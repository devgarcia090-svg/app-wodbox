import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// In-memory rate limit: max 20 invites per admin per hour
const inviteHistory = new Map<string, number[]>();
function checkRateLimit(adminId: string): boolean {
  const now = Date.now();
  const recent = (inviteHistory.get(adminId) ?? []).filter(t => now - t < 60 * 60 * 1000);
  if (recent.length >= 20) return false;
  recent.push(now);
  inviteHistory.set(adminId, recent);
  return true;
}

function jsonError(msg: string, status: number) {
  return new Response(JSON.stringify({ error: msg }), {
    status, headers: { 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  try {
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Verify caller is an admin via their JWT
    const jwt = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!jwt) return new Response('Unauthorized', { status: 401 });

    const { data: { user }, error: userError } = await adminClient.auth.getUser(jwt);
    if (userError || !user) return new Response('Unauthorized', { status: 401 });

    const { data: profile } = await adminClient
      .from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') return new Response('Forbidden', { status: 403 });

    if (!checkRateLimit(user.id)) {
      return jsonError('Demasiadas invitaciones. Espera un momento.', 429);
    }

    const { email, name, plan, redirectTo } = await req.json();
    if (!email || !name || !plan) return jsonError('Faltan campos obligatorios', 400);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return jsonError('Email no válido', 400);
    if (name.trim().length < 2 || name.length > 100) return jsonError('Nombre no válido', 400);

    const normEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    // The handle_new_user trigger reads pending_invites when the auth user is
    // created (which happens at invite time), so the row must exist BEFORE
    // calling inviteUserByEmail. The trigger consumes (deletes) it on success.
    const { error: pendingErr } = await adminClient.from('pending_invites').upsert(
      { name: cleanName, email: normEmail, plan },
      { onConflict: 'email' }
    );
    if (pendingErr) return jsonError('No se pudo registrar la invitación.', 500);

    const cleanupPending = () =>
      adminClient.from('pending_invites').delete().eq('email', normEmail);

    const inviteOptions = {
      redirectTo: redirectTo ?? 'wodbox://auth/callback',
      data: { name: cleanName, plan, role: 'athlete', invited: true },
    };

    const { error } = await adminClient.auth.admin.inviteUserByEmail(normEmail, inviteOptions);

    if (!error) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }

    // inviteUserByEmail failed — check if the email already exists in auth
    const { data: listData, error: listErr } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
    if (listErr || !listData) {
      await cleanupPending();
      return jsonError('Error interno al verificar el email.', 500);
    }
    const existing = listData.users.find(u => u.email?.toLowerCase() === normEmail);

    if (existing?.email_confirmed_at) {
      // Confirmed account — decide between blocking and reactivating
      const { data: existingProfile } = await adminClient
        .from('profiles')
        .select('id, role, membership_status')
        .eq('id', existing.id)
        .single();

      if (existingProfile?.role === 'admin') {
        await cleanupPending();
        return jsonError('Este email pertenece a un administrador del box.', 409);
      }
      if (existingProfile?.membership_status === 'active') {
        await cleanupPending();
        return jsonError('Este email ya tiene una cuenta activa en el box.', 409);
      }

      // Confirmed athlete without active profile — reactivate it
      const { error: reactErr } = existingProfile
        ? await adminClient
            .from('profiles')
            .update({ name: cleanName, plan, membership_status: 'active' })
            .eq('id', existing.id)
        : await adminClient
            .from('profiles')
            .insert({
              id: existing.id,
              name: cleanName,
              role: 'athlete',
              avatar_initials: cleanName.slice(0, 2).toUpperCase(),
              plan,
              membership_status: 'active',
            });
      await cleanupPending();
      if (reactErr) return jsonError('No se pudo reactivar el perfil.', 500);

      return new Response(JSON.stringify({ ok: true, reactivated: true }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }

    if (existing && !existing.email_confirmed_at) {
      // Invited before but never confirmed — delete and re-invite.
      // The profile cascades with the auth user; the fresh pending_invites
      // row is consumed by the trigger on the new invite.
      const { error: delErr } = await adminClient.auth.admin.deleteUser(existing.id);
      if (delErr) {
        await cleanupPending();
        return jsonError('No se pudo limpiar la invitación anterior.', 500);
      }

      const { error: reinviteErr } = await adminClient.auth.admin.inviteUserByEmail(normEmail, inviteOptions);
      if (reinviteErr) {
        await cleanupPending();
        return jsonError(reinviteErr.message, 400);
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }

    // Any other Supabase error
    await cleanupPending();
    return jsonError(error.message, 400);

  } catch (e) {
    return new Response(String(e), { status: 500 });
  }
});

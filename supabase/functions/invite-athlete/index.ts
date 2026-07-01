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

    const inviteOptions = {
      redirectTo: redirectTo ?? 'wodbox://auth/callback',
      data: { name, plan, role: 'athlete', invited: true },
    };

    const { error } = await adminClient.auth.admin.inviteUserByEmail(email, inviteOptions);

    if (!error) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }

    // inviteUserByEmail failed — check if the email already exists in auth
    const { data: listData, error: listErr } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
    if (listErr || !listData) return jsonError('Error interno al verificar el email.', 500);
    const existing = listData.users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (existing?.email_confirmed_at) {
      // User has confirmed auth credentials — check if they have an active profile
      const { data: existingProfile } = await adminClient
        .from('profiles')
        .select('id, membership_status')
        .eq('id', existing.id)
        .single();

      if (existingProfile?.membership_status === 'active') {
        return jsonError('Este email ya tiene una cuenta activa en el box.', 409);
      }

      // Auth exists but no active profile — reactivate by upserting the profile
      await adminClient.from('profiles').upsert(
        { id: existing.id, name, plan, role: 'athlete', membership_status: 'active', email: email.toLowerCase() },
        { onConflict: 'id' }
      );
      return new Response(JSON.stringify({ ok: true, reactivated: true }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }

    if (existing && !existing.email_confirmed_at) {
      // User was invited before but never confirmed — delete and re-invite
      const { error: delErr } = await adminClient.auth.admin.deleteUser(existing.id);
      if (delErr) return jsonError('No se pudo limpiar la invitación anterior.', 500);

      const { error: reinviteErr } = await adminClient.auth.admin.inviteUserByEmail(email, inviteOptions);
      if (reinviteErr) return jsonError(reinviteErr.message, 400);

      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }

    // Any other Supabase error
    return jsonError(error.message, 400);

  } catch (e) {
    return new Response(String(e), { status: 500 });
  }
});

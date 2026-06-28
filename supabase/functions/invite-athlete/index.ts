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
      return new Response('Too many invites. Try again later.', { status: 429 });
    }

    const { email, name, plan } = await req.json();
    if (!email || !name || !plan) return new Response('Missing fields', { status: 400 });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return new Response('Invalid email', { status: 400 });
    if (name.trim().length < 2 || name.length > 100) return new Response('Invalid name', { status: 400 });

    const { error } = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: 'wodbox://auth/callback',
      data: { name, plan, role: 'athlete', invited: true },
    });

    if (error) return new Response(JSON.stringify({ error: error.message }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(String(e), { status: 500 });
  }
});

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const webhookSecret = Deno.env.get('WEBHOOK_SECRET');

async function sendExpoPush(tokens: string[], title: string, body: string) {
  if (tokens.length === 0) return;
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(tokens.map((to) => ({ to, title, body, sound: 'default' }))),
  });
}

async function handleMessage(db: ReturnType<typeof createClient>, recordId: string) {
  // Re-fetch from the DB instead of trusting the webhook body verbatim, so a
  // spoofed payload shape can't fabricate a message that was never inserted.
  const { data: record } = await db
    .from('messages')
    .select('id, sender_id, text, is_broadcast, conversation_id')
    .eq('id', recordId)
    .single();
  if (!record) return;

  const { data: sender } = await db
    .from('profiles').select('name, role').eq('id', (record as any).sender_id).single();
  if (!sender) return;

  let tokens: string[] = [];
  let title = '';
  const body = ((record as any).text as string).slice(0, 150);

  if ((record as any).is_broadcast) {
    const { data: athletes } = await db
      .from('profiles')
      .select('push_token')
      .eq('role', 'athlete')
      .neq('id', (record as any).sender_id)
      .not('push_token', 'is', null);
    tokens = (athletes ?? []).map((a: any) => a.push_token).filter(Boolean);
    title = '📢 Anuncio del box';

  } else if ((record as any).conversation_id) {
    if ((sender as any).role === 'athlete') {
      const { data: admins } = await db
        .from('profiles').select('push_token').eq('role', 'admin').not('push_token', 'is', null);
      tokens = (admins ?? []).map((a: any) => a.push_token).filter(Boolean);
      title = `💬 ${(sender as any).name}`;

      const { data: conv } = await db
        .from('conversations').select('unread_admin').eq('id', (record as any).conversation_id).single();
      await db
        .from('conversations')
        .update({ unread_admin: ((conv as any)?.unread_admin ?? 0) + 1 })
        .eq('id', (record as any).conversation_id);

    } else {
      const { data: conv } = await db
        .from('conversations')
        .select('athlete_id, profiles!conversations_athlete_id_fkey(push_token)')
        .eq('id', (record as any).conversation_id)
        .single();
      const token = (conv as any)?.profiles?.push_token;
      if (token) tokens = [token];
      title = '💬 Respuesta del box';
    }
  }

  await sendExpoPush(tokens, title, body);
}

async function handleBooking(db: ReturnType<typeof createClient>, recordId: string, oldStatus: string | null) {
  const { data: booking } = await db
    .from('bookings')
    .select('id, status, athlete_id, class_id, classes(name, time), profiles!bookings_athlete_id_fkey(name, push_token)')
    .eq('id', recordId)
    .single();
  if (!booking) return;

  const b = booking as any;
  const classLabel = b.classes ? `${b.classes.name} ${b.classes.time}` : 'una clase';

  if (b.status === 'waitlist' && oldStatus !== 'waitlist') {
    // New waitlist request → notify all admins
    const { data: admins } = await db
      .from('profiles').select('push_token').eq('role', 'admin').not('push_token', 'is', null);
    const tokens = (admins ?? []).map((a: any) => a.push_token).filter(Boolean);
    await sendExpoPush(tokens, '🙋 Solicitud de plaza', `${b.profiles?.name ?? 'Un atleta'} quiere apuntarse a ${classLabel} (clase llena)`);

  } else if (b.status === 'confirmed' && oldStatus === 'waitlist') {
    // Admin accepted a waitlist request → notify the athlete
    const token = b.profiles?.push_token;
    if (token) await sendExpoPush([token], '✅ Plaza confirmada', `El entrenador te ha añadido a ${classLabel}`);
  }
}

serve(async (req) => {
  try {
    // Only meant to be called by Supabase Database Webhooks (on `messages`
    // and `bookings`). Without this check, anyone with the public anon key
    // (shipped in the APK) could POST an arbitrary payload and trigger mass
    // push notifications impersonating an admin.
    if (!webhookSecret || req.headers.get('x-webhook-secret') !== webhookSecret) {
      return new Response('Unauthorized', { status: 401 });
    }

    const payload = await req.json();
    if (payload.type !== 'INSERT' && payload.type !== 'UPDATE') return new Response('ok');

    const db = createClient(supabaseUrl, supabaseKey);
    const recordId = payload.record?.id;
    if (!recordId) return new Response('ok');

    if (payload.table === 'messages' && payload.type === 'INSERT') {
      await handleMessage(db, recordId);
    } else if (payload.table === 'bookings') {
      await handleBooking(db, recordId, payload.old_record?.status ?? null);
    }

    return new Response('ok');
  } catch (e) {
    return new Response(String(e), { status: 500 });
  }
});

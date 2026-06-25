import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  try {
    const payload = await req.json();
    if (payload.type !== 'INSERT') return new Response('ok');

    const record = payload.record;
    const db = createClient(supabaseUrl, supabaseKey);

    // Get sender info
    const { data: sender } = await db
      .from('profiles')
      .select('name, role')
      .eq('id', record.sender_id)
      .single();

    if (!sender) return new Response('ok');

    let tokens: string[] = [];
    let title = '';
    const body = (record.text as string).slice(0, 150);

    if (record.is_broadcast) {
      // Push to all athletes except sender
      const { data: athletes } = await db
        .from('profiles')
        .select('push_token')
        .eq('role', 'athlete')
        .neq('id', record.sender_id)
        .not('push_token', 'is', null);

      tokens = (athletes ?? []).map((a: any) => a.push_token).filter(Boolean);
      title = '📢 Anuncio del box';

    } else if (record.conversation_id) {
      if (sender.role === 'athlete') {
        // Athlete wrote to box → notify all admins + increment unread
        const { data: admins } = await db
          .from('profiles')
          .select('push_token')
          .eq('role', 'admin')
          .not('push_token', 'is', null);

        tokens = (admins ?? []).map((a: any) => a.push_token).filter(Boolean);
        title = `💬 ${sender.name}`;

        // Increment unread_admin counter
        const { data: conv } = await db
          .from('conversations')
          .select('unread_admin')
          .eq('id', record.conversation_id)
          .single();
        await db
          .from('conversations')
          .update({ unread_admin: ((conv as any)?.unread_admin ?? 0) + 1 })
          .eq('id', record.conversation_id);

      } else {
        // Admin replied to athlete → notify that athlete
        const { data: conv } = await db
          .from('conversations')
          .select('athlete_id, profiles!conversations_athlete_id_fkey(push_token)')
          .eq('id', record.conversation_id)
          .single();

        const token = (conv as any)?.profiles?.push_token;
        if (token) tokens = [token];
        title = '💬 Respuesta del box';
      }
    }

    if (tokens.length === 0) return new Response('ok');

    // Send via Expo Push API
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(tokens.map((to) => ({ to, title, body, sound: 'default' }))),
    });

    return new Response('ok');
  } catch (e) {
    return new Response(String(e), { status: 500 });
  }
});

-- Columna para el token de notificaciones push de Expo (usePushToken.ts,
-- edge function send-push). No estaba en ningún script de instalación:
-- en una BD nueva creada solo con los .sql del repo, cualquier `update
-- profiles set push_token = ...` fallaba en silencio y las push nunca
-- llegaban a funcionar.
-- Pega en: Supabase → SQL Editor → New query → Run query

alter table public.profiles
  add column if not exists push_token text;

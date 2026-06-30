# Changelog — WodBox

Registro de todos los cambios realizados en la app, de más reciente a más antiguo.

---

## [Sin versión] — 2026-06-30

### Corregido
- **Android build — teclado no subía el login**: Añadido `softwareKeyboardLayoutMode: "resize"` en `app.json`. En builds standalone Android el modo por defecto era `adjustPan` y `KeyboardAvoidingView` no recibía la altura del teclado correctamente. Requiere nuevo build para aplicarse.

---

## Auditoría y optimización — 2026-06-30

### Eliminado (código muerto)
- **`mockData.ts`**: Eliminados los arrays `MEMBERS`, `INVOICES`, `ATHLETE_DMS`, `ADMIN_DMS` y sus interfaces (`Member`, `Invoice`, `DM`). No estaban importados en ningún sitio.
- **`ClassCard.tsx`**: Eliminada variable `free` (calculaba plazas libres pero nunca se usaba).
- **`AdminDashboard.tsx`**: Eliminado estado `memberRefreshKey`/`setMemberRefreshKey` (el setter nunca se llamaba).

### Corregido
- **`AdminDashboard.tsx` — Modal selector de miembro**: Añadido `onRequestClose` al Modal del selector de miembro. Sin él, en Android el botón atrás no cerraba el modal.
- **`ProfileScreen.tsx` — teclado en modal de edición**: `KeyboardAvoidingView` usaba `behavior={undefined}` en Android dentro del modal de editar perfil. Cambiado a `"height"`.
- **`AuthContext.tsx` — tipo `Profile` incompleto**: Añadidos `membership_start` y `plan_classes` al tipo `Profile` y al select de Supabase. Esto eliminaba los `as any` que había en `ProfileScreen.tsx`.

### Mejorado
- **`CalendarScreen.tsx`**: Reescrita completamente. El mes, el año y la cuadrícula de días ahora son dinámicos (calculados desde la fecha real). Las flechas de navegación anterior/siguiente mes funcionan. Antes mostraba "Junio 2026" y días hardcodeados.

---

## Toast bloqueaba todos los toques — 2026-06-28

### Corregido
- **`Toast.tsx`**: Añadido `pointerEvents="none"` al `Animated.View`. Sin este atributo, un View con `position: absolute` en React Native intercepta todos los toques aunque tenga opacidad 0. Esto bloqueaba el tab bar del admin después de mostrar una notificación.

---

## Teclado persistía al cambiar de tab en admin — 2026-06-28

### Corregido
- **`AdminDashboard.tsx`**: Añadido `Keyboard.dismiss()` al pulsar cualquier tab del bottom bar. El teclado de Android se quedaba abierto al cambiar de tab (p.ej. al volver de editar un miembro), bloqueando la interfaz.

---

## Clases restantes en perfil — 2026-06-28

### Añadido
- **`ProfileScreen.tsx`**: La tercera celda de estadísticas ahora muestra el contador de clases restantes ("Restantes") en lugar de "Membresía" con un tick, cuando el perfil tiene `classes_remaining`.
- **`ProfileScreen.tsx`**: La tarjeta de membresía muestra las clases restantes incluso si no hay `plan_classes` total (barra de progreso aparece solo si hay total).

### Mejorado
- **`AdminDashboard.tsx`**: Al abrir el panel de edición de un miembro con bono de clases, el campo "Restantes" se rellena automáticamente. Al seleccionar un plan de bono, el campo se rellena con el total del bono si estaba vacío.

---

## Teclado tapaba el login en Android — 2026-06-28

### Corregido
- **`LoginScreen.tsx`** (SignInScreen, ForgotScreen, SetPasswordScreen): Envuelto el contenido en `ScrollView` dentro de `KeyboardAvoidingView`. Cambiado `behavior` de `undefined` a `"height"` en Android. Añadido `minHeight: 180` al hero para que no colapse al hacer scroll.

---

## Pastillas de fecha ampliadas — 2026-06-27

### Mejorado
- **`mockData.ts`**: La función `buildWeekDays()` ahora genera 14 días: 3 pasados + hoy + 10 futuros (antes solo mostraba la semana actual). `TODAY_IDX = 3` (posición fija del día de hoy).

---

## Leaderboard de resultados WOD — 2026-06-27

### Añadido
- **`src/components/athlete/WodLeaderboard.tsx`**: Componente de clasificación RX/Scaled con medallas para top 3.
- **`src/components/athlete/LogResultModal.tsx`**: Bottom sheet para registrar un resultado de WOD.
- **`src/hooks/useWodResults.ts`**: Hook con suscripción realtime a `wod_results`, lógica de ordenación por tipo de resultado, upsert y borrado.
- **`database/wod_results.sql`**: SQL para crear la tabla `wod_results` en Supabase (ejecutar manualmente).
- **`src/components/athlete/ClassModal.tsx`**: Las clases pasadas muestran ahora el leaderboard y el botón para registrar resultado.

---

## Calendario de asistencia en perfil — 2026-06-27

### Añadido
- **`src/components/athlete/AttendanceCalendar.tsx`**: Calendario mensual con marcadores de días con reserva confirmada, navegación anterior/siguiente mes.
- **`ProfileScreen.tsx`**: Sección "Mis clases" con el calendario de asistencia.
- **`database/membership_period.sql`**: SQL para añadir `membership_start` y `plan_classes` a la tabla `profiles` (ejecutar manualmente).

---

## Paquetes incompatibles con SDK 54 — 2026-06-26

### Corregido
- **`package.json`**: Bajadas versiones incompatibles con Expo SDK 54:
  - `expo-file-system`: `^56.0.8` → `~19.0.23`
  - `expo-print`: `^56.0.4` → `~15.0.8`
  - `expo-sharing`: `^56.0.18` → `~14.0.8`
  - `@react-native-async-storage/async-storage`: `~2.1.2` → `2.2.0`

---

## Seguridad y EAS channels — anterior

### Añadido
- Bloqueo de login tras intentos fallidos.
- Rate limiting en invitaciones.
- Canales EAS (preview / production) con `expo-updates`.
- `.easignore` para reducir el tamaño de subida a EAS.

---

## Branding WodBox — anterior

### Cambiado
- Nombre de la app: "La Trinxera" → "WodBox".
- Iconos y splash actualizados.
- Landing page con logo, SEO completo (OG tags, JSON-LD, sitemap, robots.txt).
- Política de privacidad y términos de servicio.

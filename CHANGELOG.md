# Changelog — WodBox

Registro de todos los cambios realizados en la app, de más reciente a más antiguo.

---

## Reservas atómicas + bajas visibles + solicitud de plaza + seguridad push — 2026-07-03

### Añadido
- **Bajas de clase visibles para el admin**: Cancelar una reserva ya no borra la fila, la marca `cancelled` con `cancelled_at`. En el panel de Clases del admin, cada clase con bajas muestra ahora un bloque "🚪 Bajas" con los nombres de quienes se han borrado.
- **"Solicitar plaza al entrenador" cuando la clase está llena**: El botón de lista de espera pasa a llamarse "Solicitar plaza al entrenador"; al pulsarlo se envía una notificación push a todos los admins. El panel de Clases del admin muestra un bloque "🙋 Solicitudes de plaza" con botones Aceptar/Rechazar por cada solicitud; al aceptar, el atleta recibe una push de confirmación.
- **`database/booking_control.sql`**: nuevo script con las funciones `book_class` y `cancel_booking`.
- **`database/push_tokens.sql`**: columna `push_token` que faltaba en toda la instalación (drift de esquema).

### Corregido
- **Reservas sin control real de aforo ni de bono (overbooking)**: El cliente insertaba directamente en `bookings` sin ninguna comprobación en servidor — dos atletas podían reservar la última plaza a la vez, y un atleta con el bono agotado o la membresía caducada podía seguir reservando sin límite. Ahora toda reserva/cancelación pasa por las funciones `book_class`/`cancel_booking` (`SECURITY DEFINER`, con bloqueo de fila para serializar reservas concurrentes de la misma clase). Se han retirado los permisos directos de insert/update/delete de `bookings` para los atletas: solo pueden mutar sus reservas a través de estas funciones, que validan membresía activa, caducidad del bono (1 mes desde `membership_start`) y clases restantes antes de confirmar.
- **`send-push` (Edge Function) sin autenticación**: Cualquiera con la anon key (pública, va en el APK) podía hacer POST directo a la función y enviar notificaciones push masivas suplantando a un admin, o manipular contadores de mensajes no leídos. Ahora exige una cabecera `x-webhook-secret` que debe coincidir con un secreto configurado en el proyecto, y en vez de confiar en el cuerpo del webhook, vuelve a leer el mensaje/reserva real de la base de datos antes de notificar.
- **Contador "restantes" del Home mostraba un valor distinto al del Perfil**: El Home leía `profile.classes_remaining` (columna que nadie decrementaba nunca), mientras el Perfil ya calculaba el valor dinámico correcto. Nuevo hook `useClassesRemaining` con la misma fórmula (`plan_classes − reservas confirmadas del período`), usado ahora en el Home.
- **Botones de acción no se deshabilitaban durante el envío**: `Button` no aceptaba `disabled`, así que el texto cambiaba a "..." pero el botón seguía siendo pulsable — doble tap disparaba la acción dos veces (reservar, guardar resultado). Añadido soporte real de `disabled` en `Button` y aplicado en `ClassModal` y `LogResultModal`.
- **Fuga de notificaciones push entre usuarios en dispositivos compartidos**: Al cerrar sesión no se limpiaba `push_token`; si otro atleta iniciaba sesión en el mismo móvil, seguía llegando el token del usuario anterior y recibía sus notificaciones privadas. Ahora `signOut` limpia el token antes de cerrar sesión.
- **Registro de push token fallaba en silencio en producción**: `getExpoPushTokenAsync()` sin `extra.eas.projectId` configurado lanza una excepción; la promesa no tenía `.catch()` y el registro de notificaciones quedaba muerto sin ningún aviso en consola.

### Pendiente de configuración manual en Supabase (no se puede hacer desde el repo)
- Ejecutar `database/booking_control.sql` y `database/push_tokens.sql` en el SQL Editor.
- Definir el secreto `WEBHOOK_SECRET` en el proyecto (`supabase secrets set WEBHOOK_SECRET=<valor-aleatorio>`).
- Ejecutar `database/push_webhooks.sql` (sustituyendo `<TU_WEBHOOK_SECRET>` por el mismo valor de arriba) para que `messages` y `bookings` avisen a `send-push` vía `pg_net`, sin depender de la pantalla Database → Webhooks del Dashboard.
- Redesplegar `send-push`.

---

## Fix flujo de invitaciones completo (auditoría) — 2026-07-02

### Corregido
- **`invite-athlete` (Edge Function) — el atleta invitado quedaba `inactive` y duplicado en Miembros**: El trigger `handle_new_user` lee `pending_invites` cuando se crea el usuario en auth, que ocurre en el momento de la invitación (no al aceptarla). El cliente insertaba la fila en `pending_invites` *después* de invocar la función, así que el trigger nunca la encontraba: perfil `inactive`, sin plan, y la fila de invitación quedaba huérfana duplicando al miembro en la lista. Ahora la propia edge function hace el upsert en `pending_invites` **antes** de `inviteUserByEmail` (y lo limpia en las ramas de error). Eliminado el upsert del cliente.
- **`invite-athlete` — la reactivación podía degradar a un admin a atleta**: Si el email pertenecía a un admin, el upsert le machacaba `role`, nombre y plan. Ahora se comprueba el rol y devuelve error claro. Además el upsert incluía una columna `email` que no existe en `profiles`, por lo que la reactivación fallaba siempre en silencio; sustituido por `update` (o `insert` si no hay perfil) con las columnas reales.
- **`App.tsx` — `SetPasswordScreen` era inalcanzable**: Solo se mostraba dentro de `LoginScreen`, que solo se renderiza sin sesión, pero el invitado llega con sesión ya establecida por el deep link. Entraba a la app sin fijar contraseña y quedaba bloqueado cuando caducara la sesión. Ahora `App.tsx` muestra `LoginScreen` (que enruta a `SetPasswordScreen`) cuando `needsPasswordSetup` es true.
- **`AuthContext.tsx` / `App.tsx` — handler de deep links duplicado**: `AuthContext` tenía un handler que solo aceptaba `wodbox://` (inútil en Expo Go) y `App.tsx` tenía otro añadido ayer. En builds standalone ambos procesaban el mismo enlace pudiendo invalidar la sesión. Consolidado en un único handler en `AuthContext` que acepta cualquier scheme y soporta PKCE (`?code=`) e implicit flow (`#access_token`).

---

## Fix invitaciones + contadores de clases correctos — 2026-07-01

### Corregido
- **`invite-athlete` (Edge Function) — re-invitación bloqueada**: `inviteUserByEmail` rechaza emails que ya existen en `auth.users`, aunque el perfil se haya borrado. Ahora si el email existe pero no tiene cuenta confirmada (invitación anterior caducada/no aceptada), se elimina el usuario de auth y se re-invita. Si ya tiene cuenta activa devuelve error claro "Este email ya tiene una cuenta activa en el box."
- **`AdminDashboard.tsx` — insert en `pending_invites` fallaba en silencio**: Cambiado `insert` por `upsert({ onConflict: 'email' })`. Si el email ya tenía una fila de invitación pendiente (de un invite anterior), se actualiza con los nuevos datos en vez de fallar.
- **`ProfileScreen.tsx` — contador "Este mes" mostraba total histórico**: Los filtros sobre columnas de tablas embebidas (`gte('classes.date', ...)`) en PostgREST sin `!inner` no filtran la fila padre — devuelven todos los registros y solo filtran qué datos embebidos se incluyen, no el COUNT. Refactorizado `fetchStats` a una sola query que trae todas las reservas con datos de clase y filtra en cliente. Ahora "Este mes" solo cuenta clases del mes natural actual, y `periodConsumed` (base del cálculo dinámico de restantes) también es correcto.

---

## Clases restantes dinámicas + tab Clases eliminado — 2026-07-01

### Cambiado
- **`AthleteNavigator.tsx` — tab "Clases" eliminado**: El tab duplicaba el calendario de asistencia del perfil. Eliminado junto con su import de `CalendarScreen`. El nav del atleta queda con 3 tabs: Inicio, Chat, Perfil.
- **`ProfileScreen.tsx` — `classes_remaining` ahora es dinámico**: En lugar de leer el campo manual `classes_remaining` de la BD, el valor se calcula en tiempo real: `plan_classes − reservas confirmadas con fecha pasada dentro del período actual de membresía` (`membership_start` hasta hoy). Si el atleta no tiene plan con número de clases (`plan_classes` null) o sin fecha de inicio, se sigue mostrando el tick de membresía. La lógica: cuando una clase reservada vence (fecha ≤ hoy y ≥ membership_start), se descuenta automáticamente del total del bono.

---

## Hotfix: Race condition en login (loading state) — 2026-06-30

### Corregido
- **`AuthContext.tsx` — login mostraba spinner y nunca entraba (iOS y Android)**: `onAuthStateChange` recibía la sesión, llamaba `setSession()` y lanzaba `fetchProfile()` en background, pero no ponía `loading=true`. Esto dejaba una ventana donde `session=set, profile=null, loading=false`, que hacía que `App.tsx` volviera al login antes de que el perfil cargara. El usuario veía el spinner del botón apagarse y no pasaba nada. Añadido `setLoading(true)` justo antes de `fetchProfile()` en el handler de `onAuthStateChange`. También eliminada la llamada redundante a `getSession()` (ya innecesaria porque `onAuthStateChange` dispara inmediatamente al suscribirse con el estado actual de sesión).

---

## Hotfix: fetchProfile con columnas faltantes — 2026-06-30

### Corregido
- **`AuthContext.tsx` — login no navegaba tras autenticarse**: El `fetchProfile` seleccionaba columnas concretas incluyendo `membership_start` y `plan_classes`. Si esas columnas no existen en la BD todavía (la migración `membership_period.sql` es manual y puede no haberse ejecutado), la query fallaba con error de columna, `data` quedaba null, `setProfile` nunca se llamaba, y `App.tsx` seguía mostrando el login aunque el usuario estuviera autenticado. Cambiado a `select('*')` que ignora columnas ausentes y siempre devuelve lo que hay.
- **`App.tsx` — bucle infinito cuando profile es null con sesión activa**: Separada la condición `!session || !profile` en dos bloques distintos. Ahora si hay sesión pero el perfil no carga, se muestra una pantalla de error con botón "Reintentar" y opción de cerrar sesión, en lugar de volver al login (que provocaba que el usuario reintentara el login sin efecto).

---

## Hotfix: BoxLogo eliminado + login KAV — 2026-06-30

### Corregido
- **`App.tsx` — crash al iniciar (import de BoxLogo eliminado)**: `BoxLogo.tsx` fue borrado en la auditoría anterior pero `App.tsx` seguía importándolo. Metro no podía resolver el módulo y el bundle fallaba por completo, impidiendo que la app arrancara. Reemplazadas las dos referencias de `BoxLogo` con `<Text>` usando `boxConfig.name`.
- **`LoginScreen.tsx` — botón "Entrar" no respondía en Expo Go**: `behavior={undefined}` en Android requiere `adjustResize` nativo para funcionar, que solo está activo en builds standalone (no en Expo Go). Cambiado a `behavior="padding"`, que funciona en ambos entornos: en producción añade padding de scroll extra (inocuo con `adjustResize`), en Expo Go permite hacer scroll para llegar al botón debajo del teclado.
- **`AthleteNavigator.tsx` — registro de push token duplicado**: `usePushToken` se llamaba tanto en `App.tsx` como en `AthleteNavigator.tsx`. Eliminada la llamada redundante de `AthleteNavigator` (ya se gestiona a nivel de `AppContent`).

---

## Auditoría y limpieza (round 2) — 2026-06-30

### Añadido
- **`AthleteNavigator.tsx`**: Completado el render del tab "Clases" — `<CalendarScreen />` ya se muestra al pulsar la pestaña. También wired `usePushToken(session?.user.id)` para registrar notificaciones push tras el login.

### Corregido
- **`Avatar.tsx`**: Añadido `useEffect(() => setImgError(false), [url])`. Sin él, una foto de perfil actualizada seguía mostrando las iniciales porque el flag de error no se reseteaba al cambiar la URL.
- **`ChatScreen.tsx`**: `sendBroadcast` y `sendDM` borraban el input antes del `await` de Supabase; si la petición fallaba, el mensaje se perdía silenciosamente. Movido `setBcInput('')` / `setDmInput('')` dentro del bloque `if (!error)`.
- **`AdminDashboard.tsx`**: `todayIso` era una variable local que duplicaba `TODAY_ISO` importada de `mockData`. Eliminada la variable local, usado `TODAY_ISO` directamente.
- **`AdminDashboard.tsx`**: Eliminado `refreshKey` de `MiembrosPanel` (prop y useEffect). El prop siempre era `0`, la guardia `if (refreshKey > 0)` nunca se cumplía — el panel jamás hacía refetch externo. Eliminado el código muerto; las actualizaciones se disparan desde dentro del propio panel.

### Eliminado (código muerto)
- **`BoxLogo.tsx`**: Componente exportado pero nunca importado en ningún sitio. Eliminado.
- **`HomeScreen.tsx`**: Estilos `datePillActive` y `timePillActive` nunca referenciados (el color activo se aplica inline). Eliminados.
- **`ProfileScreen.tsx`**: Estilo `avatarHint` nunca referenciado. Eliminado.
- **`AdminDashboard.tsx`**: Estilo `seenText` nunca referenciado. Eliminado.
- **`CalendarScreen.tsx`**: Array `DAY_NAMES_ES` y variable `dayAbbr` nunca usados tras la reescritura. Eliminados.

### Mejorado
- **`HomeScreen.tsx`**: Tipo de `selectedClass` cambiado de `any` a `ClassItem | null`.
- **`AttendanceCalendar.tsx`**: Sustituida concatenación `primaryColor + '28'` / `+ '55'` por llamadas a `withAlpha(primaryColor, 0.16)` / `withAlpha(primaryColor, 0.33)`. Funciona correctamente con cualquier formato de color, no solo hex 6 dígitos.
- **`LogResultModal.tsx`**: Añadido `returnKeyType="done"` al TextInput de resultado — el teclado muestra "Hecho" en lugar de "Retorno".
- **`CalendarScreen.tsx`**: `buildWeekCols` ya usa el mes visualizado como ancla en lugar de hardcodear la semana actual independientemente del mes.

---

## [Sin versión] — 2026-06-30

### Corregido
- **Android build — botón "Entrar" no respondía**: Con `adjustResize` en el manifest, Android ya redimensiona el layout al aparecer el teclado. `KeyboardAvoidingView behavior="height"` hacía un segundo ajuste encima, desplazando los elementos visualmente de sus zonas táctiles reales. Revertido a `behavior={undefined}` en Android para que `adjustResize` lo gestione solo.
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

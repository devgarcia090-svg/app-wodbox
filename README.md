# WodBox — Servidor Web Personal

Aloja tus páginas web en tu propio PC sin depender de servicios externos.

## Instalación

```bash
npm install
npm start
```

## Acceso

| Servicio | URL |
|----------|-----|
| Panel de administración | http://localhost:3000 |
| Sitios web | http://localhost:8080/nombre-sitio/ |

**Credenciales por defecto:** `admin` / `admin`  
⚠️ Cámbialas en Configuración → Seguridad al primer acceso.

## Características

- Panel de administración completo con autenticación
- Gestor de archivos con navegación de carpetas
- Editor de código integrado (HTML, CSS, JS) con resaltado de sintaxis
- Subida de archivos con drag & drop
- Descarga de sitios como ZIP
- Múltiples sitios en el mismo servidor
- Páginas 404 personalizadas (crea un `404.html` en tu sitio)
- Acceso por ruta: `http://localhost:8080/mi-sitio/`
- Acceso por subdominio: `http://mi-sitio.localhost:8080/`

## Estructura

```
wodbox/
├── server.js          # Servidor principal
├── routes/
│   ├── auth.js        # Autenticación
│   ├── api.js         # API REST del panel
│   └── sites.js       # Servidor de sitios
├── public/
│   ├── login.html     # Pantalla de login
│   └── admin.html     # Panel de administración (SPA)
├── data/              # Configuración y usuarios (auto-creado)
└── sites/             # Tus sitios web (auto-creado)
```

## Acceso desde la red local

Para acceder desde otros dispositivos de tu red local averigua tu IP:

```bash
ip addr show   # Linux/Mac
ipconfig       # Windows
```

Luego: `http://TU-IP:3000` (admin) y `http://TU-IP:8080` (sitios)

## Autoarranque en Linux (systemd)

Crea `/etc/systemd/system/wodbox.service`:

```ini
[Unit]
Description=WodBox Web Server
After=network.target

[Service]
ExecStart=/usr/bin/node /ruta/a/wodbox/server.js
Restart=always
User=tu-usuario
WorkingDirectory=/ruta/a/wodbox

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable wodbox
sudo systemctl start wodbox
```
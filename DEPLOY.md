# Deploy en Ubuntu 22.04 — Viáticos App

Guía para servidor con otras aplicaciones ya corriendo (Nginx existente).

---

## 1. Requisitos previos en el servidor

Python 3.10.12 ya viene instalado en Ubuntu 22.04. Solo necesitas el módulo `venv` y herramientas de red:

```bash
sudo apt update
sudo apt install -y python3.10-venv python3-pip git nginx
```

Verificar Python (ya debe estar):
```bash
python3 --version      # Python 3.10.12
python3 -m venv --help # verificar que venv está disponible
```

---

## 2. Clonar el repositorio

```bash
cd /var/www
sudo git clone https://github.com/RobCrack2023/Viaticos.git viaticos
sudo chown -R $USER:$USER /var/www/viaticos
cd /var/www/viaticos
```

---

## 3. Crear entorno virtual e instalar dependencias

```bash
cd /var/www/viaticos/backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
deactivate
```

---

## 4. Configurar variables de entorno

```bash
nano /var/www/viaticos/backend/.env
```

Contenido del `.env`:
```env
SECRET_KEY=reemplaza-con-clave-segura-min-32-chars-aqui!!
DATABASE_URL=sqlite:////var/www/viaticos/backend/viaticos.db
UPLOADS_DIR=/var/www/viaticos/backend/uploads
ACCESS_TOKEN_EXPIRE_MINUTES=480
```

Generar una clave segura:
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```
e76f7ca9ce81bfa21d256ff08ac0bb5d6ebe9fec265e01136d647e842274deed
---

## 5. Crear directorios necesarios

```bash
mkdir -p /var/www/viaticos/backend/uploads
chmod 755 /var/www/viaticos/backend/uploads
```

---

## 6. Crear servicio systemd

```bash
sudo nano /etc/systemd/system/viaticos.service
```

Contenido:
```ini
[Unit]
Description=Viaticos App - FastAPI
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/var/www/viaticos/backend
Environment="PATH=/var/www/viaticos/backend/venv/bin"
ExecStart=/var/www/viaticos/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8001 --workers 1
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

```bash
# Permisos a www-data sobre el proyecto
sudo chown -R www-data:www-data /var/www/viaticos

# Habilitar e iniciar
sudo systemctl daemon-reload
sudo systemctl enable viaticos
sudo systemctl start viaticos

# Verificar estado
sudo systemctl status viaticos
```

---

## 7. Configurar Nginx (nuevo virtual host)

```bash
sudo nano /etc/nginx/sites-available/viaticos
```

Contenido (reemplaza `TU_DOMINIO.cl` con tu dominio o IP):
```nginx
server {
    listen 80;
    server_name TU_DOMINIO.cl;

    # Frontend estático — servido directamente por Nginx (más rápido)
    root /var/www/viaticos/frontend;
    index index.html;

    # API → proxy al backend FastAPI
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    # Fotos subidas
    location /uploads/ {
        alias /var/www/viaticos/backend/uploads/;
        expires 7d;
        add_header Cache-Control "public";
    }

    # PWA: todas las rutas → index.html
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # Archivos estáticos con caché larga
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|woff2)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    client_max_body_size 10M;
}
```

```bash
# Activar el sitio
sudo ln -s /etc/nginx/sites-available/viaticos /etc/nginx/sites-enabled/
sudo nginx -t          # Verificar configuración
sudo systemctl reload nginx
```

---

## 8. SSL con Let's Encrypt (recomendado)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d TU_DOMINIO.cl
# Sigue las instrucciones — certbot modifica el nginx automáticamente
sudo systemctl reload nginx
```

---

## 9. Verificar que todo funciona

```bash
# Estado del servicio
sudo systemctl status viaticos

# Logs en tiempo real
sudo journalctl -u viaticos -f

# Test del API
curl http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@viaticos.cl","password":"admin1234"}'
```

---

## 10. Cambiar contraseña del admin (importante en producción)

Accede a `https://TU_DOMINIO.cl` y entra con:
- Email: `admin@viaticos.cl`
- Password: `admin1234`

Luego ve a **Admin → Usuarios → Editar** y cambia la contraseña.

---

## Actualizar la app (deploy de nuevas versiones)

```bash
cd /var/www/viaticos
sudo -u www-data git pull origin main
cd backend
source venv/bin/activate
pip install -r requirements.txt --quiet
deactivate
sudo systemctl restart viaticos
```

---

## Estructura de puertos

| App | Puerto interno | Nginx |
|---|---|---|
| Otras apps existentes | 8000, etc. | sus dominios |
| **Viáticos App** | **8001** | **TU_DOMINIO.cl** |

> Si el puerto 8001 ya está ocupado, cambia `--port 8001` en el servicio systemd y en el nginx `proxy_pass`.

---

## Respaldo de la base de datos

```bash
# Backup manual
cp /var/www/viaticos/backend/viaticos.db /backup/viaticos_$(date +%Y%m%d).db

# Cron diario a las 2am
sudo crontab -e
# Agregar:
# 0 2 * * * cp /var/www/viaticos/backend/viaticos.db /backup/viaticos_$(date +\%Y\%m\%d).db
```

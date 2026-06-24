# 💬 Personal Chat

A self-hosted real-time chat application built with Python Flask + Socket.IO.

## ✨ Features

- 🔐 **User system** — Register, login, password hashing
- 💬 **Real-time messaging** — WebSocket via Socket.IO, instant delivery
- 👥 **Friend system** — Add, accept, reject, delete friends
- 🛡️ **Super admin** — View any conversation without trace, server status dashboard
- 🖼️ **Avatar upload** — Custom profile pictures
- 📎 **File sharing** — Send files in chat
- 🎨 **6 color themes** — Light, Dark, Ocean, Forest, Purple, Sunset
- 🌍 **16 languages** — 中文, English, 日本語, 한국어, Русский, Français, Español, Deutsch, Português, العربية, Italiano, Türkçe, ไทย, Tiếng Việt, Bahasa, हिन्दी
- 📱 **Responsive design** — Collapsible sidebar, mobile-friendly
- 🔒 **HTTPS ready** — Nginx reverse proxy + Let's Encrypt SSL

## 📁 Project Structure

```
├── app.py                # Main Flask + SocketIO server
├── requirements.txt      # Python dependencies
├── start.bat             # Windows launcher
├── .gitignore
├── templates/
│   ├── index.html        # Login / Register page
│   └── chat.html         # Chat interface
└── static/
    ├── css/style.css     # 6 themed color schemes
    ├── js/chat.js        # 16-language client logic
    └── uploads/          # User uploads (avatars, files)
```

## 🚀 Quick Start (Local)

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Run
python app.py

# 3. Open http://localhost:5000
```

**Default admin**: `admin` / `admin123`

---

## 🖥 Deploy to Linux Server

Tested on **Ubuntu 20.04/22.04** with **Alibaba Cloud ECS**.

### Step 1 — Server preparation

```bash
# Update system
apt update && apt upgrade -y

# Install Python & tools
apt install -y python3 python3-pip nginx
```

### Step 2 — Upload project

```bash
# Create app directory
mkdir -p /opt/chat-app

# Upload files (via scp, git clone, or any method)
# After uploading, the structure should be:
# /opt/chat-app/
#   ├── app.py
#   ├── requirements.txt
#   ├── templates/
#   └── static/
```

### Step 3 — Install dependencies

```bash
cd /opt/chat-app
pip3 install -r requirements.txt
```

### Step 4 — Create systemd service

```bash
cat > /etc/systemd/system/chat-server.service << 'EOF'
[Unit]
Description=Personal Chat Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/chat-app
ExecStart=/usr/bin/python3 /opt/chat-app/app.py
Restart=always
RestartSec=3
Environment=PORT=5000

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable chat-server
systemctl start chat-server
```

### Step 5 — Configure Nginx

```bash
cat > /etc/nginx/sites-available/chat << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com;

    location ^~ /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name your-domain.com;

    ssl_certificate /etc/nginx/ssl/your-domain.com.pem;
    ssl_certificate_key /etc/nginx/ssl/your-domain.com.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    location /static/ {
        root /opt/chat-app;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    location /static/uploads/ {
        root /opt/chat-app;
    }
}
EOF

ln -sf /etc/nginx/sites-available/chat /etc/nginx/sites-enabled/chat
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

### Step 6 — Configure firewall

```bash
# UFW
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 5000/tcp    # optional, if accessing directly

# Alibaba Cloud: also open 80, 443 in security group console!
```

### Step 7 — HTTPS with Let's Encrypt

```bash
# Install acme.sh
curl https://get.acme.sh | sh -s email=admin@your-domain.com

# Issue certificate (DNS challenge recommended)
~/.acme.sh/acme.sh --issue --dns -d your-domain.com \
    --yes-I-know-dns-manual-mode-enough-go-ahead-please

# Add the TXT record to your DNS, then renew:
~/.acme.sh/acme.sh --renew -d your-domain.com \
    --yes-I-know-dns-manual-mode-enough-go-ahead-please

# Install certificate
mkdir -p /etc/nginx/ssl
~/.acme.sh/acme.sh --install-cert -d your-domain.com \
    --key-file /etc/nginx/ssl/your-domain.com.key \
    --fullchain-file /etc/nginx/ssl/your-domain.com.pem \
    --reloadcmd "systemctl reload nginx"

# Auto-renewal is set up automatically (daily cron)
```

### Step 8 — Verify

```bash
# Check services
systemctl status chat-server nginx

# Test HTTPS
curl -I https://your-domain.com/login

# Done! 🎉
```

---

## 🔧 Management Commands

```bash
# Chat server
systemctl status chat-server   # View status
systemctl restart chat-server  # Restart
journalctl -u chat-server -f   # Tail logs

# Nginx
nginx -t                       # Test config
systemctl reload nginx         # Reload config
```

---

## 🛡️ Default Admin

- **Username**: `admin`
- **Password**: `admin123`

> Automatically created on first startup. Change password after first login.

---

## 📊 Admin Panel

Login as admin, click the red ⚙ button in sidebar to access:
- **Server status**: CPU, RAM, Disk, Uptime, Online users
- **User list**: All registered users
- **Conversation viewer**: Click any two users to read their chat history without leaving read receipts

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Flask 3.x + Flask-SocketIO |
| Database | SQLite + Flask-SQLAlchemy |
| Real-time | WebSocket (Socket.IO) |
| Auth | Flask-Login + Werkzeug password hashing |
| Frontend | Vanilla HTML/CSS/JS (no framework) |
| Web Server | Nginx (reverse proxy) |
| SSL | Let's Encrypt via acme.sh |

## 📄 License

MIT

# 💬 Personal Chat

A self-hosted real-time chat application built with Python Flask + Socket.IO.

**Live demo**: [https://nhshit.cn](https://nhshit.cn)

## Features

- 🔐 User registration & login (password hashed)
- 💬 Real-time messaging via WebSocket (Socket.IO)
- 👥 Friend system (add, accept, reject, delete)
- 🛡️ Super admin panel (view conversations without trace)
- 🖼️ Custom avatar upload
- 📎 File sharing in chat
- 🎨 6 color themes (Light, Dark, Ocean, Forest, Purple, Sunset)
- 🌍 16 languages (中文, English, 日本語, 한국어, Русский, Français, Español, Deutsch, Português, العربية, Italiano, Türkçe, ไทย, Tiếng Việt, Bahasa, हिन्दी)
- 📱 Responsive design with collapsible sidebar
- 🖥 Server status dashboard (CPU, RAM, Disk, Uptime)
- 🔒 HTTPS ready (Nginx + Let's Encrypt)

## Quick Start

```bash
# Install
pip install -r requirements.txt

# Run
python app.py

# Open http://localhost:5000
```

**Default admin**: `admin` / `admin123`

## Project Structure

```
├── app.py                # Main Flask + SocketIO server
├── requirements.txt      # Python dependencies
├── start.bat             # Windows launcher
├── templates/
│   ├── index.html        # Login / Register page
│   └── chat.html         # Chat interface
└── static/
    ├── css/style.css     # Themed styles (6 color schemes)
    ├── js/chat.js        # Client logic (16 languages)
    └── uploads/          # User uploads (avatars, files)
```

## Deployment

```bash
# Nginx reverse proxy + Let's Encrypt SSL
sudo apt install nginx certbot python3-certbot-nginx
# See deploy notes for full instructions
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Flask + Flask-SocketIO + eventlet |
| Database | SQLite + Flask-SQLAlchemy |
| Real-time | WebSocket (Socket.IO) |
| Auth | Flask-Login + Werkzeug |
| Frontend | Vanilla HTML/CSS/JS |
| SSL | Let's Encrypt + Nginx |

## License

MIT

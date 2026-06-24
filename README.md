# 💬 Personal Chat / 个人聊天

[English](#english) | [中文](#中文)

A self-hosted real-time chat application built with Python Flask + Socket.IO. / 基于 Python Flask + Socket.IO 的自托管实时聊天应用。

## ✨ Features / 功能特性

| Feature 功能 | Description 说明 |
|-------------|-----------------|
| 🔐 User system 用户系统 | Register, login, password hashing 注册、登录、密码哈希 |
| 💬 Real-time chat 实时聊天 | WebSocket via Socket.IO 消息即时推送 |
| 👥 Friend system 好友系统 | Add, accept, reject, delete 添加、接受、拒绝、删除 |
| 🛡️ Super admin 超级管理员 | View conversations without trace 查看任意对话不留痕迹 |
| 🖼️ Avatar upload 头像上传 | Custom profile pictures 自定义头像 |
| 📎 File sharing 文件发送 | Send files in chat 聊天中发送文件 |
| 🎨 6 color themes 六种主题 | Light, Dark, Ocean, Forest, Purple, Sunset |
| 🌍 16 languages 多语言 | EN/中文/日本語/한국어/RU/FR/ES/DE/PT/AR/IT/TR/TH/VI/ID/HI |
| 📱 Responsive 响应式 | Collapsible sidebar, mobile-friendly 可折叠侧边栏 |
| 🔒 HTTPS ready 加密 | Nginx + Let's Encrypt SSL 自动续签 |

## 📁 Project Structure / 项目结构

```
├── app.py                # Main server / 主程序
├── requirements.txt      # Dependencies / 依赖
├── start.bat             # Windows launcher / 启动脚本
├── .gitignore
├── templates/
│   ├── index.html        # Login & Register / 登录注册页
│   └── chat.html         # Chat UI / 聊天界面
└── static/
    ├── css/style.css     # 6 themed styles / 主题样式
    ├── js/chat.js        # Client logic / 前端逻辑
    └── uploads/          # Avatars & files / 头像文件
```

---

# 中文

## 🚀 本地快速启动

```bash
# 1. 安装依赖
pip install -r requirements.txt

# 2. 启动
python app.py

# 3. 浏览器打开 http://localhost:5000
```

**默认管理员**: `admin` / `admin123`

---

## 🖥 部署到 Linux 服务器

以 **Ubuntu 20.04/22.04** + **阿里云 ECS** 为例。

### 第一步 — 服务器准备

```bash
apt update && apt upgrade -y
apt install -y python3 python3-pip nginx
```

### 第二步 — 上传项目

```bash
mkdir -p /opt/chat-app
# 通过 scp / git clone / 网页上传等方式将文件传至 /opt/chat-app/
```

### 第三步 — 安装依赖

```bash
cd /opt/chat-app
pip3 install -r requirements.txt
```

### 第四步 — 创建 systemd 服务

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

### 第五步 — 配置 Nginx

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

### 第六步 — 配置防火墙

```bash
# 服务器防火墙
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 5000/tcp

# 阿里云：还需要在安全组控制台开放 80、443 端口！
```

### 第七步 — 配置 HTTPS 证书 (Let's Encrypt)

```bash
# 安装 acme.sh
curl https://get.acme.sh | sh -s email=admin@your-domain.com

# 获取证书（推荐 DNS 验证）
~/.acme.sh/acme.sh --issue --dns -d your-domain.com \
    --yes-I-know-dns-manual-mode-enough-go-ahead-please

# 去 DNS 控制台添加输出的 TXT 记录，然后续期：
~/.acme.sh/acme.sh --renew -d your-domain.com \
    --yes-I-know-dns-manual-mode-enough-go-ahead-please

# 安装证书到 Nginx
mkdir -p /etc/nginx/ssl
~/.acme.sh/acme.sh --install-cert -d your-domain.com \
    --key-file /etc/nginx/ssl/your-domain.com.key \
    --fullchain-file /etc/nginx/ssl/your-domain.com.pem \
    --reloadcmd "systemctl reload nginx"

# 自动续签已默认开启（每日 cron）
```

### 第八步 — 验证

```bash
systemctl status chat-server nginx
curl -I https://your-domain.com/login
```

---

## 🔧 管理命令

```bash
systemctl status chat-server    # 查看状态
systemctl restart chat-server   # 重启
journalctl -u chat-server -f    # 查看日志
nginx -t                        # 测试 Nginx 配置
systemctl reload nginx          # 重载 Nginx
```

## 🛡️ 管理员

| 项目 | 值 |
|------|-----|
| 用户名 | `admin` |
| 密码 | `admin123` |

首次启动自动创建。登录后点击侧边栏红色 ⚙ 按钮进入管理面板，可查看服务器状态、用户列表、任意用户的聊天记录。

---

## 🛠 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Flask 3.x + Flask-SocketIO |
| 数据库 | SQLite + Flask-SQLAlchemy |
| 实时通信 | WebSocket (Socket.IO) |
| 认证 | Flask-Login + Werkzeug |
| 前端 | 原生 HTML/CSS/JS |
| Web 服务器 | Nginx |
| SSL | Let's Encrypt via acme.sh |

## 📄 许可证

MIT

---

# English

## 🚀 Quick Start

```bash
pip install -r requirements.txt
python app.py
# Open http://localhost:5000
```

**Default admin**: `admin` / `admin123`

---

## 🖥 Linux Deployment

Tested on **Ubuntu 20.04/22.04**.

### Step 1 — Server Setup

```bash
apt update && apt upgrade -y
apt install -y python3 python3-pip nginx
```

### Step 2 — Upload Project

```bash
mkdir -p /opt/chat-app
# Upload all files to /opt/chat-app/ (scp, git clone, etc.)
```

### Step 3 — Install Dependencies

```bash
cd /opt/chat-app
pip3 install -r requirements.txt
```

### Step 4 — Create systemd Service

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
systemctl enable --now chat-server
```

### Step 5 — Configure Nginx

Create `/etc/nginx/sites-available/chat` (see Chinese section above for full config), then:

```bash
ln -sf /etc/nginx/sites-available/chat /etc/nginx/sites-enabled/chat
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

### Step 6 — Firewall

```bash
ufw allow 80/tcp
ufw allow 443/tcp
# Also open 80/443 in your cloud provider's security group!
```

### Step 7 — HTTPS with Let's Encrypt

```bash
curl https://get.acme.sh | sh -s email=admin@your-domain.com

~/.acme.sh/acme.sh --issue --dns -d your-domain.com \
    --yes-I-know-dns-manual-mode-enough-go-ahead-please

# Add the TXT record to DNS, then:
~/.acme.sh/acme.sh --renew -d your-domain.com \
    --yes-I-know-dns-manual-mode-enough-go-ahead-please

mkdir -p /etc/nginx/ssl
~/.acme.sh/acme.sh --install-cert -d your-domain.com \
    --key-file /etc/nginx/ssl/your-domain.com.key \
    --fullchain-file /etc/nginx/ssl/your-domain.com.pem \
    --reloadcmd "systemctl reload nginx"
```

### Step 8 — Verify

```bash
systemctl status chat-server nginx
curl -I https://your-domain.com/login
```

---

## 🔧 Management

```bash
systemctl status chat-server    # Status
systemctl restart chat-server   # Restart
journalctl -u chat-server -f    # Logs
nginx -t && systemctl reload nginx
```

## 🛡️ Admin

| Field | Value |
|-------|-------|
| Username | `admin` |
| Password | `admin123` |

Auto-created on first run. Click the red ⚙ in the sidebar after login to access the admin panel.

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Flask 3.x + Flask-SocketIO |
| Database | SQLite + Flask-SQLAlchemy |
| Real-time | WebSocket (Socket.IO) |
| Auth | Flask-Login + Werkzeug |
| Frontend | Vanilla HTML/CSS/JS |
| Web Server | Nginx |
| SSL | Let's Encrypt via acme.sh |

## 📄 License

MIT

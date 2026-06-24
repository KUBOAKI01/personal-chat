"""
个人聊天软件 — Flask + SocketIO 实时聊天应用
功能: 好友系统 / 超级管理员 / 头像上传 / 文件发送
启动方式: python app.py
管理员: admin / admin123
"""

from __future__ import annotations

import os
import sys
import uuid
from datetime import datetime, timezone, timedelta

from flask import (
    Flask, render_template, request, redirect, url_for,
    flash, jsonify, send_from_directory
)
from flask_socketio import SocketIO, emit, join_room
from flask_login import (
    LoginManager, UserMixin, login_user, logout_user,
    login_required, current_user
)
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename

# ─── 初始化 ────────────────────────────────────────────────

CST = timezone(timedelta(hours=8))


def cst_now():
    return datetime.now(CST)


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "static", "uploads")
AVATAR_DIR = os.path.join(UPLOAD_DIR, "avatars")
FILE_DIR = os.path.join(UPLOAD_DIR, "files")

for d in [AVATAR_DIR, FILE_DIR]:
    os.makedirs(d, exist_ok=True)

app = Flask(__name__)
app.config["SECRET_KEY"] = os.urandom(24).hex()
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///chat.db"  # 服务器部署时改为: sqlite:////opt/chat-app/data/chat.db
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024  # 50MB 上传限制

ALLOWED_IMG = {"png", "jpg", "jpeg", "gif", "webp", "bmp"}

db = SQLAlchemy(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="eventlet")
login_manager = LoginManager(app)
login_manager.login_view = "login"
login_manager.login_message = "请先登录后再访问聊天室。"
_start_time: float | None = None


def _ensure_columns():
    """为旧数据库补建缺失的列（SQLite 迁移）"""
    import sqlite3
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "instance", "chat.db")
    if not os.path.exists(db_path):
        return
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    def _has_col(table, col):
        cur.execute(f"PRAGMA table_info({table})")
        return any(row[1] == col for row in cur.fetchall())

    if _has_col("users", "id") and not _has_col("users", "is_admin"):
        cur.execute("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0")
        print("[迁移] users 表增加 is_admin 列")
    if _has_col("messages", "id") and not _has_col("messages", "msg_type"):
        cur.execute("ALTER TABLE messages ADD COLUMN msg_type VARCHAR(20) DEFAULT 'text'")
        print("[迁移] messages 表增加 msg_type 列")
    if not _has_col("messages", "file_name"):
        cur.execute("ALTER TABLE messages ADD COLUMN file_name VARCHAR(256)")
        cur.execute("ALTER TABLE messages ADD COLUMN file_path VARCHAR(512)")
        cur.execute("ALTER TABLE messages ADD COLUMN file_size INTEGER")
        print("[迁移] messages 表增加文件列")

    conn.commit()
    conn.close()

# ─── 模型 ──────────────────────────────────────────────────


class User(UserMixin, db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    avatar = db.Column(db.String(300), default="😊")
    is_admin = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=cst_now)

    sent_messages = db.relationship(
        "Message", foreign_keys="Message.sender_id", backref="sender", lazy="dynamic"
    )
    received_messages = db.relationship(
        "Message", foreign_keys="Message.receiver_id", backref="receiver", lazy="dynamic"
    )

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def avatar_url(self):
        """返回头像 URL"""
        if not self.avatar or len(self.avatar) <= 3:
            return None  # emoji，不用 URL
        return f"/static/uploads/avatars/{self.avatar}"

    def get_friends(self):
        accepted = Friend.query.filter(
            ((Friend.user_id == self.id) | (Friend.friend_id == self.id)),
            Friend.status == "accepted",
        ).all()
        friend_ids = set()
        for f in accepted:
            friend_ids.add(f.friend_id if f.user_id == self.id else f.user_id)
        return User.query.filter(User.id.in_(friend_ids)).order_by(User.username).all() if friend_ids else []

    def is_friend_with(self, other_id):
        f = Friend.query.filter(
            ((Friend.user_id == self.id) & (Friend.friend_id == other_id)) |
            ((Friend.user_id == other_id) & (Friend.friend_id == self.id)),
            Friend.status == "accepted",
        ).first()
        return f is not None


class Message(db.Model):
    __tablename__ = "messages"
    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    content = db.Column(db.Text, nullable=True)
    msg_type = db.Column(db.String(20), default="text")  # text / file
    file_name = db.Column(db.String(256), nullable=True)
    file_path = db.Column(db.String(512), nullable=True)
    file_size = db.Column(db.Integer, nullable=True)
    timestamp = db.Column(db.DateTime, default=cst_now, index=True)
    is_read = db.Column(db.Boolean, default=False)


class Friend(db.Model):
    __tablename__ = "friends"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    friend_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    status = db.Column(db.String(20), default="pending")
    created_at = db.Column(db.DateTime, default=cst_now)

    requester = db.relationship("User", foreign_keys=[user_id], backref="sent_requests")
    target = db.relationship("User", foreign_keys=[friend_id], backref="received_requests")


# ─── 登录管理 ──────────────────────────────────────────────


@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))


online_sessions: dict[str, int] = {}

# ─── 静态文件 ──────────────────────────────────────────────


@app.route("/static/uploads/<path:subpath>")
def uploaded_file(subpath):
    return send_from_directory(UPLOAD_DIR, subpath)


# ─── 路由 ──────────────────────────────────────────────────


@app.route("/")
def index():
    if current_user.is_authenticated:
        return redirect(url_for("chat"))
    return redirect(url_for("login"))


@app.route("/login", methods=["GET", "POST"])
def login():
    if current_user.is_authenticated:
        return redirect(url_for("chat"))
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")
        user = User.query.filter_by(username=username).first()
        if user and user.check_password(password):
            login_user(user, remember=True)
            flash("登录成功！", "success")
            next_page = request.args.get("next")
            return redirect(next_page or url_for("chat"))
        flash("用户名或密码错误。", "danger")
    return render_template("index.html", page="login")


@app.route("/register", methods=["GET", "POST"])
def register():
    if current_user.is_authenticated:
        return redirect(url_for("chat"))
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")
        confirm = request.form.get("confirm", "")
        if not username or not password:
            flash("用户名和密码不能为空。", "danger")
        elif len(username) < 2 or len(username) > 50:
            flash("用户名长度应在 2~50 个字符之间。", "danger")
        elif len(password) < 4:
            flash("密码长度至少 4 位。", "danger")
        elif password != confirm:
            flash("两次输入的密码不一致。", "danger")
        elif username.lower() == "admin":
            flash("该用户名不可用。", "danger")
        elif User.query.filter_by(username=username).first():
            flash("该用户名已被注册。", "danger")
        else:
            user = User(username=username)
            user.set_password(password)
            db.session.add(user)
            db.session.commit()
            flash("注册成功，请登录！", "success")
            return redirect(url_for("login"))
    return render_template("index.html", page="register")


@app.route("/logout")
@login_required
def logout():
    logout_user()
    flash("已退出登录。", "info")
    return redirect(url_for("login"))


@app.route("/chat")
@login_required
def chat():
    return render_template("chat.html")


# ─── 上传 API ──────────────────────────────────────────────


@app.route("/api/upload_avatar", methods=["POST"])
@login_required
def api_upload_avatar():
    f = request.files.get("file")
    if not f or not f.filename:
        return jsonify({"error": "未选择文件"}), 400

    ext = f.filename.rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_IMG:
        return jsonify({"error": f"仅支持: {', '.join(ALLOWED_IMG)}"}), 400

    # 删除旧头像
    if current_user.avatar and len(current_user.avatar) > 3:
        old_path = os.path.join(AVATAR_DIR, current_user.avatar)
        if os.path.exists(old_path):
            os.remove(old_path)

    filename = f"u{current_user.id}_{uuid.uuid4().hex[:8]}.{ext}"
    f.save(os.path.join(AVATAR_DIR, filename))
    current_user.avatar = filename
    db.session.commit()

    return jsonify({"ok": True, "avatar_url": f"/static/uploads/avatars/{filename}"})


@app.route("/api/upload_file", methods=["POST"])
@login_required
def api_upload_file():
    f = request.files.get("file")
    if not f or not f.filename:
        return jsonify({"error": "未选择文件"}), 400

    orig_name = secure_filename(f.filename)
    ext = orig_name.rsplit(".", 1)[-1] if "." in orig_name else ""
    store_name = f"{uuid.uuid4().hex}{'.' + ext if ext else ''}"
    file_path = os.path.join(FILE_DIR, store_name)
    f.save(file_path)
    file_size = os.path.getsize(file_path)

    return jsonify({
        "ok": True,
        "file_name": orig_name,
        "file_path": store_name,
        "file_size": file_size,
    })


# ─── 好友 API ──────────────────────────────────────────────


@app.route("/api/friends")
@login_required
def api_friends():
    online_ids = set(online_sessions.values())
    friends = current_user.get_friends()
    result = []
    for u in friends:
        result.append({
            "id": u.id,
            "username": u.username,
            "avatar": u.avatar,
            "avatar_url": u.avatar_url(),
            "online": u.id in online_ids,
            "is_admin": u.is_admin,
        })
    return jsonify(result)


@app.route("/api/search_users")
@login_required
def api_search_users():
    q = request.args.get("q", "").strip()
    if not q or len(q) < 1:
        return jsonify([])

    friends = current_user.get_friends()
    friend_ids = {f.id for f in friends}
    friend_ids.add(current_user.id)

    pending_sent = Friend.query.filter(
        Friend.user_id == current_user.id, Friend.status == "pending"
    ).all()
    pending_sent_ids = {f.friend_id for f in pending_sent}

    pending_rcvd = Friend.query.filter(
        Friend.friend_id == current_user.id, Friend.status == "pending"
    ).all()
    pending_rcvd_ids = {f.user_id for f in pending_rcvd}

    exclude_ids = friend_ids | pending_sent_ids | pending_rcvd_ids

    users = User.query.filter(
        User.username.contains(q),
        User.is_admin == False,
        ~User.id.in_(exclude_ids),
    ).limit(20).all()

    return jsonify([{
        "id": u.id,
        "username": u.username,
        "avatar": u.avatar,
        "avatar_url": u.avatar_url(),
    } for u in users])


@app.route("/api/friend_requests")
@login_required
def api_friend_requests():
    requests = Friend.query.filter(
        Friend.friend_id == current_user.id,
        Friend.status == "pending",
    ).order_by(Friend.created_at.desc()).all()

    result = []
    for r in requests:
        requester = db.session.get(User, r.user_id)
        if requester:
            result.append({
                "id": r.id,
                "user_id": requester.id,
                "username": requester.username,
                "avatar": requester.avatar,
                "avatar_url": requester.avatar_url(),
            })
    return jsonify(result)


@app.route("/api/friends/request", methods=["POST"])
@login_required
def api_send_friend_request():
    data = request.get_json()
    target_id = int(data.get("user_id", 0))
    if not target_id or target_id == current_user.id:
        return jsonify({"error": "无效的用户"}), 400

    target = db.session.get(User, target_id)
    if not target:
        return jsonify({"error": "用户不存在"}), 404

    if current_user.is_friend_with(target_id):
        return jsonify({"error": "已经是好友了"}), 400

    existing = Friend.query.filter(
        ((Friend.user_id == current_user.id) & (Friend.friend_id == target_id)) |
        ((Friend.user_id == target_id) & (Friend.friend_id == current_user.id)),
        Friend.status.in_(["pending"]),
    ).first()
    if existing:
        return jsonify({"error": "已有待处理的好友请求"}), 400

    req = Friend(user_id=current_user.id, friend_id=target_id, status="pending")
    db.session.add(req)
    db.session.commit()

    socketio.emit("friend_request_received", {
        "id": req.id,
        "user_id": current_user.id,
        "username": current_user.username,
        "avatar": current_user.avatar,
        "avatar_url": current_user.avatar_url(),
    }, room=f"user_{target_id}")

    return jsonify({"ok": True})


@app.route("/api/friends/accept", methods=["POST"])
@login_required
def api_accept_friend_request():
    data = request.get_json()
    req_id = int(data.get("request_id", 0))
    req = Friend.query.filter_by(id=req_id, friend_id=current_user.id, status="pending").first()
    if not req:
        return jsonify({"error": "请求不存在"}), 404

    req.status = "accepted"
    db.session.commit()

    requester = db.session.get(User, req.user_id)

    socketio.emit("friend_accepted", {
        "user_id": current_user.id,
        "username": current_user.username,
        "avatar": current_user.avatar,
        "avatar_url": current_user.avatar_url(),
    }, room=f"user_{req.user_id}")

    return jsonify({
        "ok": True,
        "friend": {
            "id": requester.id,
            "username": requester.username,
            "avatar": requester.avatar,
            "avatar_url": requester.avatar_url(),
            "online": requester.id in online_sessions,
            "is_admin": requester.is_admin,
        },
    })


@app.route("/api/friends/reject", methods=["POST"])
@login_required
def api_reject_friend_request():
    data = request.get_json()
    req_id = int(data.get("request_id", 0))
    req = Friend.query.filter_by(id=req_id, friend_id=current_user.id, status="pending").first()
    if not req:
        return jsonify({"error": "请求不存在"}), 404

    req.status = "rejected"
    db.session.commit()
    return jsonify({"ok": True})


@app.route("/api/friends/delete", methods=["POST"])
@login_required
def api_delete_friend():
    """删除好友"""
    data = request.get_json()
    friend_id = int(data.get("user_id", 0))
    if not friend_id:
        return jsonify({"error": "无效的用户"}), 400

    # 找到两个人的好友记录（任一方向、已接受的）
    f = Friend.query.filter(
        ((Friend.user_id == current_user.id) & (Friend.friend_id == friend_id)) |
        ((Friend.user_id == friend_id) & (Friend.friend_id == current_user.id)),
        Friend.status == "accepted",
    ).first()
    if not f:
        return jsonify({"error": "不是好友"}), 404

    db.session.delete(f)
    db.session.commit()

    # 通知对方
    socketio.emit("friend_deleted", {
        "user_id": current_user.id,
        "username": current_user.username,
    }, room=f"user_{friend_id}")

    return jsonify({"ok": True})


# ─── 消息 API ──────────────────────────────────────────────


@app.route("/api/messages/<int:other_id>")
@login_required
def api_messages(other_id):
    if not current_user.is_friend_with(other_id):
        return jsonify({"error": "不是好友"}), 403

    uid = current_user.id
    msgs = Message.query.filter(
        ((Message.sender_id == uid) & (Message.receiver_id == other_id)) |
        ((Message.sender_id == other_id) & (Message.receiver_id == uid))
    ).order_by(Message.timestamp.asc()).limit(200).all()

    unread = [m for m in msgs if m.receiver_id == uid and not m.is_read]
    for m in unread:
        m.is_read = True
    if unread:
        db.session.commit()

    return jsonify([_msg_to_json(m) for m in msgs])


@app.route("/api/unread")
@login_required
def api_unread():
    from sqlalchemy import func
    rows = (
        db.session.query(Message.sender_id, func.count(Message.id))
        .filter(
            Message.receiver_id == current_user.id,
            Message.is_read == False,
        )
        .group_by(Message.sender_id)
        .all()
    )
    return jsonify({str(uid): count for uid, count in rows})


# ─── 管理员 API ────────────────────────────────────────────


@app.route("/api/admin/users")
@login_required
def api_admin_users():
    if not current_user.is_admin:
        return jsonify({"error": "无权限"}), 403
    users = User.query.filter(User.id != current_user.id).order_by(User.username).all()
    online_ids = set(online_sessions.values())
    return jsonify([{
        "id": u.id,
        "username": u.username,
        "avatar": u.avatar,
        "avatar_url": u.avatar_url(),
        "online": u.id in online_ids,
        "is_admin": u.is_admin,
        "created_at": u.created_at.strftime("%Y-%m-%d %H:%M") if u.created_at else "",
    } for u in users])


@app.route("/api/admin/conversation/<int:user_a>/<int:user_b>")
@login_required
def api_admin_conversation(user_a, user_b):
    """管理员查看两个用户之间的聊天记录（不标记已读，不留痕迹）"""
    if not current_user.is_admin:
        return jsonify({"error": "无权限"}), 403

    msgs = Message.query.filter(
        ((Message.sender_id == user_a) & (Message.receiver_id == user_b)) |
        ((Message.sender_id == user_b) & (Message.receiver_id == user_a))
    ).order_by(Message.timestamp.asc()).limit(500).all()

    # 不标记 is_read — 不留痕迹
    return jsonify([_msg_to_json(m) for m in msgs])


@app.route("/api/admin/status")
@login_required
def api_admin_status():
    """服务器状态（管理员可见）"""
    if not current_user.is_admin:
        return jsonify({"error": "无权限"}), 403

    import time as _time

    # 在线用户数
    online_count = len(set(online_sessions.values()))

    # 总用户数 / 总消息数
    total_users = User.query.count()
    total_messages = Message.query.count()

    # 启动时间
    uptime_seconds = int(_time.time() - _start_time) if _start_time else 0

    # CPU / 内存 / 磁盘
    cpu_pct = 0
    mem_used = 0
    mem_total = 0
    disk_used = 0
    disk_total = 0

    try:
        if sys.platform == "win32":
            import ctypes
            class MEMORYSTATUSEX(ctypes.Structure):
                _fields_ = [("dwLength", ctypes.c_ulong), ("dwMemoryLoad", ctypes.c_ulong),
                            ("ullTotalPhys", ctypes.c_ulonglong), ("ullAvailPhys", ctypes.c_ulonglong),
                            ("ullTotalPageFile", ctypes.c_ulonglong), ("ullAvailPageFile", ctypes.c_ulonglong),
                            ("ullTotalVirtual", ctypes.c_ulonglong), ("ullAvailVirtual", ctypes.c_ulonglong)]
            m = MEMORYSTATUSEX()
            m.dwLength = ctypes.sizeof(MEMORYSTATUSEX)
            ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(m))
            mem_total = m.ullTotalPhys // (1024 * 1024)
            mem_used = (m.ullTotalPhys - m.ullAvailPhys) // (1024 * 1024)
            cpu_pct = 0  # Windows CPU 太复杂，暂时跳过
            disk_used = 0  # 简化
        else:
            # Linux — 读取 /proc
            try:
                with open("/proc/stat") as f:
                    parts = f.readline().split()
                    idle = int(parts[4])
                    total = sum(int(x) for x in parts[1:])
                # 一秒后再读一次
                _time.sleep(0.15)
                with open("/proc/stat") as f:
                    parts2 = f.readline().split()
                    idle2 = int(parts2[4])
                    total2 = sum(int(x) for x in parts2[1:])
                idle_delta = idle2 - idle
                total_delta = total2 - total
                cpu_pct = round((1 - idle_delta / total_delta) * 100, 1) if total_delta > 0 else 0
            except Exception:
                cpu_pct = 0

            try:
                with open("/proc/meminfo") as f:
                    lines = f.readlines()
                def _kb(line):
                    return int("".join(c for c in line.split(":")[1] if c.isdigit()))
                mem_total = _kb(lines[0]) // 1024
                mem_avail = _kb(lines[2]) // 1024
                mem_used = mem_total - mem_avail
            except Exception:
                pass

            try:
                st = os.statvfs("/")
                disk_total = (st.f_frsize * st.f_blocks) // (1024**3)
                disk_used = (st.f_frsize * (st.f_blocks - st.f_bavail)) // (1024**3)
            except Exception:
                pass
    except Exception:
        pass

    return jsonify({
        "online_users": online_count,
        "total_users": total_users,
        "total_messages": total_messages,
        "uptime_seconds": uptime_seconds,
        "cpu_percent": cpu_pct,
        "memory_used_mb": mem_used,
        "memory_total_mb": mem_total,
        "disk_used_gb": disk_used,
        "disk_total_gb": disk_total,
    })


def _msg_to_json(m):
    """统一的消息序列化"""
    sender = db.session.get(User, m.sender_id)
    return {
        "id": m.id,
        "sender_id": m.sender_id,
        "sender_name": sender.username if sender else "?",
        "receiver_id": m.receiver_id,
        "content": m.content or "",
        "msg_type": m.msg_type or "text",
        "file_name": m.file_name,
        "file_path": m.file_path,
        "file_size": m.file_size,
        "timestamp": m.timestamp.strftime("%H:%M"),
        "is_read": m.is_read,
    }


# ─── SocketIO 事件 ─────────────────────────────────────────


@socketio.on("connect")
def handle_connect():
    if current_user.is_authenticated:
        online_sessions[request.sid] = current_user.id
        join_room(f"user_{current_user.id}")
        emit("user_status_change", broadcast=True, include_self=True)


@socketio.on("disconnect")
def handle_disconnect():
    uid = online_sessions.pop(request.sid, None)
    if uid:
        emit("user_status_change", broadcast=True, include_self=True)


@socketio.on("private_message")
def handle_private_message(data):
    if not current_user.is_authenticated:
        return
    receiver_id = int(data.get("receiver_id", 0))
    msg_type = data.get("msg_type", "text")
    content = (data.get("content", "") or "").strip()

    if not receiver_id:
        return
    if msg_type == "text" and not content:
        return
    if not current_user.is_friend_with(receiver_id):
        return

    msg = Message(
        sender_id=current_user.id,
        receiver_id=receiver_id,
        content=content,
        msg_type=msg_type,
        file_name=data.get("file_name"),
        file_path=data.get("file_path"),
        file_size=data.get("file_size"),
    )
    db.session.add(msg)
    db.session.commit()

    payload = _msg_to_json(msg)
    emit("new_message", payload, room=f"user_{current_user.id}")
    emit("new_message", payload, room=f"user_{receiver_id}")


@socketio.on("typing")
def handle_typing(data):
    if not current_user.is_authenticated:
        return
    receiver_id = int(data.get("receiver_id", 0))
    emit("typing", {
        "user_id": current_user.id,
        "username": current_user.username,
        "typing": data.get("typing", False),
    }, room=f"user_{receiver_id}")


# ─── 启动 ──────────────────────────────────────────────────

def main():
    global _start_time
    _start_time = __import__("time").time()

    if sys.stdout.encoding != "utf-8":
        try:
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

    # 数据库迁移（给旧数据库补列，不丢数据）
    _ensure_columns()

    with app.app_context():
        db.create_all()
        # 管理员：不存在则创建，已存在则修复 is_admin 标志
        admin = User.query.filter_by(username="admin").first()
        if not admin:
            admin = User(username="admin", is_admin=True)
            admin.set_password("admin123")
            db.session.add(admin)
            db.session.commit()
            print("[OK] Admin created: admin / admin123")
        else:
            if not admin.is_admin:
                admin.is_admin = True
                db.session.commit()
                print("[OK] Admin fixed: is_admin=True")
            else:
                print("[OK] Admin exists")
        print("[OK] Database ready")

    port = int(os.environ.get("PORT", 5000))
    print(f"[OK] 聊天服务已启动 -> http://localhost:{port}")
    socketio.run(app, host="0.0.0.0", port=port, debug=False, allow_unsafe_werkzeug=True)


if __name__ == "__main__":
    main()

/* ─── 全局状态 ──────────────────────────────────────────── */
const socket = io();
let friends = [];
let activeChatId = null;
let unreadMap = {};
let currentTab = 'friends';
let pendingFile = null;  // 待发送的文件信息

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const contactList = $('#contactList');
const searchInput = $('#searchInput');
const addSearchInput = $('#addSearchInput');
const searchResults = $('#searchResults');
const requestList = $('#requestList');
const requestBadge = $('#requestBadge');
const chatEmpty = $('#chatEmpty');
const chatWindow = $('#chatWindow');
const chatAvatar = $('#chatAvatar');
const chatName = $('#chatName');
const chatStatus = $('#chatStatus');
const messagesList = $('#messagesList');
const messageForm = $('#messageForm');
const messageInput = $('#messageInput');
const typingIndicator = $('#typingIndicator');
const attachBtn = $('#attachBtn');
const chatFileInput = $('#chatFileInput');
const filePreview = $('#filePreview');
const filePreviewName = $('#filePreviewName');
const filePreviewCancel = $('#filePreviewCancel');
const avatarFileInput = $('#avatarFileInput');
const myAvatar = $('#myAvatar');

// ─── 侧边栏折叠 ────────────────────────────────────────────

const sidebar = $('#sidebar');
$('#collapseSidebarBtn').addEventListener('click', () => sidebar.classList.add('collapsed'));
$('#expandSidebarBtn').addEventListener('click', () => sidebar.classList.remove('collapsed'));

// ─── 设置面板 ──────────────────────────────────────────────

// 翻译表
const T = {
    zh: {settings:'⚙ 设置',themeLabel:'主题 Theme',langLabel:'语言 Language',friends:'好友',addFriend:'添加好友',searchFriends:'搜索好友…',searchUser:'输入用户名搜索…',noFriends:'没有好友',online:'在线',offline:'离线',admin:'管理员',noPending:'暂无好友请求',add:'添加',sent:'已发送',accept:'接受',reject:'拒绝',noUsers:'未找到用户',requests:'好友请求',noMsgs:'还没有消息',addFriendFirst:'请先添加对方为好友',typing:'对方正在输入…',inputPlaceholder:'输入消息，按 Enter 发送…',send:'发送',welcome:'欢迎使用个人聊天',welcomeDesc:'从左侧选择一个好友',noFriendsHint:'还没有好友？点击「添加好友」',deleteConfirm:'确定要删除好友',selectTwoUsers:'选两个用户查看对话',conversation:'聊天记录',back:'← 返回',adminPanel:'🔍 管理面板',loading:'加载中…',loadUsers:'加载用户列表…',failed:'失败',retry:'重试',uploadFailed:'上传失败',changeAvatar:'点击更换头像',collapse:'收起',expand:'展开',exit:'退出',sendFile:'发送文件',cpu:'CPU',ram:'内存',disk:'磁盘',uptime:'运行',onlineStats:'在线',users:'用户',msgs:'消息'},
    en: {settings:'⚙ Settings',themeLabel:'Theme',langLabel:'Language',friends:'Friends',addFriend:'Add',searchFriends:'Search friends…',searchUser:'Search username…',noFriends:'No friends',online:'Online',offline:'Offline',admin:'Admin',noPending:'No pending',add:'Add',sent:'Sent',accept:'Accept',reject:'Reject',noUsers:'No users',requests:'Requests',noMsgs:'No messages',addFriendFirst:'Add friend first',typing:'Typing…',inputPlaceholder:'Type a message…',send:'Send',welcome:'Welcome to Chat',welcomeDesc:'Select a friend to chat',noFriendsHint:'No friends? Go to Add tab',deleteConfirm:'Delete friend',selectTwoUsers:'Select user A, then user B',conversation:'Conversation',back:'← Back',adminPanel:'🔍 Admin Panel',loading:'Loading…',loadUsers:'Loading users…',failed:'Failed',retry:'Retry',uploadFailed:'Upload failed',changeAvatar:'Change avatar',collapse:'Collapse',expand:'Expand',exit:'Exit',sendFile:'Send file',cpu:'CPU',ram:'RAM',disk:'Disk',uptime:'Uptime',onlineStats:'Online',users:'Users',msgs:'Msgs'},
    ja: {settings:'⚙ 設定',themeLabel:'テーマ',langLabel:'言語',friends:'友達',addFriend:'追加',searchFriends:'友達検索…',searchUser:'ユーザー検索…',noFriends:'友達なし',online:'オンライン',offline:'オフライン',admin:'管理者',noPending:'保留なし',add:'追加',sent:'送信済',accept:'承認',reject:'拒否',noUsers:'なし',requests:'リクエスト',noMsgs:'メッセージなし',addFriendFirst:'友達追加が必要',typing:'入力中…',inputPlaceholder:'メッセージ入力…',send:'送信',welcome:'チャットへようこそ',welcomeDesc:'友達を選んで会話',noFriendsHint:'友達がいない？追加タブへ',deleteConfirm:'友達削除',selectTwoUsers:'ユーザーA、Bを選択',conversation:'会話',back:'← 戻る',adminPanel:'🔍 管理',loading:'読込中…',loadUsers:'ユーザー読込…',failed:'失敗',retry:'再試行',uploadFailed:'失敗',changeAvatar:'画像変更',collapse:'折畳',expand:'展開',exit:'終了',sendFile:'ファイル送信',cpu:'CPU',ram:'メモリ',disk:'ディスク',uptime:'稼働',onlineStats:'オンライン',users:'ユーザー',msgs:'メッセージ'},
    ko: {settings:'⚙ 설정',themeLabel:'테마',langLabel:'언어',friends:'친구',addFriend:'추가',searchFriends:'친구 검색…',searchUser:'사용자 검색…',noFriends:'친구 없음',online:'온라인',offline:'오프라인',admin:'관리자',noPending:'대기 없음',add:'추가',sent:'전송됨',accept:'수락',reject:'거절',noUsers:'없음',requests:'요청',noMsgs:'메시지 없음',addFriendFirst:'친구 추가 필요',typing:'입력 중…',inputPlaceholder:'메시지 입력…',send:'전송',welcome:'채팅 환영합니다',welcomeDesc:'친구 선택 후 대화',noFriendsHint:'친구가 없나요? 추가 탭으로',deleteConfirm:'친구 삭제',selectTwoUsers:'사용자 A, B 선택',conversation:'대화',back:'← 뒤로',adminPanel:'🔍 관리',loading:'로딩 중…',loadUsers:'사용자 로딩…',failed:'실패',retry:'재시도',uploadFailed:'실패',changeAvatar:'아바타 변경',collapse:'접기',expand:'펴기',exit:'종료',sendFile:'파일 전송',cpu:'CPU',ram:'메모리',disk:'디스크',uptime:'가동',onlineStats:'온라인',users:'사용자',msgs:'메시지'},
    ru: {settings:'⚙ Настройки',themeLabel:'Тема',langLabel:'Язык',friends:'Друзья',addFriend:'Добавить',searchFriends:'Поиск…',searchUser:'Поиск…',noFriends:'Нет друзей',online:'Онлайн',offline:'Офлайн',admin:'Админ',noPending:'Нет заявок',add:'Добавить',sent:'Отправлено',accept:'Принять',reject:'Отклонить',noUsers:'Нет',requests:'Заявки',noMsgs:'Нет сообщений',addFriendFirst:'Добавьте друга',typing:'Печатает…',inputPlaceholder:'Сообщение…',send:'Отправить',welcome:'Добро пожаловать',welcomeDesc:'Выберите друга',noFriendsHint:'Нет друзей? Добавить',deleteConfirm:'Удалить друга',selectTwoUsers:'Выберите А, затем Б',conversation:'Диалог',back:'← Назад',adminPanel:'🔍 Админ',loading:'Загрузка…',loadUsers:'Загрузка…',failed:'Ошибка',retry:'Повтор',uploadFailed:'Ошибка',changeAvatar:'Аватар',collapse:'Свернуть',expand:'Развернуть',exit:'Выход',sendFile:'Файл',cpu:'ЦП',ram:'ОЗУ',disk:'Диск',uptime:'Аптайм',onlineStats:'Онлайн',users:'Польз.',msgs:'Сообщ.'},
    fr: {settings:'⚙ Paramètres',themeLabel:'Thème',langLabel:'Langue',friends:'Amis',addFriend:'Ajouter',searchFriends:'Rechercher…',searchUser:'Chercher…',noFriends:'Pas d\'amis',online:'En ligne',offline:'Hors ligne',admin:'Admin',noPending:'Aucune',add:'Ajouter',sent:'Envoyé',accept:'Accepter',reject:'Refuser',noUsers:'Aucun',requests:'Demandes',noMsgs:'Pas de messages',addFriendFirst:'Ajouter ami',typing:'Écrit…',inputPlaceholder:'Message…',send:'Envoyer',welcome:'Bienvenue',welcomeDesc:'Choisir un ami',noFriendsHint:'Ajouter dans l\'onglet Ajouter',deleteConfirm:'Supprimer ami',selectTwoUsers:'Choisir A, puis B',conversation:'Conversation',back:'← Retour',adminPanel:'🔍 Admin',loading:'Chargement…',loadUsers:'Chargement…',failed:'Échec',retry:'Réessayer',uploadFailed:'Échec',changeAvatar:'Avatar',collapse:'Réduire',expand:'Agrandir',exit:'Sortir',sendFile:'Fichier',cpu:'CPU',ram:'RAM',disk:'Disque',uptime:'Actif',onlineStats:'En ligne',users:'Util.',msgs:'Msgs'},
    es: {settings:'⚙ Ajustes',themeLabel:'Tema',langLabel:'Idioma',friends:'Amigos',addFriend:'Agregar',searchFriends:'Buscar…',searchUser:'Buscar…',noFriends:'Sin amigos',online:'En línea',offline:'Desconectado',admin:'Admin',noPending:'Sin pendientes',add:'Agregar',sent:'Enviado',accept:'Aceptar',reject:'Rechazar',noUsers:'Ninguno',requests:'Solicitudes',noMsgs:'Sin mensajes',addFriendFirst:'Agregar amigo',typing:'Escribiendo…',inputPlaceholder:'Mensaje…',send:'Enviar',welcome:'Bienvenido',welcomeDesc:'Elige un amigo',noFriendsHint:'¿Sin amigos? Agregar',deleteConfirm:'Eliminar amigo',selectTwoUsers:'Elige A, luego B',conversation:'Conversación',back:'← Volver',adminPanel:'🔍 Admin',loading:'Cargando…',loadUsers:'Cargando…',failed:'Falló',retry:'Reintentar',uploadFailed:'Falló',changeAvatar:'Avatar',collapse:'Colapsar',expand:'Expandir',exit:'Salir',sendFile:'Archivo',cpu:'CPU',ram:'RAM',disk:'Disco',uptime:'Activo',onlineStats:'En línea',users:'Usuarios',msgs:'Mensajes'},
    de: {settings:'⚙ Einstellungen',themeLabel:'Thema',langLabel:'Sprache',friends:'Freunde',addFriend:'Hinzufügen',searchFriends:'Suchen…',searchUser:'Suchen…',noFriends:'Keine Freunde',online:'Online',offline:'Offline',admin:'Admin',noPending:'Keine',add:'Hinzufügen',sent:'Gesendet',accept:'Annehmen',reject:'Ablehnen',noUsers:'Keine',requests:'Anfragen',noMsgs:'Keine Nachrichten',addFriendFirst:'Freund hinzufügen',typing:'Tippt…',inputPlaceholder:'Nachricht…',send:'Senden',welcome:'Willkommen',welcomeDesc:'Freund wählen',noFriendsHint:'Keine Freunde? Hinzufügen',deleteConfirm:'Freund löschen',selectTwoUsers:'A, dann B wählen',conversation:'Konversation',back:'← Zurück',adminPanel:'🔍 Admin',loading:'Lädt…',loadUsers:'Lädt…',failed:'Fehler',retry:'Wiederholen',uploadFailed:'Fehler',changeAvatar:'Avatar',collapse:'Einklappen',expand:'Ausklappen',exit:'Beenden',sendFile:'Datei',cpu:'CPU',ram:'RAM',disk:'Festplatte',uptime:'Laufzeit',onlineStats:'Online',users:'Benutzer',msgs:'Nachr.'},
    pt: {settings:'⚙ Config.',themeLabel:'Tema',langLabel:'Idioma',friends:'Amigos',addFriend:'Adicionar',searchFriends:'Buscar…',searchUser:'Buscar…',noFriends:'Sem amigos',online:'Online',offline:'Offline',admin:'Admin',noPending:'Nenhum',add:'Adicionar',sent:'Enviado',accept:'Aceitar',reject:'Rejeitar',noUsers:'Nenhum',requests:'Solicitações',noMsgs:'Sem mensagens',addFriendFirst:'Adicionar amigo',typing:'Digitando…',inputPlaceholder:'Mensagem…',send:'Enviar',welcome:'Bem-vindo',welcomeDesc:'Escolha um amigo',noFriendsHint:'Adicionar na aba Adicionar',deleteConfirm:'Remover amigo',selectTwoUsers:'Escolha A, depois B',conversation:'Conversa',back:'← Voltar',adminPanel:'🔍 Admin',loading:'Carregando…',loadUsers:'Carregando…',failed:'Falhou',retry:'Tentar',uploadFailed:'Falhou',changeAvatar:'Avatar',collapse:'Recolher',expand:'Expandir',exit:'Sair',sendFile:'Arquivo',cpu:'CPU',ram:'RAM',disk:'Disco',uptime:'Ativo',onlineStats:'Online',users:'Usuários',msgs:'Msgs'},
    ar: {settings:'⚙ الإعدادات',themeLabel:'السمة',langLabel:'اللغة',friends:'الأصدقاء',addFriend:'إضافة',searchFriends:'بحث…',searchUser:'بحث…',noFriends:'لا أصدقاء',online:'متصل',offline:'غير متصل',admin:'مشرف',noPending:'لا طلبات',add:'إضافة',sent:'تم',accept:'قبول',reject:'رفض',noUsers:'لا يوجد',requests:'طلبات',noMsgs:'لا رسائل',addFriendFirst:'أضف صديقاً',typing:'يكتب…',inputPlaceholder:'رسالة…',send:'إرسال',welcome:'مرحباً',welcomeDesc:'اختر صديقاً',noFriendsHint:'لا أصدقاء؟ أضف',deleteConfirm:'حذف',selectTwoUsers:'اختر أ، ثم ب',conversation:'محادثة',back:'← رجوع',adminPanel:'🔍 مشرف',loading:'تحميل…',loadUsers:'تحميل…',failed:'فشل',retry:'إعادة',uploadFailed:'فشل',changeAvatar:'صورة',collapse:'طي',expand:'توسيع',exit:'خروج',sendFile:'ملف',cpu:'معالج',ram:'ذاكرة',disk:'قرص',uptime:'مدة',onlineStats:'متصل',users:'مستخدم',msgs:'رسائل'},
    it: {settings:'⚙ Impostazioni',themeLabel:'Tema',langLabel:'Lingua',friends:'Amici',addFriend:'Aggiungi',searchFriends:'Cerca…',searchUser:'Cerca…',noFriends:'Nessun amico',online:'Online',offline:'Offline',admin:'Admin',noPending:'Nessuna',add:'Aggiungi',sent:'Inviato',accept:'Accetta',reject:'Rifiuta',noUsers:'Nessuno',requests:'Richieste',noMsgs:'Nessun msg',addFriendFirst:'Aggiungi amico',typing:'Scrive…',inputPlaceholder:'Messaggio…',send:'Invia',welcome:'Benvenuto',welcomeDesc:'Scegli un amico',noFriendsHint:'Aggiungi nella scheda',deleteConfirm:'Elimina amico',selectTwoUsers:'Scegli A, poi B',conversation:'Conversazione',back:'← Indietro',adminPanel:'🔍 Admin',loading:'Caricamento…',loadUsers:'Caricamento…',failed:'Fallito',retry:'Riprova',uploadFailed:'Fallito',changeAvatar:'Avatar',collapse:'Riduci',expand:'Espandi',exit:'Esci',sendFile:'File',cpu:'CPU',ram:'RAM',disk:'Disco',uptime:'Attivo',onlineStats:'Online',users:'Utenti',msgs:'Msg'},
    tr: {settings:'⚙ Ayarlar',themeLabel:'Tema',langLabel:'Dil',friends:'Arkadaşlar',addFriend:'Ekle',searchFriends:'Ara…',searchUser:'Ara…',noFriends:'Arkadaş yok',online:'Çevrimiçi',offline:'Çevrimdışı',admin:'Yönetici',noPending:'Bekleyen yok',add:'Ekle',sent:'Gönderildi',accept:'Kabul',reject:'Reddet',noUsers:'Yok',requests:'İstekler',noMsgs:'Mesaj yok',addFriendFirst:'Arkadaş ekle',typing:'Yazıyor…',inputPlaceholder:'Mesaj…',send:'Gönder',welcome:'Hoş geldiniz',welcomeDesc:'Arkadaş seçin',noFriendsHint:'Arkadaş ekleyin',deleteConfirm:'Arkadaşı sil',selectTwoUsers:'A, sonra B seçin',conversation:'Konuşma',back:'← Geri',adminPanel:'🔍 Yönetici',loading:'Yükleniyor…',loadUsers:'Yükleniyor…',failed:'Başarısız',retry:'Tekrar',uploadFailed:'Başarısız',changeAvatar:'Avatar',collapse:'Daralt',expand:'Genişlet',exit:'Çıkış',sendFile:'Dosya',cpu:'CPU',ram:'RAM',disk:'Disk',uptime:'Çalışma',onlineStats:'Çevrimiçi',users:'Kull.',msgs:'Msj'},
    th: {settings:'⚙ ตั้งค่า',themeLabel:'ธีม',langLabel:'ภาษา',friends:'เพื่อน',addFriend:'เพิ่ม',searchFriends:'ค้นหา…',searchUser:'ค้นหา…',noFriends:'ไม่มีเพื่อน',online:'ออนไลน์',offline:'ออฟไลน์',admin:'ผู้ดูแล',noPending:'ไม่มี',add:'เพิ่ม',sent:'ส่งแล้ว',accept:'ยอมรับ',reject:'ปฏิเสธ',noUsers:'ไม่มี',requests:'คำขอ',noMsgs:'ไม่มีข้อความ',addFriendFirst:'เพิ่มเพื่อนก่อน',typing:'พิมพ์…',inputPlaceholder:'ข้อความ…',send:'ส่ง',welcome:'ยินดีต้อนรับ',welcomeDesc:'เลือกเพื่อน',noFriendsHint:'เพิ่มเพื่อนที่แท็บเพิ่ม',deleteConfirm:'ลบเพื่อน',selectTwoUsers:'เลือก A แล้ว B',conversation:'สนทนา',back:'← กลับ',adminPanel:'🔍 ผู้ดูแล',loading:'โหลด…',loadUsers:'โหลด…',failed:'ล้มเหลว',retry:'ลองใหม่',uploadFailed:'ล้มเหลว',changeAvatar:'รูป',collapse:'ย่อ',expand:'ขยาย',exit:'ออก',sendFile:'ไฟล์',cpu:'CPU',ram:'RAM',disk:'ดิสก์',uptime:'ทำงาน',onlineStats:'ออนไลน์',users:'ผู้ใช้',msgs:'ข้อความ'},
    vi: {settings:'⚙ Cài đặt',themeLabel:'Chủ đề',langLabel:'Ngôn ngữ',friends:'Bạn bè',addFriend:'Thêm',searchFriends:'Tìm…',searchUser:'Tìm…',noFriends:'Không có bạn',online:'Trực tuyến',offline:'Ngoại tuyến',admin:'Quản trị',noPending:'Không có',add:'Thêm',sent:'Đã gửi',accept:'Chấp nhận',reject:'Từ chối',noUsers:'Không có',requests:'Yêu cầu',noMsgs:'Chưa có tin',addFriendFirst:'Thêm bạn trước',typing:'Đang nhập…',inputPlaceholder:'Tin nhắn…',send:'Gửi',welcome:'Chào mừng',welcomeDesc:'Chọn bạn để chat',noFriendsHint:'Thêm bạn ở tab Thêm',deleteConfirm:'Xóa bạn',selectTwoUsers:'Chọn A, rồi B',conversation:'Hội thoại',back:'← Quay lại',adminPanel:'🔍 Quản trị',loading:'Đang tải…',loadUsers:'Đang tải…',failed:'Thất bại',retry:'Thử lại',uploadFailed:'Thất bại',changeAvatar:'Đổi ảnh',collapse:'Thu gọn',expand:'Mở rộng',exit:'Thoát',sendFile:'Gửi file',cpu:'CPU',ram:'RAM',disk:'Ổ đĩa',uptime:'Hoạt động',onlineStats:'Online',users:'Người',msgs:'Tin'},
    id: {settings:'⚙ Pengaturan',themeLabel:'Tema',langLabel:'Bahasa',friends:'Teman',addFriend:'Tambah',searchFriends:'Cari…',searchUser:'Cari…',noFriends:'Tidak ada',online:'Online',offline:'Offline',admin:'Admin',noPending:'Tidak ada',add:'Tambah',sent:'Terkirim',accept:'Terima',reject:'Tolak',noUsers:'Tidak ada',requests:'Permintaan',noMsgs:'Belum ada',addFriendFirst:'Tambah teman',typing:'Mengetik…',inputPlaceholder:'Pesan…',send:'Kirim',welcome:'Selamat datang',welcomeDesc:'Pilih teman',noFriendsHint:'Tambah di tab Tambah',deleteConfirm:'Hapus teman',selectTwoUsers:'Pilih A, lalu B',conversation:'Percakapan',back:'← Kembali',adminPanel:'🔍 Admin',loading:'Memuat…',loadUsers:'Memuat…',failed:'Gagal',retry:'Coba lagi',uploadFailed:'Gagal',changeAvatar:'Avatar',collapse:'Lipat',expand:'Bentang',exit:'Keluar',sendFile:'File',cpu:'CPU',ram:'RAM',disk:'Disk',uptime:'Aktif',onlineStats:'Online',users:'Pengguna',msgs:'Pesan'},
    hi: {settings:'⚙ सेटिंग्स',themeLabel:'थीम',langLabel:'भाषा',friends:'मित्र',addFriend:'जोड़ें',searchFriends:'खोजें…',searchUser:'खोजें…',noFriends:'कोई नहीं',online:'ऑनलाइन',offline:'ऑफलाइन',admin:'एडमिन',noPending:'कोई नहीं',add:'जोड़ें',sent:'भेजा',accept:'स्वीकार',reject:'अस्वीकार',noUsers:'कोई नहीं',requests:'अनुरोध',noMsgs:'कोई संदेश नहीं',addFriendFirst:'मित्र जोड़ें',typing:'टाइप…',inputPlaceholder:'संदेश…',send:'भेजें',welcome:'स्वागत है',welcomeDesc:'मित्र चुनें',noFriendsHint:'जोड़ें टैब में जाएं',deleteConfirm:'मित्र हटाएं',selectTwoUsers:'A फिर B चुनें',conversation:'बातचीत',back:'← वापस',adminPanel:'🔍 एडमिन',loading:'लोड…',loadUsers:'लोड…',failed:'विफल',retry:'पुनः',uploadFailed:'विफल',changeAvatar:'अवतार',collapse:'समेटें',expand:'फैलाएं',exit:'बाहर',sendFile:'फ़ाइल',cpu:'CPU',ram:'RAM',disk:'डिस्क',uptime:'समय',onlineStats:'ऑनलाइन',users:'सदस्य',msgs:'संदेश'}
};

let lang = localStorage.getItem('chat_lang') || 'zh';
function _(key) { return (T[lang] && T[lang][key]) || key; }

function applyLanguage() {
    document.documentElement.setAttribute('lang', lang);
    // 更新设置面板
    $('#settingsTitle').textContent = _('settings');
    $('#themeLabel').textContent = _('themeLabel');
    $('#langLabel').textContent = _('langLabel');
    // 高亮当前语言选项
    $$('.lang-option').forEach(el => el.classList.toggle('active', el.dataset.lang === lang));
    // 更新标签
    $$('.s-tab').forEach(el => {
        const t = el.dataset.tab;
        if (t === 'friends') el.textContent = _('friends');
        if (t === 'add') el.textContent = _('addFriend');
    });
    // 更新搜索框
    if (searchInput) searchInput.placeholder = _('searchFriends');
    if (addSearchInput) addSearchInput.placeholder = _('searchUser');
    // 更新聊天区域
    if (messageInput) messageInput.placeholder = _('inputPlaceholder');
    const sendBtn = $('#sendBtn'); if (sendBtn) sendBtn.textContent = _('send');
    const emptyH2 = document.querySelector('.empty-content h2');
    if (emptyH2) emptyH2.textContent = _('welcome');
    const emptyP = document.querySelector('.empty-content p');
    if (emptyP) emptyP.textContent = _('welcomeDesc');
    const emptyHint = document.querySelector('.empty-hint');
    if (emptyHint) emptyHint.textContent = _('noFriendsHint');
    // 重新渲染联系人
    if (friends.length > 0) renderContacts(searchInput.value.trim());
    if (requestList) loadFriendRequests();
    // Admin panel
    const adminHeader = document.querySelector('.admin-panel-header span');
    if (adminHeader) adminHeader.textContent = _('adminPanel');
    const adminHint = document.querySelector('.admin-hint');
    if (adminHint) adminHint.textContent = _('selectTwoUsers');
    const adminConvoH = document.querySelector('.admin-convo-header span');
    if (adminConvoH && !adminConvoH.textContent.includes('↔') && !adminConvoH.textContent.includes('/')) adminConvoH.textContent = _('conversation');
    const adminBack = $('#adminConvoBack'); if (adminBack) adminBack.textContent = _('back');
    // Stats
    const statLabels = { statOnline: 'onlineStats', statUsers: 'users', statMsgs: 'msgs' };
    for (const [id, key] of Object.entries(statLabels)) {
        const el = document.getElementById(id);
        if (el && el.parentElement) {
            const span = el.parentElement.querySelector('span');
            if (span) span.textContent = _(key);
        }
    }
    // 重新渲染未读消息
    if (friends.length > 0) renderContacts(searchInput.value.trim());
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('chat_theme', theme);
    $$('.theme-option').forEach(el => el.classList.toggle('active', el.dataset.theme === theme));
}

// 设置按钮
$('#settingsBtn').addEventListener('click', () => {
    const panel = $('#settingsPanel');
    panel.classList.toggle('hidden');
    // 关闭管理员面板
    const ap = $('#adminPanel');
    if (ap && !ap.classList.contains('hidden')) ap.classList.add('hidden');
});
$('#closeSettingsBtn').addEventListener('click', () => $('#settingsPanel').classList.add('hidden'));

// 主题点击
$$('.theme-option').forEach(opt => {
    opt.addEventListener('click', () => applyTheme(opt.dataset.theme));
});

// 语言点击
$$('.lang-option').forEach(opt => {
    opt.addEventListener('click', () => {
        lang = opt.dataset.lang;
        localStorage.setItem('chat_lang', lang);
        applyLanguage();
    });
});

// 初始加载保存的设置
(function() {
    const savedTheme = localStorage.getItem('chat_theme') || 'light';
    applyTheme(savedTheme);
    applyLanguage();
})();

// ─── 侧边栏标签 ────────────────────────────────────────────

$$('.s-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        currentTab = tab.dataset.tab;
        $$('.s-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        $('#panelFriends').classList.toggle('hidden', currentTab !== 'friends');
        $('#panelAdd').classList.toggle('hidden', currentTab !== 'add');
        if (currentTab === 'add') loadFriendRequests();
    });
});

// ─── 好友列表 ────────────────────────────────────────────────

async function loadFriends() {
    try {
        const resp = await fetch('/api/friends');
        friends = await resp.json();
        renderContacts();
    } catch (err) {
        console.error('load friends failed:', err);
    }
}

function renderContacts(filter = '') {
    const keyword = filter.toLowerCase();
    const filtered = friends.filter(f => f.username.toLowerCase().includes(keyword));
    if (filtered.length === 0) {
        contactList.innerHTML = '<div class="loading-text">' + _('noFriends') + '</div>';
        return;
    }
    contactList.innerHTML = filtered.map(f => {
        const isActive = f.id === activeChatId;
        const dot = f.online ? 'online-dot' : 'offline-dot';
        const txt = f.online ? _('online') : _('offline');
        const unread = unreadMap[f.id] || 0;
        const badge = unread > 0 ? '<span class="unread-badge">' + unread + '</span>' : '';
        const av = renderAvatar(f.avatar, f.avatar_url);
        return '<div class="contact-item' + (isActive ? ' active' : '') + '" onclick="openChat(' + f.id + ')">' +
            av +
            '<div class="contact-info">' +
            '<div class="contact-name">' + escapeHtml(f.username) + (f.is_admin ? ' <span style="color:var(--danger);font-size:11px">' + _('admin') + '</span>' : '') + '</div>' +
            '<div class="contact-preview">' + txt + '</div>' +
            '</div>' +
            '<div class="contact-actions">' +
            '<button class="btn-delete-friend" title="删除好友" onclick="event.stopPropagation();deleteFriend(' + f.id + ',\'' + escapeHtml(f.username) + '\')">✕</button>' +
            '</div>' +
            '<div class="contact-meta"><span class="' + dot + '"></span>' + badge + '</div>' +
            '</div>';
    }).join('');
}

function currentUserId() { return CURRENT_USER_ID; }

// ─── 渲染头像 ────────────────────────────────────────────────

function renderAvatar(avatar, avatarUrl) {
    if (avatarUrl) {
        return '<span class="avatar"><img src="' + avatarUrl + '" class="avatar-img" alt="" onerror="this.style.display=\'none\';this.parentElement.textContent=\'😊\'"></span>';
    }
    return '<span class="avatar">' + (avatar || '😊') + '</span>';
}

// ─── 头像上传 ────────────────────────────────────────────────

$('#avatarUploadWrapper').addEventListener('click', () => {
    avatarFileInput.click();
});

avatarFileInput.addEventListener('change', async () => {
    const file = avatarFileInput.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
        const resp = await fetch('/api/upload_avatar', { method: 'POST', body: formData });
        const data = await resp.json();
        if (data.ok) {
            const url = data.avatar_url + '?t=' + Date.now();
            myAvatar.innerHTML = '<img src="' + url + '" class="avatar-img" alt="">';
            myAvatar.classList.add('has-img');
            socket.emit('typing', { receiver_id: 0, typing: false }); // trigger refresh
            loadFriends();
        } else {
            alert(data.error || _('uploadFailed'));
        }
    } catch (err) {
        alert(_('uploadFailed'));
    }
    avatarFileInput.value = '';
});

// ─── 搜索添加好友 ────────────────────────────────────────────

let searchTimer = null;
addSearchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    const q = addSearchInput.value.trim();
    if (!q) { searchResults.innerHTML = ''; searchResults.classList.remove('show'); return; }
    searchTimer = setTimeout(() => searchUsers(q), 300);
});

async function searchUsers(q) {
    try {
        const resp = await fetch('/api/search_users?q=' + encodeURIComponent(q));
        const users = await resp.json();
        searchResults.innerHTML = users.length === 0
            ? '<div class="loading-text">' + _('noUsers') + '</div>'
            : users.map(u =>
                '<div class="search-result-item">' +
                renderAvatar(u.avatar, u.avatar_url) +
                '<span class="contact-name">' + escapeHtml(u.username) + '</span>' +
                '<button class="btn btn-small btn-primary" onclick="sendFriendRequest(' + u.id + ', this)">' + _('add') + '</button>' +
                '</div>'
            ).join('');
        searchResults.classList.add('show');
    } catch (err) { console.error('search failed:', err); }
}

async function sendFriendRequest(userId, btn) {
    btn.disabled = true; btn.textContent = _('sent');
    try {
        const resp = await fetch('/api/friends/request', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId }),
        });
        const data = await resp.json();
        if (data.ok) { btn.classList.remove('btn-primary'); btn.classList.add('btn-outline'); btn.textContent = _('sent'); }
        else { btn.textContent = data.error || _('failed'); btn.disabled = false; }
    } catch (err) { btn.textContent = _('retry'); btn.disabled = false; }
}

// ─── 好友请求 ────────────────────────────────────────────────

async function loadFriendRequests() {
    try {
        const resp = await fetch('/api/friend_requests');
        renderFriendRequests(await resp.json());
    } catch (err) { console.error('requests failed:', err); }
}

function renderFriendRequests(requests) {
    if (requests.length === 0) {
        requestList.innerHTML = '<div class="loading-text" id="noRequests">' + _('noPending') + '</div>';
        requestBadge.classList.add('hidden');
    } else {
        requestBadge.textContent = requests.length; requestBadge.classList.remove('hidden');
        requestList.innerHTML = requests.map(r =>
            '<div class="request-item" id="req-' + r.id + '">' +
            renderAvatar(r.avatar, r.avatar_url) +
            '<span class="contact-name">' + escapeHtml(r.username) + '</span>' +
            '<div class="request-actions">' +
            '<button class="btn btn-small btn-accept" onclick="acceptRequest(' + r.id + ', ' + r.user_id + ')">' + _('accept') + '</button>' +
            '<button class="btn btn-small btn-reject" onclick="rejectRequest(' + r.id + ')">' + _('reject') + '</button>' +
            '</div></div>'
        ).join('');
    }
}

async function acceptRequest(reqId, userId) {
    try {
        const resp = await fetch('/api/friends/accept', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ request_id: reqId }),
        });
        const data = await resp.json();
        if (data.ok) {
            const el = document.getElementById('req-' + reqId); if (el) el.remove();
            friends.push(data.friend); renderContacts(searchInput.value.trim()); updateRequestCount();
        }
    } catch (err) { console.error('accept failed:', err); }
}

async function rejectRequest(reqId) {
    try {
        const resp = await fetch('/api/friends/reject', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ request_id: reqId }),
        });
        if ((await resp.json()).ok) {
            const el = document.getElementById('req-' + reqId); if (el) el.remove(); updateRequestCount();
        }
    } catch (err) { console.error('reject failed:', err); }
}

function updateRequestCount() {
    const remaining = requestList.querySelectorAll('.request-item').length;
    if (remaining === 0) { requestList.innerHTML = '<div class="loading-text">No pending requests</div>'; requestBadge.classList.add('hidden'); }
    else requestBadge.textContent = remaining;
}

// ─── 打开聊天 ────────────────────────────────────────────────

async function openChat(userId) {
    activeChatId = userId;
    const friend = friends.find(f => f.id === userId);
    if (!friend) return;
    chatEmpty.classList.add('hidden'); chatWindow.classList.remove('hidden');
    const av = renderAvatar(friend.avatar, friend.avatar_url);
    chatAvatar.innerHTML = av.includes('<img') ? av.match(/<img[^>]+>/)[0] : (friend.avatar || '😊');
    chatName.textContent = friend.username;
    chatStatus.textContent = friend.online ? _('online') : _('offline');
    chatStatus.style.color = friend.online ? 'var(--success)' : '#ccc';
    messageInput.focus();
    unreadMap[userId] = 0; renderContacts(searchInput.value.trim());
    await loadMessages(userId);
}

async function loadMessages(userId) {
    try {
        const resp = await fetch('/api/messages/' + userId);
        if (resp.status === 403) { messagesList.innerHTML = '<div style="text-align:center;color:#999;padding:40px;">Please add friend first</div>'; return; }
        renderMessages(await resp.json());
    } catch (err) { console.error('messages failed:', err); }
}

function renderMessages(msgs, targetEl) {
    const el = targetEl || messagesList;
    if (msgs.length === 0) {
        el.innerHTML = '<div style="text-align:center;color:#999;padding:40px;font-size:13px;">' + _('noMsgs') + '</div>';
        return;
    }
    el.innerHTML = msgs.map(m => {
        const isMine = m.sender_id === currentUserId();
        const cls = isMine ? 'mine' : 'theirs';
        const sender = targetEl ? ('<div class="admin-msg-sender">' + escapeHtml(m.sender_name) + '</div>') : '';
        let body;
        if (m.msg_type === 'file') {
            const sizeStr = m.file_size ? formatSize(m.file_size) : '';
            body = '<a href="/static/uploads/files/' + m.file_path + '" target="_blank" class="file-msg">' +
                '📎 ' + escapeHtml(m.file_name || m.file_path) + ' <span class="file-size">' + sizeStr + '</span></a>';
        } else {
            body = escapeHtml(m.content);
        }
        return '<div class="message-row ' + cls + '">' +
            '<div class="message-wrapper">' + sender +
            '<div class="message-bubble">' + body + '</div>' +
            '<div class="message-time">' + m.timestamp + '</div>' +
            '</div></div>';
    }).join('');
}

function addMessageToView(msg) {
    const isMine = msg.sender_id === currentUserId();
    const cls = isMine ? 'mine' : 'theirs';
    let body;
    if (msg.msg_type === 'file') {
        const sizeStr = msg.file_size ? formatSize(msg.file_size) : '';
        body = '<a href="/static/uploads/files/' + msg.file_path + '" target="_blank" class="file-msg">' +
            '📎 ' + escapeHtml(msg.file_name || msg.file_path) + ' <span class="file-size">' + sizeStr + '</span></a>';
    } else {
        body = escapeHtml(msg.content);
    }
    const div = document.createElement('div');
    div.className = 'message-row ' + cls;
    div.innerHTML = '<div class="message-wrapper">' +
        '<div class="message-bubble">' + body + '</div>' +
        '<div class="message-time">' + msg.timestamp + '</div></div>';
    messagesList.appendChild(div);
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
}

// ─── 文件上传与发送 ──────────────────────────────────────────

attachBtn.addEventListener('click', () => chatFileInput.click());

chatFileInput.addEventListener('change', async () => {
    const file = chatFileInput.files[0];
    if (!file) return;
    attachBtn.disabled = true;
    try {
        const formData = new FormData();
        formData.append('file', file);
        const resp = await fetch('/api/upload_file', { method: 'POST', body: formData });
        const data = await resp.json();
        if (data.ok) {
            pendingFile = data;
            filePreviewName.textContent = data.file_name + ' (' + formatSize(data.file_size) + ')';
            filePreview.classList.remove('hidden');
            messageInput.focus();
        } else {
            alert(data.error || 'Upload failed');
        }
    } catch (err) {
        alert('Upload failed');
    }
    attachBtn.disabled = false;
    chatFileInput.value = '';
});

filePreviewCancel.addEventListener('click', () => {
    pendingFile = null;
    filePreview.classList.add('hidden');
});

// ─── 发送消息 ────────────────────────────────────────────────

messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const content = messageInput.value.trim();

    if (pendingFile) {
        // 发送文件消息
        socket.emit('private_message', {
            receiver_id: activeChatId,
            msg_type: 'file',
            content: '[File]',
            file_name: pendingFile.file_name,
            file_path: pendingFile.file_path,
            file_size: pendingFile.file_size,
        });
        pendingFile = null;
        filePreview.classList.add('hidden');
    }

    if (content && activeChatId) {
        socket.emit('private_message', {
            receiver_id: activeChatId,
            msg_type: 'text',
            content: content,
        });
    }

    messageInput.value = '';
    messageInput.focus();
});

// ─── Socket 事件 ─────────────────────────────────────────────

socket.on('new_message', (msg) => {
    const partnerId = msg.sender_id === currentUserId() ? msg.receiver_id : msg.sender_id;
    if (activeChatId === partnerId) { addMessageToView(msg); fetch('/api/messages/' + partnerId); }
    else if (msg.sender_id !== currentUserId()) {
        unreadMap[msg.sender_id] = (unreadMap[msg.sender_id] || 0) + 1;
        if (currentTab === 'friends') renderContacts(searchInput.value.trim());
    }
});

socket.on('user_status_change', () => loadFriends());

socket.on('friend_request_received', () => {
    if (currentTab !== 'add') {
        requestBadge.classList.remove('hidden');
        requestBadge.textContent = (parseInt(requestBadge.textContent) || 0) + 1;
    }
});

socket.on('friend_accepted', () => loadFriends());

socket.on('friend_deleted', (data) => {
    // 对方删除了我，刷新好友列表
    if (activeChatId === data.user_id) {
        // 如果正在跟这个人聊天，关闭聊天窗口
        activeChatId = null;
        chatWindow.classList.add('hidden');
        chatEmpty.classList.remove('hidden');
    }
    loadFriends();
});

async function deleteFriend(userId, name) {
    if (!confirm(_('deleteConfirm') + ' ' + name + '?')) return;
    try {
        const r = await fetch('/api/friends/delete', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId }),
        });
        const d = await r.json();
        if (d.ok) {
            if (activeChatId === userId) {
                activeChatId = null;
                chatWindow.classList.add('hidden');
                chatEmpty.classList.remove('hidden');
            }
            friends = friends.filter(f => f.id !== userId);
            renderContacts(searchInput.value.trim());
        }
    } catch(e) { console.error(e); }
}

let typingTimer = null;
messageInput.addEventListener('input', () => {
    if (!activeChatId) return;
    socket.emit('typing', { receiver_id: activeChatId, typing: true });
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => socket.emit('typing', { receiver_id: activeChatId, typing: false }), 1500);
});

socket.on('typing', (data) => {
    if (data.user_id === activeChatId) typingIndicator.classList.toggle('hidden', !data.typing);
});

searchInput.addEventListener('input', () => renderContacts(searchInput.value.trim()));

// ─── 管理员面板 ──────────────────────────────────────────────

if (CURRENT_USER_IS_ADMIN) {
    const adminPanel = $('#adminPanel');
    const adminUsersList = $('#adminUsersList');
    const adminConvo = $('#adminConvo');
    const adminMessages = $('#adminMessages');
    const adminConvoTitle = $('#adminConvoTitle');
    let adminUsers = [];

    $('#adminPanelBtn').addEventListener('click', async () => {
        const show = adminPanel.classList.toggle('hidden');
        if (!show) {
            await loadAdminUsers();
            loadServerStatus();
        }
    });

    async function loadServerStatus() {
        try {
            const r = await fetch('/api/admin/status');
            const s = await r.json();
            $('#statCpu').textContent = s.cpu_percent ? s.cpu_percent + '%' : '--';
            $('#statMem').textContent = s.memory_used_mb + ' / ' + s.memory_total_mb + ' MB';
            $('#statDisk').textContent = s.disk_used_gb + ' / ' + s.disk_total_gb + ' GB';
            $('#statUptime').textContent = formatUptime(s.uptime_seconds);
            $('#statOnline').textContent = s.online_users;
            $('#statUsers').textContent = s.total_users;
            $('#statMsgs').textContent = s.total_messages;
        } catch(e) { console.error(e); }
    }

    function formatUptime(sec) {
        if (!sec || sec < 0) return '--';
        const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60);
        const p = []; if (d > 0) p.push(d + 'd'); if (h > 0) p.push(h + 'h'); p.push(m + 'm'); return p.join(' ');
    }

    $('#closeAdminBtn').addEventListener('click', () => adminPanel.classList.add('hidden'));

    $('#adminConvoBack').addEventListener('click', () => {
        adminConvo.classList.add('hidden');
        adminUsersList.parentElement.classList.remove('hidden');
    });

    async function loadAdminUsers() {
        try {
            const resp = await fetch('/api/admin/users');
            adminUsers = await resp.json();
            renderAdminUsers();
        } catch (err) { console.error(err); }
    }

    function renderAdminUsers() {
        adminUsersList.innerHTML = adminUsers.map(u => {
            const dot = u.online ? 'online-dot' : 'offline-dot';
            const av = renderAvatar(u.avatar, u.avatar_url);
            return '<div class="admin-user-item" onclick="adminViewUser(' + u.id + ')">' +
                av + '<span class="contact-name">' + escapeHtml(u.username) + '</span>' +
                '<span class="' + dot + '"></span>' +
                '</div>';
        }).join('');
        // 加入快速查看组合: 点两个用户之间的聊天
        if (adminUsers.length >= 2) {
            adminUsersList.innerHTML += '<div class="admin-hint">选择两个用户查看对话：点击用户名 A，再点击用户名 B</div>';
        }
    }

    let adminSelectedUser = null;
    window.adminViewUser = function(userId) {
        if (!adminSelectedUser) {
            adminSelectedUser = userId;
            // 高亮
            $$('.admin-user-item').forEach(el => {
                const uid = parseInt(el.getAttribute('onclick')?.match(/\d+/)?.[0]);
                if (uid === userId) el.classList.add('selected');
            });
        } else if (adminSelectedUser === userId) {
            adminSelectedUser = null;
            $$('.admin-user-item').forEach(el => el.classList.remove('selected'));
        } else {
            // 两个用户都选了 → 查看对话
            const a = adminSelectedUser;
            const b = userId;
            adminSelectedUser = null;
            $$('.admin-user-item').forEach(el => el.classList.remove('selected'));
            viewAdminConversation(a, b);
        }
    };

    async function viewAdminConversation(a, b) {
        try {
            const resp = await fetch('/api/admin/conversation/' + a + '/' + b);
            const msgs = await resp.json();
            const userA = adminUsers.find(u => u.id === a);
            const userB = adminUsers.find(u => u.id === b);
            adminConvoTitle.textContent = (userA?.username || '?') + ' ↔ ' + (userB?.username || '?');
            adminConvo.classList.remove('hidden');
            adminUsersList.parentElement.classList.add('hidden');
            renderMessages(msgs, adminMessages);
        } catch (err) { console.error(err); }
    }
}

// ─── 初始化 ──────────────────────────────────────────────────

async function init() {
    // 初始化头像显示
    if (CURRENT_USER_AVATAR && CURRENT_USER_AVATAR.length > 3) {
        myAvatar.innerHTML = '<img src="/static/uploads/avatars/' + CURRENT_USER_AVATAR + '" class="avatar-img" alt="">';
        myAvatar.classList.add('has-img');
    }
    await loadFriends();
    try {
        const resp = await fetch('/api/unread');
        unreadMap = await resp.json();
        const fixed = {};
        for (const k of Object.keys(unreadMap)) fixed[parseInt(k)] = unreadMap[k];
        unreadMap = fixed;
        renderContacts();
    } catch (err) { console.error('unread failed:', err); }
    try {
        const resp = await fetch('/api/friend_requests');
        const requests = await resp.json();
        if (requests.length > 0) { requestBadge.textContent = requests.length; requestBadge.classList.remove('hidden'); }
    } catch (err) { /* ignore */ }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

init();

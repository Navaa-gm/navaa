// ============================================================
// ══════════════════ Navaa — app.js ═════════════════════════
// ============================================================

// ================== 1. CONFIG ==================
const CURRENT_KEY = 'navaa_current_user';
const SUB_KEY = 'navaa_subscription';
const USERS_KEY = 'navaa_users';
const REQUESTS_KEY = 'navaa_payment_requests';
const WITHDRAW_KEY = 'navaa_withdraw_requests';
const PURCHASES_KEY = 'navaa_purchases';
const TRANSFERS_KEY = 'navaa_transfers';
const SETTINGS_KEY = 'navaa_settings';
const STORAGE_KEY = 'navaa_items_v3';
const DAILY_LOG_KEY = 'navaa_daily_uploads';
const ADMIN_EMAIL = 'm.soroush.salari@gmail.com';

const ADMIN_BANK_INFO = {
  bankName: 'بانک ملی ایران',
  cardNumber: '6037-9975-1966-5161',
  accountHolder: 'محمد سروش سالاری فنودی',
  sheba: 'IR340170000000358576682006'
};

const UPLOAD_REWARD = 5000;

const DEFAULT_SETTINGS = {
  commissionRate: 15,
  maxItemPrice: 500000,
  minItemPrice: 5000
};

let SETTINGS = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || DEFAULT_SETTINGS;
if (!localStorage.getItem(SETTINGS_KEY)) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(SETTINGS));
}

// ================== 2. CURRENT USER ==================
let currentUser = JSON.parse(localStorage.getItem(CURRENT_KEY)) || null;
if (!currentUser) window.location.href = 'home.html';

// ============================================================
// 📊 محدودیت آپلود
// ============================================================
const PLAN_LIMITS = {
  admin: { maxImageSize: Infinity, maxDailyUploads: Infinity, maxDailyTotalSize: Infinity, label: '🛡️ ادمین', color: '#ffc93c' },
  diamond: { maxImageSize: Infinity, maxDailyUploads: Infinity, maxDailyTotalSize: Infinity, label: '💎 الماسی', color: '#00f0d4' },
  silver: { maxImageSize: 250 * 1024 * 1024 * 1024, maxDailyUploads: 200, maxDailyTotalSize: 200 * 1024 * 1024 * 1024, label: '🥈 طلایی', color: '#ffc93c' },
  bronze: { maxImageSize: 20 * 1024 * 1024 * 1024, maxDailyUploads: 50, maxDailyTotalSize: 25 * 1024 * 1024 * 1024, label: '🥉 برنزی', color: '#cd7f32' }
};

const MIN_WITHDRAW = { admin: 1000, user: 50000 };
const MIN_TRANSFER = 1000;

function getMinWithdraw() {
  if (currentUser.email === ADMIN_EMAIL || currentUser.role === 'admin') return MIN_WITHDRAW.admin;
  return MIN_WITHDRAW.user;
}

function getUserPlanLimit() {
  if (currentUser.email === ADMIN_EMAIL || currentUser.role === 'admin') return PLAN_LIMITS.admin;
  if (currentUser.hasSubscription && currentUser.subscriptionPlan) return PLAN_LIMITS[currentUser.subscriptionPlan] || PLAN_LIMITS.bronze;
  return PLAN_LIMITS.bronze;
}

function getDailyLog() {
  const log = JSON.parse(localStorage.getItem(DAILY_LOG_KEY)) || {};
  const today = new Date().toISOString().split('T')[0];
  if (!log[currentUser.email]) log[currentUser.email] = { date: today, count: 0, totalSize: 0 };
  if (log[currentUser.email].date !== today) log[currentUser.email] = { date: today, count: 0, totalSize: 0 };
  return log;
}

function saveDailyLog(log) { localStorage.setItem(DAILY_LOG_KEY, JSON.stringify(log)); }

function updateDailyLog(fileSize) {
  const log = getDailyLog();
  log[currentUser.email].count++;
  log[currentUser.email].totalSize += fileSize;
  saveDailyLog(log);
}

function checkUploadPermission(fileSize) {
  const limit = getUserPlanLimit();
  const log = getDailyLog();
  const todayLog = log[currentUser.email];
  
  const isFreeUser = !hasSubscription && currentUser.email !== ADMIN_EMAIL && currentUser.role !== 'admin';
  
  if (isFreeUser) {
    const userUploadsCount = DB.items.filter(i => i.uploadedBy === currentUser.id || i.uploadedByEmail === currentUser.email).length;
    if (userUploadsCount >= 50) {
      return { allowed: false, reason: '❌ سهمیه ۵۰ فایل رایگان شما تمام شده!\n\nبرای آپلود بیشتر، لطفاً اشتراک تهیه کنید.' };
    }
    return { allowed: true };
  }

  if (fileSize > limit.maxImageSize) return { allowed: false, reason: `❌ حجم فایل زیاده!\n📦 پلن: ${limit.label}\n🎯 حداکثر: ${formatLimitSize(limit.maxImageSize)}` };
  if (todayLog.count >= limit.maxDailyUploads) return { allowed: false, reason: `❌ امروز ${limit.maxDailyUploads} آپلود کردی!\n📦 پلن: ${limit.label}` };
  
  return { allowed: true };
}

// ================== 3. ADMIN BALANCE ==================
(function syncAdminBalance() {
  const users = JSON.parse(localStorage.getItem(USERS_KEY)) || [];
  const freshUser = users.find(u => u.email === currentUser.email);
  if (freshUser) {
    currentUser.balance = freshUser.balance || 0;
    localStorage.setItem(CURRENT_KEY, JSON.stringify(currentUser));
  }
})();

// ================== 4. WELCOME GIFT ==================
(function syncWelcomeGift() {
  if (currentUser.email === ADMIN_EMAIL || currentUser.role === 'admin') return;
  const users = JSON.parse(localStorage.getItem(USERS_KEY)) || [];
  const freshUser = users.find(u => u.email === currentUser.email);
  if (freshUser) {
    currentUser.balance = freshUser.balance || 0;
    currentUser.welcomeGiftReceived = freshUser.welcomeGiftReceived || false;
    localStorage.setItem(CURRENT_KEY, JSON.stringify(currentUser));
  }
})();

// ================== 5. SYNC USER ==================
(function syncUserWithDatabase() {
  const users = JSON.parse(localStorage.getItem(USERS_KEY)) || [];
  const freshUser = users.find(u => u.email === currentUser.email);

  if (freshUser) {
    currentUser.id = freshUser.id;
    currentUser.role = freshUser.role;
    currentUser.hasSubscription = freshUser.hasSubscription;
    currentUser.subscriptionPlan = freshUser.subscriptionPlan;
    currentUser.subscriptionExpiry = freshUser.subscriptionExpiry;
    currentUser.balance = freshUser.balance || 0;
    if (freshUser.welcomeGiftReceived !== undefined) currentUser.welcomeGiftReceived = freshUser.welcomeGiftReceived;
    currentUser.purchasedItems = freshUser.purchasedItems || [];
    currentUser.joinDate = freshUser.joinDate || currentUser.joinDate;

    if (currentUser.fullname) {
      if (freshUser.fullname !== currentUser.fullname) { freshUser.fullname = currentUser.fullname; localStorage.setItem(USERS_KEY, JSON.stringify(users)); }
    } else { currentUser.fullname = freshUser.fullname; }

    if (currentUser.phone) {
      if (freshUser.phone !== currentUser.phone) { freshUser.phone = currentUser.phone; localStorage.setItem(USERS_KEY, JSON.stringify(users)); }
    } else { currentUser.phone = freshUser.phone; }

    localStorage.setItem(CURRENT_KEY, JSON.stringify(currentUser));

    if (currentUser.hasSubscription && currentUser.subscriptionExpiry && currentUser.subscriptionExpiry < Date.now()) {
      currentUser.hasSubscription = false;
      currentUser.subscriptionPlan = null;
      currentUser.subscriptionExpiry = null;
      const idx = users.findIndex(u => u.email === currentUser.email);
      if (idx !== -1) {
        users[idx].hasSubscription = false;
        users[idx].subscriptionPlan = null;
        users[idx].subscriptionExpiry = null;
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
      }
      localStorage.setItem(CURRENT_KEY, JSON.stringify(currentUser));
    }
  } else if (currentUser.email !== ADMIN_EMAIL) {
    localStorage.removeItem(CURRENT_KEY);
    window.location.href = 'login.html';
  }
})();

// ============================================================
// 6. SUBCATS
// ============================================================
const SUBCATS = {
  music: { 'music-pop': { label: '🎵 پاپ' }, 'music-classic': { label: '🎼 سنتی' }, 'music-rock': { label: '🎸 راک' }, 'music-electronic': { label: '🎧 الکترونیک' }, 'music-classical': { label: '🎻 کلاسیک' }, 'music-rap': { label: '🎤 رپ' } },
  photo: { 'photo-nature': { label: '🌿 طبیعت' }, 'photo-arch': { label: '🏛️ معماری' }, 'photo-bw': { label: '⚫ سیاه و سفید' }, 'photo-animal': { label: '🐾 حیوانات' }, 'photo-nostalgic': { label: '📻 نوستالژیک' }, 'photo-phone-bg': { label: '📱 پس‌زمینه گوشی' }, 'photo-pc-bg': { label: '💻 پس‌زمینه کامپیوتر' } },
  car: { 'car-super': { label: '🏎️ سوپراسپرت' }, 'car-classic': { label: '🚙 کلاسیک' }, 'car-offroad': { label: '🚙 آفرود' }, 'car-sport': { label: '🏁 اسپرت' }, 'car-luxury': { label: '💎 لوکس' }, 'car-motorcycle': { label: '🏍️ موتور' } }
};

// ================== 7. STATE ==================
const DB = { items: JSON.parse(localStorage.getItem(STORAGE_KEY)) || [] };
window.DB = DB; // برای دسترسی در gallery.html

let currentMain = 'all';
let currentSub = null;
let currentSearch = '';
let activeId = null;
let hasSubscription = currentUser.hasSubscription || false;

if (currentUser.email === ADMIN_EMAIL || currentUser.role === 'admin') {
  hasSubscription = true;
  currentUser.hasSubscription = true;
  if (currentUser.email === ADMIN_EMAIL) { currentUser.role = 'admin'; currentUser.subscriptionPlan = 'diamond'; }
  else if (!currentUser.subscriptionPlan) { currentUser.subscriptionPlan = 'bronze'; }
  localStorage.setItem(CURRENT_KEY, JSON.stringify(currentUser));
}

// ================== 8. HELPERS ==================
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
function formatMoney(n) { return Number(n).toLocaleString('fa-IR'); }

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(DB.items)); return true; }
  catch (e) { return false; }
}

function saveUserData() {
  const users = JSON.parse(localStorage.getItem(USERS_KEY)) || [];
  const idx = users.findIndex(u => u.email === currentUser.email);
  if (idx !== -1) {
    const protectedFields = ['id', 'email', 'role', 'joinDate'];
    const merged = { ...users[idx], ...currentUser };
    protectedFields.forEach(f => { if (users[idx][f] !== undefined) merged[f] = users[idx][f]; });
    users[idx] = merged;
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } else {
    users.push(currentUser);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
  localStorage.setItem(CURRENT_KEY, JSON.stringify(currentUser));
}

// ============================================================
// 💰 پرداخت پاداش آپلود
// ============================================================
function giveUploadReward(uploaderEmail) {
  const users = JSON.parse(localStorage.getItem(USERS_KEY)) || [];
  const uploaderIdx = users.findIndex(u => u.email === uploaderEmail);
  const adminIdx = users.findIndex(u => u.email === ADMIN_EMAIL);

  if (uploaderIdx === -1) return { success: false, reason: 'uploader_not_found' };
  const isUploaderAdmin = users[uploaderIdx].email === ADMIN_EMAIL || users[uploaderIdx].role === 'admin';

  users[uploaderIdx].balance = (users[uploaderIdx].balance || 0) + UPLOAD_REWARD;

  if (!isUploaderAdmin && adminIdx !== -1) {
    users[adminIdx].balance = Math.max(0, (users[adminIdx].balance || 0) - UPLOAD_REWARD);
    users[adminIdx].totalPayouts = (users[adminIdx].totalPayouts || 0) + UPLOAD_REWARD;
  }

  localStorage.setItem(USERS_KEY, JSON.stringify(users));

  if (uploaderEmail === currentUser.email) {
    currentUser.balance = users[uploaderIdx].balance;
    localStorage.setItem(CURRENT_KEY, JSON.stringify(currentUser));
  }
  return { success: true, isAdmin: isUploaderAdmin };
}

// ================== 9. COMPRESS IMAGE ==================
function compressImage(file, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject; img.src = e.target.result;
    };
    reader.onerror = reject; reader.readAsDataURL(file);
  });
}

// ================== 10. SVG ==================
function makeSVG(color1, color2, emoji, label) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${color1}"/><stop offset="100%" stop-color="${color2}"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><text x="50%" y="45%" font-size="180" text-anchor="middle" dominant-baseline="middle">${emoji}</text><text x="50%" y="75%" font-size="34" fill="rgba(255,255,255,0.9)" text-anchor="middle" font-family="Vazirmatn,sans-serif" font-weight="700">${label}</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

// ================== 11. SAMPLE DATA (حذف شده) ==================
const SAMPLE_DATA = [];
function loadSampleData() {}

// ================== 12. BOT PRICING ==================
function botPriceItem(itemData) {
  const details = []; let basePrice = 10000; details.push({ label: 'قیمت پایه', value: basePrice });
  if (itemData.hasAudio) { basePrice += 30000; details.push({ label: '🎵 فایل صوتی', value: 30000 }); }
  const titleLen = (itemData.title || '').trim().length;
  if (titleLen > 20) { basePrice += 15000; details.push({ label: '✏️ عنوان توصیفی', value: 15000 }); }
  else if (titleLen > 10) { basePrice += 7000; details.push({ label: '✏️ عنوان مناسب', value: 7000 }); }
  const descLen = (itemData.desc || '').trim().length;
  if (descLen > 100) { basePrice += 20000; details.push({ label: '📝 توضیحات کامل', value: 20000 }); }
  else if (descLen > 40) { basePrice += 10000; details.push({ label: '📝 توضیحات مناسب', value: 10000 }); }
  const tagsCount = (itemData.tags || []).length;
  if (tagsCount >= 4) { basePrice += 8000; details.push({ label: '🏷️ تگ‌های متنوع', value: 8000 }); }
  else if (tagsCount >= 2) { basePrice += 4000; details.push({ label: '🏷️ تگ‌های مناسب', value: 4000 }); }
  const categoryWeights = { music: 1.4, photo: 1.2, car: 1.0 };
  const mainCat = (itemData.category || '').split('-')[0];
  const weight = categoryWeights[mainCat] || 1.0;
  if (weight > 1) { const bonus = Math.round(basePrice * (weight - 1)); details.push({ label: `⭐ کیفیت ${mainCat === 'music' ? 'موسیقی' : 'عکس'}`, value: bonus }); basePrice = Math.round(basePrice * weight); }
  if (itemData.imageSize > 2 * 1024 * 1024) { basePrice += 25000; details.push({ label: '🖼️ تصویر باکیفیت', value: 25000 }); }
  else if (itemData.imageSize > 500 * 1024) { basePrice += 10000; details.push({ label: '🖼️ تصویر خوب', value: 10000 }); }
  if (itemData.audioDuration && itemData.audioDuration > 60) { basePrice += 20000; details.push({ label: '⏱️ موسیقی طولانی', value: 20000 }); }
  const finalPrice = Math.min(basePrice, SETTINGS.maxItemPrice);
  return { suggestedPrice: finalPrice, details: details, quality: finalPrice >= 100000 ? 'A+' : finalPrice >= 50000 ? 'A' : finalPrice >= 25000 ? 'B' : 'C' };
}

// ================== 13. USER HEADER ==================
function setupUserHeader() { const greeting = document.getElementById('userGreeting'); if (greeting) greeting.textContent = currentUser.fullname; }
function updateSubBadge() { const badge = document.getElementById('subBadge'); if (!badge) return; if (hasSubscription) badge.classList.remove('hidden'); else badge.classList.add('hidden'); }

// ================== 14. BOTTOM NAV ==================
function renderBottomNav() {
  const nav = document.getElementById('bottomNav'); if (!nav) return;
  const isAdminUser = currentUser.email === ADMIN_EMAIL || currentUser.role === 'admin';
  const isSuperUser = currentUser.email === ADMIN_EMAIL;
  const subActive = hasSubscription ? 'is-active' : '';
  const adminActive = isAdminUser ? 'is-admin' : '';
  let savedAvatar = localStorage.getItem('navaa_avatar_' + currentUser.email);
  if (!savedAvatar && currentUser.avatar) savedAvatar = currentUser.avatar;
  const profileContent = savedAvatar ? `<div class="profile-btn-avatar" style="background-image: url('${savedAvatar}');"></div>` : `<span class="nav-icon">👤</span>`;
  nav.innerHTML = `
    <button class="nav-pill-btn logout-pill" id="logoutNavBtn"><span class="nav-pill-icon">🚪</span><span class="nav-pill-label">خروج</span></button>
    <button class="nav-pill-btn sub-pill ${subActive}" id="subNavBtn"><span class="nav-pill-icon">✨${hasSubscription ? '<span class="pill-dot"></span>' : ''}</span><span class="nav-pill-label">${hasSubscription ? 'اشتراک فعال' : 'اشتراک'}</span></button>
    <a href="profile.html" class="nav-center-profile ${savedAvatar ? 'has-avatar' : ''}" title="پروفایل">${profileContent}<span class="nav-center-label">پروفایل</span></a>
    ${isAdminUser ? `<button class="nav-pill-btn admin-pill ${adminActive}" id="adminNavBtn"><span class="nav-pill-icon">🛡️</span><span class="nav-pill-label">${isSuperUser ? 'مدیر کل' : 'ادمین'}</span></button>` : ''}
    <button class="nav-pill-btn upload-pill" id="uploadNavBtn"><span class="nav-pill-icon">➕</span><span class="nav-pill-label">آپلود اثر</span></button>
  `;
  nav.querySelector('#uploadNavBtn')?.addEventListener('click', () => { if (!hasSubscription) { document.getElementById('subModal')?.classList.remove('hidden'); return; } document.getElementById('uploadModal')?.classList.remove('hidden'); });
  nav.querySelector('#subNavBtn')?.addEventListener('click', () => { document.getElementById('subModal')?.classList.remove('hidden'); });
  nav.querySelector('#adminNavBtn')?.addEventListener('click', () => { window.location.href = 'admin.html'; });
  nav.querySelector('#logoutNavBtn')?.addEventListener('click', () => { if (confirm('از حساب خارج بشی؟')) { localStorage.removeItem(CURRENT_KEY); window.location.href = 'home.html'; } });
}

// ================== 15. SUB NAV ==================
function renderSubNav() {
  const subNav = document.getElementById('subNav'); if (!subNav) return;
  if (currentMain === 'all' || !SUBCATS[currentMain]) { subNav.innerHTML = ''; subNav.classList.add('hidden'); return; }
  subNav.classList.remove('hidden');
  const subs = SUBCATS[currentMain];
  subNav.innerHTML = `<button class="chip ${!currentSub?'active':''}" data-sub="">همه</button>${Object.entries(subs).map(([key, val]) => `<button class="chip ${currentSub===key?'active':''}" data-sub="${key}">${val.label}</button>`).join('')}`;
  subNav.querySelectorAll('[data-sub]').forEach(chip => { chip.addEventListener('click', () => { currentSub = chip.dataset.sub || null; renderSubNav(); renderGallery(); }); });
}

// ================== 16. TOPBAR ==================
function bindTopbar() {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) { searchInput.addEventListener('input', e => { currentSearch = e.target.value.trim().toLowerCase(); renderGallery(); }); }
  const uploadBtn = document.getElementById('uploadBtn');
  if (uploadBtn) { uploadBtn.addEventListener('click', () => { if (!hasSubscription) { document.getElementById('subModal')?.classList.remove('hidden'); return; } document.getElementById('uploadModal')?.classList.remove('hidden'); }); }
}

// ================== 17. GALLERY ==================
function renderGallery() {
  const gallery = document.getElementById('gallery'); if (!gallery) return;
  let list = [...DB.items].sort((a, b) => b.time - a.time);
  if (currentMain !== 'all') list = list.filter(p => p.category.startsWith(currentMain + '-'));
  if (currentSub) list = list.filter(p => p.category === currentSub);
  if (currentSearch) {
    list = list.filter(p => p.title.toLowerCase().includes(currentSearch) || (p.artist || '').toLowerCase().includes(currentSearch) || (p.tags || []).some(t => t.toLowerCase().includes(currentSearch)));
  }
  if (list.length === 0) { gallery.innerHTML = `<div class="empty"><h3>🎭 هنوز اثری در این دسته نیست</h3><p>اولین اثر رو آپلود کن!</p></div>`; return; }
  if (currentMain === 'all' && !currentSearch) { renderHorizontalRows(gallery); } else { gallery.classList.remove('horizontal-mode'); gallery.innerHTML = ''; list.forEach(item => gallery.appendChild(artCard(item))); }
}

function renderHorizontalRows(gallery) {
  gallery.classList.add('horizontal-mode'); gallery.innerHTML = '';
  const sections = [{ key: 'music', title: '🎵 آهنگ‌های جدید', filter: 'music-' }, { key: 'photo', title: '📸 عکس‌های هنری', filter: 'photo-' }, { key: 'car', title: '🚗 ماشین‌های برتر', filter: 'car-' }];
  sections.forEach(section => {
    const items = DB.items.filter(p => p.category.startsWith(section.filter)).sort((a, b) => b.time - a.time).slice(0, 12);
    if (items.length === 0) return;
    const sectionEl = document.createElement('section'); sectionEl.className = 'h-section';
    sectionEl.innerHTML = `<div class="h-header"><h2>${section.title}</h2><button class="h-more" data-goto="${section.key}">مشاهده بیشتر ←</button></div><div class="h-row"></div>`;
    const row = sectionEl.querySelector('.h-row'); items.forEach(item => row.appendChild(artCard(item, true)));
    sectionEl.querySelector('.h-more').addEventListener('click', () => { currentMain = section.key; currentSub = null; renderSubNav(); renderGallery(); });
    gallery.appendChild(sectionEl);
  });
  setTimeout(enableDragScroll, 50);
}

function artCard(item, compact = false) {
  const card = document.createElement('div'); card.className = 'card' + (compact ? ' compact' : '');
  const liked = item.likedByMe ? 'liked' : ''; const heartIcon = item.likedByMe ? '❤️' : '🤍';
  const date = new Date(item.time).toLocaleDateString('fa-IR', { year: 'numeric', month: 'numeric', day: 'numeric' });
  const genre = (SUBCATS?.music?.[item.category]?.label) || (SUBCATS?.photo?.[item.category]?.label) || (SUBCATS?.car?.[item.category]?.label) || 'هنری';
  const isMyItem = item.uploadedByEmail === currentUser.email || item.uploadedBy === currentUser.id;
  const isAdminUser = currentUser.email === ADMIN_EMAIL || currentUser.role === 'admin';
  const canDelete = item.uploadedBy !== 'system' && (isMyItem || isAdminUser);
  const hasPurchased = (currentUser.purchasedItems || []).includes(item.id);
  const isPremium = item.isPremium && item.price > 0;
  const canView = !isPremium || isMyItem || isAdminUser || hasPurchased;
  const premiumBadge = isPremium ? `<span class="premium-badge">💎 ویژه</span>` : '';
  const lockOverlay = (isPremium && !canView) ? `<div class="lock-overlay"><div class="lock-icon">🔒</div><div class="lock-price">${formatMoney(item.price)} تومان</div></div>` : '';

  if (compact) {
    card.innerHTML = `<div class="album-cover"><img src="${item.image}" alt="${escapeHtml(item.title)}" loading="lazy">${premiumBadge}${item.audio ? '<span class="album-play">▶</span>' : ''}${lockOverlay}<div class="album-actions"><button class="album-btn like-btn ${liked}">${heartIcon}</button><button class="album-btn download-btn">⬇️</button>${canDelete ? `<button class="album-btn delete-btn" title="حذف">🗑️</button>` : ''}</div></div><div class="album-info"><p class="album-title">${escapeHtml(item.title)}</p><p class="album-artist">${escapeHtml(item.artist || 'ناشناس')}</p><p class="album-meta">${genre} · ${date}</p></div>`;
  } else {
    card.innerHTML = `${item.audio ? '<span class="music-badge">🎵</span>' : ''}${premiumBadge}<img src="${item.image}" alt="${escapeHtml(item.title)}" loading="lazy">${lockOverlay}<div class="card-actions"><button class="action-btn like-btn ${liked}">${heartIcon}</button><button class="action-btn download-btn">⬇️</button>${canDelete ? `<button class="action-btn delete-btn" title="حذف">🗑️</button>` : ''}</div><span class="like-count">${item.likes} ❤</span><div class="card-overlay"><p class="card-title">${escapeHtml(item.title)}</p>${item.artist ? `<p class="card-artist">👤 ${escapeHtml(item.artist)}</p>` : ''}<div class="card-tags">${(item.tags || []).map(t => `#${escapeHtml(t)}`).join(' ')}</div></div>`;
  }

  card.addEventListener('click', e => { if (e.target.closest('.album-btn') || e.target.closest('.action-btn')) return; openDetail(item.id); });
  card.querySelector('.like-btn').addEventListener('click', e => { e.stopPropagation(); toggleLike(item.id); });
  card.querySelector('.download-btn').addEventListener('click', e => { e.stopPropagation(); if (isPremium && !canView) { alert('🔒 اول بخر!'); openPurchaseModal(item.id); return; } downloadItem(item); });
  const delBtn = card.querySelector('.delete-btn'); if (delBtn) delBtn.addEventListener('click', e => { e.stopPropagation(); deleteItem(item.id); });
  return card;
}

// ================== 18. DELETE / LIKE / DOWNLOAD ==================
function deleteItem(id) {
  const item = DB.items.find(p => p.id === id); if (!item) return;
  const isMyItem = item.uploadedByEmail === currentUser.email || item.uploadedBy === currentUser.id;
  const isAdminUser = currentUser.email === ADMIN_EMAIL || currentUser.role === 'admin';
  if (!isMyItem && !isAdminUser) { alert('❌ فقط صاحب اثر یا ادمین!'); return; }
  if (!confirm(`🗑️ حذف «${item.title}»؟`)) return;
  DB.items = DB.items.filter(p => p.id !== id);
  save();
  if (window.saveItemsToCloud) window.saveItemsToCloud(DB.items); // سینک حذف
  document.getElementById('modal')?.classList.add('hidden');
  alert('🗑️ حذف شد!'); renderGallery();
}

function toggleLike(id) {
  const item = DB.items.find(p => p.id === id); if (!item) return;
  if (item.likedByMe) { item.likes--; item.likedByMe = false; } else { item.likes++; item.likedByMe = true; }
  save();
  if (window.saveItemsToCloud) window.saveItemsToCloud(DB.items); // سینک لایک
  renderGallery();
}

function downloadItem(item) {
  const a = document.createElement('a'); a.href = item.image; a.download = (item.title || 'artwork').replace(/\s+/g, '_') + '.jpg'; a.target = '_blank'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
  if (item.audio) { setTimeout(() => { const b = document.createElement('a'); b.href = item.audio; b.download = (item.title || 'track').replace(/\s+/g, '_') + '.mp3'; b.target = '_blank'; document.body.appendChild(b); b.click(); document.body.removeChild(b); }, 500); }
}

// ================== 19. SUB MODAL ==================
function bindSubModal() {
  const modal = document.getElementById('subModal'); if (!modal) return;
  const closeBtn = document.getElementById('subClose');
  closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
  modal.addEventListener('click', e => { if (e.target === modal) closeBtn.click(); });
  modal.querySelectorAll('.plan').forEach(plan => { plan.addEventListener('click', () => { startPayment(plan.dataset.plan, parseInt(plan.dataset.price), parseInt(plan.dataset.days)); }); });
}

function startPayment(planName, price, days) {
  const planLabels = { bronze: '🥉 برنزی (۱ ماهه)', silver: '🥈 طلایی (۶ ماهه)', diamond: '💎 الماسی (۱ سال و ۶ ماهه)' };
  showPaymentChoiceModal(planName, price, days, planLabels[planName]);
}

function showPaymentChoiceModal(planName, price, days, planLabel) {
  const myBalance = currentUser.balance || 0; const canPayWithWallet = myBalance >= price;
  const overlay = document.createElement('div'); overlay.className = 'renew-wrap'; overlay.style.overflow = 'auto';
  overlay.innerHTML = `<div class="renew-card" style="max-width:520px;"><div class="renew-icon">💳</div><h2>انتخاب روش پرداخت</h2><p class="renew-sub">${planLabel}</p><div class="renew-info"><div class="renew-info-row"><span>📦 پلن:</span><strong>${planLabel}</strong></div><div class="renew-info-row"><span>💰 مبلغ:</span><strong style="color:#ffc93c;">${formatMoney(price)} تومان</strong></div><div class="renew-info-row"><span>💵 موجودی:</span><strong style="color:${canPayWithWallet ? '#00f0d4' : '#ff2e4d'};">${formatMoney(myBalance)} تومان</strong></div></div><div style="display:grid;grid-template-columns:1fr;gap:.8rem;margin:1.2rem 0;"><button id="payWithWallet" style="background: linear-gradient(135deg, ${canPayWithWallet ? 'rgba(0,240,212,.15), rgba(56,189,248,.1)' : 'rgba(255,46,77,.08), rgba(255,46,77,.04)'});border: 1.5px solid ${canPayWithWallet ? 'rgba(0,240,212,.5)' : 'rgba(255,46,77,.3)'};border-radius: 14px; padding: 1rem 1.2rem;cursor: ${canPayWithWallet ? 'pointer' : 'not-allowed'};text-align: right; font-family: inherit; color: #fff;opacity: ${canPayWithWallet ? '1' : '.6'};display: flex; align-items: center; gap: 1rem;" ${!canPayWithWallet ? 'disabled' : ''}><div style="font-size: 1.8rem;">${canPayWithWallet ? '💰' : '🚫'}</div><div style="flex: 1;"><div style="font-weight: 800; font-size: .95rem; color: ${canPayWithWallet ? '#00f0d4' : '#ff2e4d'};">${canPayWithWallet ? '💎 پرداخت با کیف پول' : '❌ موجودی کافی نیست'}</div></div></button><button id="payWithCard" style="background: linear-gradient(135deg, rgba(255,201,60,.12), rgba(255,140,0,.06));border: 1.5px solid rgba(255,201,60,.5);border-radius: 14px; padding: 1rem 1.2rem;cursor: pointer; text-align: right; font-family: inherit; color: #fff;display: flex; align-items: center; gap: 1rem;"><div style="font-size: 1.8rem;">💳</div><div style="flex: 1;"><div style="font-weight: 800; font-size: .95rem; color: #ffc93c;">🏦 پرداخت کارت به کارت</div></div></button></div><button id="payChoiceCancel" class="btn-ghost-sm" style="padding:.7rem;width:100%;">انصراف</button></div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('#payWithWallet').addEventListener('click', () => { if (!canPayWithWallet) return; if (!confirm(`💰 تایید پرداخت از کیف پول\n\n📦 پلن: ${planLabel}\n💵 مبلغ: ${formatMoney(price)} تومان\n\nمطمئنی؟`)) return; completeWalletPayment(planName, price, days, planLabel); document.body.removeChild(overlay); document.getElementById('subModal')?.classList.add('hidden'); });
  overlay.querySelector('#payWithCard').addEventListener('click', () => { document.body.removeChild(overlay); showBankTransferModal(planName, price, days, planLabel); });
  overlay.querySelector('#payChoiceCancel').addEventListener('click', () => { document.body.removeChild(overlay); });
}

function completeWalletPayment(planName, price, days, planLabel) {
  const users = JSON.parse(localStorage.getItem(USERS_KEY)) || []; const idx = users.findIndex(u => u.email === currentUser.email);
  if (idx === -1) { alert('❌ خطا در پیدا کردن حساب!'); return; }
  if ((users[idx].balance || 0) < price) { alert('❌ موجودی کافی نداری!'); return; }
  users[idx].balance = (users[idx].balance || 0) - price;
  const expiryDate = Date.now() + (days * 24 * 60 * 60 * 1000);
  users[idx].hasSubscription = true; users[idx].subscriptionPlan = planName; users[idx].subscriptionExpiry = expiryDate;
  users[idx].subscriptionHistory = users[idx].subscriptionHistory || [];
  users[idx].subscriptionHistory.push({ id: Date.now(), planName, planLabel, price, days, method: 'wallet', time: Date.now(), expiryDate });
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  currentUser.balance = users[idx].balance; currentUser.hasSubscription = true; currentUser.subscriptionPlan = planName; currentUser.subscriptionExpiry = expiryDate;
  localStorage.setItem(CURRENT_KEY, JSON.stringify(currentUser));
  hasSubscription = true;
  const overlay = document.createElement('div'); overlay.className = 'renew-wrap';
  overlay.innerHTML = `<div class="renew-card" style="max-width:460px;text-align:center;"><div style="font-size:4rem;margin-bottom:.5rem;">🎉</div><h2 style="background:linear-gradient(90deg,#00f0d4,#38bdf8);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">پرداخت موفق!</h2><p style="color:#a0a0a0;margin:.5rem 0 1.5rem;">اشتراک <strong style="color:#ffc93c;">${planLabel}</strong> فعال شد</p><div class="renew-info" style="text-align:right;"><div class="renew-info-row"><span>💵 مبلغ:</span><strong style="color:#ffc93c;">${formatMoney(price)}</strong></div><div class="renew-info-row"><span>💰 باقی‌مونده:</span><strong style="color:#00f0d4;">${formatMoney(currentUser.balance)}</strong></div><div class="renew-info-row"><span>📅 انقضا:</span><strong>${new Date(expiryDate).toLocaleDateString('fa-IR')}</strong></div></div><button id="successOk" class="btn-primary" style="padding:.9rem;width:100%;margin-top:1rem;">✅ متوجه شدم</button></div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('#successOk').addEventListener('click', () => { document.body.removeChild(overlay); location.reload(); });
}

function showBankTransferModal(planName, price, days, planLabel) {
  const overlay = document.createElement('div'); overlay.className = 'renew-wrap'; overlay.style.overflow = 'auto';
  overlay.innerHTML = `<div class="renew-card" style="max-width:540px;"><div class="renew-icon">💳</div><h2>پرداخت کارت به کارت</h2><p class="renew-sub">مبلغ رو به کارت زیر واریز کن</p><div class="renew-info"><div class="renew-info-row"><span>📦 پلن:</span><strong>${planLabel}</strong></div><div class="renew-info-row"><span>💰 مبلغ:</span><strong style="color:#ffc93c;">${formatMoney(price)}</strong></div></div><div style="background:linear-gradient(135deg,rgba(0,240,212,.08),rgba(56,189,248,.05));border:1.5px solid rgba(0,240,212,.4);border-radius:14px;padding:1.2rem;margin-bottom:1.2rem;text-align:right;"><div style="font-size:.8rem;color:#a0a0a0;margin-bottom:.4rem;">🏦 حساب مدیر</div><div style="display:flex;justify-content:space-between;margin-bottom:.5rem;"><span style="color:#a0a0a0;font-size:.85rem;">بانک:</span><strong style="color:#fff;">${ADMIN_BANK_INFO.bankName}</strong></div><div style="display:flex;justify-content:space-between;margin-bottom:.5rem;"><span style="color:#a0a0a0;font-size:.85rem;">صاحب:</span><strong style="color:#fff;">${ADMIN_BANK_INFO.accountHolder}</strong></div><div><div style="color:#a0a0a0;font-size:.85rem;margin-bottom:.3rem;">شماره کارت:</div><div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;"><strong style="direction:ltr;color:#00f0d4;font-size:1rem;letter-spacing:2px;font-family:monospace;">${ADMIN_BANK_INFO.cardNumber}</strong><button id="copyCardBtn" style="background:rgba(0,240,212,.15);border:1px solid rgba(0,240,212,.4);color:#00f0d4;padding:.3rem .7rem;border-radius:8px;cursor:pointer;font-family:inherit;font-size:.75rem;">📋 کپی</button></div></div></div><div style="margin-bottom:1rem;"><label style="display:block;font-size:.85rem;color:#fff;margin-bottom:.4rem;font-weight:700;">🔢 شماره پیگیری:</label><input type="text" id="trackingNumber" placeholder="123456789" style="width:100%;padding:.9rem;background:#0a0a0a;border:1.5px solid #2a2a2a;border-radius:12px;color:#f0f0f0;font-family:inherit;font-size:1rem;text-align:center;direction:ltr;" maxlength="30"></div><div class="renew-actions"><button id="submitPayment" class="btn-primary" style="padding:.9rem;">✅ ثبت درخواست</button><button id="payCancel" class="btn-ghost-sm" style="padding:.7rem;">انصراف</button></div></div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('#copyCardBtn').addEventListener('click', () => { const cardNum = ADMIN_BANK_INFO.cardNumber.replace(/-/g, ''); navigator.clipboard.writeText(cardNum).then(() => { const btn = overlay.querySelector('#copyCardBtn'); btn.textContent = '✅ کپی شد!'; setTimeout(() => btn.textContent = '📋 کپی', 2000); }); });
  overlay.querySelector('#submitPayment').addEventListener('click', () => { const tracking = overlay.querySelector('#trackingNumber').value.trim(); if (!tracking || tracking.length < 5) return alert('❌ شماره پیگیری رو وارد کن!'); const requests = JSON.parse(localStorage.getItem(REQUESTS_KEY)) || []; requests.push({ id: Date.now(), type: 'subscription', userEmail: currentUser.email, userId: currentUser.id, userName: currentUser.fullname, userPhone: currentUser.phone, planName, planLabel, price, days, trackingNumber: tracking, status: 'pending', time: Date.now() }); localStorage.setItem(REQUESTS_KEY, JSON.stringify(requests)); document.body.removeChild(overlay); document.getElementById('subModal').classList.add('hidden'); alert('✅ درخواست پرداخت ثبت شد!'); });
  overlay.querySelector('#payCancel').addEventListener('click', () => { document.body.removeChild(overlay); });
}

// ================== 20. PURCHASE ==================
function openPurchaseModal(itemId) {
  const item = DB.items.find(p => p.id === itemId); if (!item) return;
  if (!item.isPremium || !item.price) return alert('این اثر ویژه نیست!');
  const isMyItem = item.uploadedByEmail === currentUser.email || item.uploadedBy === currentUser.id; if (isMyItem) return alert('این اثر خودته!');
  const hasPurchased = (currentUser.purchasedItems || []).includes(item.id); if (hasPurchased) return alert('✅ قبلاً خریداری شده!');
  const commission = Math.round(item.price * SETTINGS.commissionRate / 100); const creatorShare = item.price - commission;
  const myBalance = currentUser.balance || 0; const canAfford = myBalance >= item.price;
  const overlay = document.createElement('div'); overlay.className = 'renew-wrap'; overlay.style.overflow = 'auto';
  overlay.innerHTML = `<div class="renew-card" style="max-width:520px;"><div class="renew-icon">🛍️</div><h2>خرید اثر ویژه</h2><p class="renew-sub">${escapeHtml(item.title)}</p><img src="${item.image}" style="width:100%;max-height:200px;object-fit:cover;border-radius:12px;margin-bottom:1rem;"><div class="renew-info"><div class="renew-info-row"><span>💰 قیمت:</span><strong style="color:#ffc93c;">${formatMoney(item.price)}</strong></div><div class="renew-info-row"><span>💵 موجودی:</span><strong style="color:${canAfford ? '#00f0d4' : '#ff2e4d'};">${formatMoney(myBalance)}</strong></div></div>${!canAfford ? `<div style="background:rgba(255,46,77,.1);border:1px solid rgba(255,46,77,.4);color:#ff2e4d;padding:.8rem;border-radius:10px;margin-bottom:1rem;text-align:center;font-size:.85rem;">⚠️ موجودی کافی نداری!</div>` : ''}<div class="renew-actions"><button id="buyConfirm" class="btn-primary" style="padding:.9rem;" ${!canAfford ? 'disabled' : ''}>🛍️ خرید</button><button id="buyCancel" class="btn-ghost-sm" style="padding:.7rem;">انصراف</button></div></div>`;
  document.body.appendChild(overlay);
  if (canAfford) { overlay.querySelector('#buyConfirm').addEventListener('click', () => { if (!confirm(`خرید به قیمت ${formatMoney(item.price)} تومان؟`)) return; completePurchase(item.id); document.body.removeChild(overlay); }); }
  overlay.querySelector('#buyCancel').addEventListener('click', () => document.body.removeChild(overlay));
}

function completePurchase(itemId) {
  const item = DB.items.find(p => p.id === itemId); if (!item) return; const price = item.price; const commission = Math.round(price * SETTINGS.commissionRate / 100); const creatorShare = price - commission;
  currentUser.balance = (currentUser.balance || 0) - price; currentUser.purchasedItems = currentUser.purchasedItems || []; currentUser.purchasedItems.push(itemId); saveUserData();
  const users = JSON.parse(localStorage.getItem(USERS_KEY)) || []; const sellerIdx = users.findIndex(u => u.email === item.uploadedByEmail);
  if (sellerIdx !== -1) { users[sellerIdx].balance = (users[sellerIdx].balance || 0) + creatorShare; users[sellerIdx].totalEarned = (users[sellerIdx].totalEarned || 0) + creatorShare; }
  const adminIdx = users.findIndex(u => u.email === ADMIN_EMAIL); if (adminIdx !== -1) { users[adminIdx].balance = (users[adminIdx].balance || 0) + commission; users[adminIdx].totalCommission = (users[adminIdx].totalCommission || 0) + commission; }
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  item.purchases = item.purchases || []; item.purchases.push({ buyerEmail: currentUser.email, buyerId: currentUser.id, price, time: Date.now() }); item.totalRevenue = (item.totalRevenue || 0) + creatorShare; save();
  if (window.saveItemsToCloud) window.saveItemsToCloud(DB.items); // سینک خرید
  const purchases = JSON.parse(localStorage.getItem(PURCHASES_KEY)) || []; purchases.push({ id: Date.now(), itemId: item.id, itemTitle: item.title, buyerEmail: currentUser.email, sellerEmail: item.uploadedByEmail, price, commission, creatorShare, time: Date.now() });
  localStorage.setItem(PURCHASES_KEY, JSON.stringify(purchases)); alert(`🎉 خریداری شد! ${formatMoney(price)} تومان کسر شد`); renderGallery();
}

// ================== 21. UPLOAD MODAL ==================
function bindUploadModal() {
  const modal = document.getElementById('uploadModal'); const closeBtn = document.getElementById('uploadClose'); const form = document.getElementById('uploadForm'); const fileIn = document.getElementById('fileInput'); const audioIn = document.getElementById('audioInput'); const preview = document.getElementById('preview'); const previewWrap = document.getElementById('previewWrap'); const previewRemove = document.getElementById('previewRemove'); const catSel = document.getElementById('catSelect'); const audioFileBox = document.getElementById('audioFileBox'); const audioFileName = document.getElementById('audioFileName'); const audioFileRemove = document.getElementById('audioFileRemove');
  if (!modal || !form) return;
  const allSubs = []; Object.entries(SUBCATS).forEach(([main, subs]) => { Object.entries(subs).forEach(([key, val]) => allSubs.push(`<option value="${key}">${val.label}</option>`)); });
  catSel.innerHTML = allSubs.join('');
  let currentImageSize = 0; let currentAudioDuration = 0; let compressedImageData = null;
  window.__navaaUploadState = { getImageSize: () => currentImageSize, getAudioDuration: () => currentAudioDuration };
  function renderPlanInfo() {
    const limit = getUserPlanLimit(); const log = getDailyLog(); const todayLog = log[currentUser.email]; const usedSize = formatLimitSize(todayLog.totalSize); const maxSize = formatLimitSize(limit.maxImageSize); const maxCount = limit.maxDailyUploads === Infinity ? '∞' : limit.maxDailyUploads;
    let planInfo = document.getElementById('planInfoBox');
    if (!planInfo) { planInfo = document.createElement('div'); planInfo.id = 'planInfoBox'; const header = modal.querySelector('.upload-header'); if (header) header.parentNode.insertBefore(planInfo, header.nextSibling); }
    planInfo.style.cssText = `margin:0 1.5rem 1rem;background:linear-gradient(135deg,rgba(0,240,212,.08),rgba(56,189,248,.05));border:1px solid rgba(0,240,212,.35);border-radius:12px;padding:.9rem 1rem;font-size:.78rem;`;
    planInfo.innerHTML = `<div style="display:flex;justify-content:space-between;margin-bottom:.5rem;"><strong style="color:${limit.color};">${limit.label}</strong><span style="color:#a0a0a0;">📅 امروز: ${todayLog.count} / ${maxCount}</span></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:.4rem;font-size:.72rem;color:#a0a0a0;"><span>📸 هر فایل: <strong style="color:#ffc93c;">${maxSize}</strong></span><span>💾 مصرف: <strong style="color:#ffc93c;">${usedSize}</strong></span></div>`;
  }
  function closeModal() { modal.classList.add('hidden'); form.reset(); previewWrap.classList.add('hidden'); preview.src = ''; audioFileBox.classList.add('hidden'); audioFileName.textContent = ''; currentImageSize = 0; currentAudioDuration = 0; compressedImageData = null; }
  const openObserver = new MutationObserver(() => { if (!modal.classList.contains('hidden')) renderPlanInfo(); }); openObserver.observe(modal, { attributes: true, attributeFilter: ['class'] });
  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  fileIn.addEventListener('change', e => {
    const file = e.target.files[0]; if (!file) return; const limit = getUserPlanLimit();
    if (file.size > limit.maxImageSize) { alert(`❌ حجم عکس زیاده!\n\nحداکثر: ${formatLimitSize(limit.maxImageSize)}\nعکس تو: ${formatLimitSize(file.size)}`); fileIn.value = ''; return; }
    currentImageSize = file.size; let quality = 0.7, maxWidth = 800;
    if (limit === PLAN_LIMITS.diamond || limit === PLAN_LIMITS.admin) { quality = 0.9; maxWidth = 1600; } else if (limit === PLAN_LIMITS.silver) { quality = 0.8; maxWidth = 1200; }
    compressImage(file, maxWidth, quality).then(compressed => { compressedImageData = compressed; preview.src = compressed; previewWrap.classList.remove('hidden'); }).catch(err => { const reader = new FileReader(); reader.onload = ev => { compressedImageData = ev.target.result; preview.src = ev.target.result; previewWrap.classList.remove('hidden'); }; reader.readAsDataURL(file); });
  });
  if (previewRemove) { previewRemove.addEventListener('click', () => { fileIn.value = ''; preview.src = ''; previewWrap.classList.add('hidden'); currentImageSize = 0; compressedImageData = null; }); }
  if (audioIn) { audioIn.addEventListener('change', e => { const file = e.target.files[0]; if (file) { audioFileName.textContent = file.name; audioFileBox.classList.remove('hidden'); const audio = document.createElement('audio'); audio.src = URL.createObjectURL(file); audio.addEventListener('loadedmetadata', () => { currentAudioDuration = audio.duration; }); } else { audioFileBox.classList.add('hidden'); currentAudioDuration = 0; } }); }
  if (audioFileRemove) { audioFileRemove.addEventListener('click', () => { audioIn.value = ''; audioFileName.textContent = ''; audioFileBox.classList.add('hidden'); currentAudioDuration = 0; }); }

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!hasSubscription) { alert('برای آپلود باید اشتراک داشته باشی!'); closeModal(); document.getElementById('subModal')?.classList.remove('hidden'); return; }
    const imageFile = fileIn.files[0]; const audioFile = audioIn ? audioIn.files[0] : null; if (!imageFile && !audioFile) return alert('حداقل یه تصویر یا یه فایل صوتی انتخاب کن!');
    const titleValue = form.title.value.trim(); if (!titleValue) return alert('عنوان اثر رو وارد کن!');
    const permission = checkUploadPermission(currentImageSize); if (!permission.allowed) { alert(permission.reason); return; }
    const isPremium = window.__navaaPremium?.isPremium === true; const itemPrice = isPremium ? parseInt(window.__navaaPremium?.price || 0) : 0;

    // 🔥 این تابع رو async کردیم تا منتظر ذخیره‌سازی بمونه
    const finish = async (imageData, audioData) => {
      const tags = form.tags.value.split(',').map(t => t.trim()).filter(Boolean);
      let finalImage = imageData; if (!finalImage) finalImage = makeSVG('#00f0d4', '#38bdf8', '🎵', 'صوتی');
      const newItem = { id: Date.now(), image: finalImage, audio: audioData || null, title: titleValue, artist: form.artist.value.trim() || currentUser.fullname, desc: form.desc.value.trim(), category: form.category.value, tags, likes: 0, likedByMe: false, uploadedBy: currentUser.id, uploadedByEmail: currentUser.email, time: Date.now(), isPremium: isPremium, price: itemPrice, botSuggestedPrice: itemPrice, purchases: [], totalRevenue: 0 };
      
      DB.items.push(newItem);
      save(); // ذخیره در حافظه لوکال
      
      // 🔥 اینجا با await ذخیره میکنیم تا مطمئن بشیم کامل رفته روی سرور
      if (window.saveItemsToCloud) {
        try {
          await window.saveItemsToCloud(DB.items);
          console.log('✅ اثر در سرور ذخیره شد.');
        } catch(err) {
          console.error('خطا در ذخیره اثر:', err);
          alert('⚠️ خطا در اتصال به سرور. اثر توی مرورگر ذخیره شد ولی ممکنه با رفرش پاک بشه.');
        }
      }

      updateDailyLog(currentImageSize);
      const rewardResult = giveUploadReward(currentUser.email);
      let rewardMsg = '';
      if (rewardResult.success) {
        if (rewardResult.isAdmin) { rewardMsg = `\n💰 +${formatMoney(UPLOAD_REWARD)} تومان به کیف پولت اضافه شد`; } else { rewardMsg = `\n💰 +${formatMoney(UPLOAD_REWARD)} تومان به کیف پولت اضافه شد\n(از حساب مدیر کسر شد)`; }
      }
      closeModal();
      renderGallery();
      alert('🎉 اثر منتشر شد!' + rewardMsg);
    };

    if (imageFile) { const finalImageData = compressedImageData; if (audioFile) { const r = new FileReader(); r.onload = ev => finish(finalImageData, ev.target.result); r.readAsDataURL(audioFile); } else finish(finalImageData, null); }
    else if (audioFile) { const r = new FileReader(); r.onload = ev => finish(null, ev.target.result); r.readAsDataURL(audioFile); }
  });
}

// ================== 22. PREMIUM SECTION ==================
function initPremiumSection() {
  const modal = document.getElementById('uploadModal'); if (!modal) return; const premiumSection = document.getElementById('premiumSection'); if (!premiumSection) return;
  const titleInput = modal.querySelector('input[name="title"]'); const descInput = modal.querySelector('textarea[name="desc"]'); const tagsInput = modal.querySelector('input[name="tags"]'); const catSelect = document.getElementById('catSelect'); const audioIn = document.getElementById('audioInput');
  premiumSection.innerHTML = `<div class="section-title"><span class="section-num">۴</span><span>محتوای ویژه</span><span class="optional-badge">اختیاری</span></div><div style="background:linear-gradient(135deg,rgba(255,201,60,.06),rgba(255,140,0,.03));border:1.5px dashed rgba(255,201,60,.4);border-radius:14px;padding:1rem;"><div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.8rem;"><input type="checkbox" id="isPremiumCheck" style="width:18px;height:18px;accent-color:#ffc93c;"><label for="isPremiumCheck" style="color:#fff;font-weight:700;font-size:.9rem;cursor:pointer;">💎 این اثر رو ویژه بذار</label></div><div id="premiumOptions" style="display:none;"><button type="button" id="analyzeBtn" class="btn-primary" style="width:100%;padding:.7rem;font-size:.85rem;margin-bottom:.8rem;background:linear-gradient(135deg,#ffc93c,#ff8c00);color:#1a1100;">🤖 تحلیل ربات</button><div id="botResult" style="display:none;background:#1c1c1c;border-radius:10px;padding:.8rem;margin-bottom:.8rem;font-size:.8rem;color:#a0a0a0;"></div><label style="display:block;font-size:.82rem;color:#fff;font-weight:700;margin-bottom:.4rem;">💰 قیمت نهایی (تومان):</label><input type="number" id="premiumPriceInput" min="5000" max="500000" placeholder="حداکثر ۵۰۰,۰۰۰" style="width:100%;padding:.8rem;background:#0a0a0a;border:1.5px solid #2a2a2a;border-radius:10px;color:#ffc93c;font-family:inherit;font-size:1rem;text-align:center;font-weight:800;outline:none;"></div></div>`;
  const isPremiumCheck = premiumSection.querySelector('#isPremiumCheck'); const premiumOptions = premiumSection.querySelector('#premiumOptions'); const analyzeBtn = premiumSection.querySelector('#analyzeBtn'); const botResult = premiumSection.querySelector('#botResult'); const premiumPriceInput = premiumSection.querySelector('#premiumPriceInput');
  isPremiumCheck.addEventListener('change', () => { premiumOptions.style.display = isPremiumCheck.checked ? 'block' : 'none'; premiumSection.dataset.premium = isPremiumCheck.checked ? 'true' : 'false'; });
  analyzeBtn.addEventListener('click', () => { const state = window.__navaaUploadState || {}; const itemData = { title: titleInput?.value || '', desc: descInput?.value || '', tags: (tagsInput?.value || '').split(',').map(t => t.trim()).filter(Boolean), category: catSelect?.value || '', hasAudio: audioIn?.files?.length > 0, imageSize: state.getImageSize ? state.getImageSize() : 0, audioDuration: state.getAudioDuration ? state.getAudioDuration() : 0 }; if (!itemData.title) return alert('❌ اول عنوان!'); const result = botPriceItem(itemData); botResult.style.display = 'block'; botResult.innerHTML = `<div style="display:flex;justify-content:space-between;margin-bottom:.5rem;"><strong style="color:#ffc93c;">🤖 امتیاز: ${result.quality}</strong></div><div style="border-top:1px solid #2a2a2a;padding-top:.5rem;margin-bottom:.5rem;">${result.details.map(d => `<div style="display:flex;justify-content:space-between;padding:.15rem 0;"><span>${d.label}</span><span style="color:#00f0d4;">+${formatMoney(d.value)}</span></div>`).join('')}</div><div style="display:flex;justify-content:space-between;padding-top:.5rem;border-top:1px solid #2a2a2a;"><strong style="color:#fff;">💰 پیشنهادی:</strong><strong style="color:#00f0d4;font-size:1rem;">${formatMoney(result.suggestedPrice)} تومان</strong></div>`; premiumPriceInput.value = result.suggestedPrice; premiumSection.dataset.price = result.suggestedPrice; });
  premiumPriceInput.addEventListener('input', () => { let val = parseInt(premiumPriceInput.value) || 0; if (val > SETTINGS.maxItemPrice) { premiumPriceInput.value = SETTINGS.maxItemPrice; val = SETTINGS.maxItemPrice; } if (val < SETTINGS.minItemPrice && val > 0) { premiumPriceInput.value = SETTINGS.minItemPrice; val = SETTINGS.minItemPrice; } premiumSection.dataset.price = val; });
  window.__navaaPremium = { isPremium: false, price: 0 };
  isPremiumCheck.addEventListener('change', () => { window.__navaaPremium.isPremium = isPremiumCheck.checked; });
  premiumPriceInput.addEventListener('input', () => { window.__navaaPremium.price = parseInt(premiumPriceInput.value) || 0; });
  analyzeBtn.addEventListener('click', () => { setTimeout(() => { window.__navaaPremium.price = parseInt(premiumPriceInput.value) || 0; }, 100); });
}

// ================== 23. DETAIL MODAL ==================
function bindDetailModal() { const modal = document.getElementById('modal'); const audioEl = document.getElementById('modalAudio'); if (!modal) return; document.getElementById('modalClose').addEventListener('click', () => { audioEl.pause(); modal.classList.add('hidden'); }); modal.addEventListener('click', e => { if (e.target === modal) { audioEl.pause(); modal.classList.add('hidden'); } }); }
function openDetail(id) {
  const item = DB.items.find(p => p.id === id); if (!item) return; activeId = id;
  const isMyItem = item.uploadedByEmail === currentUser.email || item.uploadedBy === currentUser.id; const isAdminUser = currentUser.email === ADMIN_EMAIL || currentUser.role === 'admin'; const hasPurchased = (currentUser.purchasedItems || []).includes(item.id); const isPremium = item.isPremium && item.price > 0; const canView = !isPremium || isMyItem || isAdminUser || hasPurchased;
  document.getElementById('modalImg').src = item.image; document.getElementById('modalTitle').textContent = item.title; document.getElementById('modalArtist').textContent = item.artist ? `👤 ${item.artist}` : ''; document.getElementById('modalDesc').textContent = item.desc || ''; document.getElementById('modalTags').innerHTML = (item.tags || []).map(t => `<span class="tag">#${escapeHtml(t)}</span>`).join(''); document.getElementById('modalLikes').textContent = item.likes;
  let premiumInfo = document.getElementById('modalPremiumInfo'); if (!premiumInfo) { premiumInfo = document.createElement('div'); premiumInfo.id = 'modalPremiumInfo'; const actionsEl = document.querySelector('.modal-actions'); if (actionsEl) actionsEl.parentNode.insertBefore(premiumInfo, actionsEl); }
  if (isPremium) { premiumInfo.innerHTML = `<div style="background:linear-gradient(135deg,rgba(255,201,60,.1),rgba(255,140,0,.05));border:1.5px solid rgba(255,201,60,.4);border-radius:12px;padding:1rem;margin:.8rem 0;"><div style="display:flex;justify-content:space-between;"><strong style="color:#ffc93c;">💎 اثر ویژه</strong><strong style="color:#fff;font-size:1.2rem;">${formatMoney(item.price)} تومان</strong></div></div>`; } else premiumInfo.innerHTML = '';
  const audioWrap = document.getElementById('modalAudioWrap'); const audioEl = document.getElementById('modalAudio'); const modalImg = document.getElementById('modalImg');
  if (canView) { modalImg.style.filter = 'none'; modalImg.onclick = null; modalImg.style.cursor = 'default'; if (item.audio) { audioEl.src = item.audio; audioEl.load(); audioWrap.classList.remove('hidden'); } else { audioEl.pause(); audioEl.src = ''; audioWrap.classList.add('hidden'); } } else { modalImg.style.filter = 'blur(15px) brightness(0.5)'; audioEl.pause(); audioEl.src = ''; audioWrap.classList.add('hidden'); modalImg.style.cursor = 'pointer'; modalImg.onclick = () => openPurchaseModal(item.id); }
  const downloadBtn = document.getElementById('modalDownload'); downloadBtn.onclick = () => { if (isPremium && !canView) { openPurchaseModal(item.id); return; } downloadItem(item); }; downloadBtn.textContent = (isPremium && !canView) ? `🛍️ خرید به ${formatMoney(item.price)} تومان` : '⬇️ دانلود';
  const deleteBtn = document.getElementById('modalDelete'); const canDelete = item.uploadedBy !== 'system' && (isMyItem || isAdminUser);
  if (deleteBtn) { if (canDelete) { deleteBtn.classList.remove('hidden'); deleteBtn.style.display = 'inline-block'; deleteBtn.onclick = () => deleteItem(item.id); } else { deleteBtn.classList.add('hidden'); deleteBtn.style.display = 'none'; } }
  document.getElementById('modalLike').onclick = () => { toggleLike(item.id); document.getElementById('modalLikes').textContent = DB.items.find(p => p.id === id).likes; };
  document.getElementById('modal').classList.remove('hidden');
}

// ================== 24. DRAG SCROLL ==================
function enableDragScroll() {
  document.querySelectorAll('.h-row').forEach(row => {
    if (row.dataset.dragEnabled === 'true') return; row.dataset.dragEnabled = 'true';
    let isDown = false, startX = 0, scrollLeft = 0, moved = false;
    row.addEventListener('mousedown', e => { if (e.target.closest('button') || e.target.closest('a')) return; isDown = true; moved = false; row.classList.add('dragging'); startX = e.pageX - row.offsetLeft; scrollLeft = row.scrollLeft; e.preventDefault(); });
    row.addEventListener('mouseleave', () => { isDown = false; row.classList.remove('dragging'); });
    row.addEventListener('mouseup', () => { isDown = false; row.classList.remove('dragging'); });
    row.addEventListener('mousemove', e => { if (!isDown) return; const x = e.pageX - row.offsetLeft; const walk = (x - startX) * 1.5; if (Math.abs(walk) > 5) { moved = true; row.scrollLeft = scrollLeft - walk; e.preventDefault(); } });
    row.addEventListener('click', e => { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
    let tsx = 0, tsl = 0; row.addEventListener('touchstart', e => { tsx = e.touches[0].pageX; tsl = row.scrollLeft; }, { passive: true }); row.addEventListener('touchmove', e => { row.scrollLeft = tsl + (tsx - e.touches[0].pageX); }, { passive: true });
  });
}

// ============================================================
// 🚫 چک بن بودن کاربر
// ============================================================
(function checkBanned() {
  if (!currentUser) return;
  const users = JSON.parse(localStorage.getItem(USERS_KEY)) || [];
  const freshUser = users.find(u => u.email === currentUser.email);
  if (freshUser && freshUser.banned === true) {
    localStorage.removeItem(CURRENT_KEY);
    alert('🚫 حساب شما مسدود شده!\n\n' + (freshUser.bannedReason ? `دلیل: ${freshUser.bannedReason}\n\n` : '') + 'برای اطلاعات بیشتر با مدیر سایت تماس بگیرید.');
    window.location.href = 'home.html'; return;
  }
  if (freshUser) { currentUser.banned = freshUser.banned || false; localStorage.setItem(CURRENT_KEY, JSON.stringify(currentUser)); }
})();

// ================== 26. INIT ==================
loadSampleData();
initPremiumSection();
bindUploadModal();
setupUserHeader();
renderGallery();
updateSubBadge();
bindTopbar();
bindDetailModal();
bindSubModal();
renderBottomNav();

(function checkSubscribeParam() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('subscribe') === '1') { setTimeout(() => document.getElementById('subModal')?.classList.remove('hidden'), 500); }
})();

window.navaaConfig = { ADMIN_BANK_INFO, UPLOAD_REWARD, SETTINGS, REQUESTS_KEY, WITHDRAW_KEY, PURCHASES_KEY, TRANSFERS_KEY, USERS_KEY, SETTINGS_KEY, ADMIN_EMAIL };

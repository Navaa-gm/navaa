// ============================================================
// ══════════════════ Navaa — app.js ═════════════════════════
// ============================================================

// ================== 1. CONFIG ==================
const CURRENT_KEY = 'navaa_current_user';
const USERS_KEY = 'navaa_users';
const ITEMS_KEY = 'navaa_items_v3';
const ADMIN_EMAIL = 'm.soroush.salari@gmail.com';
const UPLOAD_REWARD = 5000;

let currentUser = JSON.parse(localStorage.getItem(CURRENT_KEY)) || null;
if (!currentUser) window.location.href = 'home.html';

// ================== 2. PLAN LIMITS ==================
const PLAN_LIMITS = {
  admin: { maxImageSize: Infinity, maxDailyUploads: Infinity, maxDailyTotalSize: Infinity, label: '🛡️ ادمین', color: '#ffc93c' },
  diamond: { maxImageSize: Infinity, maxDailyUploads: Infinity, maxDailyTotalSize: Infinity, label: '💎 الماسی', color: '#00f0d4' },
  silver: { maxImageSize: 250 * 1024 * 1024 * 1024, maxDailyUploads: 200, maxDailyTotalSize: 200 * 1024 * 1024 * 1024, label: '🥈 طلایی', color: '#ffc93c' },
  bronze: { maxImageSize: 20 * 1024 * 1024 * 1024, maxDailyUploads: 50, maxDailyTotalSize: 25 * 1024 * 1024 * 1024, label: '🥉 برنزی', color: '#cd7f32' }
};

let hasSubscription = currentUser.hasSubscription || false;
if (currentUser.email === ADMIN_EMAIL || currentUser.role === 'admin') hasSubscription = true;

const DB = { items: JSON.parse(localStorage.getItem(ITEMS_KEY)) || [] };
window.DB = DB;

function getUserPlanLimit() {
  if (currentUser.email === ADMIN_EMAIL || currentUser.role === 'admin') return PLAN_LIMITS.admin;
  if (hasSubscription && currentUser.subscriptionPlan) return PLAN_LIMITS[currentUser.subscriptionPlan] || PLAN_LIMITS.bronze;
  return PLAN_LIMITS.bronze;
}

function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
function formatMoney(n) { return Number(n || 0).toLocaleString('fa-IR'); }
function save() { try { localStorage.setItem(ITEMS_KEY, JSON.stringify(DB.items)); return true; } catch (e) { return false; } }
function formatLimitSize(bytes) {
  if (bytes === Infinity) return '∞ نامحدود';
  if (bytes >= 1024 * 1024 * 1024) return (bytes / 1024 / 1024 / 1024).toFixed(0) + ' گیگابایت';
  if (bytes >= 1024 * 1024) return (bytes / 1024 / 1024).toFixed(0) + ' مگابایت';
  if (bytes >= 1024) return (bytes / 1024).toFixed(0) + ' کیلوبایت';
  return bytes + ' بایت';
}

// ================== 3. REWARD & LIMITS ==================
function giveUploadReward(uploaderEmail) {
  const users = JSON.parse(localStorage.getItem(USERS_KEY)) || [];
  const uploaderIdx = users.findIndex(u => u.email === uploaderEmail);
  const adminIdx = users.findIndex(u => u.email === ADMIN_EMAIL);
  if (uploaderIdx === -1) return { success: false };
  
  const isUploaderAdmin = users[uploaderIdx].email === ADMIN_EMAIL || users[uploaderIdx].role === 'admin';
  users[uploaderIdx].balance = (users[uploaderIdx].balance || 0) + UPLOAD_REWARD;
  
  if (!isUploaderAdmin && adminIdx !== -1) { 
    users[adminIdx].balance = Math.max(0, (users[adminIdx].balance || 0) - UPLOAD_REWARD); 
  }
  
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  if (window.saveUsersToCloud) window.saveUsersToCloud();
  
  if (uploaderEmail === currentUser.email) {
    currentUser.balance = users[uploaderIdx].balance;
    localStorage.setItem(CURRENT_KEY, JSON.stringify(currentUser));
  }
  return { success: true, isAdmin: isUploaderAdmin };
}

function checkUploadPermission(fileSize) {
  if (currentUser.email === ADMIN_EMAIL || currentUser.role === 'admin' || hasSubscription) return { allowed: true };
  
  const currentMonth = new Date().getMonth();
  if (currentUser.lastUploadMonth !== currentMonth) {
    currentUser.monthlyUploads = 0;
    currentUser.lastUploadMonth = currentMonth;
    localStorage.setItem(CURRENT_KEY, JSON.stringify(currentUser));
  }
  
  if ((currentUser.monthlyUploads || 0) >= 50) {
    return { allowed: false, reason: '❌ سهمیه ۵۰ فایل رایگان ماهانه شما تمام شده!\nبرای آپلود بیشتر، لطفاً اشتراک تهیه کنید.' };
  }
  return { allowed: true };
}

// ================== 4. SUBCATS (اضافه شدن عکس پروفایل و تبلیغاتی) ==================
const SUBCATS = {
  music: {
    'music-pop':        { label: '🎵 پاپ' },
    'music-classic':    { label: '🎼 سنتی' },
    'music-rock':       { label: '🎸 راک' },
    'music-electronic': { label: '🎧 الکترونیک' },
    'music-classical':  { label: '🎻 کلاسیک' },
    'music-rap':        { label: '🎤 رپ' }
  },
  photo: {
    'photo-nature':    { label: '🌿 طبیعت' },
    'photo-arch':      { label: '🏛️ معماری' },
    'photo-bw':        { label: '⚫ سیاه و سفید' },
    'photo-animal':    { label: '🐾 حیوانات' },
    'photo-nostalgic': { label: '📻 نوستالژیک' },
    'photo-phone-bg':  { label: '📱 پس‌زمینه گوشی' },
    'photo-pc-bg':     { label: '💻 پس‌زمینه کامپیوتر' },
    'photo-profile':   { label: '👤 عکس پروفایل' },
    'photo-ad':        { label: '📢 عکس تبلیغاتی' }
  },
  car: {
    'car-super':      { label: '🏎️ سوپراسپرت' },
    'car-classic':    { label: '🚙 کلاسیک' },
    'car-offroad':    { label: '🚙 آفرود' },
    'car-sport':      { label: '🏁 اسپرت' },
    'car-luxury':     { label: '💎 لوکس' },
    'car-motorcycle': { label: '🏍️ موتور' }
  }
};

// ================== 5. GALLERY ==================
function setupUserHeader() { const greeting = document.getElementById('userGreeting'); if (greeting) greeting.textContent = currentUser.fullname; }

function renderGallery() {
  const gallery = document.getElementById('gallery'); if (!gallery) return;
  gallery.innerHTML = '';
  let list = [...DB.items].sort((a, b) => b.time - a.time);
  if (list.length === 0) { gallery.innerHTML = `<div class="empty"><h3>🎭 هنوز اثری نیست</h3><p>اولین اثر رو آپلود کن!</p></div>`; return; }
  
  list.forEach(item => {
    const card = document.createElement('div'); card.className = 'card';
    const isMyItem = item.uploadedByEmail === currentUser.email;
    card.innerHTML = `
      <img src="${item.image}" alt="" loading="lazy">
      <div class="card-actions">
        <button class="action-btn like-btn">${item.likedByMe ? '❤️' : '🤍'}</button>
        ${isMyItem || currentUser.role === 'admin' ? `<button class="action-btn delete-btn">🗑️</button>` : ''}
      </div>
      <div class="card-overlay">
        <p class="card-title">${escapeHtml(item.title)}</p>
        <p class="card-artist">👤 ${escapeHtml(item.artist)}</p>
        <div class="card-tags">${(item.tags || []).map(t => `#${escapeHtml(t)}`).join(' ')}</div>
      </div>
    `;
    card.querySelector('.delete-btn')?.addEventListener('click', e => { 
        e.stopPropagation(); 
        if(confirm('حذف بشه؟')) {
            DB.items = DB.items.filter(i => i.id !== item.id); 
            save(); 
            if(window.saveItemsToCloud) window.saveItemsToCloud(DB.items);
            renderGallery(); 
        }
    });
    gallery.appendChild(card);
  });
}

// ================== 6. UPLOAD MODAL (تگ‌های چندگانه و دسته‌بندی) ==================
function bindUploadModal() {
  const modal = document.getElementById('uploadModal'); 
  const form = document.getElementById('uploadForm');
  const catSel = document.getElementById('catSelect');
  
  if (!modal || !form) return;

  // پر کردن دسته‌بندی‌ها در فرم آپلود
  if (catSel) {
    let allSubs = [];
    Object.entries(SUBCATS).forEach(([main, subs]) => {
      Object.entries(subs).forEach(([key, val]) => allSubs.push(`<option value="${key}">${val.label}</option>`));
    });
    catSel.innerHTML = allSubs.join('');
  }

  document.getElementById('uploadClose')?.addEventListener('click', () => modal.classList.add('hidden'));
  document.getElementById('uploadBtn')?.addEventListener('click', () => modal.classList.remove('hidden'));
  
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const perm = checkUploadPermission(0);
    if (!perm.allowed) return alert(perm.reason);

    const titleValue = form.title.value.trim();
    if(!titleValue) return alert('عنوان رو وارد کن!');

    // 🔥 پردازش تگ‌ها (پشتیبانی از کامای فارسی و انگلیسی)
    const tagsInput = form.tags.value || '';
    const tagsArray = tagsInput.split(/[,،]/).map(t => t.trim()).filter(Boolean);

    // ساخت آبجکت اثر جدید
    const newItem = { 
        id: Date.now(), 
        image: 'https://via.placeholder.com/600', // فعلا عکس پیش‌فرض
        title: titleValue, 
        artist: form.artist.value.trim() || currentUser.fullname, 
        desc: form.desc.value.trim(),
        category: form.category.value,
        tags: tagsArray,
        time: Date.now(), 
        uploadedByEmail: currentUser.email, 
        likes: 0 
    };
    
    window.isUploading = true; // جلوگیری از پاک شدن موقع رفرش
    DB.items.push(newItem); 
    save();
    
    if (!hasSubscription && currentUser.email !== ADMIN_EMAIL) {
      currentUser.monthlyUploads = (currentUser.monthlyUploads || 0) + 1;
      localStorage.setItem(CURRENT_KEY, JSON.stringify(currentUser));
    }

    if (window.saveItemsToCloud) { 
        try { await window.saveItemsToCloud(DB.items); } catch(err) { console.error(err); } 
    }
    window.isUploading = false;
    
    const reward = giveUploadReward(currentUser.email);
    modal.classList.add('hidden'); 
    form.reset();
    renderGallery();
    alert('🎉 اثر منتشر شد!' + (reward.success ? `\n💰 +${formatMoney(UPLOAD_REWARD)} تومان` : ''));
  });
}

// ================== 7. BOTTOM NAV (اصلاح شده - دقیقا همون دکمه‌های اصلی) ==================
function renderBottomNav() {
  const nav = document.getElementById('bottomNav'); 
  if (!nav) return;
  
  const isAdminUser = currentUser.email === ADMIN_EMAIL || currentUser.role === 'admin';
  
  nav.innerHTML = `
    <button class="nav-pill-btn logout-pill" onclick="window.location.href='home.html'">
      <span class="nav-pill-icon">🚪</span><span class="nav-pill-label">خانه</span>
    </button>
    <button class="nav-pill-btn sub-pill ${hasSubscription ? 'is-active' : ''}" onclick="window.location.href='gallery.html?subscribe=1'">
      <span class="nav-pill-icon">✨</span><span class="nav-pill-label">اشتراک</span>
    </button>
    <a href="profile.html" class="nav-center-profile">
      <span class="nav-icon">👤</span><span class="nav-center-label">پروفایل</span>
    </a>
    ${isAdminUser ? `
      <button class="nav-pill-btn admin-pill" onclick="window.location.href='admin.html'">
        <span class="nav-pill-icon">🛡️</span><span class="nav-pill-label">مدیریت</span>
      </button>` : '<span style="width:60px;"></span>'}
    <button class="nav-pill-btn upload-pill" onclick="document.getElementById('uploadModal').classList.remove('hidden')">
      <span class="nav-pill-icon">➕</span><span class="nav-pill-label">آپلود اثر</span>
    </button>
  `;
}

// ================== 8. INIT ==================
setupUserHeader(); 
renderGallery(); 
bindUploadModal(); 
renderBottomNav();

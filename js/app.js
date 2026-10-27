// ============================================================
// ══════════════════ Navaa — app.js ═════════════════════════
// ============================================================

const CURRENT_KEY = 'navaa_current_user';
const USERS_KEY = 'navaa_users';
const ITEMS_KEY = 'navaa_items_v3';
const ADMIN_EMAIL = 'm.soroush.salari@gmail.com';
const UPLOAD_REWARD = 5000;

let currentUser = JSON.parse(localStorage.getItem(CURRENT_KEY)) || null;
if (!currentUser) window.location.href = 'home.html';

const PLAN_LIMITS = {
  admin: { maxImageSize: Infinity, maxDailyUploads: Infinity, maxDailyTotalSize: Infinity, label: '🛡️ ادمین' },
  diamond: { maxImageSize: Infinity, maxDailyUploads: Infinity, maxDailyTotalSize: Infinity, label: '💎 الماسی' },
  silver: { maxImageSize: 250 * 1024 * 1024 * 1024, maxDailyUploads: 200, maxDailyTotalSize: 200 * 1024 * 1024 * 1024, label: '🥈 طلایی' },
  bronze: { maxImageSize: 20 * 1024 * 1024 * 1024, maxDailyUploads: 50, maxDailyTotalSize: 25 * 1024 * 1024 * 1024, label: '🥉 برنزی' }
};

let hasSubscription = currentUser.hasSubscription || false;
if (currentUser.email === ADMIN_EMAIL) hasSubscription = true;

const DB = { items: JSON.parse(localStorage.getItem(ITEMS_KEY)) || [] };
window.DB = DB;

function getUserPlanLimit() {
  if (currentUser.email === ADMIN_EMAIL || currentUser.role === 'admin') return PLAN_LIMITS.admin;
  if (hasSubscription && currentUser.subscriptionPlan) return PLAN_LIMITS[currentUser.subscriptionPlan] || PLAN_LIMITS.bronze;
  return PLAN_LIMITS.bronze;
}

function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
function formatMoney(n) { return Number(n).toLocaleString('fa-IR'); }
function save() { try { localStorage.setItem(ITEMS_KEY, JSON.stringify(DB.items)); return true; } catch (e) { return false; } }

// 🎁 هدیه آپلود
function giveUploadReward(uploaderEmail) {
  const users = JSON.parse(localStorage.getItem(USERS_KEY)) || [];
  const uploaderIdx = users.findIndex(u => u.email === uploaderEmail);
  const adminIdx = users.findIndex(u => u.email === ADMIN_EMAIL);
  if (uploaderIdx === -1) return { success: false };
  const isUploaderAdmin = users[uploaderIdx].email === ADMIN_EMAIL || users[uploaderIdx].role === 'admin';
  users[uploaderIdx].balance = (users[uploaderIdx].balance || 0) + UPLOAD_REWARD;
  if (!isUploaderAdmin && adminIdx !== -1) { users[adminIdx].balance = Math.max(0, (users[adminIdx].balance || 0) - UPLOAD_REWARD); }
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  if (window.saveUsersToCloud) window.saveUsersToCloud();
  if (uploaderEmail === currentUser.email) {
    currentUser.balance = users[uploaderIdx].balance;
    localStorage.setItem(CURRENT_KEY, JSON.stringify(currentUser));
  }
  return { success: true, isAdmin: isUploaderAdmin };
}

// 📊 سیستم ۵۰ فایل رایگان
function checkUploadPermission() {
  if (currentUser.email === ADMIN_EMAIL || currentUser.role === 'admin' || hasSubscription) return { allowed: true };
  
  const currentMonth = new Date().getMonth();
  if (currentUser.lastUploadMonth !== currentMonth) {
    currentUser.monthlyUploads = 0;
    currentUser.lastUploadMonth = currentMonth;
    localStorage.setItem(CURRENT_KEY, JSON.stringify(currentUser));
  }
  if ((currentUser.monthlyUploads || 0) >= 50) {
    return { allowed: false, reason: '❌ سهمیه ۵۰ فایل رایگان ماهانه شما تمام شده!\nبرای آپلود بیشتر، اشتراک تهیه کنید.' };
  }
  return { allowed: true };
}

function updateSubBadge() { /* خالی */ }
function setupUserHeader() { const greeting = document.getElementById('userGreeting'); if (greeting) greeting.textContent = currentUser.fullname; }

// ✅ گالری
function renderGallery() {
  const gallery = document.getElementById('gallery'); if (!gallery) return;
  gallery.innerHTML = '';
  let list = [...DB.items].sort((a, b) => b.time - a.time);
  if (list.length === 0) { gallery.innerHTML = `<div class="empty"><h3>🎭 هنوز اثری نیست</h3></div>`; return; }
  list.forEach(item => {
    const card = document.createElement('div'); card.className = 'card';
    const isMyItem = item.uploadedByEmail === currentUser.email;
    card.innerHTML = `<img src="${item.image}" alt=""><div class="card-actions"><button class="action-btn like-btn">${item.likedByMe ? '❤️' : '🤍'}</button>${isMyItem || currentUser.role === 'admin' ? `<button class="action-btn delete-btn">🗑️</button>` : ''}</div><div class="card-overlay"><p class="card-title">${escapeHtml(item.title)}</p><p class="card-artist">👤 ${escapeHtml(item.artist)}</p></div>`;
    card.querySelector('.delete-btn')?.addEventListener('click', e => { e.stopPropagation(); DB.items = DB.items.filter(i => i.id !== item.id); save(); renderGallery(); });
    gallery.appendChild(card);
  });
}

// ✅ فرم آپلود
function bindUploadModal() {
  const modal = document.getElementById('uploadModal'); const form = document.getElementById('uploadForm');
  if (!modal || !form) return;
  document.getElementById('uploadClose').addEventListener('click', () => modal.classList.add('hidden'));
  document.getElementById('uploadBtn')?.addEventListener('click', () => modal.classList.remove('hidden'));
  
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const perm = checkUploadPermission();
    if (!perm.allowed) return alert(perm.reason);

    const newItem = { id: Date.now(), image: 'https://via.placeholder.com/600', title: form.title.value || 'بدون عنوان', artist: currentUser.fullname, time: Date.now(), uploadedByEmail: currentUser.email, likes: 0 };
    DB.items.push(newItem); save();
    
    if (!hasSubscription && currentUser.email !== ADMIN_EMAIL) {
      currentUser.monthlyUploads = (currentUser.monthlyUploads || 0) + 1;
      localStorage.setItem(CURRENT_KEY, JSON.stringify(currentUser));
    }

    if (window.saveItemsToCloud) { try { await window.saveItemsToCloud(DB.items); } catch(err) { console.error(err); } }
    
    const reward = giveUploadReward(currentUser.email);
    modal.classList.add('hidden'); renderGallery();
    alert('🎉 اثر منتشر شد!' + (reward.success ? `\n💰 +${formatMoney(UPLOAD_REWARD)} تومان` : ''));
  });
}

// ✅ نوار پایین
function renderBottomNav() {
  const nav = document.getElementById('bottomNav'); if (!nav) return;
  nav.innerHTML = `<button class="nav-pill-btn" onclick="window.location.href='profile.html'">👤 پروفایل</button><button class="nav-pill-btn" onclick="window.location.href='admin.html'">🛡️ مدیریت</button>`;
}

setupUserHeader(); renderGallery(); bindUploadModal(); renderBottomNav();

// ============================================================
// ══════════════════ Navaa — app.js ═════════════════════════
// ============================================================

const CURRENT_KEY = 'navaa_current_user';
const USERS_KEY = 'navaa_users';
const ITEMS_KEY = 'navaa_items_v3';
const ADMIN_EMAIL = 'm.soroush.salari@gmail.com';
const UPLOAD_REWARD = 5000;
const SETTINGS = { commissionRate: 15, maxItemPrice: 500000, minItemPrice: 5000 };

// 🎨 پالت تم (شیشه + فیروزه‌ای + قرمز)
const THEME = {
  turquoise: '#00f0d4',
  sky: '#38bdf8',
  gold: '#ffc93c',
  red: '#ff2e4d',
  glassBg: 'linear-gradient(160deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
  glassBorder: 'rgba(255,255,255,0.1)',
  redGlow: 'rgba(255,46,77,0.35)',
  turquoiseGlow: 'rgba(0,240,212,0.35)'
};

let currentUser = JSON.parse(localStorage.getItem(CURRENT_KEY)) || null;
if (!currentUser) window.location.href = 'home.html';

const PLAN_LIMITS = {
  admin: { maxImageSize: Infinity, maxDailyUploads: Infinity, label: '🛡️ ادمین' },
  diamond: { maxImageSize: Infinity, maxDailyUploads: Infinity, label: '💎 الماسی' },
  silver: { maxImageSize: 250 * 1024 * 1024 * 1024, maxDailyUploads: 200, label: '🥈 طلایی' },
  bronze: { maxImageSize: 20 * 1024 * 1024 * 1024, maxDailyUploads: 50, label: '🥉 برنزی' }
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

function escapeHtml(s) { return String(s || '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
function formatMoney(n) { return Number(n || 0).toLocaleString('fa-IR'); }
function save() { try { localStorage.setItem(ITEMS_KEY, JSON.stringify(DB.items)); return true; } catch (e) { return false; } }

async function syncCurrentUserToArray() {
    let users = await window.getUsersFromCloud() || [];
    if (users.length === 0) users = JSON.parse(localStorage.getItem(USERS_KEY)) || [];

    const idx = users.findIndex(u => u.email === currentUser.email);
    if (idx !== -1) {
        users[idx] = { ...users[idx], ...currentUser };
        await window.saveUsersToCloud(users);
    }
}

async function giveUploadReward(uploaderEmail) {
  let users = await window.getUsersFromCloud() || [];
  if (users.length === 0) users = JSON.parse(localStorage.getItem(USERS_KEY)) || [];

  const uploaderIdx = users.findIndex(u => u.email === uploaderEmail);
  const adminIdx = users.findIndex(u => u.email === ADMIN_EMAIL);
  if (uploaderIdx === -1) return { success: false };

  const isUploaderAdmin = users[uploaderIdx].email === ADMIN_EMAIL || users[uploaderIdx].role === 'admin';
  users[uploaderIdx].balance = (users[uploaderIdx].balance || 0) + UPLOAD_REWARD;

  if (!isUploaderAdmin && adminIdx !== -1) {
    users[adminIdx].balance = Math.max(0, (users[adminIdx].balance || 0) - UPLOAD_REWARD);
  }

  await window.saveUsersToCloud(users);

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
    syncCurrentUserToArray();
  }

  if ((currentUser.monthlyUploads || 0) >= 50) {
    return { allowed: false, reason: '❌ سهمیه ۵۰ فایل رایگان ماهانه شما تمام شده!\nبرای آپلود بیشتر، لطفاً اشتراک تهیه کنید.' };
  }
  return { allowed: true };
}

const SUBCATS = {
  music: { 'music-pop': { label: '🎵 پاپ' }, 'music-classic': { label: '🎼 سنتی' }, 'music-rock': { label: '🎸 راک' }, 'music-electronic': { label: '🎧 الکترونیک' }, 'music-classical': { label: '🎻 کلاسیک' }, 'music-rap': { label: '🎤 رپ' } },
  photo: { 'photo-nature': { label: '🌿 طبیعت' }, 'photo-arch': { label: '🏛️ معماری' }, 'photo-bw': { label: '⚫ سیاه و سفید' }, 'photo-animal': { label: '🐾 حیوانات' }, 'photo-nostalgic': { label: '📻 نوستالژیک' }, 'photo-phone-bg': { label: '📱 پس‌زمینه گوشی' }, 'photo-pc-bg': { label: '💻 پس‌زمینه کامپیوتر' }, 'photo-profile': { label: '👤 عکس پروفایل' }, 'photo-ad': { label: '📢 عکس تبلیغاتی' } },
  car: { 'car-super': { label: '🏎️ سوپراسپرت' }, 'car-classic': { label: '🚙 کلاسیک' }, 'car-offroad': { label: '🚙 آفرود' }, 'car-sport': { label: '🏁 اسپرت' }, 'car-luxury': { label: '💎 لوکس' }, 'car-motorcycle': { label: '🏍️ موتور' } }
};

function setupUserHeader() { const greeting = document.getElementById('userGreeting'); if (greeting) greeting.textContent = currentUser.fullname; }

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

function makeSVG(color1, color2, emoji, label) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${color1}"/><stop offset="100%" stop-color="${color2}"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><text x="50%" y="45%" font-size="180" text-anchor="middle" dominant-baseline="middle">${emoji}</text><text x="50%" y="75%" font-size="34" fill="rgba(255,255,255,0.9)" text-anchor="middle" font-family="Vazirmatn,sans-serif" font-weight="700">${label}</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

function botPriceItem(itemData) {
  const details = []; let basePrice = 10000; details.push({ label: 'قیمت پایه', value: basePrice });
  if (itemData.hasAudio) { basePrice += 30000; details.push({ label: '🎵 فایل صوتی', value: 30000 }); }
  const titleLen = (itemData.title || '').trim().length;
  if (titleLen > 20) { basePrice += 15000; details.push({ label: '✏️ عنوان توصیفی', value: 15000 }); }
  else if (titleLen > 10) { basePrice += 7000; details.push({ label: '✏️ عنوان مناسب', value: 7000 }); }
  const descLen = (itemData.desc || '').trim().length;
  if (descLen > 100) { basePrice += 20000; details.push({ label: '📝 توضیحات کامل', value: 20000 }); }
  else if (descLen > 40) { basePrice += 10000; details.push({ label: '📝 توضیحات مناسب', value: 10000 }); }
  
  const categoryWeights = { music: 1.4, photo: 1.2, car: 1.0 };
  const mainCat = (itemData.category || '').split('-')[0];
  const weight = categoryWeights[mainCat] || 1.0;
  if (weight > 1) { const bonus = Math.round(basePrice * (weight - 1)); details.push({ label: `⭐ کیفیت ${mainCat === 'music' ? 'موسیقی' : 'عکس'}`, value: bonus }); basePrice = Math.round(basePrice * weight); }
  
  const finalPrice = Math.min(basePrice, SETTINGS.maxItemPrice);
  return { suggestedPrice: finalPrice, details: details, quality: finalPrice >= 100000 ? 'A+' : finalPrice >= 50000 ? 'A' : finalPrice >= 25000 ? 'B' : 'C' };
}

function initPremiumSection() {
  const modal = document.getElementById('uploadModal'); if (!modal) return;
  const premiumSection = document.getElementById('premiumSection'); if (!premiumSection) return;

  premiumSection.innerHTML = `
    <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.8rem;">
      <input type="checkbox" id="isPremiumCheck" style="width:18px;height:18px;accent-color:#ff2e4d;cursor:pointer;">
      <label for="isPremiumCheck" style="color:#fff;font-weight:700;font-size:.9rem;cursor:pointer;">💎 این اثر رو ویژه بذار</label>
    </div>
    <div id="premiumOptions" style="display:none;">
      <button type="button" id="analyzeBtn" class="btn-primary" style="width:100%;padding:.85rem;font-size:.9rem;margin-bottom:.8rem;background:linear-gradient(135deg,#ffc93c,#ff2e4d);color:#1a1100;border:none;border-radius:12px;font-family:inherit;font-weight:800;cursor:pointer;box-shadow:0 6px 20px rgba(255,46,77,0.3);transition:all .25s;">🤖 تحلیل ربات</button>
      <div id="botResult" style="display:none;background:rgba(255,255,255,0.05);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:.9rem;margin-bottom:.8rem;font-size:.8rem;color:#a0a0a0;"></div>
      <label style="display:block;font-size:.82rem;color:#fff;font-weight:700;margin-bottom:.4rem;">💰 قیمت نهایی (تومان):</label>
      <input type="number" id="premiumPriceInput" min="5000" max="500000" placeholder="حداکثر ۵۰۰,۰۰۰" style="width:100%;padding:.85rem 1rem;background:rgba(0,0,0,0.35);border:1.5px solid rgba(255,255,255,0.1);border-radius:12px;color:#ffc93c;font-family:inherit;font-size:1rem;text-align:center;font-weight:800;outline:none;">
    </div>`;

  const isPremiumCheck = premiumSection.querySelector('#isPremiumCheck');
  const premiumOptions = premiumSection.querySelector('#premiumOptions');
  const analyzeBtn = premiumSection.querySelector('#analyzeBtn');
  const botResult = premiumSection.querySelector('#botResult');
  const premiumPriceInput = premiumSection.querySelector('#premiumPriceInput');

  window.__navaaPremium = { isPremium: false, price: 0 };

  isPremiumCheck.addEventListener('change', () => {
    premiumOptions.style.display = isPremiumCheck.checked ? 'block' : 'none';
    window.__navaaPremium.isPremium = isPremiumCheck.checked;
  });

  analyzeBtn.addEventListener('click', () => {
    const titleInput = modal.querySelector('input[name="title"]');
    const descInput = modal.querySelector('textarea[name="desc"]');
    const catSelect = document.getElementById('catSelect');

    const itemData = {
      title: titleInput?.value || '',
      desc: descInput?.value || '',
      category: catSelect?.value || '',
      hasAudio: false
    };

    if (!itemData.title) return alert('❌ اول عنوان!');
    const result = botPriceItem(itemData);

    botResult.style.display = 'block';
    botResult.innerHTML = `
      <div style="display:flex;justify-content:space-between;margin-bottom:.5rem;">
        <strong style="color:#ffc93c;font-weight:800;">🤖 امتیاز: ${result.quality}</strong>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:baseline;padding-top:.5rem;border-top:1px solid rgba(255,255,255,0.1);">
        <strong style="color:#fff;">💰 پیشنهادی:</strong>
        <strong style="color:#00f0d4;font-weight:900;">${formatMoney(result.suggestedPrice)} تومان</strong>
      </div>`;

    premiumPriceInput.value = result.suggestedPrice;
    window.__navaaPremium.price = result.suggestedPrice;
  });
}

window.toggleItemVisibility = async function(id) {
    window.isUploading = true;
    let items = [...DB.items];
    const idx = items.findIndex(i => i.id === id);
    if (idx !== -1) {
        items[idx].isHidden = !items[idx].isHidden;
        DB.items = items;
        save();
        renderGallery();
        if (window.updateItemInCloud) await window.updateItemInCloud(items[idx]);
    }
    window.isUploading = false;
};

window.toggleLikeItem = async function(itemId) {
  let me = currentUser;
  if (!me || !me.email) return alert('برای لایک باید وارد حساب بشی!');

  let items = DB.items;
  if (window.getItemsFromCloud) {
    try {
      const cloudItems = await window.getItemsFromCloud();
      if (Array.isArray(cloudItems) && cloudItems.length) items = cloudItems;
    } catch (e) {}
  }

  const idx = items.findIndex(i => String(i.id) === String(itemId));
  if (idx === -1) return alert('❌ اثر پیدا نشد!');

  const item = { ...items[idx] };
  item.likedBy = Array.isArray(item.likedBy) ? [...item.likedBy] : [];
  item.likes = Number(item.likes || 0);

  const likedIdx = item.likedBy.indexOf(me.email);
  if (likedIdx >= 0) {
    item.likedBy.splice(likedIdx, 1);
    item.likes = Math.max(0, item.likes - 1);
  } else {
    item.likedBy.push(me.email);
    item.likes += 1;
  }

  const localIdx = DB.items.findIndex(i => String(i.id) === String(itemId));
  if (localIdx >= 0) DB.items[localIdx] = item;
  save();
  renderGallery();

  try {
    if (window.updateItemInCloud) await window.updateItemInCloud(item);
  } catch (e) { console.error(e); }
};

window.shareItemById = async function(itemId) {
  const item = DB.items.find(i => String(i.id) === String(itemId));
  if (!item) return alert('❌ اثر پیدا نشد!');

  const url = `${location.origin}${location.pathname}?item=${encodeURIComponent(item.id)}`;
  try {
    if (navigator.share) await navigator.share({ title: item.title, url });
    else if (navigator.clipboard) { await navigator.clipboard.writeText(url); alert('✅ لینک کپی شد!'); }
    else prompt('لینک اثر:', url);
  } catch (e) { console.error(e); }
};

// ✏️ قابلیت ویرایش اثر
window.editItem = function(id) {
  const item = DB.items.find(i => String(i.id) === String(id));
  if (!item) return;

  // باز کردن مودال آپلود
  const uploadModal = document.getElementById('uploadModal');
  const form = document.getElementById('uploadForm');
  if (!uploadModal || !form) return;

  window.__editItemId = id;
  
  // تغییر عنوان مودال
  const modalTitle = uploadModal.querySelector('h2');
  if (modalTitle) modalTitle.textContent = 'ویرایش اثر';

  // پر کردن فیلدها
  form.querySelector('input[name="title"]').value = item.title || '';
  form.querySelector('input[name="artist"]').value = item.artist || '';
  form.querySelector('textarea[name="desc"]').value = item.desc || '';
  form.querySelector('select[name="category"]').value = item.category || '';
  
  // هشتگ‌ها
  const hashtagsInput = document.getElementById('hashtagsInput');
  if (hashtagsInput) {
    hashtagsInput.value = (item.hashtags || []).join(' ');
    hashtagsInput.dispatchEvent(new Event('input'));
  }

  // عکس و صدا (فقط برای نمایش، چون فایل در فرم آپلود نمی‌شود)
  if (item.image && !item.image.startsWith('data:image/svg')) {
     const previewWrap = document.getElementById('previewWrap');
     const preview = document.getElementById('preview');
     if (previewWrap && preview) {
        preview.src = item.image;
        previewWrap.classList.remove('hidden');
        window.compressedImageData = item.image;
     }
  }

  uploadModal.classList.remove('hidden');
};

function openDetail(id) {
  const item = DB.items.find(p => p.id === id);
  if (!item) return;

  document.getElementById('modalImg').src = item.image;
  document.getElementById('modalTitle').textContent = item.title;
  document.getElementById('modalArtist').textContent = item.artist ? `👤 ${item.artist}` : '';
  document.getElementById('modalDesc').textContent = item.desc || '';
  
  const allTags = item.hashtags || [];
  document.getElementById('modalTags').innerHTML = allTags.map(t => `<span class="tag">#${escapeHtml(t.replace(/^#+/,''))}</span>`).join('');

  const likesCount = item.likes || 0;
  const likedByMe = Array.isArray(item.likedBy) && item.likedBy.includes(currentUser.email);
  document.getElementById('modalLikes').textContent = likesCount.toLocaleString('fa-IR');
  
  const modalLikeBtn = document.getElementById('modalLike');
  if (modalLikeBtn) {
    if (likedByMe) modalLikeBtn.classList.add('liked');
    else modalLikeBtn.classList.remove('liked');
    modalLikeBtn.onclick = () => window.toggleLikeItem(item.id);
  }

  const modalShareBtn = document.getElementById('modalShare');
  if (modalShareBtn) modalShareBtn.onclick = () => window.shareItemById(item.id);

  const audioWrap = document.getElementById('modalAudioWrap');
  const audioEl = document.getElementById('modalAudio');
  if (item.audio) { audioEl.src = item.audio; audioWrap.classList.remove('hidden'); }
  else { audioEl.pause(); audioEl.src = ''; audioWrap.classList.add('hidden'); }

  const deleteBtn = document.getElementById('modalDelete');
  const editBtn = document.getElementById('modalEdit');
  const isMyItem = item.uploadedByEmail === currentUser.email;
  const isAdminUser = currentUser.email === ADMIN_EMAIL || currentUser.role === 'admin';

  if (isMyItem || isAdminUser) {
    deleteBtn.style.display = 'inline-block';
    deleteBtn.onclick = async () => {
      if (confirm('حذف بشه؟')) {
        window.isUploading = true;
        DB.items = DB.items.filter(p => p.id !== id);
        save();
        if (window.deleteItemFromCloud) await window.deleteItemFromCloud(id);
        window.isUploading = false;
        document.getElementById('modal').classList.add('hidden');
        renderGallery();
      }
    };
    if (editBtn) {
      editBtn.style.display = 'inline-block';
      editBtn.onclick = () => {
        document.getElementById('modal').classList.add('hidden');
        window.editItem(item.id);
      };
    }
  } else {
    deleteBtn.style.display = 'none';
    if (editBtn) editBtn.style.display = 'none';
  }

  document.getElementById('modal').classList.remove('hidden');
}

function bindDetailModal() {
  const modal = document.getElementById('modal');
  const audioEl = document.getElementById('modalAudio');
  if (!modal) return;

  const closeModal = () => { if(audioEl) audioEl.pause(); modal.classList.add('hidden'); };
  document.getElementById('modalClose')?.addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
}

function renderGallery() {
  const gallery = document.getElementById('gallery'); if (!gallery) return;
  gallery.innerHTML = '';

  const isAdminUser = currentUser.email === ADMIN_EMAIL || currentUser.role === 'admin';
  let list = [...DB.items].sort((a, b) => b.time - a.time);

  list = list.filter(item => {
    const isMyItem = item.uploadedByEmail === currentUser.email;
    if (item.isHidden && !isMyItem && !isAdminUser) return false;
    return true;
  });

  if (list.length === 0) {
    gallery.innerHTML = `<div class="empty"><h3>🎭 هنوز اثری نیست</h3><p>اولین اثر رو آپلود کن!</p></div>`;
    return;
  }

  list.forEach(item => {
    const card = document.createElement('div'); card.className = 'card';
    const isMyItem = item.uploadedByEmail === currentUser.email;

    const likedByMe = Array.isArray(item.likedBy) && item.likedBy.includes(currentUser.email);
    const likesCount = Number(item.likes || 0);
    const hashtagsList = Array.isArray(item.hashtags) ? item.hashtags : [];

    card.innerHTML = `
      <img src="${item.image}" alt="" loading="lazy">
      ${item.isPremium ? '<span class="premium-badge">💎 ویژه</span>' : ''}
      ${item.isHidden ? '<span class="hidden-badge">🙈 مخفی</span>' : ''}
      <div class="card-actions">
        <button class="action-btn like-btn ${likedByMe ? 'liked' : ''}" title="لایک">
          ${likedByMe ? '❤️' : '🤍'} <span class="like-count">${likesCount.toLocaleString('fa-IR')}</span>
        </button>
        ${isMyItem || isAdminUser ? `<button class="action-btn delete-btn" title="حذف">🗑️</button>` : ''}
        ${isMyItem ? `<button class="action-btn visibility-btn" data-id="${item.id}">${item.isHidden ? '👁️' : '🙈'}</button>` : ''}
      </div>
      <div class="card-overlay">
        <p class="card-title">${escapeHtml(item.title)}</p>
        <p class="card-artist">👤 ${escapeHtml(item.artist)}</p>
        <div class="card-tags">${hashtagsList.slice(0, 5).map(t => `#${escapeHtml(String(t).replace(/^#+/, ''))}`).join(' ')}</div>
      </div>
    `;

    card.addEventListener('click', (e) => { if (!e.target.closest('.action-btn')) openDetail(item.id); });

    card.querySelector('.like-btn')?.addEventListener('click', async e => { e.stopPropagation(); await window.toggleLikeItem(item.id); });
    card.querySelector('.delete-btn')?.addEventListener('click', async e => {
        e.stopPropagation();
        if(confirm('حذف بشه؟')) {
            DB.items = DB.items.filter(i => i.id !== item.id); save(); renderGallery();
            if (window.deleteItemFromCloud) await window.deleteItemFromCloud(item.id);
        }
    });
    card.querySelector('.visibility-btn')?.addEventListener('click', e => { e.stopPropagation(); if (window.toggleItemVisibility) window.toggleItemVisibility(item.id); });

    gallery.appendChild(card);
  });
}

function normalizeHashtags(raw) {
  const parts = String(raw || '').split(/[\s,،]+/).map(t => t.trim().replace(/^#+/, '').replace(/[^\p{L}\p{N}_]/gu, '')).filter(Boolean);
  const unique = [...new Set(parts)];
  return unique.slice(0, 5).map(t => '#' + t);
}

function bindUploadModal() {
  const modal = document.getElementById('uploadModal');
  const form = document.getElementById('uploadForm');
  const catSel = document.getElementById('catSelect');
  const fileIn = document.getElementById('fileInput');
  const audioIn = document.getElementById('audioInput');
  const preview = document.getElementById('preview');
  const previewWrap = document.getElementById('previewWrap');
  const previewRemove = document.getElementById('previewRemove');
  const audioFileBox = document.getElementById('audioFileBox');
  const audioFileName = document.getElementById('audioFileName');
  const audioFileRemove = document.getElementById('audioFileRemove');

  if (!modal || !form) return;

  if (catSel) {
    let allSubs = [];
    Object.entries(SUBCATS).forEach(([main, subs]) => {
      Object.entries(subs).forEach(([key, val]) => allSubs.push(`<option value="${key}">${val.label}</option>`));
    });
    catSel.innerHTML = allSubs.join('');
  }

  let compressedImageData = null;
  window.compressedImageData = null;

  const closeModal = () => {
    modal.classList.add('hidden');
    form.reset();
    if (previewWrap) previewWrap.classList.add('hidden');
    if (audioFileBox) audioFileBox.classList.add('hidden');
    compressedImageData = null;
    window.compressedImageData = null;
    window.__pendingHashtags = null;
    window.__editItemId = null;
    const modalTitle = modal.querySelector('h2');
    if (modalTitle) modalTitle.textContent = 'آپلود اثر جدید';
  };

  document.getElementById('uploadClose')?.addEventListener('click', closeModal);
  document.getElementById('cancelUploadBtn')?.addEventListener('click', closeModal);

  fileIn?.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    compressImage(file, 800, 0.7).then(compressed => {
      compressedImageData = compressed;
      window.compressedImageData = compressed;
      preview.src = compressed;
      previewWrap.classList.remove('hidden');
    });
  });

  previewRemove?.addEventListener('click', () => { fileIn.value = ''; preview.src = ''; previewWrap.classList.add('hidden'); compressedImageData = null; window.compressedImageData = null; });
  audioIn?.addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) { audioFileName.textContent = file.name; audioFileBox.classList.remove('hidden'); }
    else { audioFileBox.classList.add('hidden'); }
  });
  audioFileRemove?.addEventListener('click', () => { audioIn.value = ''; audioFileName.textContent = ''; audioFileBox.classList.add('hidden'); });

  form.addEventListener('submit', async e => {
    e.preventDefault();

    const imageFile = fileIn.files[0];
    const audioFile = audioIn ? audioIn.files[0] : null;
    if (!imageFile && !audioFile && !window.__editItemId) return alert('حداقل یه تصویر یا یه فایل صوتی انتخاب کن!');

    const titleValue = form.title.value.trim();
    if(!titleValue) return alert('عنوان رو وارد کن!');

    let hashtagsArr = [];
    const hiddenHashtags = form.querySelector('input[name="hashtags"]');
    if (hiddenHashtags && hiddenHashtags.value) {
      try { hashtagsArr = JSON.parse(hiddenHashtags.value); } catch (err) { hashtagsArr = String(hiddenHashtags.value).split(/[\s,،]+/); }
    }
    if (!hashtagsArr.length && Array.isArray(window.__pendingHashtags)) hashtagsArr = window.__pendingHashtags;
    hashtagsArr = normalizeHashtags(hashtagsArr.join(' '));

    const isPremium = window.__navaaPremium?.isPremium === true;
    const itemPrice = isPremium ? parseInt(window.__navaaPremium?.price || 0) : 0;

    const finish = async (finalImage, audioData) => {
      if (window.__editItemId) {
        // حالت ویرایش
        const idx = DB.items.findIndex(i => String(i.id) === String(window.__editItemId));
        if (idx !== -1) {
           DB.items[idx].title = titleValue;
           DB.items[idx].artist = form.artist.value.trim() || currentUser.fullname;
           DB.items[idx].desc = form.desc.value.trim();
           DB.items[idx].category = form.category.value;
           DB.items[idx].hashtags = hashtagsArr;
           DB.items[idx].isPremium = isPremium;
           DB.items[idx].price = itemPrice;
           if (finalImage) DB.items[idx].image = finalImage;
           if (audioData) DB.items[idx].audio = audioData;
           
           if (window.updateItemInCloud) await window.updateItemInCloud(DB.items[idx]);
           save();
           closeModal();
           renderGallery();
           alert('✅ اثر با موفقیت ویرایش شد!');
           return;
        }
      }

      // حالت آپلود جدید
      const newItem = {
          id: Date.now(),
          image: finalImage || makeSVG(THEME.turquoise, THEME.red, '🎵', 'صوتی'),
          audio: audioData || null,
          title: titleValue,
          artist: form.artist.value.trim() || currentUser.fullname,
          desc: form.desc.value.trim(),
          category: form.category.value,
          hashtags: hashtagsArr,
          isPremium: isPremium,
          price: itemPrice,
          time: Date.now(),
          uploadedByEmail: currentUser.email,
          likes: 0,
          likedBy: [],
          isHidden: false
      };

      let success = true;
      if (window.addItemToCloud) success = await window.addItemToCloud(newItem);
      else { DB.items.push(newItem); save(); }

      if (!success) return;

      if (!hasSubscription && currentUser.email !== ADMIN_EMAIL) {
        currentUser.monthlyUploads = (currentUser.monthlyUploads || 0) + 1;
        localStorage.setItem(CURRENT_KEY, JSON.stringify(currentUser));
        await syncCurrentUserToArray();
      }

      const reward = await giveUploadReward(currentUser.email);
      closeModal();
      alert('🎉 اثر منتشر شد!' + (reward.success ? `\n💰 +${formatMoney(UPLOAD_REWARD)} تومان` : ''));
    };

    if (audioFile) {
      const r = new FileReader();
      r.onload = ev => finish(compressedImageData, ev.target.result);
      r.readAsDataURL(audioFile);
    } else {
      finish(compressedImageData, null);
    }
  });
}

function renderBottomNav() {
  const nav = document.getElementById('bottomNav');
  if (!nav) return;

  const isAdminUser = currentUser.email === ADMIN_EMAIL || currentUser.role === 'admin';
  let savedAvatar = localStorage.getItem('navaa_avatar_' + currentUser.email) || currentUser.avatar;
  const profileContent = savedAvatar ? `<div class="profile-btn-avatar" style="background-image: url('${savedAvatar}');"></div>` : `<span class="nav-icon">👤</span>`;

  nav.innerHTML = `
    <button class="nav-pill-btn logout-pill" onclick="window.location.href='home.html'">
      <span class="nav-pill-icon">🚪</span><span class="nav-pill-label">خانه</span>
    </button>
    <button class="nav-pill-btn sub-pill ${hasSubscription ? 'is-active' : ''}" onclick="document.getElementById('subModal').classList.remove('hidden')">
      <span class="nav-pill-icon">✨</span><span class="nav-pill-label">اشتراک</span>
    </button>
    <a href="profile.html" class="nav-center-profile">
      ${profileContent}<span class="nav-center-label">پروفایل</span>
    </a>
    ${isAdminUser ? `
      <button class="nav-pill-btn admin-pill" onclick="window.location.href='admin.html'">
        <span class="nav-pill-icon">🛡️</span><span class="nav-pill-label">مدیریت</span>
      </button>` : '<span style="width:60px;"></span>'}
    <button class="nav-pill-btn upload-pill" id="uploadNavBtn">
      <span class="nav-pill-icon">➕</span><span class="nav-pill-label">آپلود اثر</span>
    </button>
  `;

  nav.querySelector('#uploadNavBtn')?.addEventListener('click', () => {
      if (!hasSubscription) { window.location.href = 'gallery.html?subscribe=1'; return; }
      window.location.href = 'gallery.html';
  });
}

setupUserHeader();
initPremiumSection();
renderGallery();
renderBottomNav();
bindUploadModal();
bindDetailModal();

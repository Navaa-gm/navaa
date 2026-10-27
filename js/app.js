// ============================================================
// ══════════════════ Navaa — app.js ═════════════════════════
// ============================================================

const CURRENT_KEY = 'navaa_current_user';
const USERS_KEY = 'navaa_users';
const ITEMS_KEY = 'navaa_items_v3';
const ADMIN_EMAIL = 'm.soroush.salari@gmail.com';
const UPLOAD_REWARD = 5000;
const SETTINGS = { commissionRate: 15, maxItemPrice: 500000, minItemPrice: 5000 };

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

// 🔥 سینک کردن اطلاعات کاربر با آرایه کاربران و دیتابیس ابری
function syncCurrentUserToArray() {
    const users = JSON.parse(localStorage.getItem(USERS_KEY)) || [];
    const idx = users.findIndex(u => u.email === currentUser.email);
    if (idx !== -1) {
        users[idx] = { ...users[idx], ...currentUser };
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
        if (window.saveUsersToCloud) window.saveUsersToCloud();
    }
}

// 🎁 هدیه آپلود
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

// 📊 سیستم ۵۰ فایل رایگان ماهانه
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

// ================== قیمت‌گذاری ==================
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

function initPremiumSection() {
  const modal = document.getElementById('uploadModal'); if (!modal) return;
  const premiumSection = document.getElementById('premiumSection'); if (!premiumSection) return;

  premiumSection.innerHTML = `
    <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.8rem;">
      <input type="checkbox" id="isPremiumCheck" style="width:18px;height:18px;accent-color:#ffc93c;">
      <label for="isPremiumCheck" style="color:#fff;font-weight:700;font-size:.9rem;cursor:pointer;">💎 این اثر رو ویژه بذار</label>
    </div>
    <div id="premiumOptions" style="display:none;">
      <button type="button" id="analyzeBtn" class="btn-primary" style="width:100%;padding:.7rem;font-size:.85rem;margin-bottom:.8rem;background:linear-gradient(135deg,#ffc93c,#ff8c00);color:#1a1100;">🤖 تحلیل ربات</button>
      <div id="botResult" style="display:none;background:#1c1c1c;border-radius:10px;padding:.8rem;margin-bottom:.8rem;font-size:.8rem;color:#a0a0a0;"></div>
      <label style="display:block;font-size:.82rem;color:#fff;font-weight:700;margin-bottom:.4rem;">💰 قیمت نهایی (تومان):</label>
      <input type="number" id="premiumPriceInput" min="5000" max="500000" placeholder="حداکثر ۵۰۰,۰۰۰" style="width:100%;padding:.8rem;background:#0a0a0a;border:1.5px solid #2a2a2a;border-radius:10px;color:#ffc93c;font-family:inherit;font-size:1rem;text-align:center;font-weight:800;outline:none;">
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
    const tagsInput = modal.querySelector('input[name="tags"]');
    const catSelect = document.getElementById('catSelect');
    
    const tagsValue = tagsInput?.value || '';
    const tagsArr = tagsValue.split(/[,،]/).map(t => t.trim()).filter(Boolean);

    const itemData = {
      title: titleInput?.value || '',
      desc: descInput?.value || '',
      tags: tagsArr,
      category: catSelect?.value || '',
      hasAudio: false,
      imageSize: 0,
      audioDuration: 0
    };
    
    if (!itemData.title) return alert('❌ اول عنوان!');
    const result = botPriceItem(itemData);
    
    botResult.style.display = 'block';
    botResult.innerHTML = `
      <div style="display:flex;justify-content:space-between;margin-bottom:.5rem;">
        <strong style="color:#ffc93c;">🤖 امتیاز: ${result.quality}</strong>
      </div>
      <div style="border-top:1px solid #2a2a2a;padding-top:.5rem;margin-bottom:.5rem;">
        ${result.details.map(d => `<div style="display:flex;justify-content:space-between;padding:.15rem 0;"><span>${d.label}</span><span style="color:#00f0d4;">+${formatMoney(d.value)}</span></div>`).join('')}
      </div>
      <div style="display:flex;justify-content:space-between;padding-top:.5rem;border-top:1px solid #2a2a2a;">
        <strong style="color:#fff;">💰 پیشنهادی:</strong>
        <strong style="color:#00f0d4;font-size:1rem;">${formatMoney(result.suggestedPrice)} تومان</strong>
      </div>`;
      
    premiumPriceInput.value = result.suggestedPrice;
    window.__navaaPremium.price = result.suggestedPrice;
  });

  premiumPriceInput.addEventListener('input', () => {
    let val = parseInt(premiumPriceInput.value) || 0;
    if (val > SETTINGS.maxItemPrice) { premiumPriceInput.value = SETTINGS.maxItemPrice; val = SETTINGS.maxItemPrice; }
    if (val < SETTINGS.minItemPrice && val > 0) { premiumPriceInput.value = SETTINGS.minItemPrice; val = SETTINGS.minItemPrice; }
    window.__navaaPremium.price = val;
  });
}

// ================== مودال نمایش جزئیات ==================
function openDetail(id) {
  const item = DB.items.find(p => p.id === id);
  if (!item) return;
  
  document.getElementById('modalImg').src = item.image;
  document.getElementById('modalTitle').textContent = item.title;
  document.getElementById('modalArtist').textContent = item.artist ? `👤 ${item.artist}` : '';
  document.getElementById('modalDesc').textContent = item.desc || '';
  document.getElementById('modalTags').innerHTML = (item.tags || []).map(t => `<span class="tag">#${escapeHtml(t)}</span>`).join('');
  document.getElementById('modalLikes').textContent = item.likes || 0;

  const audioWrap = document.getElementById('modalAudioWrap');
  const audioEl = document.getElementById('modalAudio');
  if (item.audio) {
    audioEl.src = item.audio;
    audioWrap.classList.remove('hidden');
  } else {
    audioEl.pause();
    audioEl.src = '';
    audioWrap.classList.add('hidden');
  }

  const deleteBtn = document.getElementById('modalDelete');
  const isMyItem = item.uploadedByEmail === currentUser.email;
  if (isMyItem || currentUser.role === 'admin') {
    deleteBtn.style.display = 'inline-block';
    deleteBtn.onclick = () => {
      if (confirm('حذف بشه؟')) {
        DB.items = DB.items.filter(p => p.id !== id);
        save();
        if (window.saveItemsToCloud) window.saveItemsToCloud(DB.items);
        document.getElementById('modal').classList.add('hidden');
        renderGallery();
      }
    };
  } else {
    deleteBtn.style.display = 'none';
  }

  document.getElementById('modal').classList.remove('hidden');
}

function bindDetailModal() {
  const modal = document.getElementById('modal');
  const audioEl = document.getElementById('modalAudio');
  if (!modal) return;
  
  const closeModal = () => {
    audioEl.pause();
    modal.classList.add('hidden');
  };

  document.getElementById('modalClose').addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
}

// ✅ گالری
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
      ${item.isPremium ? '<span class="premium-badge">💎 ویژه</span>' : ''}
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
    
    card.addEventListener('click', (e) => {
      if (e.target.closest('.action-btn')) return; 
      openDetail(item.id);
    });

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

// ================== فرم آپلود ==================
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

  fileIn.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    compressImage(file, 800, 0.7).then(compressed => {
      compressedImageData = compressed;
      preview.src = compressed;
      previewWrap.classList.remove('hidden');
    });
  });

  previewRemove?.addEventListener('click', () => {
    fileIn.value = ''; preview.src = ''; previewWrap.classList.add('hidden'); compressedImageData = null;
  });

  audioIn?.addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) { audioFileName.textContent = file.name; audioFileBox.classList.remove('hidden'); } 
    else { audioFileBox.classList.add('hidden'); }
  });

  audioFileRemove?.addEventListener('click', () => {
    audioIn.value = ''; audioFileName.textContent = ''; audioFileBox.classList.add('hidden');
  });

  document.getElementById('uploadClose')?.addEventListener('click', () => {
    modal.classList.add('hidden'); form.reset(); previewWrap.classList.add('hidden'); audioFileBox.classList.add('hidden'); compressedImageData = null;
  });

  document.getElementById('uploadBtn')?.addEventListener('click', () => modal.classList.remove('hidden'));
  
  form.addEventListener('submit', async e => {
    e.preventDefault();
    
    const imageFile = fileIn.files[0];
    const audioFile = audioIn ? audioIn.files[0] : null;
    if (!imageFile && !audioFile) return alert('حداقل یه تصویر یا یه فایل صوتی انتخاب کن!');
    
    // 🔥 چک کردن سهمیه ۵۰ فایل رایگان
    const perm = checkUploadPermission(imageFile ? imageFile.size : 0);
    if (!perm.allowed) return alert(perm.reason);

    const titleValue = form.title.value.trim();
    if(!titleValue) return alert('عنوان رو وارد کن!');

    const tagsInput = form.tags.value || '';
    const tagsArray = tagsInput.split(/[,،]/).map(t => t.trim()).filter(Boolean);

    const isPremium = window.__navaaPremium?.isPremium === true;
    const itemPrice = isPremium ? parseInt(window.__navaaPremium?.price || 0) : 0;

    const finish = async (finalImage, audioData) => {
      const newItem = { 
          id: Date.now(), 
          image: finalImage || makeSVG('#00f0d4', '#38bdf8', '🎵', 'صوتی'),
          audio: audioData || null,
          title: titleValue, 
          artist: form.artist.value.trim() || currentUser.fullname, 
          desc: form.desc.value.trim(),
          category: form.category.value,
          tags: tagsArray,
          isPremium: isPremium,
          price: itemPrice,
          time: Date.now(), 
          uploadedByEmail: currentUser.email, 
          likes: 0 
      };
      
      window.isUploading = true;
      DB.items.push(newItem); 
      save();
      
      // 🔥 افزایش شمارنده آپلود ماهانه
      if (!hasSubscription && currentUser.email !== ADMIN_EMAIL) {
        currentUser.monthlyUploads = (currentUser.monthlyUploads || 0) + 1;
        localStorage.setItem(CURRENT_KEY, JSON.stringify(currentUser));
        syncCurrentUserToArray(); // 🔥 سینک با دیتابیس
      }

      if (window.saveItemsToCloud) { try { await window.saveItemsToCloud(DB.items); } catch(err) { console.error(err); } }
      window.isUploading = false;
      
      const reward = giveUploadReward(currentUser.email);
      modal.classList.add('hidden'); form.reset(); previewWrap.classList.add('hidden'); audioFileBox.classList.add('hidden'); compressedImageData = null;
      renderGallery();
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

// 🎨 تزریق CSS برای حالت شیشه‌ای مودال
function injectGlassCSS() {
  if (document.getElementById('glass-css-inject')) return;
  const style = document.createElement('style');
  style.id = 'glass-css-inject';
  style.innerHTML = `
    .modal-content {
      background: rgba(20, 20, 20, 0.6) !important;
      backdrop-filter: blur(20px) !important;
      -webkit-backdrop-filter: blur(20px) !important;
      border: 1px solid rgba(255, 255, 255, 0.1) !important;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7) !important;
    }
    #modalImg {
      max-height: 70vh !important;
      width: 100% !important;
      object-fit: contain !important;
      border-radius: 12px !important;
    }
    .modal-media {
      background: rgba(0,0,0,0.3) !important;
      border-radius: 12px !important;
      padding: 10px !important;
    }
  `;
  document.head.appendChild(style);
}

// ================== INIT ==================
injectGlassCSS();
setupUserHeader(); 
initPremiumSection();
renderGallery(); 
bindUploadModal(); 
bindDetailModal();
renderBottomNav();

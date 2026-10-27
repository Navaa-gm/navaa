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

// 📊 سیستم ۵۰ فایل رایگان
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

// 🗂️ دسته‌بندی‌ها
const SUBCATS = {
  music: {
    'music-pop': { label: '🎵 پاپ' }, 'music-classic': { label: '🎼 سنتی' },
    'music-rock': { label: '🎸 راک' }, 'music-electronic': { label: '🎧 الکترونیک' },
    'music-classical': { label: '🎻 کلاسیک' }, 'music-rap': { label: '🎤 رپ' }
  },
  photo: {
    'photo-nature': { label: '🌿 طبیعت' }, 'photo-arch': { label: '🏛️ معماری' },
    'photo-bw': { label: '⚫ سیاه و سفید' }, 'photo-animal': { label: '🐾 حیوانات' },
    'photo-nostalgic': { label: '📻 نوستالژیک' }, 'photo-phone-bg': { label: '📱 پس‌زمینه گوشی' },
    'photo-pc-bg': { label: '💻 پس‌زمینه کامپیوتر' }, 'photo-profile': { label: '👤 عکس پروفایل' },
    'photo-ad': { label: '📢 عکس تبلیغاتی' }
  },
  car: {
    'car-super': { label: '🏎️ سوپراسپرت' }, 'car-classic': { label: '🚙 کلاسیک' },
    'car-offroad': { label: '🚙 آفرود' }, 'car-sport': { label: '🏁 اسپرت' },
    'car-luxury': { label: '💎 لوکس' }, 'car-motorcycle': { label: '🏍️ موتور' }
  }
};

function setupUserHeader() { const greeting = document.getElementById('userGreeting'); if (greeting) greeting.textContent = currentUser.fullname; }

// ✅ فشرده‌سازی تصویر (بازگردانده شد)
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

// ✅ ساخت SVG برای فایل‌های صوتی بدون عکس
function makeSVG(color1, color2, emoji, label) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${color1}"/><stop offset="100%" stop-color="${color2}"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><text x="50%" y="45%" font-size="180" text-anchor="middle" dominant-baseline="middle">${emoji}</text><text x="50%" y="75%" font-size="34" fill="rgba(255,255,255,0.9)" text-anchor="middle" font-family="Vazirmatn,sans-serif" font-weight="700">${label}</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
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

// ✅ فرم آپلود (با کدهای کامل خواندن فایل)
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

  // پر کردن دسته‌بندی‌ها
  if (catSel) {
    let allSubs = [];
    Object.entries(SUBCATS).forEach(([main, subs]) => {
      Object.entries(subs).forEach(([key, val]) => allSubs.push(`<option value="${key}">${val.label}</option>`));
    });
    catSel.innerHTML = allSubs.join('');
  }

  let compressedImageData = null;
  let currentAudioDuration = 0;

  // 🔥 انتخاب عکس
  fileIn.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    
    compressImage(file, 800, 0.7).then(compressed => {
      compressedImageData = compressed;
      preview.src = compressed;
      previewWrap.classList.remove('hidden');
    }).catch(err => {
      console.error(err);
      // اگر فشرده‌سازی نشد، به صورت دیتا یو آر ال می‌خونیم
      const reader = new FileReader();
      reader.onload = ev => {
        compressedImageData = ev.target.result;
        preview.src = ev.target.result;
        previewWrap.classList.remove('hidden');
      };
      reader.readAsDataURL(file);
    });
  });

  // 🔥 حذف عکس انتخاب شده
  previewRemove?.addEventListener('click', () => {
    fileIn.value = '';
    preview.src = '';
    previewWrap.classList.add('hidden');
    compressedImageData = null;
  });

  // 🔥 انتخاب فایل صوتی
  audioIn?.addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) {
      audioFileName.textContent = file.name;
      audioFileBox.classList.remove('hidden');
      const audio = document.createElement('audio');
      audio.src = URL.createObjectURL(file);
      audio.addEventListener('loadedmetadata', () => { currentAudioDuration = audio.duration; });
    } else {
      audioFileBox.classList.add('hidden');
      currentAudioDuration = 0;
    }
  });

  // 🔥 حذف فایل صوتی
  audioFileRemove?.addEventListener('click', () => {
    audioIn.value = '';
    audioFileName.textContent = '';
    audioFileBox.classList.add('hidden');
    currentAudioDuration = 0;
  });

  document.getElementById('uploadClose')?.addEventListener('click', () => {
    modal.classList.add('hidden');
    form.reset();
    previewWrap.classList.add('hidden');
    preview.src = '';
    audioFileBox.classList.add('hidden');
    compressedImageData = null;
  });

  document.getElementById('uploadBtn')?.addEventListener('click', () => modal.classList.remove('hidden'));
  
  // 🔥 ثبت فرم
  form.addEventListener('submit', async e => {
    e.preventDefault();
    
    const imageFile = fileIn.files[0];
    const audioFile = audioIn ? audioIn.files[0] : null;
    
    if (!imageFile && !audioFile) return alert('حداقل یه تصویر یا یه فایل صوتی انتخاب کن!');
    
    const perm = checkUploadPermission(imageFile ? imageFile.size : 0);
    if (!perm.allowed) return alert(perm.reason);

    const titleValue = form.title.value.trim();
    if(!titleValue) return alert('عنوان رو وارد کن!');

    const tagsInput = form.tags.value || '';
    const tagsArray = tagsInput.split(/[,،]/).map(t => t.trim()).filter(Boolean);

    // تابع نهایی برای ساخت آبجکت
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
          time: Date.now(), 
          uploadedByEmail: currentUser.email, 
          likes: 0 
      };
      
      window.isUploading = true;
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
      previewWrap.classList.add('hidden');
      audioFileBox.classList.add('hidden');
      compressedImageData = null;
      renderGallery();
      alert('🎉 اثر منتشر شد!' + (reward.success ? `\n💰 +${formatMoney(UPLOAD_REWARD)} تومان` : ''));
    };

    // اگه فایل صوتی هم بود، خونده میشه
    if (audioFile) {
      const r = new FileReader();
      r.onload = ev => finish(compressedImageData, ev.target.result);
      r.readAsDataURL(audioFile);
    } else {
      finish(compressedImageData, null);
    }
  });
}

// ✅ نوار پایین
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

setupUserHeader(); 
renderGallery(); 
bindUploadModal(); 
renderBottomNav();

// ============================================================
// ══════════════════ Navaa — auth.js ════════════════════════
// ============================================================

// ================== STORAGE KEYS ==================
const USERS_KEY = 'navaa_users';
const CURRENT_KEY = 'navaa_current_user';
const WELCOME_GIFT_KEY = 'navaa_welcome_gift';

// ================== ADMIN ==================
const ADMIN_EMAIL = 'm.soroush.salari@gmail.com';
const ADMIN_PASSWORD = 'MSsf17311731';

// ================== WELCOME GIFT ==================
const WELCOME_GIFT_AMOUNT = 5000; // ۵,۰۰۰ تومان هدیه خوش‌آمدگویی

// 🎨 پالت تم (برای سازگاری با بقیهٔ پروژه)
const THEME = {
  turquoise: '#00f0d4',
  sky: '#38bdf8',
  gold: '#ffc93c',
  red: '#ff2e4d'
};

// ================== STATE ==================
let users = JSON.parse(localStorage.getItem(USERS_KEY)) || [];

// ================== SAVE ==================
function saveUsers() {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

// ============================================================
// 🎁 اعطای هدیه خوش‌آمدگویی
// ============================================================
function grantWelcomeGift(userObj) {
  // اگه کاربر ادمین باشه، هدیه نده
  if (userObj.email === ADMIN_EMAIL || userObj.role === 'admin') {
    return { granted: false, reason: 'admin' };
  }

  // اگه قبلاً گرفته باشه، دوباره نده
  if (userObj.welcomeGiftReceived === true) {
    return { granted: false, reason: 'already_received' };
  }

  // ✅ اعطای هدیه
  userObj.balance = (userObj.balance || 0) + WELCOME_GIFT_AMOUNT;
  userObj.welcomeGiftReceived = true;
  userObj.welcomeGiftDate = Date.now();

  // آپدیت توی DB
  const idx = users.findIndex(u => (u.email || '').toLowerCase() === (userObj.email || '').toLowerCase());
  if (idx !== -1) {
    users[idx].balance = userObj.balance;
    users[idx].welcomeGiftReceived = true;
    users[idx].welcomeGiftDate = userObj.welcomeGiftDate;
    saveUsers();
  }

  // آپدیت currentUser
  localStorage.setItem(CURRENT_KEY, JSON.stringify(userObj));

  console.log('🎁 هدیه خوش‌آمدگویی اعطا شد:', WELCOME_GIFT_AMOUNT, 'تومان');
  return { granted: true, amount: WELCOME_GIFT_AMOUNT };
}

// ============================================================
// 🧹 پاکسازی کاربران تکراری
// ============================================================
(function deduplicateUsers() {
  const seen = new Map();
  const unique = [];

  users.forEach(u => {
    const key = (u.email || '').toLowerCase().trim();
    if (!key) return;

    if (!seen.has(key)) {
      seen.set(key, true);
      unique.push(u);
    } else {
      const existingIdx = unique.findIndex(x => (x.email || '').toLowerCase().trim() === key);
      if (existingIdx !== -1) {
        const existing = unique[existingIdx];
        const existingScore = (existing.fullname ? 1 : 0) + (existing.phone ? 1 : 0) + (existing.avatar ? 2 : 0) + (existing.balance ? 1 : 0);
        const newScore = (u.fullname ? 1 : 0) + (u.phone ? 1 : 0) + (u.avatar ? 2 : 0) + (u.balance ? 1 : 0);
        if (newScore > existingScore) {
          unique[existingIdx] = u;
        }
      }
    }
  });

  if (unique.length !== users.length) {
    users = unique;
    saveUsers();
    console.log(`🧹 ${users.length} کاربر یکتا باقی موند`);
  }
})();

// ============================================================
// 🧹 پاکسازی پرچم‌های قدیمی
// ============================================================
(function cleanOldFlags() {
  if (!localStorage.getItem('navaa_flags_cleaned_v1')) {
    localStorage.removeItem('navaa_admin_balance_set');
    localStorage.removeItem('navaa_admin_balance_set_v2');
    localStorage.setItem('navaa_flags_cleaned_v1', 'true');
    console.log('🧹 پرچم‌های قدیمی پاک شدن');
  }
})();

// ============================================================
// 🎁 بررسی هدیه خوش‌آمدگویی در اولین ورود
// ============================================================
(function checkWelcomeGiftOnEntry() {
  const currentUser = JSON.parse(localStorage.getItem(CURRENT_KEY));
  if (!currentUser) return;

  // اگه ادمین یا قبلاً گرفته باشه، کاری نکن
  if (currentUser.email === ADMIN_EMAIL || currentUser.role === 'admin') return;
  if (currentUser.welcomeGiftReceived === true) return;

  // ✅ اعطای هدیه
  const result = grantWelcomeGift(currentUser);
  if (result.granted) {
    // بعد از رفرش صفحه، پیام رو نشون بده
    setTimeout(() => {
      alert('🎁 هدیه خوش‌آمدگویی!\n\n💰 ۵,۰۰۰ تومان به کیف پولت اضافه شد!\n\nمی‌تونی از پروفایل، موجودیت رو ببینی.');
    }, 1000);
  }
})();

// ================== TAB SWITCH ==================
const tabs = document.querySelectorAll('.auth-tab');
const forms = document.querySelectorAll('.auth-form');

function switchTab(tabName) {
  tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
  forms.forEach(f => {
    const isActive =
      (tabName === 'login' && f.id === 'loginForm') ||
      (tabName === 'signup' && f.id === 'signupForm');
    f.classList.toggle('active', isActive);
  });
}

tabs.forEach(tab => {
  tab.addEventListener('click', () => switchTab(tab.dataset.tab));
});

document.querySelectorAll('[data-goto]').forEach(el => {
  el.addEventListener('click', e => {
    e.preventDefault();
    switchTab(el.dataset.goto);
  });
});

const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('tab') === 'signup') switchTab('signup');

// ============================================================
// 📝 ثبت‌نام (ایمیل اجباری، شماره اختیاری)
// ============================================================
const signupForm = document.getElementById('signupForm');
if (signupForm) {
  signupForm.addEventListener('submit', e => {
    e.preventDefault();
    e.stopPropagation();

    const f = e.target;
    const email = f.email.value.trim().toLowerCase();
    const phone = f.phone.value.trim();  // ← ممکنه خالی باشه
    const fullname = f.fullname.value.trim();

    // ✅ چک تکراری بودن ایمیل (اجباری)
    if (users.find(u => (u.email || '').toLowerCase() === email)) {
      alert('❌ این ایمیل قبلاً ثبت‌نام کرده!');
      return;
    }

    // ✅ چک تکراری بودن شماره (فقط اگه وارد شده باشه)
    if (phone) {
      if (!/^09\d{9}$/.test(phone)) {
        alert('❌ شماره تماس باید ۱۱ رقم و با ۰۹ شروع بشه!');
        return;
      }
      if (users.find(u => u.phone === phone)) {
        alert('❌ این شماره قبلاً ثبت‌نام کرده!');
        return;
      }
    }

    const isAdminSignup = email === ADMIN_EMAIL;

    const newUser = {
      id: Date.now(),
      fullname,
      phone: phone || null,
      email,
      password: f.password.value,
      hasSubscription: isAdminSignup,
      subscriptionPlan: isAdminSignup ? 'diamond' : null,
      subscriptionExpiry: isAdminSignup ? Date.now() + (36500 * 24 * 60 * 60 * 1000) : null,
      joinDate: Date.now(),
      role: isAdminSignup ? 'admin' : 'user',
      balance: isAdminSignup ? 5000000 : 0,
      welcomeGiftReceived: isAdminSignup ? true : false,
      purchasedItems: [],
      banned: false,
      bannedAt: null,
      bannedReason: null
    };

    users.push(newUser);
    saveUsers();
    localStorage.setItem(CURRENT_KEY, JSON.stringify(newUser));

    if (isAdminSignup) {
      alert('👑 خوش اومدی مدیر!');
    } else {
      alert('✨ حساب با موفقیت ساخته شد!\n\n🎁 یه هدیه خوش‌آمدگویی هم برات داریم!');
    }
    window.location.href = 'gallery.html';
  });
}

// ============================================================
// 🔑 ورود
// ============================================================
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', e => {
    e.preventDefault();
    e.stopPropagation();

    const f = e.target;
    const email = f.email.value.trim().toLowerCase();
    const password = f.password.value;

    // ✅ چک ادمین
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      let adminIdx = users.findIndex(u => (u.email || '').toLowerCase() === ADMIN_EMAIL);

      if (adminIdx === -1) {
        const admin = {
          id: Date.now(),
          fullname: 'مدیر نوآ',
          phone: '09000000000',
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          role: 'admin',
          hasSubscription: true,
          subscriptionPlan: 'diamond',
          subscriptionExpiry: Date.now() + (36500 * 24 * 60 * 60 * 1000),
          joinDate: Date.now(),
          balance: 5000000,
          welcomeGiftReceived: true,
          purchasedItems: []
        };
        users.push(admin);
        saveUsers();
        localStorage.setItem(CURRENT_KEY, JSON.stringify(admin));
        alert('👑 خوش برگشتی، مدیر!');
        window.location.href = 'gallery.html';
        return;
      }

      const admin = users[adminIdx];

      if (!admin.fullname) admin.fullname = 'مدیر نوآ';
      if (!admin.phone) admin.phone = '09000000000';
      if (!admin.balance || admin.balance < 100000) admin.balance = 5000000;

      admin.role = 'admin';
      admin.hasSubscription = true;
      admin.subscriptionPlan = 'diamond';
      admin.subscriptionExpiry = Date.now() + (36500 * 24 * 60 * 60 * 1000);

      users[adminIdx] = admin;
      saveUsers();

      localStorage.setItem(CURRENT_KEY, JSON.stringify(admin));
      alert('👑 خوش برگشتی، مدیر!');
      window.location.href = 'gallery.html';
      return;
    }

    // ورود عادی
    const userIdx = users.findIndex(u => (u.email || '').toLowerCase() === email && u.password === password);
    if (userIdx === -1) {
      alert('❌ ایمیل یا رمز عبور اشتباهه!');
      return;
    }

    const user = users[userIdx];

    // ✅ چک بن
    if (user.banned === true) {
      alert(
        '🚫 حساب شما مسدود شده!\n\n' +
        (user.bannedReason ? `دلیل: ${user.bannedReason}\n\n` : '') +
        'برای اطلاعات بیشتر با مدیر سایت تماس بگیرید.'
      );
      return;
    }

    // ✅ چک هدیه خوش‌آمدگویی
    if (user.welcomeGiftReceived !== true) {
      user.balance = (user.balance || 0) + WELCOME_GIFT_AMOUNT;
      user.welcomeGiftReceived = true;
      user.welcomeGiftDate = Date.now();
      users[userIdx] = user;
      saveUsers();

      localStorage.setItem(CURRENT_KEY, JSON.stringify(user));
      alert(`👋 خوش برگشتی، ${user.fullname}!\n\n🎁 هدیه خوش‌آمدگویی: ۵,۰۰۰ تومان به کیف پولت اضافه شد!`);
      window.location.href = 'gallery.html';
      return;
    }

    localStorage.setItem(CURRENT_KEY, JSON.stringify(user));
    alert(`👋 خوش برگشتی، ${user.fullname}!`);
    window.location.href = 'gallery.html';
  });   // ← ✅ FIX: این براکت جا افتاده بود
}       // ← ✅ FIX: و این هم

// ================== DEBUG ==================
console.log('✅ auth.js بارگذاری شد');
console.log('👥 تعداد کاربران:', users.length);
users.forEach((u, i) => {
  console.log(`${i + 1}. ${u.email} | نام: ${u.fullname} | موجودی: ${u.balance || 0} | هدیه: ${u.welcomeGiftReceived ? '✅' : '❌'}`);
});

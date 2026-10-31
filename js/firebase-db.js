// ============================================================
// ══════════════════ Navaa — firebase-db.js ══════════════════
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCdy1XEUDrVdgmyrr2r5nnvxaIP6A6y294",
  authDomain: "navaa-409cb.firebaseapp.com",
  projectId: "navaa-409cb",
  storageBucket: "navaa-409cb.firebasestorage.app",
  messagingSenderId: "81312395623",
  appId: "1:81312395623:web:6dd187fdf063ce44fc3fc2",
  measurementId: "G-KNJ5EEYHLB"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const localCache = {};

// 🎨 پالت تم (برای سازگاری با کل پروژه)
const THEME = {
  turquoise: '#00f0d4',
  sky: '#38bdf8',
  gold: '#ffc93c',
  red: '#ff2e4d'
};

window.FirebaseStorage = {
  getItem: function(key) {
    return localCache[key] !== undefined ? localCache[key] : null;
  },

  setItem: function(key, value) {
    localCache[key] = value;
    const docRef = doc(db, 'navaa_storage', key);
    setDoc(docRef, { value: value, updatedAt: Date.now() })
      .then(() => console.log('☁️ سینک شد:', key))
      .catch(err => console.error('❌ خطا در سینک:', err));
  },

  removeItem: function(key) {
    delete localCache[key];
    const docRef = doc(db, 'navaa_storage', key);
    setDoc(docRef, { value: null, updatedAt: Date.now() });
  },

  // این تابع آنی کار میکنه
  init: async function() {
    // ⚠️ توجه: این خط localStorage واقعی رو override می‌کنه
    window.localStorage = window.FirebaseStorage;

    const keysToFetch = [
      'navaa_current_user',
      'navaa_items_v3',
      'navaa_purchases',
      'navaa_settings'
    ];

    for (const key of keysToFetch) {
      const docRef = doc(db, 'navaa_storage', key);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) localCache[key] = docSnap.data().value;
    }

    // 🔄 گوش دادن زنده به لیست کاربران
    const usersRef = doc(db, 'navaa_storage', 'navaa_users');
    onSnapshot(usersRef, (docSnap) => {
      if (docSnap.exists()) {
        localCache['navaa_users'] = docSnap.data().value;
        console.log('🔄 لیست کاربران از سرور آپدیت شد!');

        // اگر توی پنل مدیریت هستیم، جدول رو رفرش کن
        try {
          const parsed = JSON.parse(localCache['navaa_users'] || '[]');

          // الگوی جدید (admin.html): window.renderUsersFromCloud
          if (typeof window.renderUsersFromCloud === 'function') {
            window.renderUsersFromCloud(parsed);
          }
          // الگوی قدیمی (غیرماژول): renderUsers
          else if (typeof renderUsers === 'function') {
            window.users = parsed;
            renderUsers();
            updateStats();
          }
        } catch (e) { /* silent — جلوگیری از کرش کردن onSnapshot */ }
      }
    });
  }
};

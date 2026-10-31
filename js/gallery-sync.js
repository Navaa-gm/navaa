// ============================================================
// ══════════════════ Navaa — gallery-sync.js ═════════════════
// ═══════════ سینک زندهٔ آثار از Firestore ═══════════════════
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const app = initializeApp({
  apiKey: "AIzaSyCdy1XEUDrVdgmyrr2r5nnvxaIP6A6y294",
  projectId: "navaa-409cb"
});
const db = getFirestore(app);

// 🔄 گوش دادن زنده به تغییرات آثار
onSnapshot(doc(db, 'navaa_storage', 'navaa_items_v3'), (docSnap) => {
  if (!docSnap.exists()) return;
  try {
    const cloudItems = JSON.parse(docSnap.data().value);

    // آپدیت DB در حافظه (اگر app.js قبلاً لود شده باشه، همون آبجکته)
    window.DB = window.DB || { items: [] };
    window.DB.items = cloudItems;

    // آپدیت localStorage برای اینکه app.js (که بعداً لود می‌شه) دیتای تازه ببینه
    localStorage.setItem('navaa_items_v3', JSON.stringify(cloudItems));

    // رفرش گالری اگه رندرر آماده باشه
    if (typeof renderGallery === 'function') {
      renderGallery();
    } else if (typeof window.renderGallery === 'function') {
      window.renderGallery();
    }

    console.log('🔄 آثار از سرور سینک شد — تعداد:', cloudItems.length);
  } catch (e) {
    console.error('❌ خطا در پردازش آیتم‌های سینک:', e);
  }
});

// ☁️ ارسال آثار به سرور (مصرف‌کننده: app.js)
window.saveItemsToCloud = async function(items) {
  const docRef = doc(db, 'navaa_storage', 'navaa_items_v3');
  await setDoc(docRef, { value: JSON.stringify(items), updatedAt: Date.now() });
};

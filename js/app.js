  <!-- 🔥 اتصال به Firebase برای ذخیره دائمی آثار -->
  <script type="module">
    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
    import { getFirestore, doc, getDoc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

    const firebaseConfig = {
      apiKey: "AIzaSyCdy1XEUDrVdgmyrr2r5nnvxaIP6A6y294",
      authDomain: "navaa-409cb.firebaseapp.com",
      projectId: "navaa-409cb",
      storageBucket: "navaa-409cb.firebasestorage.app",
      messagingSenderId: "81312395623",
      appId: "1:81312395623:web:6dd187fdf063ce44fc3fc2"
    };

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const docRef = doc(db, 'navaa_storage', 'navaa_items_v3');

    window.saveItemsToCloud = async function(items) {
      await setDoc(docRef, { value: JSON.stringify(items), updatedAt: Date.now() });
    };

    onSnapshot(docRef, (docSnap) => {
      // 🔥 اگه در حال آپلود هستیم، دیتابیس ابری رو نادیده بگیر تا اثر جدید پاک نشه
      if (window.isUploading) return; 

      if (docSnap.exists()) {
        const cloudItems = JSON.parse(docSnap.data().value);
        if (cloudItems.length > 0 || window.DB.items.length === 0) {
          window.DB.items = cloudItems;
          localStorage.setItem('navaa_items_v3', JSON.stringify(cloudItems));
          if (typeof window.renderGallery === 'function') window.renderGallery();
        }
      }
    });
  </script>

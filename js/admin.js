// ============================================================
// ══════════════════ Navaa — auth.js (legacy admin view) ══════
// ══════════════════ نسخهٔ قدیمی — احتمالاً dead code ═════════
// ============================================================

const CURRENT_KEY = 'navaa_current_user';
const ADMIN_EMAIL = 'admin@navaa.com';

// 🎨 پالت تم (برای سازگاری با کل پروژه)
const THEME = {
  turquoise: '#00f0d4',
  sky: '#38bdf8',
  gold: '#ffc93c',
  red: '#ff2e4d'
};

const currentUser = JSON.parse(localStorage.getItem(CURRENT_KEY)) || null;

// فقط ادمین
if (!currentUser || (currentUser.email !== ADMIN_EMAIL && currentUser.role !== 'admin')) {
  alert('⛔ دسترسی نداری!');
  window.location.href = 'gallery.html';
}

// ================== RENDER ==================
const users = JSON.parse(localStorage.getItem('navaa_users')) || [];
const items = JSON.parse(localStorage.getItem('navaa_items')) || [];

// 📊 آمار — با گارد امنیتی (چون این IDها در admin.html فعلی نیستن)
const statUsersEl = document.getElementById('statUsers');
const statSubsEl  = document.getElementById('statSubs');
const statItemsEl = document.getElementById('statItems');

if (statUsersEl) statUsersEl.textContent = users.length;
if (statSubsEl)  statSubsEl.textContent  = users.filter(u => u.hasSubscription).length;
if (statItemsEl) statItemsEl.textContent = items.length;

// ================== جدول کاربران ==================
const tbody = document.getElementById('usersTableBody');

if (tbody) {
  if (users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#888;padding:2rem;">هنوز کسی ثبت‌نام نکرده</td></tr>`;
  } else {
    users.sort((a, b) => b.joinDate - a.joinDate).forEach((u, i) => {
      const date = new Date(u.joinDate).toLocaleDateString('fa-IR');
      const subBadge = u.hasSubscription
        ? `<span class="badge-yes" style="background:rgba(0,240,212,0.15);color:${THEME.turquoise};border:1px solid rgba(0,240,212,0.4);padding:0.2rem 0.6rem;border-radius:999px;font-size:0.72rem;font-weight:700;">✓ فعال</span>`
        : `<span class="badge-no" style="background:rgba(255,46,77,0.1);color:${THEME.red};border:1px solid rgba(255,46,77,0.35);padding:0.2rem 0.6rem;border-radius:999px;font-size:0.72rem;font-weight:700;">—</span>`;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${i + 1}</td>
        <td>${escapeHtml(u.fullname)}</td>
        <td dir="ltr" style="text-align:right;">${escapeHtml(u.phone)}</td>
        <td dir="ltr" style="text-align:right;">${escapeHtml(u.email)}</td>
        <td dir="ltr" style="text-align:right;">${u.appleId ? escapeHtml(u.appleId) : '—'}</td>
        <td>${subBadge}</td>
        <td>${date}</td>
      `;
      tbody.appendChild(tr);
    });
  }
}

// ================== گالری آثار آپلودشده ==================
const adminItems = document.getElementById('adminItems');

if (adminItems) {
  if (items.length === 0) {
    adminItems.innerHTML = '<p style="color:#888;">هنوز اثری آپلود نشده.</p>';
  } else {
    items.sort((a, b) => b.time - a.time).forEach(item => {
      const card = document.createElement('div');
      card.className = 'admin-item-card';
      card.innerHTML = `
        <img src="${item.image}" alt="">
        <div class="admin-item-info">
          <strong>${escapeHtml(item.title)}</strong>
          <small>${item.artist ? '👤 ' + escapeHtml(item.artist) : ''}</small>
        </div>
      `;
      adminItems.appendChild(card);
    });
  }
}

// ================== helper ==================
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

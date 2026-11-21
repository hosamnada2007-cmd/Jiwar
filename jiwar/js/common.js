const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const DEFAULT_CENTER = [30.5586, 31.0098];

function esc(t) {
  const d = document.createElement('div'); d.textContent = t == null ? '' : String(t); return d.innerHTML;
}
let toastTimer;
function toast(msg, type = 'info') {
  const el = $('#toast'); if (!el) return;
  el.textContent = msg; el.className = 'toast show' + (type === 'error' ? ' error' : '');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 3800);
}
function setBusy(btn, busy, label) {
  if (!btn) return;
  if (busy) { btn.dataset.label = btn.textContent; btn.textContent = label || 'جارٍ التنفيذ...'; btn.disabled = true; }
  else { btn.textContent = btn.dataset.label || btn.textContent; btn.disabled = false; }
}
function safeNext(url) { return url && /^[\w-]+\.html(\?[\w=&%.-]*)?$/.test(url) ? url : null; }
function formatDistance(m) { return m < 1000 ? `${m} متر` : `${(m / 1000).toFixed(1)} كم`; }
function formatDate(ts) { return new Date(ts).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }); }
function emptyState(text) {
  return `<div class="empty"><svg viewBox="0 0 72 72" fill="none" stroke="#2DFFC4" stroke-width="3" stroke-linejoin="round"><path d="M8 40L28 22L48 40V58H8Z"/><path d="M36 40L52 26L68 40V58H36"/></svg><p>${esc(text)}</p></div>`;
}
function homeFor(user) {
  if (user && user.role === 'admin') return Routes.admin;
  return user && user.role === 'volunteer' ? Routes.volunteer : Routes.emergency;
}
function normalizePhone(raw) {
  let d = String(raw || '').replace(/[٠-٩]/g, (c) => c.charCodeAt(0) - 1632).replace(/\D/g, '');
  if (d.startsWith('0020')) d = d.slice(4);
  else if (d.startsWith('20') && d.length === 12) d = d.slice(2);
  else if (d.startsWith('0')) d = d.slice(1);
  return /^1[0125]\d{8}$/.test(d) ? '+20' + d : null;
}
function readImage(file, maxBytes = 700 * 1024) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    if (!file.type.startsWith('image/')) return reject(new Error('الملف المرفق يجب أن يكون صورة'));
    if (file.size > maxBytes) return reject(new Error('الصورة كبيرة، اختر صورة أقل من 700 كيلوبايت'));
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error('تعذر قراءة الصورة'));
    r.readAsDataURL(file);
  });
}
const VERIFY_LABEL = { pending: 'قيد المراجعة', verified: 'موثّق', rejected: 'مرفوض' };

async function requireUser(roles) {
  const user = await Api.getMe();
  if (!user) {
    location.href = Routes.login + '?next=' + encodeURIComponent(location.pathname.split('/').pop() + location.search);
    return null;
  }
  if (roles && !roles.includes(user.role)) {
    toast('هذه الصفحة غير متاحة لنوع حسابك', 'error');
    setTimeout(() => (location.href = homeFor(user)), 1200);
    return null;
  }
  return user;
}

function makeMap(el, { center = DEFAULT_CENTER, zoom = 14, onPick } = {}) {
  if (typeof L === 'undefined') { el.innerHTML = emptyState('تعذر تحميل الخريطة، تأكد من الاتصال بالإنترنت'); return null; }
  const map = L.map(el).setView(center, zoom);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap contributors' }).addTo(map);
  if (onPick) map.on('click', (e) => onPick(e.latlng.lat, e.latlng.lng));
  return map;
}
function dotMarker(map, lat, lng, kind = 'red') {
  return L.marker([lat, lng], { icon: L.divIcon({ className: '', html: `<div class="dot dot-${kind}"></div>`, iconSize: [22, 22], iconAnchor: [11, 11] }) }).addTo(map);
}

function renderLayout() {
  const header = $('#site-header'), footer = $('#site-footer');
  if (header) header.innerHTML = `<div class="container">
    <a class="brand" href="index.html">
      <svg viewBox="0 0 120 120" role="img" aria-label="شعار جِوار">
        <path d="M12 66L38 40L64 66V94H12Z" fill="#2DFFC4" stroke="#2DFFC4" stroke-width="6" stroke-linejoin="round" style="mix-blend-mode:screen"/>
        <path d="M56 66L82 40L108 66V94H56Z" fill="#FFC23D" stroke="#FFC23D" stroke-width="6" stroke-linejoin="round" style="mix-blend-mode:screen"/>
        <circle cx="60" cy="62" r="9" fill="#FF4D6D"/>
        <path d="M60 57V67M55 62H65" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
      </svg>
      <span>جِوار</span>
    </a>
    <input type="checkbox" id="nav-toggle" class="nav-toggle" aria-label="فتح القائمة">
    <label for="nav-toggle" class="burger" aria-hidden="true">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
    </label>
    <nav class="site-nav" aria-label="القائمة الرئيسية">
      <a href="index.html">الرئيسية</a>
      <a href="guide.html">دليل الإسعافات</a>
      <span id="nav-auth"></span>
    </nav>
  </div>`;
  if (footer) footer.innerHTML = `<div class="container">
    <p><strong>جِوار</strong> مكمّل للإسعاف الرسمي وليس بديلاً. في الخطر اتصل أولاً بـ <a href="tel:123">123</a>.</p>
    <p class="hint">مشروع جامعي تعليمي، والبيانات المعروضة وهمية. الإرشادات الطبية عامة للتوعية ولا تغني عن التدريب أو الطبيب.</p>
  </div>`;
  document.body.insertAdjacentHTML('afterbegin', '<a class="skip" href="#main">تخطَّ إلى المحتوى</a>');
  if (!$('#toast')) document.body.insertAdjacentHTML('beforeend', '<div id="toast" class="toast" role="status" aria-live="polite"></div>');
}

async function initNav() {
  const box = $('#nav-auth'); if (!box) return;
  let user = null, active = null;
  try { user = await Api.getMe(); } catch { user = null; }
  if (user && user.role !== 'admin') { try { active = await Api.getActive(); } catch { active = null; } }
  const here = location.pathname.split('/').pop();
  let html = '';
  if (active) {
    const href = active.as === 'requester' ? Routes.track(active.id) : Routes.activeCase(active.id);
    html += `<a class="nav-live" href="${href}"><span class="live-dot"></span>${active.as === 'requester' ? 'طلبي النشط' : 'حالتي النشطة'}</a>`;
  }
  if (!user) html += `<a href="emergency.html">طلب طوارئ</a><a href="login.html">دخول</a><a class="btn btn-primary" href="register.html">إنشاء حساب</a>`;
  else {
    if (user.role === 'requester') html += `<a href="emergency.html">طلب طوارئ</a>`;
    if (user.role === 'volunteer') html += `<a href="volunteer.html">لوحتي</a>`;
    if (user.role === 'admin') html += `<a href="admin.html">لوحة الإدارة</a>`;
    html += `<span class="nav-user">${esc(user.full_name)}</span><a href="#" id="logout-link">خروج</a>`;
  }
  box.innerHTML = html;
  const out = $('#logout-link');
  if (out) out.addEventListener('click', async (e) => { e.preventDefault(); await Api.logout(); location.href = 'index.html'; });
  if (active && here !== 'track.html' && here !== 'case.html') {
    const href = active.as === 'requester' ? Routes.track(active.id) : Routes.activeCase(active.id);
    document.body.insertAdjacentHTML('beforeend', `<a class="active-bar" href="${href}"><span class="live-dot"></span><span>${active.as === 'requester' ? 'لديك طلب طوارئ نشط' : 'لديك حالة نشطة'}: ${esc(active.type_name)}</span><strong>العودة إلى الطلب</strong></a>`);
  }
}

renderLayout();
initNav();

const USE_MOCK = true;

const Routes = {
  login: 'login.html',
  emergency: 'emergency.html',
  volunteer: 'volunteer.html',
  admin: 'admin.html',
  track: (id) => `track.html?id=${id}`,
  activeCase: (id) => `case.html?id=${id}`,
};

async function request(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: body ? JSON.stringify(body) : undefined,
  });
  let json;
  try { json = await res.json(); }
  catch { json = { ok: false, error: 'bad_response', message: 'رد غير مفهوم من الخادم' }; }
  if (!res.ok || json.ok === false) {
    throw Object.assign(new Error(json.message || 'حدث خطأ، حاول مرة أخرى'), { code: json.error, status: res.status });
  }
  return json.data;
}

const MOCK_SKILLS = [
  { id: 1, name: 'الإنعاش القلبي الرئوي (CPR)' }, { id: 2, name: 'إسعافات أولية عامة' },
  { id: 3, name: 'الجروح والنزيف' }, { id: 4, name: 'الاختناق' },
  { id: 5, name: 'أزمات السكر' }, { id: 6, name: 'سيارة متاحة للنقل' },
];
const MOCK_TYPES = [
  { id: 1, name: 'توقف تنفس أو قلب' }, { id: 2, name: 'اختناق' }, { id: 3, name: 'نزيف أو جرح عميق' },
  { id: 4, name: 'فقدان وعي' }, { id: 5, name: 'أزمة سكر' }, { id: 6, name: 'ألم في الصدر' },
  { id: 7, name: 'حروق' }, { id: 8, name: 'كسر أو التواء' }, { id: 9, name: 'نوبة صرع' },
  { id: 10, name: 'أعراض سكتة دماغية' }, { id: 11, name: 'ضيق تنفس أو ربو' }, { id: 12, name: 'حساسية شديدة' },
  { id: 13, name: 'تسمم' }, { id: 14, name: 'صعق كهربائي' }, { id: 15, name: 'غرق' },
  { id: 16, name: 'ضربة شمس' }, { id: 17, name: 'لدغة عقرب أو ثعبان' }, { id: 18, name: 'إصابة في الرأس' },
  { id: 19, name: 'حادث سير' },
];
const MOCK_KEY = 'jiwar_mock_v2';
const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms));
const fail = (message, status = 400, code = 'error') => Object.assign(new Error(message), { status, code });
const DAY = 864e5;

function freshState() {
  const now = Date.now();
  const vol = (id, name, phone, gov, city, qual, inst, cert, status, days) => ({
    id, full_name: name, phone, role: 'volunteer', governorate: gov, city, age: 23, skills: [2],
    is_available: false, lat: null, lng: null, location_consent: false, rating_avg: 0, cases_done: 0,
    qualification: qual, institution: inst, certificate_no: cert, certificate_image: null,
    verification_status: status, rejection_reason: '', created_at: now - days * DAY,
  });
  return {
    nextId: 100, session: null, emergency: null, demoAt: null,
    users: [
      { ...vol(1, 'أحمد سمير', '+201000000001', 'المنوفية', 'شبين الكوم', 'طالب طب', 'كلية الطب، جامعة المنوفية', 'MED-2210', 'verified', 30),
        skills: [1, 2], lat: 30.5586, lng: 31.0098, location_consent: true, rating_avg: 4.8, cases_done: 12, age: 24 },
      { id: 2, full_name: 'منى علي', phone: '+201000000002', role: 'requester', governorate: 'المنوفية', city: 'شبين الكوم' },
      { id: 3, full_name: 'مدير النظام', phone: '+201000000000', role: 'admin' },
      vol(4, 'سارة محمود', '+201111111111', 'القليوبية', 'بنها', 'طالبة تمريض', 'كلية التمريض، جامعة بنها', 'NUR-8841', 'pending', 1),
      vol(5, 'كريم عادل', '+201222222222', 'الجيزة', 'الهرم', 'ممرض', 'مستشفى الهرم التخصصي', 'SYN-3320', 'pending', 2),
      vol(6, 'ياسر حسن', '+201555555555', 'الإسكندرية', 'سموحة', 'حاصل على دورة إسعافات أولية', 'الهلال الأحمر المصري', 'RC-5521', 'pending', 3),
    ],
  };
}
function load() { try { return JSON.parse(localStorage.getItem(MOCK_KEY)) || freshState(); } catch { return freshState(); } }
function save(s) {
  try { localStorage.setItem(MOCK_KEY, JSON.stringify(s)); }
  catch { throw fail('مساحة التخزين ممتلئة، جرّب صورة أصغر', 400, 'storage_full'); }
}
function me(s) { return s.users.find((u) => u.id === s.session) || null; }
function needUser(s, roles) {
  const u = me(s);
  if (!u) throw fail('سجّل الدخول أولاً', 401, 'unauthorized');
  if (roles && !roles.includes(u.role)) throw fail('هذا الإجراء غير متاح لنوع حسابك', 403, 'forbidden');
  return u;
}
function needVerified(u) {
  if (u.verification_status !== 'verified') throw fail('حسابك لم يُوثَّق بعد، وسيتم تفعيله بعد مراجعة الإدارة لبياناتك وشهاداتك', 403, 'not_verified');
}
function haversineKm(a, b, c, d) {
  const R = 6371, r = Math.PI / 180, dLat = (c - a) * r, dLng = (d - b) * r;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
function view(e, s) {
  if (e.status === 'open' && e.auto && Date.now() - e.created_at > 7000) {
    e.status = 'accepted'; e.accepted_at = Date.now();
    e.volunteer = { name: 'أحمد سمير', skill: MOCK_SKILLS[0].name, distance_m: 320, eta_min: 3, rating: 4.8 };
    save(s);
  }
  return { id: e.id, type_id: e.type_id, type_name: e.type_name, status: e.status, lat: e.lat, lng: e.lng,
    note: e.note || '', created_at: e.created_at, volunteer: e.volunteer || null };
}
function getE(s, id) {
  if (!s.emergency || s.emergency.id !== Number(id)) throw fail('الحالة غير موجودة', 404, 'not_found');
  return s.emergency;
}

const mock = {
  async register(p) {
    await wait(); const s = load();
    if (!['volunteer', 'requester'].includes(p.role)) throw fail('نوع الحساب غير صحيح');
    if (s.users.some((u) => u.phone === p.phone)) throw fail('رقم الهاتف مسجل من قبل', 409, 'phone_taken');
    const u = { id: s.nextId++, full_name: p.full_name, phone: p.phone, role: p.role, governorate: p.governorate, city: p.city, created_at: Date.now() };
    if (p.role === 'volunteer') {
      Object.assign(u, { age: p.age, skills: p.skills || [], is_available: false, lat: null, lng: null, location_consent: false,
        rating_avg: 0, cases_done: 0, qualification: p.qualification, institution: p.institution, certificate_no: p.certificate_no || '',
        certificate_image: p.certificate_image || null, verification_status: 'pending', rejection_reason: '' });
    }
    s.users.push(u); s.session = u.id; save(s); return u;
  },
  async login(p) {
    await wait(); const s = load();
    const u = s.users.find((x) => x.phone === p.phone);
    if (!u) throw fail('بيانات الدخول غير صحيحة', 401, 'bad_credentials');
    s.session = u.id; save(s); return u;
  },
  async logout() { const s = load(); s.session = null; save(s); return {}; },
  async getMe() { return me(load()); },
  async getSkills() { await wait(100); return MOCK_SKILLS; },
  async getEmergencyTypes() { await wait(100); return MOCK_TYPES; },
  async getActive() {
    const s = load(), u = me(s), e = s.emergency;
    if (!u || !e || !['open', 'accepted'].includes(e.status)) return null;
    const v = view(e, s);
    if (!['open', 'accepted'].includes(v.status)) return null;
    if (e.requester_id === u.id) return { id: e.id, as: 'requester', status: v.status, type_name: e.type_name };
    if (e.accepted_by === u.id) return { id: e.id, as: 'volunteer', status: v.status, type_name: e.type_name };
    return null;
  },
  async updateVolunteer(p) {
    await wait(); const s = load(), u = needUser(s, ['volunteer']);
    const proof = ['qualification', 'institution', 'certificate_no', 'certificate_image'];
    const changedProof = proof.some((k) => p[k] !== undefined && p[k] !== u[k]);
    ['skills', 'lat', 'lng', 'location_consent', ...proof].forEach((k) => { if (p[k] !== undefined) u[k] = p[k]; });
    if (u.verification_status === 'rejected' && changedProof) { u.verification_status = 'pending'; u.rejection_reason = ''; }
    save(s); return u;
  },
  async setAvailability(on) {
    const s = load(), u = needUser(s, ['volunteer']);
    if (on) needVerified(u);
    u.is_available = !!on; save(s); return u;
  },
  async getAlerts() {
    await wait(150); const s = load(), u = needUser(s, ['volunteer']);
    if (u.verification_status !== 'verified') return [];
    let e = s.emergency;
    const done = !e || ['resolved', 'cancelled'].includes(e.status) || (e.declined || []).includes(u.id);
    if (done) {
      if (!s.demoAt) { s.demoAt = Date.now(); save(s); }
      if (Date.now() - s.demoAt > 4000) {
        e = s.emergency = { id: s.nextId++, requester_id: 99, type_id: 1, type_name: 'توقف تنفس أو قلب', lat: 30.5605, lng: 31.0120,
          status: 'open', created_at: Date.now(), auto: false, declined: [] };
        s.demoAt = null; save(s);
      } else return [];
    }
    if (e.status !== 'open' || e.requester_id === u.id) return [];
    const km = haversineKm(u.lat || 30.5586, u.lng || 31.0098, e.lat, e.lng);
    return [{ emergency_id: e.id, type_id: e.type_id, type_name: e.type_name, distance_m: Math.max(50, Math.round(km * 1000 / 50) * 50), expires_in: 60 }];
  },
  async createEmergency(p) {
    await wait(); const s = load(), u = needUser(s, ['volunteer', 'requester']);
    if (s.emergency && ['open', 'accepted'].includes(s.emergency.status) && s.emergency.requester_id === u.id)
      throw fail('لديك طلب مفتوح بالفعل', 409, 'already_open');
    const t = MOCK_TYPES.find((x) => x.id === Number(p.type_id));
    if (!t) throw fail('نوع الحالة غير معروف');
    s.emergency = { id: s.nextId++, requester_id: u.id, type_id: t.id, type_name: t.name, lat: p.lat, lng: p.lng, note: p.note,
      status: 'open', created_at: Date.now(), auto: true, declined: [] };
    save(s); return { id: s.emergency.id };
  },
  async getEmergency(id) { await wait(120); const s = load(); needUser(s); return view(getE(s, id), s); },
  async cancelEmergency(id) { const s = load(); needUser(s); getE(s, id).status = 'cancelled'; save(s); return {}; },
  async acceptEmergency(id) {
    await wait(); const s = load(), u = needUser(s, ['volunteer']), e = getE(s, id);
    needVerified(u);
    if (e.status !== 'open') throw fail('سبقك متطوع آخر', 409, 'already_taken');
    e.status = 'accepted'; e.accepted_by = u.id; e.accepted_at = Date.now();
    e.volunteer = { name: u.full_name, skill: MOCK_SKILLS[(u.skills[0] || 1) - 1].name, distance_m: 300, eta_min: 3, rating: u.rating_avg || 0 };
    save(s); return view(e, s);
  },
  async declineEmergency(id) { const s = load(), u = needUser(s), e = getE(s, id); (e.declined = e.declined || []).push(u.id); save(s); return {}; },
  async resolveEmergency(id) { await wait(); const s = load(); needUser(s); getE(s, id).status = 'resolved'; save(s); return {}; },
  async rateEmergency() { await wait(); return {}; },
  async adminVolunteers(status) {
    await wait(150); const s = load(); needUser(s, ['admin']);
    return s.users.filter((u) => u.role === 'volunteer' && (!status || u.verification_status === status))
      .sort((a, b) => b.created_at - a.created_at);
  },
  async adminDecide(id, approve, reason) {
    await wait(); const s = load(); needUser(s, ['admin']);
    const u = s.users.find((x) => x.id === Number(id) && x.role === 'volunteer');
    if (!u) throw fail('المتطوع غير موجود', 404, 'not_found');
    u.verification_status = approve ? 'verified' : 'rejected';
    u.rejection_reason = approve ? '' : (reason || '');
    if (!approve) u.is_available = false;
    save(s); return u;
  },
  async adminStats() {
    const s = load(); needUser(s, ['admin']);
    const v = s.users.filter((u) => u.role === 'volunteer');
    const count = (st) => v.filter((u) => u.verification_status === st).length;
    return { verified: count('verified'), pending: count('pending'), rejected: count('rejected'), requesters: s.users.filter((u) => u.role === 'requester').length };
  },
};

const Api = {
  register: (p) => USE_MOCK ? mock.register(p) : request('POST', '/api/auth/register', p),
  login: (p) => USE_MOCK ? mock.login(p) : request('POST', '/api/auth/login', p),
  logout: () => USE_MOCK ? mock.logout() : request('POST', '/api/auth/logout'),
  getMe: async () => {
    if (USE_MOCK) return mock.getMe();
    try { return await request('GET', '/api/me'); } catch (e) { if (e.status === 401) return null; throw e; }
  },
  getSkills: () => USE_MOCK ? mock.getSkills() : request('GET', '/api/skills'),
  getEmergencyTypes: () => USE_MOCK ? mock.getEmergencyTypes() : request('GET', '/api/emergency-types'),
  getActive: () => USE_MOCK ? mock.getActive() : request('GET', '/api/emergencies/active'),
  updateVolunteer: (p) => USE_MOCK ? mock.updateVolunteer(p) : request('PUT', '/api/volunteers/me', p),
  setAvailability: (on) => USE_MOCK ? mock.setAvailability(on) : request('POST', '/api/volunteers/me/availability', { is_available: on }),
  getAlerts: () => USE_MOCK ? mock.getAlerts() : request('GET', '/api/volunteers/me/alerts'),
  createEmergency: (p) => USE_MOCK ? mock.createEmergency(p) : request('POST', '/api/emergencies', p),
  getEmergency: (id) => USE_MOCK ? mock.getEmergency(id) : request('GET', `/api/emergencies/${id}`),
  cancelEmergency: (id) => USE_MOCK ? mock.cancelEmergency(id) : request('POST', `/api/emergencies/${id}/cancel`),
  acceptEmergency: (id) => USE_MOCK ? mock.acceptEmergency(id) : request('POST', `/api/emergencies/${id}/accept`),
  declineEmergency: (id) => USE_MOCK ? mock.declineEmergency(id) : request('POST', `/api/emergencies/${id}/decline`),
  resolveEmergency: (id) => USE_MOCK ? mock.resolveEmergency(id) : request('POST', `/api/emergencies/${id}/resolve`),
  rateEmergency: (id, score) => USE_MOCK ? mock.rateEmergency(id, score) : request('POST', `/api/emergencies/${id}/rating`, { score }),
  adminVolunteers: (status) => USE_MOCK ? mock.adminVolunteers(status) : request('GET', `/api/admin/volunteers?status=${status || ''}`),
  adminDecide: (id, approve, reason) => USE_MOCK ? mock.adminDecide(id, approve, reason)
    : request('POST', `/api/admin/volunteers/${id}/${approve ? 'verify' : 'reject'}`, approve ? undefined : { reason }),
  adminStats: () => USE_MOCK ? mock.adminStats() : request('GET', '/api/admin/stats'),
};

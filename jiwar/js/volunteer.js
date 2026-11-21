(async () => {
  const user = await requireUser(['volunteer']); if (!user) return;
  let pos = user.lat ? { lat: user.lat, lng: user.lng } : null, marker = null, timer, proofImage;
  const verified = user.verification_status === 'verified';

  $('#v-name').textContent = user.full_name;
  const banners = {
    pending: 'حسابك قيد المراجعة. ستراجع الإدارة بياناتك وشهاداتك، ولن تصلك طلبات قبل التوثيق.',
    rejected: `تم رفض طلب التوثيق${user.rejection_reason ? '. السبب: ' + user.rejection_reason : ''}. عدّل بياناتك أو أرفق شهادة أوضح من «ملفي» ثم احفظ لإعادة الإرسال.`,
    verified: 'حسابك موثّق. يمكنك الآن استقبال الطلبات عند تفعيل «متاح».',
  };
  $('#verify-banner').innerHTML = `<div class="banner ${esc(user.verification_status)}">${esc(banners[user.verification_status] || '')}</div>`;
  $('#stats').innerHTML = `
    <div class="glass stat"><b class="c-amber">${user.rating_avg || 'جديد'}</b><span>التقييم</span></div>
    <div class="glass stat"><b class="c-mint">${user.cases_done || 0}</b><span>حالات منجزة</span></div>
    <div class="glass stat"><b class="c-cyan">${esc(VERIFY_LABEL[user.verification_status] || '')}</b><span>التوثيق</span></div>
    <div class="glass stat"><b class="c-lime">${esc(user.city || '-')}</b><span>${esc(user.governorate || '')}</span></div>`;

  const form = $('#profile-form');
  form.qualification.value = user.qualification || '';
  form.institution.value = user.institution || '';
  form.certificate_no.value = user.certificate_no || '';
  $('#consent').checked = !!user.location_consent;

  const skills = await Api.getSkills(), mine = user.skills || [];
  $('#skills-list').innerHTML = skills.map((s) =>
    `<label class="choice"><input type="checkbox" name="skills" value="${s.id}" ${mine.includes(s.id) ? 'checked' : ''}><span>${esc(s.name)}</span></label>`).join('');

  const map = makeMap($('#map'), { center: pos ? [pos.lat, pos.lng] : govCenter(user.governorate), onPick: setPos });
  function setPos(lat, lng) {
    pos = { lat, lng };
    if (!map) return;
    if (marker) marker.setLatLng([lat, lng]); else marker = dotMarker(map, lat, lng, 'teal');
  }
  if (pos) setPos(pos.lat, pos.lng);

  form.certificate_file.addEventListener('change', async () => {
    try { proofImage = await readImage(form.certificate_file.files[0]); }
    catch (ex) { proofImage = undefined; form.certificate_file.value = ''; toast(ex.message, 'error'); }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const ids = $$('input[name=skills]:checked').map((c) => Number(c.value));
    if (!ids.length) return toast('اختر مهارة واحدة على الأقل', 'error');
    if (!form.qualification.value || form.institution.value.trim().length < 3) return toast('اكمل بيانات المؤهل والجهة', 'error');
    if (!pos) return toast('حدد موقعك على الخريطة', 'error');
    if (!$('#consent').checked) return toast('يلزم الموافقة على مشاركة الموقع', 'error');
    const payload = { skills: ids, lat: pos.lat, lng: pos.lng, location_consent: true, qualification: form.qualification.value,
      institution: form.institution.value.trim(), certificate_no: form.certificate_no.value.trim() };
    if (proofImage) payload.certificate_image = proofImage;
    try {
      const u = await Api.updateVolunteer(payload);
      toast(u.verification_status === 'pending' && user.verification_status === 'rejected' ? 'تم إعادة إرسال بياناتك للمراجعة' : 'تم حفظ التغييرات');
      if (u.verification_status !== user.verification_status) setTimeout(() => location.reload(), 900);
    } catch (ex) { toast(ex.message, 'error'); }
  });

  const sw = $('#availability'), swLabel = $('#availability-label');
  function applyAvailability(on) {
    swLabel.textContent = on ? 'متاح الآن' : 'غير متاح';
    clearInterval(timer);
    if (on) { pollAlerts(); timer = setInterval(pollAlerts, 5000); }
    else $('#alerts').innerHTML = emptyState(verified ? 'أنت غير متاح، فلن تصلك تنبيهات.' : 'ستصلك الطلبات بعد توثيق حسابك.');
  }
  sw.checked = verified && !!user.is_available;
  sw.disabled = !verified;
  applyAvailability(sw.checked);
  sw.addEventListener('change', async () => {
    try { await Api.setAvailability(sw.checked); applyAvailability(sw.checked); }
    catch (ex) { sw.checked = !sw.checked; toast(ex.message, 'error'); }
  });

  async function pollAlerts() {
    let list;
    try { list = await Api.getAlerts(); } catch (ex) { return toast(ex.message, 'error'); }
    $('#alerts').innerHTML = list.length ? list.map((a) => `
      <div class="card alert-card" data-id="${a.emergency_id}">
        <h3>${esc(a.type_name)}</h3>
        <div class="meta"><span>تبعد ${formatDistance(a.distance_m)} تقريباً</span><span>المهلة ${a.expires_in} ثانية</span></div>
        ${TYPE_TO_GUIDE[a.type_id] ? `<a href="guide.html#${TYPE_TO_GUIDE[a.type_id]}">اقرأ إرشادات هذه الحالة</a>` : ''}
        <div class="actions">
          <button class="btn btn-primary" data-act="accept">قبول</button>
          <button class="btn btn-ghost" data-act="decline">رفض</button>
        </div>
      </div>`).join('') : emptyState('لا توجد طلبات الآن. سنخبرك فور وصول حالة قريبة.');
  }

  $('#alerts').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-act]'); if (!btn) return;
    const card = btn.closest('.alert-card'), id = Number(card.dataset.id);
    setBusy(btn, true, '...');
    try {
      if (btn.dataset.act === 'accept') { await Api.acceptEmergency(id); location.href = Routes.activeCase(id); }
      else { await Api.declineEmergency(id); card.remove(); toast('تم الرفض'); }
    } catch (ex) { toast(ex.message, 'error'); setBusy(btn, false); pollAlerts(); }
  });
  window.addEventListener('pagehide', () => clearInterval(timer));
})();

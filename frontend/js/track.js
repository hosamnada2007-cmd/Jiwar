(async () => {
  const user = await requireUser(); if (!user) return;
  const id = Number(new URLSearchParams(location.search).get('id'));
  if (!id) { location.href = Routes.emergency; return; }
  const order = ['open', 'accepted', 'resolved'];
  const text = { open: 'نبحث عن أنسب متطوع موثّق قريب منك...', accepted: 'تم قبول طلبك، والمتطوع في الطريق إليك.',
    resolved: 'انتهت الحالة. نتمنى لك السلامة.', cancelled: 'تم إلغاء الطلب.', expired: 'لم يستجب أحد في الوقت المحدد. اتصل بالإسعاف 123 الآن.' };
  let map, timer, rated = false, guideShown = false;

  async function refresh() {
    let e;
    try { e = await Api.getEmergency(id); }
    catch (ex) { $('#status-card').innerHTML = `<p class="error-text">${esc(ex.message)}</p>`; clearInterval(timer); return; }

    $$('#steps li').forEach((li) => {
      const i = order.indexOf(li.dataset.step), cur = order.indexOf(e.status);
      li.className = cur > i || e.status === 'resolved' ? 'done' : cur === i ? 'current' : '';
    });
    $('#status-card').innerHTML = `<span class="badge badge-${esc(e.status)}">${esc(e.type_name)}</span><p style="margin:.6rem 0 0;font-weight:700">${esc(text[e.status] || '')}</p>`;

    const v = $('#volunteer-card');
    if (e.volunteer) {
      v.classList.remove('hidden');
      $('#v-name').textContent = e.volunteer.name; $('#v-skill').textContent = e.volunteer.skill;
      $('#v-meta').textContent = `يبعد ${formatDistance(e.volunteer.distance_m)}، وصول تقريبي ${e.volunteer.eta_min} دقائق`;
    }
    $('#cancel-btn').classList.toggle('hidden', !['open', 'accepted'].includes(e.status));
    $('#rate-card').classList.toggle('hidden', !(e.status === 'resolved' && e.volunteer && !rated));
    if (!map) { map = makeMap($('#map'), { center: [e.lat, e.lng], zoom: 16 }); if (map) dotMarker(map, e.lat, e.lng, 'red'); }
    if (!guideShown) {
      const g = GUIDES.find((x) => x.id === TYPE_TO_GUIDE[e.type_id]);
      if (g) $('#guide-box').innerHTML = `<h2 style="font-size:1.4rem">ماذا تفعل الآن؟</h2>${guideCard(g, true)}<p class="hint"><a href="guide.html">كل إرشادات الإسعافات الأولية</a></p>`;
      guideShown = true;
    }
    if (['resolved', 'cancelled', 'expired'].includes(e.status)) clearInterval(timer);
  }

  $('#cancel-btn').addEventListener('click', async () => {
    if (!confirm('هل تريد إلغاء الطلب؟')) return;
    try { await Api.cancelEmergency(id); toast('تم إلغاء الطلب'); refresh(); } catch (ex) { toast(ex.message, 'error'); }
  });
  $('#rate-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    try { await Api.rateEmergency(id, Number(ev.target.score.value)); rated = true; $('#rate-card').classList.add('hidden'); toast('شكراً لتقييمك'); }
    catch (ex) { toast(ex.message, 'error'); }
  });

  await refresh();
  timer = setInterval(refresh, 5000);
  window.addEventListener('pagehide', () => clearInterval(timer));
})();

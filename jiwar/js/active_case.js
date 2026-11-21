(async () => {
  const user = await requireUser(['volunteer']); if (!user) return;
  const id = Number(new URLSearchParams(location.search).get('id'));
  if (!id) { location.href = Routes.volunteer; return; }
  let e;
  try { e = await Api.getEmergency(id); }
  catch (ex) { $('#case-card').innerHTML = `<p class="error-text">${esc(ex.message)}</p>`; return; }

  $('#case-card').innerHTML = `<span class="badge badge-${esc(e.status)}">${esc(e.type_name)}</span>
    <p style="margin:.6rem 0 0">${esc(e.note) || 'لا توجد ملاحظات.'}</p>`;
  const g = GUIDES.find((x) => x.id === TYPE_TO_GUIDE[e.type_id]);
  if (g) $('#guide-box').innerHTML = `<h2 style="font-size:1.4rem">إرشادات هذه الحالة</h2>${guideCard(g, true)}<p class="hint"><a href="guide.html">كل إرشادات الإسعافات الأولية</a></p>`;
  const map = makeMap($('#map'), { center: [e.lat, e.lng], zoom: 17 });
  if (map) dotMarker(map, e.lat, e.lng, 'red');
  if (e.status === 'accepted') $('#resolve-btn').classList.remove('hidden');
  else toast('هذه الحالة لم تعد نشطة');

  $('#resolve-btn').addEventListener('click', async (ev) => {
    setBusy(ev.target, true, 'جارٍ الإنهاء...');
    try { await Api.resolveEmergency(id); toast('شكراً لمساعدتك'); setTimeout(() => (location.href = Routes.volunteer), 1200); }
    catch (ex) { toast(ex.message, 'error'); setBusy(ev.target, false); }
  });
})();

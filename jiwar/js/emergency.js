(async () => {
  const user = await requireUser(['requester', 'volunteer']); if (!user) return;
  const active = await Api.getActive();
  if (active && active.as === 'requester') { location.href = Routes.track(active.id); return; }

  const form = $('#emergency-form'), err = $('#form-error'), coords = $('#coords');
  let pos = null, marker = null;

  const types = await Api.getEmergencyTypes();
  $('#type-list').innerHTML = types.map((t) =>
    `<label class="choice"><input type="radio" name="type_id" value="${t.id}"><span>${esc(t.name)}</span></label>`).join('');

  const map = makeMap($('#map'), { onPick: setPos });
  function setPos(lat, lng) {
    pos = { lat, lng };
    coords.textContent = `تم تحديد الموقع (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    if (!map) return;
    if (marker) marker.setLatLng([lat, lng]); else marker = dotMarker(map, lat, lng, 'red');
    map.setView([lat, lng], Math.max(map.getZoom(), 15));
  }
  bindLocationSelects(form.governorate, form.city, (gov) => { if (map && gov) map.setView(govCenter(gov), 11); });
  form.city.addEventListener('change', () => { if (map && form.governorate.value) map.setView(govCenter(form.governorate.value), 12); });

  $('#use-location').addEventListener('click', () => {
    if (!navigator.geolocation) return toast('المتصفح لا يدعم تحديد الموقع، اضغط على الخريطة', 'error');
    navigator.geolocation.getCurrentPosition((p) => setPos(p.coords.latitude, p.coords.longitude),
      () => toast('لم نتمكن من تحديد موقعك، اضغط على الخريطة', 'error'));
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault(); err.textContent = '';
    const type = form.elements.type_id.value;
    if (!type) return (err.textContent = 'اختر نوع الحالة');
    if (!pos) return (err.textContent = 'حدد مكانك على الخريطة');
    const btn = $('#sos-submit'); setBusy(btn, true, 'جارٍ إرسال الطلب...');
    try {
      const r = await Api.createEmergency({ type_id: Number(type), lat: pos.lat, lng: pos.lng, note: form.note.value.trim() });
      location.href = Routes.track(r.id);
    } catch (ex) { err.textContent = ex.message; setBusy(btn, false); }
  });
})();

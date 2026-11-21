(async () => {
  const user = await requireUser(['admin']); if (!user) return;
  let current = 'pending';
  const list = $('#vol-list');

  async function loadStats() {
    const s = await Api.adminStats();
    $('#stats').innerHTML = `
      <div class="glass stat"><b class="c-amber">${s.pending}</b><span>بانتظار المراجعة</span></div>
      <div class="glass stat"><b class="c-mint">${s.verified}</b><span>متطوعون موثّقون</span></div>
      <div class="glass stat"><b class="c-coral">${s.rejected}</b><span>طلبات مرفوضة</span></div>
      <div class="glass stat"><b class="c-cyan">${s.requesters}</b><span>مستخدمون يطلبون المساعدة</span></div>`;
  }

  function card(v) {
    const actions = v.verification_status === 'pending'
      ? `<button class="btn btn-primary btn-sm" data-act="approve">توثيق المتطوع</button><button class="btn btn-outline-danger btn-sm" data-act="reject">رفض</button>`
      : v.verification_status === 'verified'
        ? `<button class="btn btn-outline-danger btn-sm" data-act="reject">سحب التوثيق</button>`
        : `<button class="btn btn-primary btn-sm" data-act="approve">توثيق بعد المراجعة</button>`;
    return `<article class="card vol-card" data-id="${v.id}">
      <div class="vol-head"><h3 style="margin:0">${esc(v.full_name)}</h3><span class="badge badge-${esc(v.verification_status)}">${esc(VERIFY_LABEL[v.verification_status])}</span></div>
      <dl class="vol-grid">
        <div><dt>الموبايل</dt><dd><span class="dir-ltr">${esc(v.phone)}</span></dd></div>
        <div><dt>المكان</dt><dd>${esc(v.city)}، ${esc(v.governorate)}</dd></div>
        <div><dt>المؤهل أو العمل</dt><dd>${esc(v.qualification)}</dd></div>
        <div><dt>الجهة</dt><dd>${esc(v.institution)}</dd></div>
        <div><dt>رقم الشهادة أو الكارنيه</dt><dd>${esc(v.certificate_no) || 'لم يُذكر'}</dd></div>
        <div><dt>تاريخ التسجيل</dt><dd>${esc(formatDate(v.created_at))}</dd></div>
      </dl>
      ${v.certificate_image ? `<a href="${v.certificate_image}" target="_blank" rel="noopener"><img class="cert-img" src="${v.certificate_image}" alt="صورة الشهادة المرفقة"></a>` : '<p class="hint">لم يرفع المتطوع صورة شهادة.</p>'}
      ${v.rejection_reason ? `<p class="error-text">سبب الرفض: ${esc(v.rejection_reason)}</p>` : ''}
      <div class="actions">${actions}</div>
    </article>`;
  }

  async function loadList() {
    list.innerHTML = '<div class="skeleton"></div>';
    const items = await Api.adminVolunteers(current);
    list.innerHTML = items.length ? items.map(card).join('') : emptyState('لا توجد طلبات في هذا القسم.');
  }

  $$('.tab').forEach((t) => t.addEventListener('click', () => {
    current = t.dataset.status;
    $$('.tab').forEach((x) => x.setAttribute('aria-selected', String(x === t)));
    loadList();
  }));

  list.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-act]'); if (!btn) return;
    const id = Number(btn.closest('.vol-card').dataset.id), approve = btn.dataset.act === 'approve';
    let reason = '';
    if (!approve) {
      reason = (prompt('اكتب سبب الرفض ليظهر للمتطوع:') || '').trim();
      if (!reason) return toast('سبب الرفض مطلوب', 'error');
    }
    setBusy(btn, true, '...');
    try { await Api.adminDecide(id, approve, reason); toast(approve ? 'تم توثيق المتطوع' : 'تم رفض الطلب'); await loadStats(); await loadList(); }
    catch (ex) { toast(ex.message, 'error'); setBusy(btn, false); }
  });

  await loadStats();
  await loadList();
})();

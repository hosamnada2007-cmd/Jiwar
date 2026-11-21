(() => {
  if (typeof USE_MOCK !== 'undefined' && USE_MOCK) $('#mock-hint').classList.remove('hidden');
  const form = $('#login-form'), err = $('#form-error');
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); err.textContent = '';
    const phone = normalizePhone(form.phone.value);
    if (!phone) return (err.textContent = 'اكتب رقم الموبايل بعد +20، مثال: 1012345678');
    if (!form.password.value) return (err.textContent = 'اكتب كلمة المرور');
    const btn = form.querySelector('[type=submit]'); setBusy(btn, true, 'جارٍ الدخول...');
    try {
      const u = await Api.login({ phone, password: form.password.value });
      location.href = safeNext(new URLSearchParams(location.search).get('next')) || homeFor(u);
    } catch (ex) { err.textContent = ex.message; setBusy(btn, false); }
  });
})();

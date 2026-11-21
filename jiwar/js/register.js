(async () => {
  const form = $('#register-form'), err = $('#form-error'), vFields = $('#volunteer-fields');
  bindLocationSelects(form.governorate, form.city);
  const skills = await Api.getSkills();
  $('#skills-list').innerHTML = skills.map((s) =>
    `<label class="choice"><input type="checkbox" name="skills" value="${s.id}"><span>${esc(s.name)}</span></label>`).join('');

  const role = () => form.elements.role.value;
  $$('input[name=role]').forEach((r) => r.addEventListener('change', () => vFields.classList.toggle('hidden', role() !== 'volunteer')));

  form.addEventListener('submit', async (e) => {
    e.preventDefault(); err.textContent = '';
    const phone = normalizePhone(form.phone.value);
    const p = { role: role(), full_name: form.full_name.value.trim(), phone, password: form.password.value,
      governorate: form.governorate.value, city: form.city.value };
    if (p.full_name.length < 3) return (err.textContent = 'اكتب اسمك (3 أحرف على الأقل)');
    if (!phone) return (err.textContent = 'اكتب رقم الموبايل بعد +20، مثال: 1012345678');
    if (p.password.length < 8 || !/\d/.test(p.password) || !/[A-Za-z\u0600-\u06FF]/.test(p.password)) return (err.textContent = 'كلمة المرور 8 أحرف على الأقل وفيها حرف ورقم');
    if (!p.governorate || !p.city) return (err.textContent = 'اختر المحافظة والمدينة');
    if (p.role === 'volunteer') {
      p.age = Number(form.age.value);
      p.skills = $$('input[name=skills]:checked').map((c) => Number(c.value));
      p.qualification = form.qualification.value;
      p.institution = form.institution.value.trim();
      p.certificate_no = form.certificate_no.value.trim();
      if (!(p.age >= 18 && p.age <= 65)) return (err.textContent = 'السن يجب أن يكون بين 18 و65');
      if (!p.qualification) return (err.textContent = 'اختر مؤهلك أو عملك');
      if (p.institution.length < 3) return (err.textContent = 'اكتب الجهة: الكلية أو المستشفى أو جهة التدريب');
      if (!p.skills.length) return (err.textContent = 'اختر مهارة واحدة على الأقل');
      if (!form.certificate_file.files[0]) return (err.textContent = 'أرفق صورة الشهادة أو الكارنيه للمراجعة');
      if (!form.agree.checked) return (err.textContent = 'يلزم الإقرار بصحة البيانات');
      try { p.certificate_image = await readImage(form.certificate_file.files[0]); }
      catch (ex) { return (err.textContent = ex.message); }
    }
    const btn = form.querySelector('[type=submit]'); setBusy(btn, true, 'جارٍ إنشاء الحساب...');
    try { const u = await Api.register(p); location.href = homeFor(u); }
    catch (ex) { err.textContent = ex.message; setBusy(btn, false); }
  });
})();

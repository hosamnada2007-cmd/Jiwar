(() => {
  const list = $('#guide-list'), search = $('#guide-search'), count = $('#guide-count');
  $('#rules').innerHTML = GUIDE_RULES.map((r) => `<li>${r}</li>`).join('');

  function render() {
    const q = search.value.trim();
    const items = GUIDES.filter((g) => !q || (g.title + ' ' + g.signs.join(' ') + ' ' + g.do.join(' ')).includes(q));
    list.innerHTML = items.length ? items.map((g) => guideCard(g, false)).join('') : emptyState('لا توجد نتائج مطابقة، جرّب كلمة أخرى.');
    count.textContent = `${items.length} من ${GUIDES.length} إرشاداً`;
  }
  render();
  search.addEventListener('input', render);

  function openFromHash() {
    const el = location.hash && document.getElementById(location.hash.slice(1));
    if (el && el.tagName === 'DETAILS') { el.open = true; el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  }
  openFromHash();
  window.addEventListener('hashchange', openFromHash);
})();

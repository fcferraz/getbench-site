// Shared BuskAI behavior: theme, density, language, tweaks panel.
window.GB = (function(){
  const STATE_KEY = 'buskai_ui_v1';
  const DEFAULTS = { theme: 'light', density: 'default', lang: 'pt' };
  const state = Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(STATE_KEY) || '{}'));

  function save(){ localStorage.setItem(STATE_KEY, JSON.stringify(state)); }

  function applyTheme(){
    // Set on <html> so [data-theme="dark"] body selectors match and the theme
    // can be applied before <body> exists (no flash on load).
    document.documentElement.dataset.theme = state.theme;
    if (document.body) document.body.dataset.theme = state.theme;
    document.querySelectorAll('.theme-toggle').forEach(b => {
      b.textContent = state.theme === 'dark' ? '☀' : '☾';
      b.setAttribute('aria-label', state.theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro');
    });
  }
  function toggleTheme(){
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme(); save();
  }
  function applyDensity(){
    const w = document.querySelector('.wrap'); if (!w) return;
    w.style.padding = state.density === 'dense' ? '12px 20px 60px'
                    : state.density === 'comfy' ? '28px 36px 100px'
                    : '20px 28px 80px';
  }
  function applyLang(dicts){
    const dict = dicts[state.lang] || dicts.pt || {};
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const k = el.dataset.i18n; if (dict[k]) el.textContent = dict[k];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const k = el.dataset.i18nPlaceholder; if (dict[k]) el.placeholder = dict[k];
    });
    document.documentElement.lang = state.lang === 'pt' ? 'pt-BR' : state.lang;
    document.querySelectorAll('#lang button').forEach(b => b.classList.toggle('on', b.dataset.lang === state.lang));
  }

  function bindLang(dicts){
    const el = document.getElementById('lang'); if (!el) return;
    el.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      state.lang = b.dataset.lang; applyLang(dicts); save();
    });
    applyLang(dicts);
  }

  function bindTweaks(){
    const panel = document.getElementById('tweaks');
    if (!panel) return;
    // initialize segs
    panel.querySelectorAll('.seg').forEach(seg => {
      const key = seg.id.replace('tw-','');
      seg.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === state[key]));
      seg.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        state[key] = b.dataset.v;
        seg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
        if (key === 'theme') applyTheme();
        if (key === 'density') applyDensity();
        save();
      });
    });
  }

  return {
    state,
    toggleTheme,
    init(dicts){
      applyTheme(); applyDensity();
      bindLang(dicts || { pt:{}, es:{}, en:{} });
      bindTweaks();
    }
  };
})();

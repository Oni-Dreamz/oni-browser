(function () {
  'use strict';

  const tooltipTextEl = document.getElementById('tooltip-text');

  function applyThemeVariables(theme) {
    if (!theme) return;
    const root = document.documentElement;
    const vars = (theme.chrome && theme.chrome.cssVariables) || theme.cssVariables || {};
    for (const [key, val] of Object.entries(vars)) {
      root.style.setProperty(key, val);
    }
  }

  if (window.oniAPI) {
    if (window.oniAPI.onTooltipUpdate) {
      window.oniAPI.onTooltipUpdate((text) => {
        if (tooltipTextEl) {
          tooltipTextEl.textContent = text || '';
        }
      });
    }
    if (window.oniAPI.getActiveTheme) {
      window.oniAPI.getActiveTheme().then(applyThemeVariables).catch(() => {});
    }
    if (window.oniAPI.onThemeChanged) {
      window.oniAPI.onThemeChanged((payload) => {
        if (payload && payload.theme) applyThemeVariables(payload.theme);
      });
    }
  }
})();

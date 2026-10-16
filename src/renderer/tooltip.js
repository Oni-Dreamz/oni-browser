(function () {
  'use strict';

  const tooltipTextEl = document.getElementById('tooltip-text');

  if (window.oniAPI && window.oniAPI.onTooltipUpdate) {
    window.oniAPI.onTooltipUpdate((text) => {
      if (tooltipTextEl) {
        tooltipTextEl.textContent = text || '';
      }
    });
  }
})();

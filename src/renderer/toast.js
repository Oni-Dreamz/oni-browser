// Oni OS - Download Complete Toast Notification
(function () {
  'use strict';

  const card = document.getElementById('os-toast-card');
  const titleEl = document.getElementById('toast-title');
  const filenameEl = document.getElementById('toast-filename');
  const btnOpen = document.getElementById('toast-btn-open');
  const btnClose = document.getElementById('toast-btn-close');

  let currentFilePath = '';
  let autoDismissTimer = null;

  function resetDismissTimer(delay = 7000) {
    if (autoDismissTimer) clearTimeout(autoDismissTimer);
    autoDismissTimer = setTimeout(() => {
      dismissToast();
    }, delay);
  }

  function dismissToast() {
    if (autoDismissTimer) {
      clearTimeout(autoDismissTimer);
      autoDismissTimer = null;
    }
    if (window.oniAPI && window.oniAPI.hideDownloadToast) {
      window.oniAPI.hideDownloadToast();
    }
  }

  if (window.oniAPI && window.oniAPI.onToastDisplay) {
    window.oniAPI.onToastDisplay((data) => {
      if (!data) return;
      currentFilePath = data.filePath || '';
      if (titleEl) titleEl.textContent = data.title || 'Download Complete';
      if (filenameEl) filenameEl.textContent = data.filename || 'File downloaded';

      if (btnOpen) {
        btnOpen.style.display = currentFilePath ? 'inline-block' : 'none';
      }

      // Re-trigger animation
      if (card) {
        card.style.animation = 'none';
        void card.offsetHeight; // trigger reflow
        card.style.animation = 'toastDrop 0.2s cubic-bezier(0.16, 1, 0.3, 1)';
      }

      resetDismissTimer(7000);
    });
  }

  if (card) {
    card.addEventListener('mouseenter', () => {
      if (autoDismissTimer) {
        clearTimeout(autoDismissTimer);
        autoDismissTimer = null;
      }
    });

    card.addEventListener('mouseleave', () => {
      resetDismissTimer(4000);
    });
  }

  if (btnOpen) {
    btnOpen.addEventListener('click', () => {
      if (currentFilePath && window.oniAPI && window.oniAPI.openDownloadFile) {
        window.oniAPI.openDownloadFile(currentFilePath);
      }
      dismissToast();
    });
  }

  if (btnClose) {
    btnClose.addEventListener('click', () => {
      dismissToast();
    });
  }

  function applyThemeVariables(theme) {
    if (!theme) return;
    const root = document.documentElement;
    const vars = (theme.chrome && theme.chrome.cssVariables) || theme.cssVariables || {};
    for (const [key, val] of Object.entries(vars)) {
      root.style.setProperty(key, val);
    }
  }

  if (window.oniAPI) {
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

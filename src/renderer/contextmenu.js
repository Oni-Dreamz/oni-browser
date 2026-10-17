// Oni OS - Web Page Custom Right-Click Context Menu
(function () {
  'use strict';

  const backdrop = document.getElementById('context-menu-backdrop');
  const menu = document.getElementById('os-page-context-menu');
  let currentData = null;
  let openedAt = 0;

  function hideMenu() {
    if (!menu) return;
    menu.classList.add('hidden');
    menu.innerHTML = '';
    if (window.oniAPI && window.oniAPI.hideContextMenu) {
      window.oniAPI.hideContextMenu();
    }
  }

  if (window.oniAPI && window.oniAPI.onShowContextMenu) {
    window.oniAPI.onShowContextMenu((data) => {
      currentData = data;
      openedAt = Date.now();

      let itemsHtml = '';

      // 1. Link items
      if (data.linkURL) {
        itemsHtml += `
          <button class="os-ctx-item" data-action="open-link-new-tab">
            <span class="os-ctx-item-left">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              <span>Open link in new tab</span>
            </span>
          </button>
          <button class="os-ctx-item" data-action="open-link-new-window">
            <span class="os-ctx-item-left">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
              <span>Open link in new window</span>
            </span>
          </button>
          <div class="os-ctx-sep"></div>
          <button class="os-ctx-item" data-action="save-link-as">
            <span class="os-ctx-item-left">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              <span>Save link as...</span>
            </span>
          </button>
          <button class="os-ctx-item" data-action="copy-link-address">
            <span class="os-ctx-item-left">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              <span>Copy link address</span>
            </span>
          </button>
          <div class="os-ctx-sep"></div>
        `;
      }

      // 2. Image / Media items
      if (data.srcURL || data.mediaType === 'image') {
        itemsHtml += `
          <button class="os-ctx-item" data-action="open-image-new-tab">
            <span class="os-ctx-item-left">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              <span>Open image in new tab</span>
            </span>
          </button>
          <button class="os-ctx-item" data-action="save-image-as">
            <span class="os-ctx-item-left">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              <span>Save image as...</span>
            </span>
          </button>
          <button class="os-ctx-item" data-action="copy-image">
            <span class="os-ctx-item-left">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              <span>Copy image</span>
            </span>
          </button>
          <button class="os-ctx-item" data-action="copy-image-address">
            <span class="os-ctx-item-left">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              <span>Copy image address</span>
            </span>
          </button>
          <button class="os-ctx-item" data-action="search-image-web">
            <span class="os-ctx-item-left">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <span>Search image on Web</span>
            </span>
          </button>
          <div class="os-ctx-sep"></div>
        `;
      }

      // 3. Selection items
      if (data.selectionText) {
        const trunc = data.selectionText.length > 20 ? data.selectionText.substring(0, 20) + '...' : data.selectionText;
        itemsHtml += `
          <button class="os-ctx-item" data-action="copy">
            <span class="os-ctx-item-left">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              <span>Copy</span>
            </span>
            <span class="os-ctx-shortcut">Ctrl+C</span>
          </button>
          <button class="os-ctx-item" data-action="search-selection">
            <span class="os-ctx-item-left">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <span>Search Web for "${trunc}"</span>
            </span>
          </button>
          <div class="os-ctx-sep"></div>
        `;
      }

      // 4. Editable inputs
      if (data.isEditable) {
        itemsHtml += `
          <button class="os-ctx-item" data-action="undo">
            <span class="os-ctx-item-left">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
              <span>Undo</span>
            </span>
            <span class="os-ctx-shortcut">Ctrl+Z</span>
          </button>
          <button class="os-ctx-item" data-action="redo">
            <span class="os-ctx-item-left">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/></svg>
              <span>Redo</span>
            </span>
            <span class="os-ctx-shortcut">Ctrl+Y</span>
          </button>
          <div class="os-ctx-sep"></div>
          <button class="os-ctx-item" data-action="cut">
            <span class="os-ctx-item-left">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>
              <span>Cut</span>
            </span>
            <span class="os-ctx-shortcut">Ctrl+X</span>
          </button>
          <button class="os-ctx-item" data-action="copy">
            <span class="os-ctx-item-left">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              <span>Copy</span>
            </span>
            <span class="os-ctx-shortcut">Ctrl+C</span>
          </button>
          <button class="os-ctx-item" data-action="paste">
            <span class="os-ctx-item-left">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
              <span>Paste</span>
            </span>
            <span class="os-ctx-shortcut">Ctrl+V</span>
          </button>
          <div class="os-ctx-sep"></div>
          <button class="os-ctx-item" data-action="select-all">
            <span class="os-ctx-item-left">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke-dasharray="3 3"/></svg>
              <span>Select All</span>
            </span>
            <span class="os-ctx-shortcut">Ctrl+A</span>
          </button>
          <div class="os-ctx-sep"></div>
        `;
      }

      // 5. Page navigation items
      if (!data.linkURL && !data.srcURL && !data.isEditable) {
        itemsHtml += `
          <button class="os-ctx-item" data-action="back" ${data.canGoBack ? '' : 'disabled'}>
            <span class="os-ctx-item-left">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
              <span>Back</span>
            </span>
            <span class="os-ctx-shortcut">Alt+←</span>
          </button>
          <button class="os-ctx-item" data-action="forward" ${data.canGoForward ? '' : 'disabled'}>
            <span class="os-ctx-item-left">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
              <span>Forward</span>
            </span>
            <span class="os-ctx-shortcut">Alt+→</span>
          </button>
          <button class="os-ctx-item" data-action="reload">
            <span class="os-ctx-item-left">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
              <span>Reload</span>
            </span>
            <span class="os-ctx-shortcut">Ctrl+R</span>
          </button>
          <div class="os-ctx-sep"></div>
          <button class="os-ctx-item" data-action="save-page-as">
            <span class="os-ctx-item-left">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              <span>Save page as...</span>
            </span>
            <span class="os-ctx-shortcut">Ctrl+S</span>
          </button>
          <button class="os-ctx-item" data-action="print">
            <span class="os-ctx-item-left">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              <span>Print...</span>
            </span>
            <span class="os-ctx-shortcut">Ctrl+P</span>
          </button>
          <button class="os-ctx-item" data-action="view-source">
            <span class="os-ctx-item-left">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
              <span>View page source</span>
            </span>
            <span class="os-ctx-shortcut">Ctrl+U</span>
          </button>
          <div class="os-ctx-sep"></div>
        `;
      }

      // 6. Inspect element (always present at bottom, just like Google Chrome)
      itemsHtml += `
        <button class="os-ctx-item" data-action="inspect-element">
          <span class="os-ctx-item-left">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            <span>Inspect</span>
          </span>
          <span class="os-ctx-shortcut">F12</span>
        </button>
      `;

      menu.innerHTML = itemsHtml;

      const winW = window.innerWidth || document.documentElement.clientWidth;
      const winH = window.innerHeight || document.documentElement.clientHeight;
      const menuW = 250;

      menu.style.width = `${menuW}px`;
      menu.style.visibility = 'hidden';
      menu.classList.remove('hidden');

      const menuH = menu.offsetHeight || 260;

      let posX = data.x;
      let posY = data.y;

      if (posX + menuW > winW - 8) {
        posX = Math.max(8, winW - menuW - 8);
      }
      if (posY + menuH > winH - 8) {
        posY = Math.max(8, winH - menuH - 8);
      }

      menu.style.left = `${posX}px`;
      menu.style.top = `${posY}px`;
      menu.style.visibility = 'visible';
    });
  }

  // Handle menu item click
  menu.addEventListener('click', async (e) => {
    const btn = e.target.closest('.os-ctx-item');
    if (!btn || btn.disabled) return;
    const action = btn.dataset.action;
    const payload = currentData || {};
    hideMenu();
    if (action && window.oniAPI && window.oniAPI.executeContextMenuAction) {
      await window.oniAPI.executeContextMenuAction(action, payload);
    }
  });

  // Handle click outside or contextmenu outside to dismiss
  backdrop.addEventListener('pointerdown', (e) => {
    if (Date.now() - openedAt < 120) return;
    if (e.target === backdrop) {
      hideMenu();
    }
  });

  backdrop.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (Date.now() - openedAt < 120) return;
    hideMenu();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideMenu();
    }
  });
})();

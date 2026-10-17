// Oni OS - Always-on-Top Bottom Dock Tabs Manager & Start Menu
(function () {
  'use strict';

  const dockEl = document.getElementById('os-dock');
  const dockBarWrap = document.getElementById('dock-bar-wrap');
  const dockTabsWrap = document.getElementById('os-dock-tabs-wrap');
  const dockTabsEl = document.getElementById('os-dock-tabs');
  const dockSepEl = document.getElementById('dock-sep');
  const btnStart = document.getElementById('dock-btn-start');
  const btnScrollLeft = document.getElementById('dock-scroll-left');
  const btnScrollRight = document.getElementById('dock-scroll-right');

  const startMenuEl = document.getElementById('os-start-menu');
  const startAppsGrid = document.getElementById('os-start-apps-grid');
  const startBtnNewTab = document.getElementById('os-start-btn-newtab');
  const startBtnPin = document.getElementById('os-start-btn-pin');
  const startBtnEdit = document.getElementById('os-start-btn-edit');
  let isStartMenuEditMode = false;
  let draggedAppIndex = null;

  let tabs = [];
  let activeTabId = null;
  let isStartMenuOpen = false;

  const appCtxMenu = document.getElementById('os-app-context-menu');
  let activeContextApp = null;

  function showAppContextMenu(clientX, clientY, app) {
    if (!appCtxMenu) return;
    activeContextApp = app;
    appCtxMenu.classList.remove('hidden');
    const menuW = appCtxMenu.offsetWidth || 240;
    const menuH = appCtxMenu.offsetHeight || 220;
    const x = Math.min(window.innerWidth - menuW - 16, Math.max(16, clientX));
    const y = Math.min(window.innerHeight - menuH - 16, Math.max(16, clientY));
    appCtxMenu.style.left = `${x}px`;
    appCtxMenu.style.top = `${y}px`;
  }

  function hideAppContextMenu() {
    if (appCtxMenu && !appCtxMenu.classList.contains('hidden')) {
      appCtxMenu.classList.add('hidden');
    }
  }

  let pinnedApps = [
    { title: 'GitHub', url: 'https://github.com', icon: 'https://github.githubassets.com/favicons/favicon.png' },
    { title: 'YouTube', url: 'https://youtube.com', icon: 'https://www.youtube.com/s/desktop/f7125368/img/favicon_144x144.png' },
    { title: 'Reddit', url: 'https://reddit.com', icon: 'https://www.redditstatic.com/shreddit/assets/favicon/192x192.png' },
    { title: 'Wikipedia', url: 'https://wikipedia.org', icon: 'https://en.wikipedia.org/static/favicon/wikipedia.ico' },
    { title: 'Twitch', url: 'https://twitch.tv', icon: 'https://static.twitchcdn.net/assets/favicon-32-e29e246c157142c94346.png' },
    { title: 'Hacker News', url: 'https://news.ycombinator.com', icon: 'https://news.ycombinator.com/favicon.ico' },
    { title: 'ChatGPT', url: 'https://chatgpt.com', icon: 'https://oaistatic-cdn.azureedge.net/chatgpt/favicon.ico' },
    { title: 'Claude', url: 'https://claude.ai', icon: 'https://claude.ai/favicon.ico' }
  ];

  const DEFAULT_GLOBE_SVG = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%2300ff88" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';

  function isDesktopHomeTab(tab) {
    if (!tab) return false;
    return tab.isDesktopHome === true || tab.url === 'oni://home';
  }

  function reportBounds() {
    if (!dockEl || !window.oniAPI || !window.oniAPI.setDockBounds) return;
    requestAnimationFrame(() => {
      const dockWidth = Math.min(1040, dockEl.offsetWidth || 70);
      let calculatedHeight = 100;
      if (isStartMenuOpen) {
        const startMenuH = startMenuEl ? Math.max(startMenuEl.offsetHeight || 0, 390) : 400;
        const dockH = dockEl ? (dockEl.offsetHeight || 60) : 60;
        calculatedHeight = Math.max(520, startMenuH + dockH + 40);
      }
      const width = isStartMenuOpen ? Math.max(dockWidth + 160, 820) : dockWidth + 160;
      window.oniAPI.setDockBounds({
        width,
        height: calculatedHeight,
        isStartMenuOpen
      });
    });
  }

  function openStartMenu() {
    if (!startMenuEl) return;
    isStartMenuOpen = true;
    hideTooltip();
    startMenuEl.classList.remove('hidden');
    renderStartMenuApps();
    reportBounds();
  }

  function closeStartMenu() {
    if (!startMenuEl || !isStartMenuOpen) return;
    isStartMenuOpen = false;
    isStartMenuEditMode = false;
    if (startBtnEdit) {
      startBtnEdit.textContent = 'Edit';
      startBtnEdit.classList.remove('active');
    }
    startMenuEl.classList.add('hidden');
    renderStartMenuApps();
    reportBounds();
  }

  function toggleStartMenu() {
    if (isStartMenuOpen) {
      closeStartMenu();
    } else {
      openStartMenu();
    }
  }

  function hideTooltip() {
    if (window.oniAPI && window.oniAPI.hideDockTooltip) {
      window.oniAPI.hideDockTooltip();
    }
  }

  function showTooltipForElement(el, title) {
    if (!el || !window.oniAPI || !window.oniAPI.showDockTooltip) return;
    const rect = el.getBoundingClientRect();
    window.oniAPI.showDockTooltip({
      text: title || 'Tab',
      relX: Math.round(rect.left + rect.width / 2),
      relY: Math.round(rect.top)
    });
  }

  function renderStartMenuApps() {
    if (!startAppsGrid) return;
    startAppsGrid.innerHTML = '';
    pinnedApps.forEach((app, index) => {
      const item = document.createElement('a');
      item.className = 'os-start-app' + (isStartMenuEditMode ? ' editing' : '');
      item.href = app.url;
      item.dataset.index = index;

      if (isStartMenuEditMode) {
        item.draggable = true;
        item.title = 'Drag to reorder';

        item.addEventListener('dragstart', (e) => {
          draggedAppIndex = index;
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', String(index));
          setTimeout(() => item.classList.add('dragging'), 0);
        });

        item.addEventListener('dragend', () => {
          item.classList.remove('dragging');
          document.querySelectorAll('.os-start-app').forEach(el => el.classList.remove('drag-over'));
          draggedAppIndex = null;
        });

        item.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          item.classList.add('drag-over');

          const rect = startAppsGrid.getBoundingClientRect();
          const edgeThreshold = 45;
          const y = e.clientY;
          if (y - rect.top < edgeThreshold) {
            const factor = Math.max(1, (edgeThreshold - (y - rect.top)) / 5);
            startAppsGrid.scrollTop -= factor * 5;
          } else if (rect.bottom - y < edgeThreshold) {
            const factor = Math.max(1, (edgeThreshold - (rect.bottom - y)) / 5);
            startAppsGrid.scrollTop += factor * 5;
          }
        });

        item.addEventListener('dragleave', () => {
          item.classList.remove('drag-over');
        });

        item.addEventListener('drop', async (e) => {
          e.preventDefault();
          item.classList.remove('drag-over');
          const fromIndex = draggedAppIndex !== null ? draggedAppIndex : parseInt(e.dataTransfer.getData('text/plain'), 10);
          const toIndex = index;
          if (fromIndex !== null && !isNaN(fromIndex) && fromIndex !== toIndex) {
            const [moved] = pinnedApps.splice(fromIndex, 1);
            pinnedApps.splice(toIndex, 0, moved);
            renderStartMenuApps();
            if (window.oniAPI && window.oniAPI.setBookmarks) {
              await window.oniAPI.setBookmarks(pinnedApps);
            }
          }
        });
      }

      const img = document.createElement('img');
      img.src = app.icon || app.favicon || '../../assets/app-icon.png';
      img.alt = app.title;
      img.onerror = () => { img.src = '../../assets/app-icon.png'; };

      const span = document.createElement('span');
      span.textContent = app.title;

      item.appendChild(img);
      item.appendChild(span);

      item.addEventListener('click', async (e) => {
        e.preventDefault();
        if (isStartMenuEditMode) return;
        closeStartMenu();
        let isHome = false;
        let currentTabId = activeTabId;
        try {
          if (window.oniAPI && window.oniAPI.getTabs) {
            const freshTabs = await window.oniAPI.getTabs();
            if (Array.isArray(freshTabs)) {
              tabs = freshTabs;
              const current = freshTabs.find(t => t.isActive);
              if (current) {
                currentTabId = current.id;
                isHome = isDesktopHomeTab(current);
              }
            }
          }
        } catch (err) {}

        if (!currentTabId && activeTabId) {
          currentTabId = activeTabId;
          const current = tabs.find(t => t.id === activeTabId);
          if (current) isHome = isDesktopHomeTab(current);
        }

        if (isHome || !currentTabId) {
          if (window.oniAPI && window.oniAPI.createTab) {
            window.oniAPI.createTab(app.url);
          }
        } else {
          if (currentTabId && window.oniAPI && window.oniAPI.navigate) {
            window.oniAPI.navigate(app.url, currentTabId);
          } else if (window.oniAPI && window.oniAPI.createTab) {
            window.oniAPI.createTab(app.url);
          }
        }
      });

      item.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showAppContextMenu(e.clientX, e.clientY, app);
      });

      startAppsGrid.appendChild(item);
    });
  }

  function updateDockScrollArrows() {
    if (!dockTabsEl || !btnScrollLeft || !btnScrollRight) return;
    const canScroll = dockTabsEl.scrollWidth > dockTabsEl.clientWidth + 4;
    if (!canScroll) {
      btnScrollLeft.classList.add('hidden');
      btnScrollRight.classList.add('hidden');
      return;
    }
    const sl = dockTabsEl.scrollLeft;
    const maxScroll = dockTabsEl.scrollWidth - dockTabsEl.clientWidth - 2;
    btnScrollLeft.classList.toggle('hidden', sl <= 2);
    btnScrollRight.classList.toggle('hidden', sl >= maxScroll);
  }

  function resolveTabIcon(tab) {
    if (tab.url && tab.url.startsWith('oni://')) {
      return '../../assets/app-icon.png';
    }
    if (tab.favicon) {
      if (tab.favicon === 'assets/icon.png') return '../../assets/app-icon.png';
      return tab.favicon;
    }
    return DEFAULT_GLOBE_SVG;
  }

  function renderDockTabs() {
    if (!dockTabsEl) return;
    dockTabsEl.innerHTML = '';

    const webTabs = tabs.filter(t => !isDesktopHomeTab(t));

    if (webTabs.length === 0) {
      dockTabsEl.classList.add('hidden');
      if (dockTabsWrap) dockTabsWrap.classList.add('hidden');
      if (dockSepEl) dockSepEl.classList.add('hidden');
      if (dockEl) dockEl.classList.add('no-tabs');
      reportBounds();
      return;
    }

    if (dockEl) dockEl.classList.remove('no-tabs');
    if (dockSepEl) dockSepEl.classList.remove('hidden');
    if (dockTabsWrap) dockTabsWrap.classList.remove('hidden');
    dockTabsEl.classList.remove('hidden');

    webTabs.forEach(tab => {
      const btn = document.createElement('button');
      btn.className = 'os-dock-item' + (tab.isActive ? ' active' : '');
      btn.setAttribute('type', 'button');
      btn.dataset.id = tab.id;

      if (tab.isLoading) {
        const spinner = document.createElement('div');
        spinner.className = 'dock-tab-spinner';
        btn.appendChild(spinner);
      } else {
        const img = document.createElement('img');
        img.className = 'dock-tab-icon dock-tab-favicon';
        img.alt = tab.title || 'Tab';
        img.src = resolveTabIcon(tab);
        img.onerror = () => { img.src = '../../assets/app-icon.png'; };
        btn.appendChild(img);
      }

      const closeBtn = document.createElement('button');
      closeBtn.className = 'dock-tab-close';
      closeBtn.setAttribute('type', 'button');
      closeBtn.setAttribute('title', 'Close tab');
      closeBtn.innerHTML = '✕';
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        hideTooltip();
        if (window.oniAPI && window.oniAPI.closeTab) {
          window.oniAPI.closeTab(tab.id);
        }
      });
      btn.appendChild(closeBtn);

      const pill = document.createElement('div');
      pill.className = 'os-dock-pill';
      btn.appendChild(pill);

      btn.addEventListener('mouseenter', () => {
        showTooltipForElement(btn, tab.title || 'Tab', tab.url || '');
      });

      btn.addEventListener('mouseleave', () => {
        hideTooltip();
      });

      btn.addEventListener('click', () => {
        hideTooltip();
        if (window.oniAPI && window.oniAPI.switchTab) {
          window.oniAPI.switchTab(tab.id);
        }
      });

      btn.addEventListener('auxclick', (e) => {
        if (e.button === 1) {
          e.preventDefault();
          hideTooltip();
          if (window.oniAPI && window.oniAPI.closeTab) {
            window.oniAPI.closeTab(tab.id);
          }
        }
      });

      dockTabsEl.appendChild(btn);
    });

    reportBounds();
    setTimeout(updateDockScrollArrows, 30);
  }

  function setupEventListeners() {
    if (btnStart) {
      btnStart.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleStartMenu();
      });
      btnStart.addEventListener('mouseenter', () => {
        showTooltipForElement(btnStart, 'Oni Start Menu', 'Applications & System Quick Launch');
      });
      btnStart.addEventListener('mouseleave', () => {
        hideTooltip();
      });
    }

    if (startBtnNewTab) {
      startBtnNewTab.addEventListener('click', () => {
        closeStartMenu();
        if (window.oniAPI && window.oniAPI.createTab) {
          window.oniAPI.createTab('oni://newtab');
        }
      });
    }

    if (startBtnPin) {
      startBtnPin.addEventListener('click', (e) => {
        e.stopPropagation();
        closeStartMenu();
        if (window.oniAPI && window.oniAPI.triggerOsAction) {
          window.oniAPI.triggerOsAction('pin-app');
        }
      });
    }

    if (startBtnEdit) {
      startBtnEdit.addEventListener('click', (e) => {
        e.stopPropagation();
        isStartMenuEditMode = !isStartMenuEditMode;
        startBtnEdit.textContent = isStartMenuEditMode ? 'Done' : 'Edit';
        startBtnEdit.classList.toggle('active', isStartMenuEditMode);
        renderStartMenuApps();
      });
    }

    // App context menu actions
    document.getElementById('ctx-app-open')?.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const app = activeContextApp;
      hideAppContextMenu();
      if (!app) return;
      closeStartMenu();
      let isHome = false;
      let currentTabId = activeTabId;
      try {
        if (window.oniAPI && window.oniAPI.getTabs) {
          const freshTabs = await window.oniAPI.getTabs();
          if (Array.isArray(freshTabs)) {
            tabs = freshTabs;
            const current = freshTabs.find(t => t.isActive);
            if (current) {
              currentTabId = current.id;
              isHome = isDesktopHomeTab(current);
            }
          }
        }
      } catch (err) {}

      if (!currentTabId && activeTabId) {
        currentTabId = activeTabId;
        const current = tabs.find(t => t.id === activeTabId);
        if (current) isHome = isDesktopHomeTab(current);
      }

      if (isHome || !currentTabId) {
        if (window.oniAPI && window.oniAPI.createTab) {
          window.oniAPI.createTab(app.url);
        }
      } else {
        if (currentTabId && window.oniAPI && window.oniAPI.navigate) {
          window.oniAPI.navigate(app.url, currentTabId);
        } else if (window.oniAPI && window.oniAPI.createTab) {
          window.oniAPI.createTab(app.url);
        }
      }
    });

    document.getElementById('ctx-app-open-tab')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const app = activeContextApp;
      hideAppContextMenu();
      if (!app) return;
      closeStartMenu();
      if (window.oniAPI && window.oniAPI.createTab) {
        window.oniAPI.createTab(app.url);
      }
    });

    document.getElementById('ctx-app-copy-link')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const app = activeContextApp;
      hideAppContextMenu();
      if (!app) return;
      if (window.oniAPI && window.oniAPI.writeClipboardText) {
        window.oniAPI.writeClipboardText(app.url);
      }
    });

    document.getElementById('ctx-app-edit')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const app = activeContextApp;
      hideAppContextMenu();
      if (!app) return;
      closeStartMenu();
      if (window.oniAPI && window.oniAPI.triggerOsAction) {
        window.oniAPI.triggerOsAction({ type: 'edit-app', app });
      }
    });

    document.getElementById('ctx-app-delete')?.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const app = activeContextApp;
      hideAppContextMenu();
      if (!app) return;
      const targetUrl = app.url;
      const targetId = app.id;
      pinnedApps = pinnedApps.filter(a => (targetId ? a.id !== targetId : a.url !== targetUrl));
      renderStartMenuApps();
      if (window.oniAPI && window.oniAPI.removeBookmark) {
        await window.oniAPI.removeBookmark(targetId || targetUrl);
      }
    });

    // Close Start Menu and Context Menus when clicking outside
    document.addEventListener('pointerdown', (e) => {
      if (!e.target.closest('#os-app-context-menu')) {
        hideAppContextMenu();
      }
      if (isStartMenuOpen) {
        const inside = e.target.closest('#os-start-menu, #dock-bar-wrap, #os-app-context-menu');
        if (!inside) {
          closeStartMenu();
        }
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (appCtxMenu && !appCtxMenu.classList.contains('hidden')) {
          hideAppContextMenu();
        } else if (isStartMenuOpen) {
          closeStartMenu();
        }
      }
    });

    window.addEventListener('blur', () => {
      hideTooltip();
      hideAppContextMenu();
      if (isStartMenuOpen) {
        closeStartMenu();
      }
    });

    if (dockTabsEl) {
      dockTabsEl.addEventListener('scroll', updateDockScrollArrows, { passive: true });
    }

    if (dockEl) {
      dockEl.addEventListener('wheel', (e) => {
        if (!dockTabsEl || dockTabsEl.classList.contains('hidden')) return;
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          e.preventDefault();
          dockTabsEl.scrollLeft += e.deltaY;
          updateDockScrollArrows();
        }
      }, { passive: false });
    }

    if (startAppsGrid) {
      startAppsGrid.addEventListener('dragover', (e) => {
        if (!isStartMenuEditMode) return;
        e.preventDefault();
        const rect = startAppsGrid.getBoundingClientRect();
        const edgeThreshold = 45;
        const y = e.clientY;
        if (y - rect.top < edgeThreshold) {
          const factor = Math.max(1, (edgeThreshold - (y - rect.top)) / 5);
          startAppsGrid.scrollTop -= factor * 5;
        } else if (rect.bottom - y < edgeThreshold) {
          const factor = Math.max(1, (edgeThreshold - (rect.bottom - y)) / 5);
          startAppsGrid.scrollTop += factor * 5;
        }
      });
    }

    if (btnScrollLeft) {
      btnScrollLeft.addEventListener('click', (e) => {
        e.stopPropagation();
        if (dockTabsEl) {
          dockTabsEl.scrollBy({ left: -160, behavior: 'smooth' });
          setTimeout(updateDockScrollArrows, 200);
        }
      });
    }

    if (btnScrollRight) {
      btnScrollRight.addEventListener('click', (e) => {
        e.stopPropagation();
        if (dockTabsEl) {
          dockTabsEl.scrollBy({ left: 160, behavior: 'smooth' });
          setTimeout(updateDockScrollArrows, 200);
        }
      });
    }
  }

  async function init() {
    setupEventListeners();

    if (window.oniAPI) {
      try {
        if (window.oniAPI.getBookmarks) {
          const bms = await window.oniAPI.getBookmarks();
          if (Array.isArray(bms) && bms.length > 0) {
            pinnedApps = bms;
          }
        }

        if (window.oniAPI.onBookmarksUpdated) {
          window.oniAPI.onBookmarksUpdated((bms) => {
            if (Array.isArray(bms)) {
              pinnedApps = bms;
              renderStartMenuApps();
            }
          });
        }

        if (window.oniAPI.getTabs) {
          const tList = await window.oniAPI.getTabs();
          if (Array.isArray(tList)) {
            tabs = tList;
            const current = tList.find(t => t.isActive);
            if (current) activeTabId = current.id;
            renderDockTabs();
          }
        }

        if (window.oniAPI.onTabCreated) {
          window.oniAPI.onTabCreated((tab) => {
            if (!tab) return;
            const existingIdx = tabs.findIndex(t => t.id === tab.id);
            if (existingIdx >= 0) {
              tabs[existingIdx] = { ...tabs[existingIdx], ...tab };
            } else {
              tabs.push(tab);
            }
            if (tab.isActive) {
              activeTabId = tab.id;
              tabs.forEach(t => { t.isActive = (t.id === tab.id); });
            }
            renderDockTabs();
          });
        }

        if (window.oniAPI.onTabClosed) {
          window.oniAPI.onTabClosed((tabId) => {
            const id = (tabId && typeof tabId === 'object') ? tabId.id : tabId;
            tabs = tabs.filter(t => t.id !== id);
            hideTooltip();
            renderDockTabs();
          });
        }

        if (window.oniAPI.onTabSwitched) {
          window.oniAPI.onTabSwitched((tabId) => {
            const id = (tabId && typeof tabId === 'object') ? tabId.id : tabId;
            activeTabId = id;
            tabs.forEach(t => { t.isActive = (t.id === id); });
            renderDockTabs();
          });
        }

        if (window.oniAPI.onTabUpdated) {
          window.oniAPI.onTabUpdated((tabData) => {
            if (!tabData) return;
            const idx = tabs.findIndex(t => t.id === tabData.id);
            if (idx >= 0) {
              tabs[idx] = { ...tabs[idx], ...tabData };
            } else {
              tabs.push(tabData);
            }
            if (tabData.isActive) {
              activeTabId = tabData.id;
              tabs.forEach(t => { t.isActive = (t.id === tabData.id); });
            }
            renderDockTabs();
          });
        }

        if (window.oniAPI.onOsAction) {
          window.oniAPI.onOsAction((action) => {
            if (action === 'start-menu') {
              toggleStartMenu();
            } else if (action === 'start-menu-open') {
              openStartMenu();
            } else if (action === 'close-start-menu' || action === 'home') {
              closeStartMenu();
            }
          });
        }
      } catch (err) {}
    }

    renderStartMenuApps();
    reportBounds();
  }

  document.addEventListener('DOMContentLoaded', init);
})();

// Oni Browser - Renderer UI Logic
(function () {
  'use strict';

  // DOM Elements
  const tabsList = document.getElementById('tabs-list');
  const btnNewTab = document.getElementById('btn-new-tab');
  const btnBack = document.getElementById('btn-back');
  const btnForward = document.getElementById('btn-forward');
  const btnReload = document.getElementById('btn-reload');
  const iconReload = document.getElementById('icon-reload');
  const iconStop = document.getElementById('icon-stop');
  const btnHome = document.getElementById('btn-home');
  const omniboxInput = document.getElementById('omnibox-input');
  const securityIndicator = document.getElementById('security-indicator');
  const btnStar = document.getElementById('btn-star');
  const btnZoomPill = document.getElementById('btn-zoom-pill');
  const zoomText = document.getElementById('zoom-text');
  
  const winMin = document.getElementById('win-min');
  const winMax = document.getElementById('win-max');
  const winClose = document.getElementById('win-close');
  const iconMax = document.getElementById('icon-max');
  const iconRestore = document.getElementById('icon-restore');

  // Oni OS Top Menu Bar Elements
  const osMenubar = document.getElementById('os-menubar');
  const osWinMin = document.getElementById('os-win-min');
  const osWinMax = document.getElementById('os-win-max');
  const osWinClose = document.getElementById('os-win-close');
  const osIconMax = document.getElementById('os-icon-max');
  const osIconRestore = document.getElementById('os-icon-restore');
  const osTopStartBtn = document.getElementById('os-top-start-btn');
  const osMenuDesktop = document.getElementById('os-menu-desktop');
  const osMenuSpotlight = document.getElementById('os-menu-spotlight');
  const osMenuBookmarks = document.getElementById('os-menu-bookmarks');
  const osMenuHistory = document.getElementById('os-menu-history');
  const osMenuDownloads = document.getElementById('os-menu-downloads');
  const osDlBadge = document.getElementById('os-dl-badge');
  const osMenuSettings = document.getElementById('os-menu-settings');
  const osMenuToggleDock = document.getElementById('os-menu-toggle-dock');

  const bookmarksBar = document.getElementById('bookmarks-bar');
  const bookmarksBarList = document.getElementById('bookmarks-bar-list');

  const btnShield = document.getElementById('btn-shield');
  const shieldCountBadge = document.getElementById('shield-count-badge');
  const shieldFlyout = document.getElementById('shield-flyout');
  const shieldToggle = document.getElementById('shield-toggle');
  const flyoutTotalBlocked = document.getElementById('flyout-total-blocked');

  const btnDownloads = document.getElementById('btn-downloads');
  const downloadsBadge = document.getElementById('downloads-badge');
  const downloadsFlyout = document.getElementById('downloads-flyout');
  const downloadsList = document.getElementById('downloads-list');
  const btnClearDownloads = document.getElementById('btn-clear-downloads');

  const btnHistory = document.getElementById('btn-history');
  const btnBookmarksPanel = document.getElementById('btn-bookmarks-panel');
  const btnSettings = document.getElementById('btn-settings');
  const btnDevtools = document.getElementById('btn-devtools');

  const findBar = document.getElementById('find-bar');
  const findInput = document.getElementById('find-input');
  const findCount = document.getElementById('find-count');
  const findPrev = document.getElementById('find-prev');
  const findNext = document.getElementById('find-next');
  const findClose = document.getElementById('find-close');
  const btnFind = document.getElementById('btn-find');

  const overlayContainer = document.getElementById('overlay-container');
  const overlayBackdrop = document.getElementById('overlay-backdrop');
  const modalTitle = document.getElementById('modal-title');
  const modalContent = document.getElementById('modal-content');
  const modalClose = document.getElementById('modal-close');

  // State
  let tabs = [];
  let activeTabId = null;
  let isMaximized = false;
  let currentSettings = {};
  let currentTheme = null;

  // Initialize
  async function init() {
    setupWindowControls();
    setupOsMenubar();
    setupNavigation();
    setupOmnibox();
    setupShortcuts();
    setupFlyouts();
    setupFindBar();

    // Load initial theme, settings, and bookmarks
    currentTheme = await window.oniAPI.getActiveTheme();
    currentSettings = await window.oniAPI.getSettings();
    applyThemeConstructs(currentTheme);
    applySettings(currentSettings);
    renderBookmarksBar();

    // Check maximized state
    isMaximized = await window.oniAPI.isMaximized();
    updateMaximizedUI(isMaximized);

    // Initial shield stats
    const stats = await window.oniAPI.getShieldStats();
    updateShieldUI(stats);

    // Measure and report topbar height
    reportTopBarHeight();
    window.addEventListener('resize', reportTopBarHeight);

    // Bind API Event Listeners
    window.oniAPI.onTabCreated(handleTabCreated);
    window.oniAPI.onTabUpdated(handleTabUpdated);
    window.oniAPI.onTabClosed(handleTabClosed);
    window.oniAPI.onTabSwitched(handleTabSwitched);
    window.oniAPI.onShieldUpdated(updateShieldUI);
    window.oniAPI.onDownloadProgress(handleDownloadProgress);
    window.oniAPI.onWindowMaximizedChange(updateMaximizedUI);
    window.oniAPI.onFindResult(handleFindResult);
    if (window.oniAPI.onBookmarksUpdated) {
      window.oniAPI.onBookmarksUpdated(() => {
        renderBookmarksBar();
        const activeTab = tabs.find(t => t.id === activeTabId);
        if (activeTab) updateActiveTabUI(activeTab);
      });
    }
    if (window.oniAPI.onThemeChanged) {
      window.oniAPI.onThemeChanged(({ theme, settings }) => {
        if (theme) {
          currentTheme = theme;
          applyThemeConstructs(theme);
        }
        if (settings) {
          currentSettings = settings;
          applySettings(settings);
        }
        renderTabs();
      });
    }

    if (window.oniAPI.onHtmlFullscreenChange) {
      window.oniAPI.onHtmlFullscreenChange((isFullscreen) => {
        document.body.classList.toggle('html-fullscreen', isFullscreen);
        const chrome = document.getElementById('browser-chrome');
        if (chrome) {
          chrome.style.display = isFullscreen ? 'none' : '';
        }
        reportTopBarHeight();
      });
    }

    if (window.oniAPI.onTabsReordered) {
      window.oniAPI.onTabsReordered((newList) => {
        if (Array.isArray(newList)) {
          tabs = newList;
          renderTabs();
        }
      });
    }

    if (window.oniAPI.onShortcut) {
      window.oniAPI.onShortcut('focusOmnibox', () => {
        omniboxInput.focus();
        omniboxInput.select();
      });
      window.oniAPI.onShortcut('toggleFind', () => {
        toggleFindBar();
      });
      window.oniAPI.onShortcut('toggleBookmark', () => {
        btnStar.click();
      });
      window.oniAPI.onShortcut('openHistory', () => {
        openOverlay('history');
      });
      window.oniAPI.onShortcut('openDownloads', () => {
        downloadsFlyout.classList.toggle('hidden');
        if (!downloadsFlyout.classList.contains('hidden')) renderDownloadsFlyout();
      });
      window.oniAPI.onShortcut('openBookmarks', () => {
        openOverlay('bookmarks');
      });
      window.oniAPI.onShortcut('openSettings', () => {
        openOverlay('settings');
      });
      window.oniAPI.onShortcut('escape', () => {
        if (!findBar.classList.contains('hidden')) closeFindBar();
        if (!shieldFlyout.classList.contains('hidden')) shieldFlyout.classList.add('hidden');
        if (!downloadsFlyout.classList.contains('hidden')) downloadsFlyout.classList.add('hidden');
        if (!overlayContainer.classList.contains('hidden')) closeOverlay();
      });
    }

    // Sync any already-created tabs
    const initialTabs = await window.oniAPI.getTabs();
    if (Array.isArray(initialTabs) && initialTabs.length > 0) {
      tabs = initialTabs;
      const active = initialTabs.find(t => t.isActive);
      if (active) activeTabId = active.id;
      renderTabs();
      if (active) updateActiveTabUI(active);
    }
  }

  function reportTopBarHeight() {
    if (document.body.classList.contains('html-fullscreen')) {
      window.oniAPI.setTopBarHeight(0);
      return;
    }
    const chrome = document.getElementById('browser-chrome');
    if (chrome) {
      window.oniAPI.setTopBarHeight(chrome.offsetHeight);
    }
  }

  // Window Controls
  function setupWindowControls() {
    winMin.addEventListener('click', () => window.oniAPI.minimize());
    winMax.addEventListener('click', async () => {
      const isMax = await window.oniAPI.maximize();
      updateMaximizedUI(isMax);
    });
    winClose.addEventListener('click', () => window.oniAPI.close());

    if (osWinMin) osWinMin.addEventListener('click', () => window.oniAPI.minimize());
    if (osWinMax) {
      osWinMax.addEventListener('click', async () => {
        const isMax = await window.oniAPI.maximize();
        updateMaximizedUI(isMax);
      });
    }
    if (osWinClose) osWinClose.addEventListener('click', () => window.oniAPI.close());
  }

  function setupOsMenubar() {
    if (osMenuDesktop) {
      osMenuDesktop.addEventListener('click', () => {
        if (window.oniAPI.triggerOsAction) window.oniAPI.triggerOsAction('home');
      });
    }
    if (osMenuSpotlight) {
      osMenuSpotlight.addEventListener('click', () => {
        if (window.oniAPI.triggerOsAction) window.oniAPI.triggerOsAction('search');
      });
    }
    if (osMenuHistory) {
      osMenuHistory.addEventListener('click', () => {
        if (window.oniAPI.triggerOsAction) window.oniAPI.triggerOsAction('history');
      });
    }
    if (osMenuDownloads) {
      osMenuDownloads.addEventListener('click', () => {
        if (window.oniAPI && window.oniAPI.hideDownloadToast) {
          window.oniAPI.hideDownloadToast();
        }
        if (window.oniAPI.triggerOsAction) window.oniAPI.triggerOsAction('downloads');
      });
    }
    if (osMenuSettings) {
      osMenuSettings.addEventListener('click', () => {
        if (window.oniAPI.triggerOsAction) window.oniAPI.triggerOsAction('settings');
      });
    }
    if (osMenuToggleDock) {
      if (window.oniAPI && window.oniAPI.getDockVisibility) {
        window.oniAPI.getDockVisibility().then((isVisible) => {
          osMenuToggleDock.textContent = isVisible ? 'Hide Dock' : 'Show Dock';
        }).catch(() => {});
      }
      osMenuToggleDock.addEventListener('click', async () => {
        if (window.oniAPI && window.oniAPI.toggleDock) {
          const isVisible = await window.oniAPI.toggleDock();
          osMenuToggleDock.textContent = isVisible ? 'Hide Dock' : 'Show Dock';
        }
      });
    }
    if (window.oniAPI && window.oniAPI.onDockVisibilityChange) {
      window.oniAPI.onDockVisibilityChange((isVisible) => {
        if (osMenuToggleDock) {
          osMenuToggleDock.textContent = isVisible ? 'Hide Dock' : 'Show Dock';
        }
      });
    }
  }

  function updateMaximizedUI(isMax) {
    isMaximized = isMax;
    if (isMax) {
      iconMax.classList.add('hidden');
      iconRestore.classList.remove('hidden');
      if (osIconMax) osIconMax.classList.add('hidden');
      if (osIconRestore) osIconRestore.classList.remove('hidden');
    } else {
      iconMax.classList.remove('hidden');
      iconRestore.classList.add('hidden');
      if (osIconMax) osIconMax.classList.remove('hidden');
      if (osIconRestore) osIconRestore.classList.add('hidden');
    }
  }

  // Navigation
  function setupNavigation() {
    btnBack.addEventListener('click', () => {
      if (activeTabId) window.oniAPI.goBack(activeTabId);
    });
    btnForward.addEventListener('click', () => {
      if (activeTabId) window.oniAPI.goForward(activeTabId);
    });
    btnReload.addEventListener('click', () => {
      if (!activeTabId) return;
      const activeTab = tabs.find(t => t.id === activeTabId);
      if (activeTab && activeTab.isLoading) {
        window.oniAPI.stopLoading(activeTabId);
      } else {
        window.oniAPI.reloadTab(activeTabId);
      }
    });
    btnHome.addEventListener('click', () => {
      if (activeTabId) {
        const home = currentSettings.homeUrl || 'oni://newtab';
        window.oniAPI.navigate(home, activeTabId);
      }
    });
    btnNewTab.addEventListener('click', () => {
      window.oniAPI.createTab('oni://newtab');
    });
    btnDevtools.addEventListener('click', () => {
      if (activeTabId) window.oniAPI.toggleDevTools(activeTabId);
    });
  }

  // Omnibox
  function setupOmnibox() {
    omniboxInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const value = omniboxInput.value.trim();
        if (value && activeTabId) {
          window.oniAPI.navigate(value, activeTabId);
          omniboxInput.blur();
        }
      }
    });

    omniboxInput.addEventListener('focus', () => {
      omniboxInput.select();
    });

    btnStar.addEventListener('click', async () => {
      const activeTab = tabs.find(t => t.id === activeTabId);
      if (!activeTab || activeTab.url.startsWith('oni://')) return;

      const isBm = await window.oniAPI.isBookmarked(activeTab.url);
      if (isBm) {
        await window.oniAPI.removeBookmark(activeTab.url);
        btnStar.classList.remove('active');
      } else {
        await window.oniAPI.addBookmark({
          title: activeTab.title,
          url: activeTab.url,
          icon: activeTab.favicon,
          favicon: activeTab.favicon
        });
        btnStar.classList.add('active');
      }
      renderBookmarksBar();
    });

    btnZoomPill.addEventListener('click', () => {
      if (activeTabId) {
        window.oniAPI.resetZoom(activeTabId);
        btnZoomPill.classList.add('hidden');
      }
    });
  }

  // Tabs Management
  function handleTabCreated(tab) {
    if (!tabs.some(t => t.id === tab.id)) {
      tabs.push(tab);
    }
    renderTabs();
  }

  function handleTabSwitched(tabId) {
    activeTabId = tabId;
    renderTabs();
    const activeTab = tabs.find(t => t.id === tabId);
    if (activeTab) {
      updateActiveTabUI(activeTab);
    }
  }

  function handleTabUpdated(updatedTab) {
    const idx = tabs.findIndex(t => t.id === updatedTab.id);
    if (idx >= 0) {
      tabs[idx] = { ...tabs[idx], ...updatedTab };
    } else {
      tabs.push(updatedTab);
    }
    renderTabs();
    if (updatedTab.id === activeTabId) {
      updateActiveTabUI(updatedTab);
    }
  }

  function handleTabClosed(tabId) {
    tabs = tabs.filter(t => t.id !== tabId);
    renderTabs();
  }

  function renderTabs() {
    tabsList.innerHTML = '';
    const visibleTabs = tabs.filter(tab => !tab.isDesktopHome && tab.url !== 'oni://home');
    visibleTabs.forEach(tab => {
      const tabEl = document.createElement('div');
      tabEl.className = `tab ${tab.id === activeTabId ? 'active' : ''}`;
      tabEl.dataset.id = tab.id;

      // Icon or Spinner
      if (tab.isLoading) {
        const spinner = document.createElement('div');
        spinner.className = 'tab-spinner';
        tabEl.appendChild(spinner);
      } else {
        const img = document.createElement('img');
        img.className = 'tab-favicon';
        img.src = tab.favicon || (tab.url.startsWith('oni://') ? '../../assets/app-icon.png' : 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>');
        img.onerror = () => { img.src = '../../assets/app-icon.png'; };
        tabEl.appendChild(img);
      }

      // Title
      const titleSpan = document.createElement('span');
      titleSpan.className = 'tab-title';
      titleSpan.textContent = tab.title || 'Untitled';
      tabEl.appendChild(titleSpan);

      // Close button
      const closeBtn = document.createElement('div');
      closeBtn.className = 'tab-close';
      closeBtn.innerHTML = '✕';
      closeBtn.title = 'Close tab (Ctrl+W)';
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.oniAPI.closeTab(tab.id);
      });
      tabEl.appendChild(closeBtn);

      // Tab click to switch
      tabEl.addEventListener('click', () => {
        window.oniAPI.switchTab(tab.id);
      });

      tabsList.appendChild(tabEl);
    });
  }

  async function updateActiveTabUI(tab) {
    // Navigation buttons state
    btnBack.disabled = !tab.canGoBack;
    btnForward.disabled = !tab.canGoForward;

    // Reload / Stop icon
    if (tab.isLoading) {
      iconReload.classList.add('hidden');
      iconStop.classList.remove('hidden');
    } else {
      iconReload.classList.remove('hidden');
      iconStop.classList.add('hidden');
    }

    // Omnibox URL
    if (document.activeElement !== omniboxInput) {
      if (tab.url === 'oni://newtab') {
        omniboxInput.value = '';
        omniboxInput.placeholder = 'Search the web or enter address...';
      } else {
        omniboxInput.value = tab.url;
      }
    }

    // Security indicator
    if (tab.url.startsWith('https://')) {
      securityIndicator.className = 'secure';
      securityIndicator.title = 'Secure Connection (HTTPS)';
    } else if (tab.url.startsWith('http://')) {
      securityIndicator.className = 'insecure';
      securityIndicator.title = 'Not Secure (HTTP)';
    } else {
      securityIndicator.className = '';
      securityIndicator.title = 'Oni Internal System';
    }

    // Star / Bookmark state
    const isBm = await window.oniAPI.isBookmarked(tab.url);
    if (isBm) {
      btnStar.classList.add('active');
    } else {
      btnStar.classList.remove('active');
    }

    // Zoom pill
    if (tab.zoomFactor && Math.abs(tab.zoomFactor - 1.0) > 0.05) {
      btnZoomPill.classList.remove('hidden');
      zoomText.textContent = `${Math.round(tab.zoomFactor * 100)}%`;
    } else {
      btnZoomPill.classList.add('hidden');
    }
  }

  // Bookmarks Bar
  async function renderBookmarksBar() {
    const bookmarks = await window.oniAPI.getBookmarks();
    bookmarksBarList.innerHTML = '';
    bookmarks.forEach(bm => {
      const chip = document.createElement('div');
      chip.className = 'bookmark-chip';
      chip.title = `${bm.title}\n${bm.url}`;
      
      const icon = document.createElement('img');
      icon.src = bm.favicon || '../../assets/app-icon.png';
      icon.onerror = () => { icon.src = '../../assets/app-icon.png'; };
      chip.appendChild(icon);

      const title = document.createElement('span');
      title.textContent = bm.title;
      chip.appendChild(title);

      chip.addEventListener('click', () => {
        if (activeTabId) {
          window.oniAPI.navigate(bm.url, activeTabId);
        }
      });

      bookmarksBarList.appendChild(chip);
    });
  }

  // Settings & Theme Constructs
  function applyThemeConstructs(theme) {
    if (!theme) return;

    document.body.className = `theme-${theme.id}`;
    document.body.dataset.theme = theme.id;

    // 1. Apply Chrome CSS custom properties
    if (theme.chrome && theme.chrome.cssVariables) {
      const rootStyle = document.documentElement.style;
      Object.entries(theme.chrome.cssVariables).forEach(([prop, val]) => {
        rootStyle.setProperty(prop, val);
      });
    }

    // 2. Apply Chrome layout & structural constructs
    if (theme.chrome && theme.chrome.layout) {
      const layout = theme.chrome.layout;
      const chromeEl = document.getElementById('browser-chrome');
      const brandEl = document.getElementById('brand-emblem');

      if (chromeEl) {
        chromeEl.dataset.tabBarPosition = layout.tabBarPosition || 'top';
        chromeEl.dataset.toolbarPosition = layout.toolbarPosition || 'top';
        chromeEl.dataset.windowControls = layout.windowControlsPosition || 'right';
        chromeEl.dataset.tabStyle = layout.tabStyle || 'rounded-top';
        chromeEl.dataset.omniboxStyle = layout.omniboxStyle || 'pill';
      }

      if (brandEl) {
        brandEl.classList.toggle('hidden', layout.showBrandEmblem === false);
        const brandTextEl = brandEl.querySelector('.brand-text');
        const brandIconEl = brandEl.querySelector('.brand-icon');
        if (brandTextEl && layout.brandText !== undefined) {
          brandTextEl.textContent = layout.brandText;
        }
        if (brandIconEl && layout.brandIcon) {
          brandIconEl.src = layout.brandIcon;
        }
      }

      const isOsTheme = theme.id === 'oni-os' || layout.showOsMenubar === true;
      const titlebarEl = document.getElementById('titlebar');
      const toolbarEl = document.getElementById('toolbar');

      if (osMenubar) {
        osMenubar.classList.toggle('hidden', !isOsTheme);
      }
      if (titlebarEl) {
        titlebarEl.classList.toggle('hidden', isOsTheme || layout.showTitlebar === false);
      }
      if (toolbarEl) {
        toolbarEl.classList.toggle('hidden', isOsTheme || layout.showToolbar === false);
      }

      if (btnHome) btnHome.classList.toggle('hidden', layout.showHomeButton === false);
      if (btnShield) btnShield.classList.toggle('hidden', layout.showShieldButton === false);
      if (btnBookmarksPanel) btnBookmarksPanel.classList.toggle('hidden', layout.showBookmarksButton === false);
      if (btnDownloads) btnDownloads.classList.toggle('hidden', layout.showDownloadsButton === false);
      if (btnHistory) btnHistory.classList.toggle('hidden', layout.showHistoryButton === false);
      if (btnFind) btnFind.classList.toggle('hidden', layout.showFindButton === false);
      if (btnDevtools) btnDevtools.classList.toggle('hidden', layout.showDevToolsButton === false);
    }

    // 3. Inject custom theme CSS if present
    let customStyleEl = document.getElementById('oni-theme-custom-css');
    if (theme.chrome && theme.chrome.customCss) {
      if (!customStyleEl) {
        customStyleEl = document.createElement('style');
        customStyleEl.id = 'oni-theme-custom-css';
        document.head.appendChild(customStyleEl);
      }
      customStyleEl.textContent = theme.chrome.customCss;
    } else if (customStyleEl) {
      customStyleEl.textContent = '';
    }

    requestAnimationFrame(reportTopBarHeight);
  }

  function applySettings(settings) {
    if (!settings) return;
    if (settings.showBookmarksBar === false) {
      bookmarksBar.classList.add('hidden');
    } else {
      bookmarksBar.classList.remove('hidden');
    }
    reportTopBarHeight();
  }

  // Shield UI
  function updateShieldUI(stats) {
    if (!stats) return;
    shieldCountBadge.textContent = stats.totalBlocked > 99 ? '99+' : stats.totalBlocked;
    flyoutTotalBlocked.textContent = stats.totalBlocked;
    shieldToggle.checked = stats.enabled;
    if (stats.enabled) {
      btnShield.classList.add('shield-active');
    } else {
      btnShield.classList.remove('shield-active');
    }
  }

  // Downloads UI & Toast Notifications
  const notifiedDownloads = new Set();

  function showDownloadToastNotification(item) {
    if (!item) return;

    let targetX = 180;
    let targetY = 40;

    const osDlBtn = document.getElementById('os-menu-downloads');
    const classicDlBtn = document.getElementById('btn-downloads');
    
    // Choose active button depending on theme
    const activeBtn = (osDlBtn && osDlBtn.offsetParent !== null) ? osDlBtn : (classicDlBtn && classicDlBtn.offsetParent !== null ? classicDlBtn : osDlBtn);

    if (activeBtn) {
      const rect = activeBtn.getBoundingClientRect();
      // Center the 360px toast card directly below the Downloads button/text
      targetX = Math.round(rect.left + (rect.width / 2) - 180);
      targetY = Math.round(rect.bottom + 4);
    }

    if (window.oniAPI && window.oniAPI.showDownloadToast) {
      window.oniAPI.showDownloadToast({
        x: targetX,
        y: targetY,
        title: 'Download Complete',
        filename: item.filename,
        filePath: item.path
      });
    }
  }

  function handleDownloadProgress(item) {
    if (!item) return;
    if (downloadsBadge) downloadsBadge.classList.remove('hidden');

    const pct = item.totalBytes > 0 ? Math.round((item.receivedBytes / item.totalBytes) * 100) : 0;
    if (osDlBadge) {
      if (item.state === 'progressing') {
        osDlBadge.textContent = `${pct}%`;
        osDlBadge.classList.remove('hidden');
      } else {
        osDlBadge.classList.add('hidden');
      }
    }

    if (item.state === 'completed' && !notifiedDownloads.has(item.id)) {
      notifiedDownloads.add(item.id);
      showDownloadToastNotification(item);
    }

    renderDownloadsFlyout();
  }

  async function renderDownloadsFlyout() {
    const downloads = await window.oniAPI.getDownloads();
    downloadsList.innerHTML = '';
    if (!downloads || downloads.length === 0) {
      downloadsList.innerHTML = '<div class="empty-state">No recent downloads</div>';
      return;
    }

    downloads.forEach(dl => {
      const row = document.createElement('div');
      row.className = 'download-row';

      const info = document.createElement('div');
      info.className = 'download-info';
      
      const name = document.createElement('span');
      name.className = 'download-name';
      name.textContent = dl.filename;
      info.appendChild(name);

      const meta = document.createElement('span');
      meta.className = 'download-meta';
      const pct = dl.totalBytes > 0 ? Math.round((dl.receivedBytes / dl.totalBytes) * 100) : 0;
      meta.textContent = dl.state === 'completed' ? 'Completed' : `${pct}% (${(dl.receivedBytes / (1024*1024)).toFixed(1)} MB)`;
      info.appendChild(meta);

      if (dl.state === 'progressing') {
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'text-btn';
        cancelBtn.textContent = '✕';
        cancelBtn.title = 'Cancel Download';
        cancelBtn.style.color = '#ef4444';
        cancelBtn.style.marginLeft = '4px';
        cancelBtn.addEventListener('click', async () => {
          if (window.oniAPI && window.oniAPI.cancelDownload) {
            cancelBtn.disabled = true;
            await window.oniAPI.cancelDownload(dl.id);
            renderDownloadsFlyout();
          }
        });
        row.appendChild(cancelBtn);
      }

      const openBtn = document.createElement('button');
      openBtn.className = 'text-btn';
      openBtn.textContent = 'Folder';
      openBtn.addEventListener('click', () => {
        window.oniAPI.openDownloadFolder(dl.path);
      });
      row.appendChild(openBtn);

      downloadsList.appendChild(row);
    });
  }

  // Flyouts
  function setupFlyouts() {
    btnShield.addEventListener('click', (e) => {
      e.stopPropagation();
      downloadsFlyout.classList.add('hidden');
      shieldFlyout.classList.toggle('hidden');
    });

    shieldToggle.addEventListener('change', () => {
      window.oniAPI.toggleShield(shieldToggle.checked);
    });

    btnDownloads.addEventListener('click', (e) => {
      e.stopPropagation();
      shieldFlyout.classList.add('hidden');
      downloadsFlyout.classList.toggle('hidden');
      if (!downloadsFlyout.classList.contains('hidden')) {
        renderDownloadsFlyout();
      }
    });

    btnClearDownloads.addEventListener('click', async () => {
      await window.oniAPI.clearDownloads();
      downloadsBadge.classList.add('hidden');
      renderDownloadsFlyout();
    });

    btnHistory.addEventListener('click', () => openOverlay('history'));
    btnBookmarksPanel.addEventListener('click', () => openOverlay('bookmarks'));
    btnSettings.addEventListener('click', () => openOverlay('settings'));

    // Close flyouts on outside click
    document.addEventListener('pointerdown', (e) => {
      if (window.oniAPI && window.oniAPI.hideContextMenu) {
        window.oniAPI.hideContextMenu();
      }
    });

    document.addEventListener('click', (e) => {
      if (!shieldFlyout.contains(e.target) && e.target !== btnShield) {
        shieldFlyout.classList.add('hidden');
      }
      if (!downloadsFlyout.contains(e.target) && e.target !== btnDownloads) {
        downloadsFlyout.classList.add('hidden');
      }
    });
  }

  // Find in Page
  function setupFindBar() {
    btnFind.addEventListener('click', () => {
      toggleFindBar();
    });

    findClose.addEventListener('click', () => {
      closeFindBar();
    });

    findInput.addEventListener('input', () => {
      const text = findInput.value.trim();
      if (text) {
        window.oniAPI.findInPage(text, true);
      } else {
        window.oniAPI.stopFindInPage('clearSelection');
        findCount.textContent = '0 of 0';
      }
    });

    findNext.addEventListener('click', () => {
      const text = findInput.value.trim();
      if (text) window.oniAPI.findInPage(text, true);
    });

    findPrev.addEventListener('click', () => {
      const text = findInput.value.trim();
      if (text) window.oniAPI.findInPage(text, false);
    });

    findInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const forward = !e.shiftKey;
        window.oniAPI.findInPage(findInput.value, forward);
      } else if (e.key === 'Escape') {
        closeFindBar();
      }
    });
  }

  function toggleFindBar() {
    findBar.classList.toggle('hidden');
    if (!findBar.classList.contains('hidden')) {
      findInput.focus();
      findInput.select();
    } else {
      window.oniAPI.stopFindInPage('clearSelection');
    }
  }

  function closeFindBar() {
    findBar.classList.add('hidden');
    window.oniAPI.stopFindInPage('clearSelection');
  }

  function handleFindResult(result) {
    if (result && result.matches !== undefined) {
      findCount.textContent = `${result.activeMatchOrdinal || 0} of ${result.matches}`;
    }
  }

  // Interactive Overlays (Settings, History, Bookmarks)
  function openOverlay(type) {
    window.oniAPI.setOverlayOpen(true);
    overlayContainer.classList.remove('hidden');

    if (type === 'settings') {
      renderSettingsModal();
    } else if (type === 'history') {
      renderHistoryModal();
    } else if (type === 'bookmarks') {
      renderBookmarksModal();
    }
  }

  function closeOverlay() {
    overlayContainer.classList.add('hidden');
    window.oniAPI.setOverlayOpen(false);
  }

  modalClose.addEventListener('click', closeOverlay);
  overlayBackdrop.addEventListener('click', closeOverlay);

  // System Updates State
  let appVersion = '1.0.0';
  let updateState = {
    status: 'idle',
    percent: 0,
    downloadedVersion: '',
    errorMessage: '',
    checkedOnce: false
  };

  function getUpdaterApi() {
    return (window.electronAPI && window.electronAPI.updater) || (window.oniAPI && window.oniAPI.updater);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function renderUpdateStatusIndicator(state) {
    if (state.status === 'checking') {
      return `
        <div class="os-update-status-checking">
          <span class="os-update-spinner"></span>
          <span>Scanning For Updates...</span>
        </div>
      `;
    }
    if (state.status === 'available' || state.status === 'downloading') {
      const pct = Math.max(0, Math.min(100, state.percent || 0));
      return `
        <div class="os-update-progress-wrap">
          <div class="os-update-progress-label">
            <span>Downloading update: ${pct}%</span>
            <span>${pct}%</span>
          </div>
          <div class="os-update-progress-bar-bg">
            <div class="os-update-progress-bar-fill" style="width: ${pct}%;"></div>
          </div>
        </div>
      `;
    }
    if (state.status === 'downloaded') {
      return `
        <div class="os-update-status-ready">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
          <span>v${escapeHtml(state.downloadedVersion || 'new version')} ready to install</span>
        </div>
      `;
    }
    if (state.status === 'error') {
      return `
        <div class="os-update-status-error">
          <span class="os-update-error-msg" title="${escapeHtml(state.errorMessage)}">${escapeHtml(state.errorMessage || 'Failed to check for updates')}</span>
          <button type="button" class="os-update-retry-btn" id="os-update-retry-btn">[ Retry ]</button>
        </div>
      `;
    }
    if (state.checkedOnce) {
      return `
        <div class="os-update-status-uptodate">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
          <span>Up to date</span>
        </div>
      `;
    }
    return '';
  }

  function renderUpdateCardHtml() {
    return `
      <div class="os-update-card" id="os-update-card">
        <div class="os-update-header">
          <div class="os-update-titles">
            <div class="os-settings-group-label" style="margin-bottom: 2px; color: var(--accent-green);">SYSTEM UPDATES</div>
            <div class="os-update-version-subtitle" id="os-update-version">Current Version: v${escapeHtml(appVersion)}</div>
          </div>
          <button type="button" class="os-update-btn ${updateState.status === 'downloaded' ? 'install-ready' : ''}" id="os-update-action-btn" ${updateState.status === 'checking' ? 'disabled' : ''}>
            ${updateState.status === 'downloaded' ? '[ Restart & Install ]' : (updateState.status === 'checking' ? '[ Checking... ]' : '[ Check for Updates ]')}
          </button>
        </div>
        <div class="os-update-status-row" id="os-update-status-row">
          ${renderUpdateStatusIndicator(updateState)}
        </div>
      </div>
    `;
  }

  function updateDomUpdateCard(container) {
    if (!container) return;
    const actionBtn = container.querySelector('#os-update-action-btn');
    const statusRow = container.querySelector('#os-update-status-row');
    const verEl = container.querySelector('#os-update-version');

    if (verEl) {
      verEl.textContent = `Current Version: v${appVersion}`;
    }

    if (actionBtn) {
      if (updateState.status === 'downloaded') {
        actionBtn.textContent = '[ Restart & Install ]';
        actionBtn.classList.add('install-ready');
        actionBtn.disabled = false;
      } else if (updateState.status === 'checking') {
        actionBtn.textContent = '[ Checking... ]';
        actionBtn.classList.remove('install-ready');
        actionBtn.disabled = true;
      } else {
        actionBtn.textContent = '[ Check for Updates ]';
        actionBtn.classList.remove('install-ready');
        actionBtn.disabled = false;
      }
    }

    if (statusRow) {
      statusRow.innerHTML = renderUpdateStatusIndicator(updateState);
      const retryBtn = statusRow.querySelector('#os-update-retry-btn');
      if (retryBtn) {
        retryBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          triggerUpdateCheck(container);
        });
      }
    }
  }

  async function triggerUpdateCheck(container) {
    const updater = getUpdaterApi();
    if (!updater) return;
    updateState.status = 'checking';
    updateState.errorMessage = '';
    updateDomUpdateCard(container);

    try {
      if (updater.checkForUpdates) {
        const res = await updater.checkForUpdates();
        if (res && (res.status === 'portable' || res.status === 'dev')) {
          updateState.status = 'idle';
          updateState.checkedOnce = true;
          updateState.isPortable = res.status === 'portable';
          updateState.errorMessage = '';
        } else if (res && res.status === 'success') {
          if (updateState.status === 'checking') {
            updateState.status = 'idle';
            updateState.checkedOnce = true;
            updateState.errorMessage = '';
          }
        } else if (res && res.status === 'error') {
          updateState.status = 'error';
          updateState.errorMessage = res.message || 'Unable to check for updates';
        }
        updateDomUpdateCard(container);
      }
    } catch (err) {
      updateState.status = 'error';
      const cleanMsg = (err?.message || 'Failed to check for updates')
        .replace(/^Error invoking remote method '[^']+':\s*/i, '')
        .replace(/^Error:\s*/i, '');
      updateState.errorMessage = cleanMsg;
      updateDomUpdateCard(container);
    }
  }

  function bindUpdateCardEvents(container) {
    if (!container) return;
    const actionBtn = container.querySelector('#os-update-action-btn');
    const retryBtn = container.querySelector('#os-update-retry-btn');

    if (actionBtn) {
      actionBtn.addEventListener('click', async () => {
        const updater = getUpdaterApi();
        if (updateState.status === 'downloaded') {
          if (updater && updater.installUpdate) {
            updater.installUpdate();
          }
        } else {
          await triggerUpdateCheck(container);
        }
      });
    }

    if (retryBtn) {
      retryBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        triggerUpdateCheck(container);
      });
    }
  }

  const updaterApiInstance = getUpdaterApi();
  if (updaterApiInstance && updaterApiInstance.onUpdaterEvent) {
    updaterApiInstance.onUpdaterEvent((data) => {
      if (!data) return;
      const evt = data.event || data.status;
      if (evt === 'checking-for-update' || data.status === 'checking') {
        updateState.status = 'checking';
        updateState.errorMessage = '';
      } else if (evt === 'update-available' || data.status === 'available') {
        updateState.status = 'downloading';
        updateState.percent = 0;
        updateState.errorMessage = '';
      } else if (evt === 'update-not-available' || data.status === 'not-available') {
        updateState.status = 'idle';
        updateState.checkedOnce = true;
        updateState.errorMessage = '';
      } else if (evt === 'download-progress' || data.status === 'downloading') {
        updateState.status = 'downloading';
        updateState.percent = data.percent || 0;
        updateState.errorMessage = '';
      } else if (evt === 'update-downloaded' || data.status === 'downloaded') {
        updateState.status = 'downloaded';
        updateState.downloadedVersion = data.version || (data.info && data.info.version) || '';
        updateState.errorMessage = '';
      } else if (evt === 'error' || data.status === 'error') {
        updateState.status = 'error';
        updateState.errorMessage = data.message || 'Error checking for updates';
      }
      updateDomUpdateCard(modalContent);
    });
  }

  if (updaterApiInstance && updaterApiInstance.getVersion) {
    updaterApiInstance.getVersion().then(v => {
      if (v) {
        appVersion = v;
        const verEl = document.getElementById('os-update-version');
        if (verEl) verEl.textContent = `Current Version: v${escapeHtml(appVersion)}`;
      }
    }).catch(() => {});
  }

  // Settings Modal View
  async function renderSettingsModal() {
    modalTitle.textContent = 'Oni Browser Settings';
    const updater = getUpdaterApi();
    const [settings, themes, activeTheme, fetchedVersion] = await Promise.all([
      window.oniAPI.getSettings(),
      window.oniAPI.getThemes(),
      window.oniAPI.getActiveTheme(),
      (updater && updater.getVersion) ? updater.getVersion().catch(() => null) : null
    ]);

    if (fetchedVersion) appVersion = fetchedVersion;

    const activeId = (activeTheme && activeTheme.id) || settings.activeThemeId || 'oni-os';

    const sortedThemes = [...(themes || [])].sort((a, b) => {
      if (a.id === 'oni-os') return -1;
      if (b.id === 'oni-os') return 1;
      if (a.id === 'classic') return -1;
      if (b.id === 'classic') return 1;
      return 0;
    });

    const themeCardsHtml = sortedThemes.map(t => {
      const isActive = t.id === activeId;
      const vars = (t.chrome && t.chrome.cssVariables) || {};
      const bgMain = vars['--bg-main'] || '#0a0b0f';
      const bgToolbar = vars['--bg-toolbar'] || '#12141e';
      const accentGreen = vars['--accent-green'] || '#00ff88';
      const accentCyan = vars['--accent-cyan'] || '#00e5ff';
      const layout = (t.chrome && t.chrome.layout) || {};
      const behavior = t.behavior || {};

      return `
        <div class="theme-card ${isActive ? 'active' : ''}" data-theme-id="${t.id}">
          <div class="theme-card-top">
            <div class="theme-card-title-row">
              <span class="theme-card-name">${t.name}</span>
              ${isActive ? '<span class="theme-badge">Active</span>' : ''}
            </div>
            <div class="theme-swatches" title="Theme Color Palette">
              <span class="theme-swatch" style="background: ${bgMain};" title="Main Background: ${bgMain}"></span>
              <span class="theme-swatch" style="background: ${bgToolbar};" title="Chrome Surface: ${bgToolbar}"></span>
              <span class="theme-swatch" style="background: ${accentGreen};" title="Primary Accent: ${accentGreen}"></span>
              <span class="theme-swatch" style="background: ${accentCyan};" title="Secondary Accent: ${accentCyan}"></span>
            </div>
          </div>
          <div class="theme-card-desc">${t.description || 'Complete visual and functional browser construct.'}</div>
          <div class="theme-construct-tags">
            <span class="theme-construct-tag">Chrome: ${layout.tabBarPosition || 'top'} / ${layout.omniboxStyle || 'pill'}</span>
            <span class="theme-construct-tag">Home: ${t.newTab && t.newTab.layoutMode === 'desktop' ? 'OS Desktop + App Dock' : (t.newTab && t.newTab.clock && t.newTab.clock.showKanjiDate ? 'Kanji Clock Dashboard' : 'Standard')}</span>
            <span class="theme-construct-tag">Engine: ${behavior.searchEngine || 'google'}</span>
            <span class="theme-construct-tag">Shield: ${behavior.adBlockEnabled !== false ? 'Enabled' : 'Off'}</span>
          </div>
        </div>
      `;
    }).join('');

    modalContent.innerHTML = `
      <div class="themes-section">
        <div class="themes-section-header">
          <div>
            <div class="setting-label" style="margin-bottom: 2px;">Themes</div>
            <div class="setting-desc" style="margin-bottom: 0;">A theme saves and controls the entire visual and functional constructs of Oni Browser (chrome layout, palette, typography, dashboard, and engine behavior).</div>
          </div>
        </div>

        <div class="theme-list" id="modal-theme-list">
          ${themeCardsHtml}
        </div>

        <div class="theme-save-row">
          <input type="text" id="modal-theme-name" class="setting-input" value="${(activeTheme && activeTheme.name) || 'Oni OS'}" placeholder="Theme name (e.g. Oni OS)" style="flex: 1;">
          <button id="modal-btn-save-theme" class="btn-primary" style="white-space: nowrap;">Save Current Config</button>
        </div>
        <div id="modal-theme-status" class="theme-status-msg hidden"></div>
      </div>

      <!-- Updates Card -->
      ${renderUpdateCardHtml()}

      <div class="setting-group">
        <div class="setting-label">Default Search Engine</div>
        <div class="setting-desc">Choose which search engine to query when typing in the address bar.</div>
        <select id="modal-select-engine" class="setting-select">
          <option value="google" ${(settings.searchEngine || 'google') === 'google' ? 'selected' : ''}>Google</option>
          <option value="duckduckgo" ${settings.searchEngine === 'duckduckgo' ? 'selected' : ''}>DuckDuckGo (Privacy-focused)</option>
          <option value="brave" ${settings.searchEngine === 'brave' ? 'selected' : ''}>Brave Search</option>
          <option value="bing" ${settings.searchEngine === 'bing' ? 'selected' : ''}>Microsoft Bing</option>
        </select>
      </div>

      <div class="setting-group">
        <div class="setting-label">Pinned Apps Bar</div>
        <div class="setting-desc">Show quick-launch Pinned Apps below the address bar (synced with Oni OS Pinned Apps).</div>
        <label class="switch">
          <input type="checkbox" id="modal-toggle-bm" ${settings.showBookmarksBar !== false ? 'checked' : ''}>
          <span class="slider round"></span>
        </label>
      </div>

      <div class="setting-group">
        <div class="setting-label">Privacy & Shield</div>
        <div class="setting-desc">Automatically block known invasive ad trackers and telemetry scripts.</div>
        <label class="switch">
          <input type="checkbox" id="modal-toggle-shield" ${settings.adBlockEnabled !== false ? 'checked' : ''}>
          <span class="slider round"></span>
        </label>
      </div>

      <div class="setting-group" style="padding-top: 14px; border-top: 1px solid var(--border-subtle);">
        <div class="setting-label">Privacy &amp; Security</div>
        <div class="setting-desc">Clear local cookies, cached network assets, storage, and browsing logs.</div>
        <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 8px; padding: 12px; margin-top: 8px;">
          <div style="font-weight: 600; font-size: 13px; color: #fff; margin-bottom: 2px;">Clear Browsing Data</div>
          <div style="font-size: 11.5px; color: var(--text-muted); margin-bottom: 10px;">Delete history, cookies, cache, and more.</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; margin-bottom: 12px; font-size: 12px; color: #d1d5db;">
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
              <input type="checkbox" id="modal-clear-history" checked style="accent-color: var(--accent-green); cursor: pointer;">
              <span>Browsing History</span>
            </label>
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
              <input type="checkbox" id="modal-clear-cookies" checked style="accent-color: var(--accent-green); cursor: pointer;">
              <span>Cookies &amp; Site Data</span>
            </label>
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
              <input type="checkbox" id="modal-clear-cache" checked style="accent-color: var(--accent-green); cursor: pointer;">
              <span>Cached Images &amp; Files</span>
            </label>
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
              <input type="checkbox" id="modal-clear-storage" checked style="accent-color: var(--accent-green); cursor: pointer;">
              <span>Storage &amp; Service Workers</span>
            </label>
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px;">
            <div id="modal-clear-status" style="font-size: 11px; color: var(--accent-green); font-weight: 500;" class="hidden"></div>
            <button class="btn-primary" id="modal-btn-clear-data" style="margin-left: auto; background: rgba(239, 68, 68, 0.2); border-color: rgba(239, 68, 68, 0.4); color: #fca5a5; white-space: nowrap;">
              Delete Browsing Data
            </button>
          </div>
        </div>
      </div>

      <div class="setting-group" style="padding-top: 10px; border-top: 1px solid var(--border-subtle);">
        <div class="setting-label">About Oni Browser</div>
        <div class="setting-desc">Version 1.0.0 (Windows Standalone x64 Edition). Crafted for speed, aesthetics, and privacy.</div>
      </div>
    `;

    bindUpdateCardEvents(modalContent);

    // Bind theme card clicks
    modalContent.querySelectorAll('.theme-card').forEach(card => {
      card.addEventListener('click', async () => {
        const themeId = card.dataset.themeId;
        if (!themeId) return;
        const res = await window.oniAPI.applyTheme(themeId);
        if (res && res.theme) {
          currentTheme = res.theme;
          currentSettings = res.settings;
          applyThemeConstructs(currentTheme);
          applySettings(currentSettings);
          await renderSettingsModal();
        }
      });
    });

    // Save current configuration into theme
    document.getElementById('modal-btn-save-theme').addEventListener('click', async () => {
      const nameInput = document.getElementById('modal-theme-name');
      const name = (nameInput.value || (activeTheme && activeTheme.name) || 'Oni OS').trim() || 'Oni OS';
      const id = name.toLowerCase() === 'oni os' || name.toLowerCase() === 'oni-os' ? 'oni-os' : (name.toLowerCase() === 'classic' ? 'classic' : undefined);
      const res = await window.oniAPI.saveTheme({ id, name });
      if (res && res.theme) {
        currentTheme = res.theme;
        currentSettings = res.settings;
        applyThemeConstructs(currentTheme);
        applySettings(currentSettings);
        await renderSettingsModal();
        const statusEl = document.getElementById('modal-theme-status');
        if (statusEl) {
          statusEl.textContent = `Saved current browser configuration to "${res.theme.name}" theme.`;
          statusEl.classList.remove('hidden');
        }
      }
    });

    document.getElementById('modal-select-engine').addEventListener('change', async (e) => {
      currentSettings = await window.oniAPI.updateSettings({ searchEngine: e.target.value });
    });

    document.getElementById('modal-toggle-bm').addEventListener('change', async (e) => {
      currentSettings = await window.oniAPI.updateSettings({ showBookmarksBar: e.target.checked });
      applySettings(currentSettings);
    });

    document.getElementById('modal-toggle-shield').addEventListener('change', async (e) => {
      currentSettings = await window.oniAPI.updateSettings({ adBlockEnabled: e.target.checked });
      window.oniAPI.toggleShield(e.target.checked);
    });

    const clearDataBtn = document.getElementById('modal-btn-clear-data');
    if (clearDataBtn) {
      clearDataBtn.addEventListener('click', async () => {
        const history = document.getElementById('modal-clear-history')?.checked ?? true;
        const cookies = document.getElementById('modal-clear-cookies')?.checked ?? true;
        const cache = document.getElementById('modal-clear-cache')?.checked ?? true;
        const storage = document.getElementById('modal-clear-storage')?.checked ?? true;
        const statusEl = document.getElementById('modal-clear-status');

        clearDataBtn.disabled = true;
        clearDataBtn.textContent = 'Deleting...';

        try {
          if (window.oniAPI && window.oniAPI.clearBrowsingData) {
            await window.oniAPI.clearBrowsingData({ history, cookies, cache, storage });
          } else if (window.oniAPI && window.oniAPI.clearHistory && history) {
            await window.oniAPI.clearHistory();
          }

          if (statusEl) {
            statusEl.textContent = 'Browsing data deleted successfully ✓';
            statusEl.style.color = 'var(--accent-green)';
            statusEl.classList.remove('hidden');
            setTimeout(() => {
              if (statusEl) statusEl.classList.add('hidden');
            }, 3000);
          }
        } catch (err) {
          console.error('Failed to clear browsing data:', err);
          if (statusEl) {
            statusEl.textContent = 'Failed to delete some data';
            statusEl.style.color = '#ef4444';
            statusEl.classList.remove('hidden');
          }
        } finally {
          clearDataBtn.disabled = false;
          clearDataBtn.textContent = 'Delete Browsing Data';
        }
      });
    }
  }

  // History Modal View
  async function renderHistoryModal() {
    modalTitle.textContent = 'Browsing History';
    const history = await window.oniAPI.getHistory();

    if (!history || history.length === 0) {
      modalContent.innerHTML = '<div class="empty-state">No browsing history recorded yet.</div>';
      return;
    }

    let html = `
      <div style="display:flex; justify-content:space-between; margin-bottom: 14px;">
        <span style="font-size:12px; color:var(--text-muted);">${history.length} visited pages</span>
        <button id="modal-btn-clear-hist" class="btn-danger">Clear All History</button>
      </div>
      <div style="display:flex; flex-direction:column; gap:8px; max-height:400px; overflow-y:auto;">
    `;

    history.forEach(item => {
      const dateStr = new Date(item.visitedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      html += `
        <div class="download-row" style="cursor:pointer;" data-url="${item.url}">
          <div class="download-info">
            <span class="download-name">${item.title}</span>
            <span class="download-meta">${item.url} • ${dateStr}</span>
          </div>
          <button class="text-btn modal-del-hist" data-id="${item.id}">Delete</button>
        </div>
      `;
    });

    html += '</div>';
    modalContent.innerHTML = html;

    // Bind item click to navigate
    modalContent.querySelectorAll('.download-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-del-hist')) return;
        const url = row.dataset.url;
        if (url && activeTabId) {
          window.oniAPI.navigate(url, activeTabId);
          closeOverlay();
        }
      });
    });

    // Delete single item
    modalContent.querySelectorAll('.modal-del-hist').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await window.oniAPI.removeHistory(btn.dataset.id);
        renderHistoryModal();
      });
    });

    // Clear all history
    document.getElementById('modal-btn-clear-hist').addEventListener('click', async () => {
      await window.oniAPI.clearHistory();
      renderHistoryModal();
    });
  }

  // Pinned Apps Modal View (replaces Bookmarks)
  async function renderBookmarksModal() {
    modalTitle.textContent = 'Pinned Apps';
    const bookmarks = await window.oniAPI.getBookmarks();

    let html = `
      <form id="modal-add-pin-form" style="display:flex; gap:8px; margin-bottom:14px;">
        <input type="text" id="modal-pin-title" class="setting-input" placeholder="App Title (e.g. Discord)" required style="flex:1;">
        <input type="text" id="modal-pin-url" class="setting-input" placeholder="URL (e.g. https://discord.com)" required style="flex:1.4;">
        <button type="submit" class="btn-primary" style="white-space:nowrap;">Pin App</button>
      </form>
      <div style="display:flex; flex-direction:column; gap:8px; max-height:380px; overflow-y:auto;">
    `;

    if (!bookmarks || bookmarks.length === 0) {
      html += '<div class="empty-state">No Pinned Apps yet. Click the ★ icon in the address bar or use the form above to pin an app.</div>';
    } else {
      bookmarks.forEach(bm => {
        const iconSrc = bm.icon || bm.favicon || '../../assets/app-icon.png';
        html += `
          <div class="download-row" style="cursor:pointer;" data-url="${bm.url}">
            <div style="display:flex; align-items:center; gap:10px; overflow:hidden;">
              <img src="${iconSrc}" style="width:18px; height:18px; border-radius:4px; object-fit:contain;" onerror="this.src='../../assets/app-icon.png'">
              <div class="download-info">
                <span class="download-name">${bm.title}</span>
                <span class="download-meta">${bm.url}</span>
              </div>
            </div>
            <button class="text-btn modal-del-bm" data-id="${bm.id || bm.url}">Unpin</button>
          </div>
        `;
      });
    }

    html += '</div>';
    modalContent.innerHTML = html;

    const addForm = document.getElementById('modal-add-pin-form');
    if (addForm) {
      addForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = (document.getElementById('modal-pin-title').value || '').trim();
        let url = (document.getElementById('modal-pin-url').value || '').trim();
        if (!title || !url) return;
        if (!/^https?:\/\//i.test(url) && !url.startsWith('oni://')) {
          url = `https://${url}`;
        }
        await window.oniAPI.addBookmark({ title, url });
        renderBookmarksModal();
        renderBookmarksBar();
      });
    }

    modalContent.querySelectorAll('.download-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-del-bm')) return;
        const url = row.dataset.url;
        if (url && activeTabId) {
          window.oniAPI.navigate(url, activeTabId);
          closeOverlay();
        }
      });
    });

    modalContent.querySelectorAll('.modal-del-bm').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await window.oniAPI.removeBookmark(btn.dataset.id);
        renderBookmarksModal();
        renderBookmarksBar();
      });
    });
  }

  // Keyboard Shortcuts
  function setupShortcuts() {
    window.addEventListener('keydown', (e) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      if (isCtrlOrCmd && e.key.toLowerCase() === 't') {
        e.preventDefault();
        window.oniAPI.createTab('oni://newtab');
      } else if (isCtrlOrCmd && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        if (activeTabId) window.oniAPI.closeTab(activeTabId);
      } else if (isCtrlOrCmd && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        if (activeTabId) window.oniAPI.reloadTab(activeTabId);
      } else if (isCtrlOrCmd && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        omniboxInput.focus();
        omniboxInput.select();
      } else if (isCtrlOrCmd && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        btnStar.click();
      } else if (isCtrlOrCmd && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        if (currentTheme && (currentTheme.id === 'oni-os' || currentTheme.chrome?.layout?.showOsMenubar)) {
          if (window.oniAPI && window.oniAPI.triggerOsAction) window.oniAPI.triggerOsAction('pin-app');
        } else {
          openOverlay('bookmarks');
        }
      } else if (isCtrlOrCmd && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (currentTheme && (currentTheme.id === 'oni-os' || currentTheme.chrome?.layout?.showOsMenubar)) {
          if (window.oniAPI && window.oniAPI.triggerOsAction) window.oniAPI.triggerOsAction('search');
        }
      } else if (isCtrlOrCmd && e.key === ',') {
        e.preventDefault();
        if (currentTheme && (currentTheme.id === 'oni-os' || currentTheme.chrome?.layout?.showOsMenubar)) {
          if (window.oniAPI && window.oniAPI.triggerOsAction) window.oniAPI.triggerOsAction('settings');
        } else {
          openOverlay('settings');
        }
      } else if (isCtrlOrCmd && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        toggleFindBar();
      } else if (isCtrlOrCmd && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        if (currentTheme && (currentTheme.id === 'oni-os' || currentTheme.chrome?.layout?.showOsMenubar)) {
          if (window.oniAPI && window.oniAPI.triggerOsAction) window.oniAPI.triggerOsAction('history');
        } else {
          openOverlay('history');
        }
      } else if (isCtrlOrCmd && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        if (currentTheme && (currentTheme.id === 'oni-os' || currentTheme.chrome?.layout?.showOsMenubar)) {
          if (window.oniAPI && window.oniAPI.triggerOsAction) window.oniAPI.triggerOsAction('downloads');
        } else {
          downloadsFlyout.classList.toggle('hidden');
          if (!downloadsFlyout.classList.contains('hidden')) renderDownloadsFlyout();
        }
      } else if (isCtrlOrCmd && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        if (activeTabId) window.oniAPI.zoom(0.1, activeTabId);
      } else if (isCtrlOrCmd && e.key === '-') {
        e.preventDefault();
        if (activeTabId) window.oniAPI.zoom(-0.1, activeTabId);
      } else if (isCtrlOrCmd && e.key === '0') {
        e.preventDefault();
        if (activeTabId) window.oniAPI.resetZoom(activeTabId);
      } else if (e.key === 'F12') {
        e.preventDefault();
        if (activeTabId) window.oniAPI.toggleDevTools(activeTabId);
      } else if (e.key === 'Escape') {
        if (!findBar.classList.contains('hidden')) closeFindBar();
        if (!shieldFlyout.classList.contains('hidden')) shieldFlyout.classList.add('hidden');
        if (!downloadsFlyout.classList.contains('hidden')) downloadsFlyout.classList.add('hidden');
        if (!overlayContainer.classList.contains('hidden')) closeOverlay();
      }
    });
  }

  // Start
  document.addEventListener('DOMContentLoaded', init);
})();

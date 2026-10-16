// Oni Browser - New Tab & Oni OS Desktop Environment Logic
(function () {
  'use strict';

  // Classic Dashboard DOM
  const classicDashboard = document.getElementById('classic-dashboard');
  const clockTime = document.getElementById('clock-time');
  const dateKanji = document.getElementById('date-kanji');
  const dateEn = document.getElementById('date-en');
  const liveGreeting = document.getElementById('live-greeting');
  const searchForm = document.getElementById('search-form');
  const searchInput = document.getElementById('search-input');
  const engineBadge = document.getElementById('engine-badge');
  const engineName = document.getElementById('engine-name');
  const shortcutsGrid = document.getElementById('shortcuts-grid');
  const shieldStatText = document.getElementById('shield-stat-text');

  // Oni OS Desktop DOM
  const osDesktop = document.getElementById('oni-os-desktop');
  const osDesktopIcons = document.getElementById('os-desktop-icons');
  const osDock = document.getElementById('os-dock');
  const osWidgetsPanel = document.getElementById('os-widgets-panel');
  const osStartMenu = document.getElementById('os-start-menu');
  const osStartAppsGrid = document.getElementById('os-start-apps-grid');
  const osContextMenu = document.getElementById('os-context-menu');

  const osMenubarClock = document.getElementById('os-menubar-clock');
  const osMenubarDate = document.getElementById('os-menubar-date');
  const osMenubarShield = document.getElementById('os-menubar-shield');
  const osWidgetTime = document.getElementById('os-widget-time');
  const osWidgetKanji = document.getElementById('os-widget-kanji');
  const osWidgetEn = document.getElementById('os-widget-en');
  const osWidgetGreeting = document.getElementById('os-widget-greeting');
  const osWidgetBlockedCount = document.getElementById('os-widget-blocked-count');
  const osWidgetShieldState = document.getElementById('os-widget-shield-state');
  const osWidgetEngineBtn = document.getElementById('os-widget-engine-btn');
  const osDesktopSearchForm = document.getElementById('os-desktop-search-form');
  const osDesktopSearchInput = document.getElementById('os-desktop-search-input');

  const osSpotlightForm = document.getElementById('os-spotlight-form');
  const osSpotlightInput = document.getElementById('os-spotlight-input');
  const osSpotlightResults = document.getElementById('os-spotlight-results');
  const osAddAppForm = document.getElementById('os-add-app-form');

  // Engines (Google default globally)
  const ENGINES = [
    { key: 'google', name: 'Google', url: 'https://www.google.com/search?q=' },
    { key: 'duckduckgo', name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' },
    { key: 'brave', name: 'Brave', url: 'https://search.brave.com/search?q=' },
    { key: 'bing', name: 'Bing', url: 'https://www.bing.com/search?q=' }
  ];
  let currentEngineIndex = 0;
  let currentThemeObj = null;

  // Default Curated Speed Dials / Desktop Apps
  let activeShortcuts = [
    { title: 'GitHub', url: 'https://github.com', icon: 'https://github.githubassets.com/favicons/favicon.png' },
    { title: 'YouTube', url: 'https://youtube.com', icon: 'https://www.youtube.com/s/desktop/f7125368/img/favicon_144x144.png' },
    { title: 'Reddit', url: 'https://reddit.com', icon: 'https://www.redditstatic.com/shreddit/assets/favicon/192x192.png' },
    { title: 'Wikipedia', url: 'https://wikipedia.org', icon: 'https://en.wikipedia.org/static/favicon/wikipedia.ico' },
    { title: 'Twitch', url: 'https://twitch.tv', icon: 'https://static.twitchcdn.net/assets/favicon-32-e29e246c157142c94346.png' },
    { title: 'Hacker News', url: 'https://news.ycombinator.com', icon: 'https://news.ycombinator.com/favicon.ico' },
    { title: 'ChatGPT', url: 'https://chatgpt.com', icon: 'https://oaistatic-cdn.azureedge.net/chatgpt/favicon.ico' },
    { title: 'Claude', url: 'https://claude.ai', icon: 'https://claude.ai/favicon.ico' }
  ];

  const PAGE_MODE = new URLSearchParams(window.location.search).get('mode');
  const IS_FORCED_CLASSIC_NEWTAB = PAGE_MODE === 'classic';

  let activeClockConfig = {
    visible: true,
    use24Hour: true,
    showSeconds: true,
    showKanjiDate: true,
    showEnglishDate: true
  };

  let activeGreetings = {
    morning: 'Good Morning, Hunter.',
    afternoon: 'Good Afternoon, Hunter.',
    evening: 'Good Evening, Hunter.',
    night: 'Night Operations Active.'
  };

  const KANJI_DAYS = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];

  function launchUrlFromDesktop(targetUrl) {
    if (!targetUrl) return;
    if (osStartMenu) osStartMenu.classList.add('hidden');
    closeOsWindow('os-win-spotlight');
    if (document.body.dataset.layout === 'desktop' && window.oniAPI && window.oniAPI.createTab) {
      window.oniAPI.createTab(targetUrl);
    } else {
      window.location.href = targetUrl;
    }
  }

  function executeSearchOrNavigate(rawQuery) {
    const query = (rawQuery || '').trim();
    if (!query) return;

    let destUrl = '';
    if (/^https?:\/\//i.test(query) || /^file:\/\//i.test(query)) {
      destUrl = query;
    } else if (/^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/i.test(query) || /^localhost(:\d+)?(\/.*)?$/i.test(query)) {
      destUrl = `https://${query}`;
    } else {
      const engine = ENGINES[currentEngineIndex];
      destUrl = `${engine.url}${encodeURIComponent(query)}`;
    }

    launchUrlFromDesktop(destUrl);
  }

  function updateClock() {
    const now = new Date();
    let hoursNum = now.getHours();
    let suffix = '';
    if (activeClockConfig.use24Hour === false) {
      suffix = hoursNum >= 12 ? ' PM' : ' AM';
      hoursNum = hoursNum % 12 || 12;
    }
    const h = String(hoursNum).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    const timeStr = activeClockConfig.showSeconds !== false ? `${h}:${m}:${s}${suffix}` : `${h}:${m}${suffix}`;

    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const weekdayKanji = KANJI_DAYS[now.getDay()];
    const kanjiStr = `${year}年${month}月${day}日 (${weekdayKanji})`;

    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    const enStr = now.toLocaleDateString('en-US', options);

    const hour = now.getHours();
    let greetStr = activeGreetings.night || 'Night Operations Active.';
    if (hour >= 5 && hour < 12) {
      greetStr = activeGreetings.morning || 'Good Morning, Hunter.';
    } else if (hour >= 12 && hour < 17) {
      greetStr = activeGreetings.afternoon || 'Good Afternoon, Hunter.';
    } else if (hour >= 17 && hour < 22) {
      greetStr = activeGreetings.evening || 'Good Evening, Hunter.';
    }

    // Update Classic Dashboard
    if (clockTime) clockTime.textContent = timeStr;
    if (dateKanji) dateKanji.textContent = kanjiStr;
    if (dateEn) dateEn.textContent = enStr;
    if (liveGreeting) liveGreeting.textContent = greetStr;

    // Update Oni OS Desktop
    if (osMenubarClock) osMenubarClock.textContent = timeStr;
    if (osMenubarDate) osMenubarDate.textContent = `${year}年${month}月${day}日`;
    if (osWidgetTime) osWidgetTime.textContent = timeStr;
    if (osWidgetKanji) osWidgetKanji.textContent = `${year}年${month}月${day}日`;
    if (osWidgetEn) osWidgetEn.textContent = enStr;
    if (osWidgetGreeting) osWidgetGreeting.textContent = greetStr;
  }

  function updateShieldTelemetry(stats) {
    if (!stats) return;
    const blocked = stats.totalBlocked || 0;
    const enabled = stats.enabled !== false;
    if (shieldStatText) {
      shieldStatText.textContent = enabled
        ? `Oni Shield: Active (${blocked} Neutralized)`
        : 'Oni Shield: Standby';
    }
    if (osMenubarShield) {
      osMenubarShield.textContent = enabled ? `Shield: ${blocked} Blocked` : 'Shield: Off';
    }
    if (osWidgetBlockedCount) {
      osWidgetBlockedCount.textContent = blocked;
    }
    if (osWidgetShieldState) {
      osWidgetShieldState.textContent = enabled ? 'PROTECTED' : 'PAUSED';
    }
  }

  function applyNewTabTheme(theme) {
    if (!theme || !theme.newTab) return;
    currentThemeObj = theme;
    const nt = theme.newTab;
    const isDesktopMode = PAGE_MODE === 'desktop';

    document.body.dataset.theme = isDesktopMode ? (theme.id || 'oni-os') : 'classic';
    document.body.dataset.layout = isDesktopMode ? 'desktop' : 'dashboard';

    if (classicDashboard && osDesktop) {
      classicDashboard.classList.toggle('hidden', isDesktopMode);
      osDesktop.classList.toggle('hidden', !isDesktopMode);
    }

    // 1. CSS Variables
    if (nt.cssVariables) {
      const rootStyle = document.documentElement.style;
      Object.entries(nt.cssVariables).forEach(([prop, val]) => {
        rootStyle.setProperty(prop, val);
      });
    }

    // 2. Wallpaper constructs
    if (nt.wallpaper) {
      const wpBg = document.querySelector('.wallpaper-bg');
      const wpOverlay = document.querySelector('.wallpaper-overlay');
      if (wpBg) {
        if (nt.wallpaper.image) {
          wpBg.style.backgroundImage = `url('${nt.wallpaper.image}')`;
        }
        const b = nt.wallpaper.brightness !== undefined ? nt.wallpaper.brightness : 0.65;
        const sat = nt.wallpaper.saturate !== undefined ? nt.wallpaper.saturate : 1.15;
        wpBg.style.filter = `brightness(${b}) saturate(${sat})`;
      }
      if (wpOverlay && nt.wallpaper.overlayGradient) {
        wpOverlay.style.background = nt.wallpaper.overlayGradient;
      }
    }

    // 3. Hero & Greetings
    if (nt.hero) {
      const heroEl = document.querySelector('.oni-hero');
      const emblemImg = document.querySelector('.oni-emblem');
      const emblemGlow = document.querySelector('.emblem-glow');
      const brandTitle = document.querySelector('.brand-title');

      if (heroEl) heroEl.style.display = nt.hero.visible === false ? 'none' : '';
      if (emblemImg && nt.hero.emblemIcon) emblemImg.src = nt.hero.emblemIcon;
      if (emblemGlow) emblemGlow.style.display = nt.hero.rotatingGlow === false ? 'none' : '';
      if (brandTitle && (nt.hero.titlePrefix !== undefined || nt.hero.titleAccent !== undefined)) {
        brandTitle.innerHTML = `${nt.hero.titlePrefix || 'ONI '}<span class="accent">${nt.hero.titleAccent || 'BROWSER'}</span>`;
      }
      if (nt.hero.greetings) {
        activeGreetings = { ...activeGreetings, ...nt.hero.greetings };
      }
    }

    // 4. Clock constructs
    if (nt.clock) {
      activeClockConfig = { ...activeClockConfig, ...nt.clock };
      const clockSection = document.querySelector('.clock-section');
      const divider = document.querySelector('.date-divider');
      if (clockSection) clockSection.style.display = nt.clock.visible === false ? 'none' : '';
      if (dateKanji) dateKanji.style.display = nt.clock.showKanjiDate === false ? 'none' : '';
      if (dateEn) dateEn.style.display = nt.clock.showEnglishDate === false ? 'none' : '';
      if (divider) {
        divider.style.display = (nt.clock.showKanjiDate === false || nt.clock.showEnglishDate === false) ? 'none' : '';
      }
      updateClock();
    }

    // 5. Search constructs
    if (nt.search) {
      const searchSection = document.querySelector('.search-section');
      if (searchSection) searchSection.style.display = nt.search.visible === false ? 'none' : '';
      if (searchInput && nt.search.placeholder) searchInput.placeholder = nt.search.placeholder;
      if (engineBadge) engineBadge.style.display = nt.search.showEngineSelector === false ? 'none' : '';
    }

    if (theme.behavior && theme.behavior.searchEngine) {
      const idx = ENGINES.findIndex(e => e.key === theme.behavior.searchEngine);
      if (idx >= 0) {
        currentEngineIndex = idx;
        if (engineName) engineName.textContent = ENGINES[currentEngineIndex].name;
        if (osWidgetEngineBtn) osWidgetEngineBtn.textContent = ENGINES[currentEngineIndex].name;
      }
    }

    // 6. Shortcuts & Desktop Apps
    if (nt.shortcuts) {
      const shortcutsSection = document.querySelector('.shortcuts-section');
      if (shortcutsSection) shortcutsSection.style.display = nt.shortcuts.visible === false ? 'none' : '';
      if (Array.isArray(nt.shortcuts.items)) {
        activeShortcuts = nt.shortcuts.items;
      }
    }
    renderShortcuts();
    renderOniOsDesktop();

    // 7. Footer constructs
    if (nt.footer) {
      const footerEl = document.querySelector('.dashboard-footer');
      const quoteEl = document.querySelector('.footer-quote');
      const versionEl = document.querySelector('.version-badge');
      if (footerEl) footerEl.style.display = nt.footer.visible === false ? 'none' : '';
      if (quoteEl && nt.footer.quote !== undefined) quoteEl.textContent = nt.footer.quote;
      if (versionEl && nt.footer.versionBadge !== undefined) versionEl.textContent = nt.footer.versionBadge;
    }

    // 8. Custom CSS
    let customStyleEl = document.getElementById('oni-newtab-theme-css');
    if (nt.customCss) {
      if (!customStyleEl) {
        customStyleEl = document.createElement('style');
        customStyleEl.id = 'oni-newtab-theme-css';
        document.head.appendChild(customStyleEl);
      }
      customStyleEl.textContent = nt.customCss;
    } else if (customStyleEl) {
      customStyleEl.textContent = '';
    }
  }

  function renderShortcuts() {
    if (!shortcutsGrid) return;
    shortcutsGrid.innerHTML = '';
    activeShortcuts.forEach(s => {
      const card = document.createElement('a');
      card.className = 'shortcut-card';
      card.href = s.url;

      const iconWrap = document.createElement('div');
      iconWrap.className = 'shortcut-icon-wrap';

      const img = document.createElement('img');
      img.className = 'shortcut-icon';
      img.src = s.icon;
      img.alt = s.title;
      img.onerror = () => {
        img.src = '../../assets/app-icon.png';
      };

      iconWrap.appendChild(img);
      card.appendChild(iconWrap);

      const title = document.createElement('span');
      title.className = 'shortcut-title';
      title.textContent = s.title;
      card.appendChild(title);

      shortcutsGrid.appendChild(card);
    });
  }

  // =========================================================
  // ONI OS DESKTOP ENVIRONMENT RENDERING & INTERACTION
  // =========================================================
  function renderOniOsDesktop() {
    if (!osDesktopIcons || !osStartAppsGrid) return;

    // 1. Desktop App Icons Grid
    osDesktopIcons.innerHTML = '';
    activeShortcuts.forEach((app, idx) => {
      const tile = document.createElement('a');
      tile.className = 'os-app-tile';
      tile.href = app.url;
      tile.dataset.index = idx;
      tile.title = `${app.title}\n${app.url}`;

      const iconBox = document.createElement('div');
      iconBox.className = 'os-app-icon-box';

      const img = document.createElement('img');
      img.src = app.icon || '../../assets/app-icon.png';
      img.alt = app.title;
      img.onerror = () => { img.src = '../../assets/app-icon.png'; };
      iconBox.appendChild(img);

      const label = document.createElement('span');
      label.className = 'os-app-label';
      label.textContent = app.title;

      tile.appendChild(iconBox);
      tile.appendChild(label);

      tile.addEventListener('click', (e) => {
        e.preventDefault();
        launchUrlFromDesktop(app.url);
      });

      osDesktopIcons.appendChild(tile);
    });

    // 2. Start Menu Pinned Apps Grid
    osStartAppsGrid.innerHTML = '';
    activeShortcuts.forEach(app => {
      const item = document.createElement('a');
      item.className = 'os-start-app';
      item.href = app.url;

      const img = document.createElement('img');
      img.src = app.icon || '../../assets/app-icon.png';
      img.alt = app.title;
      img.onerror = () => { img.src = '../../assets/app-icon.png'; };

      const span = document.createElement('span');
      span.textContent = app.title;

      item.appendChild(img);
      item.appendChild(span);

      item.addEventListener('click', (e) => {
        e.preventDefault();
        launchUrlFromDesktop(app.url);
      });

      osStartAppsGrid.appendChild(item);
    });

    renderSpotlightApps('');
  }

  function renderSpotlightApps(filterText) {
    if (!osSpotlightResults) return;
    const q = (filterText || '').toLowerCase().trim();
    const filtered = activeShortcuts.filter(a => !q || a.title.toLowerCase().includes(q) || a.url.toLowerCase().includes(q));

    osSpotlightResults.innerHTML = '';
    filtered.forEach(app => {
      const item = document.createElement('a');
      item.className = 'os-spotlight-item';
      item.href = app.url;

      const img = document.createElement('img');
      img.src = app.icon || '../../assets/app-icon.png';
      img.onerror = () => { img.src = '../../assets/app-icon.png'; };

      const span = document.createElement('span');
      span.textContent = app.title;

      item.appendChild(img);
      item.appendChild(span);

      item.addEventListener('click', (e) => {
        e.preventDefault();
        launchUrlFromDesktop(app.url);
      });

      osSpotlightResults.appendChild(item);
    });
  }

  async function openOsWindow(winId) {
    const winEl = document.getElementById(winId);
    if (!winEl) return;

    // Bring to front
    document.querySelectorAll('.os-window').forEach(w => { w.style.zIndex = '30'; });
    winEl.style.zIndex = '35';
    winEl.classList.remove('hidden');

    // Update dock active dot
    updateDockActiveDots();

    if (winId === 'os-win-spotlight') {
      if (osSpotlightInput) {
        osSpotlightInput.value = '';
        renderSpotlightApps('');
        setTimeout(() => osSpotlightInput.focus(), 40);
      }
    } else if (winId === 'os-win-bookmarks') {
      await renderOsBookmarksWindow();
    } else if (winId === 'os-win-history') {
      await renderOsHistoryWindow();
    } else if (winId === 'os-win-settings') {
      await renderOsSettingsWindow();
    }
  }

  function closeOsWindow(winId) {
    const winEl = document.getElementById(winId);
    if (winEl) winEl.classList.add('hidden');
    updateDockActiveDots();
  }

  function updateDockActiveDots() {
    if (!osDock) return;
    osDock.querySelectorAll('[data-dock-window]').forEach(btn => {
      const targetWin = document.getElementById(btn.dataset.dockWindow);
      const isOpen = targetWin && !targetWin.classList.contains('hidden');
      btn.classList.toggle('active-dot', !!isOpen);
    });
  }


  async function renderOsHistoryWindow() {
    const body = document.getElementById('os-win-history-body');
    if (!body || !window.oniAPI) return;
    const history = await window.oniAPI.getHistory();
    if (!history || history.length === 0) {
      body.innerHTML = '<div style="color:var(--text-muted); padding:16px; text-align:center;">No browsing history recorded yet.</div>';
      return;
    }
    body.innerHTML = history.slice(0, 30).map(item => `
      <div class="os-list-row" data-url="${item.url}">
        <div style="overflow:hidden; max-width:390px;">
          <div style="font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.title}</div>
          <div style="font-size:10.5px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.url}</div>
        </div>
        <span style="color:var(--accent-cyan);font-size:11px;">Open ↗</span>
      </div>
    `).join('');

    body.querySelectorAll('.os-list-row').forEach(row => {
      row.addEventListener('click', () => {
        if (row.dataset.url) launchUrlFromDesktop(row.dataset.url);
      });
    });
  }

  async function renderOsSettingsWindow() {
    const body = document.getElementById('os-win-settings-body');
    if (!body || !window.oniAPI) return;
    const [themes, activeTheme] = await Promise.all([
      window.oniAPI.getThemes(),
      window.oniAPI.getActiveTheme()
    ]);

    body.innerHTML = `
      <div style="margin-bottom:14px;">
        <div class="os-field-label">Active Operating Theme Construct</div>
        <div style="display:flex; flex-direction:column; gap:8px; margin-top:6px;">
          ${(themes || []).map(t => `
            <div class="os-list-row os-theme-pick" data-theme-id="${t.id}" style="border-color:${t.id === activeTheme.id ? 'var(--accent-green)' : 'rgba(255,255,255,0.08)'};">
              <div>
                <div style="font-weight:700; color:#fff;">${t.name} ${t.id === activeTheme.id ? '<span style="color:var(--accent-green);font-size:10px;margin-left:6px;">● ACTIVE</span>' : ''}</div>
                <div style="font-size:11px; color:var(--text-muted);">${t.description || ''}</div>
              </div>
              <button class="os-btn-ghost" style="white-space:nowrap;">Apply</button>
            </div>
          `).join('')}
        </div>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; padding-top:10px; border-top:1px solid rgba(255,255,255,0.08);">
        <span style="font-size:11.5px; color:var(--text-muted);">Home Widgets Panel</span>
        <button class="os-btn-ghost" id="os-win-toggle-widgets">Toggle Widgets</button>
      </div>
    `;

    body.querySelectorAll('.os-theme-pick').forEach(row => {
      row.addEventListener('click', async () => {
        const id = row.dataset.themeId;
        if (id) {
          const res = await window.oniAPI.applyTheme(id);
          if (res && res.theme) applyNewTabTheme(res.theme);
          await renderOsSettingsWindow();
        }
      });
    });

    const toggleWidgetsBtn = document.getElementById('os-win-toggle-widgets');
    if (toggleWidgetsBtn) {
      toggleWidgetsBtn.addEventListener('click', () => {
        if (osWidgetsPanel) osWidgetsPanel.classList.toggle('hidden');
      });
    }
  }

  function setupOsDesktopEvents() {
    // Top bar menu items
    const topStartBtn = document.getElementById('os-top-start-btn');
    if (topStartBtn) {
      topStartBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        osStartMenu.classList.toggle('hidden');
      });
    }

    const menuSpotlight = document.getElementById('os-menu-spotlight');
    if (menuSpotlight) menuSpotlight.addEventListener('click', () => openOsWindow('os-win-spotlight'));

    const menuHistory = document.getElementById('os-menu-history');
    if (menuHistory) menuHistory.addEventListener('click', () => openOsWindow('os-win-history'));

    const menuSettings = document.getElementById('os-menu-settings');
    if (menuSettings) menuSettings.addEventListener('click', () => openOsWindow('os-win-settings'));

    const barSearchTrigger = document.getElementById('os-bar-search-trigger');
    if (barSearchTrigger) barSearchTrigger.addEventListener('click', () => openOsWindow('os-win-spotlight'));

    // Start menu footer buttons
    const startNewTab = document.getElementById('os-start-btn-newtab');
    if (startNewTab) {
      startNewTab.addEventListener('click', () => {
        if (osStartMenu) osStartMenu.classList.add('hidden');
        if (window.oniAPI && window.oniAPI.createTab) {
          window.oniAPI.createTab('oni://newtab');
        }
      });
    }

    const startPin = document.getElementById('os-start-btn-pin') || document.getElementById('os-start-btn-control');
    if (startPin) {
      startPin.addEventListener('click', () => {
        if (osStartMenu) osStartMenu.classList.add('hidden');
        if (window.oniAPI && window.oniAPI.triggerOsAction) {
          window.oniAPI.triggerOsAction('pin-app');
        } else {
          openOsWindow('os-win-add-app');
        }
      });
    }

    // Widget Search & Engine switcher
    if (osWidgetEngineBtn) {
      osWidgetEngineBtn.addEventListener('click', () => {
        currentEngineIndex = (currentEngineIndex + 1) % ENGINES.length;
        osWidgetEngineBtn.textContent = ENGINES[currentEngineIndex].name;
        if (engineName) engineName.textContent = ENGINES[currentEngineIndex].name;
      });
    }

    if (osDesktopSearchForm) {
      osDesktopSearchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        executeSearchOrNavigate(osDesktopSearchInput.value);
        osDesktopSearchInput.value = '';
      });
    }

    // Search Form & Filtering
    if (osSpotlightInput) {
      osSpotlightInput.addEventListener('input', () => {
        renderSpotlightApps(osSpotlightInput.value);
      });
    }

    if (osSpotlightForm) {
      osSpotlightForm.addEventListener('submit', (e) => {
        e.preventDefault();
        executeSearchOrNavigate(osSpotlightInput.value);
      });
    }

    // Pin New Desktop App Form
    if (osAddAppForm) {
      osAddAppForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const titleEl = document.getElementById('os-app-title');
        const urlEl = document.getElementById('os-app-url');
        const iconEl = document.getElementById('os-app-icon');

        const title = (titleEl.value || '').trim();
        let url = (urlEl.value || '').trim();
        if (!title || !url) return;
        if (!/^https?:\/\//i.test(url) && !url.startsWith('oni://')) {
          url = `https://${url}`;
        }

        let icon = (iconEl.value || '').trim();
        if (!icon) {
          try {
            const u = new URL(url);
            icon = `${u.origin}/favicon.ico`;
          } catch (err) {
            icon = '../../assets/app-icon.png';
          }
        }

        if (window.oniAPI && window.oniAPI.addBookmark) {
          await window.oniAPI.addBookmark({ title, url, favicon: icon });
        } else {
          activeShortcuts.push({ title, url, icon });
          renderShortcuts();
          renderOniOsDesktop();
        }

        closeOsWindow('os-win-add-app');
        titleEl.value = '';
        urlEl.value = '';
        iconEl.value = '';
      });
    }

    // Close window buttons
    document.querySelectorAll('[data-close-window]').forEach(btn => {
      btn.addEventListener('click', () => {
        closeOsWindow(btn.dataset.closeWindow);
      });
    });

    // Draggable Floating OS Windows
    document.querySelectorAll('[data-drag-window]').forEach(titlebar => {
      let isDragging = false;
      let startX = 0;
      let startY = 0;
      let origLeft = 0;
      let origTop = 0;
      const winEl = document.getElementById(titlebar.dataset.dragWindow);

      titlebar.addEventListener('mousedown', (e) => {
        if (e.target.closest('button')) return;
        isDragging = true;
        document.querySelectorAll('.os-window').forEach(w => { w.style.zIndex = '30'; });
        winEl.style.zIndex = '36';

        const rect = winEl.getBoundingClientRect();
        winEl.style.transform = 'none';
        winEl.style.left = `${rect.left}px`;
        winEl.style.top = `${rect.top}px`;
        startX = e.clientX;
        startY = e.clientY;
        origLeft = rect.left;
        origTop = rect.top;
      });

      window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        winEl.style.left = `${Math.max(0, origLeft + dx)}px`;
        winEl.style.top = `${Math.max(8, origTop + dy)}px`;
      });

      window.addEventListener('mouseup', () => {
        isDragging = false;
      });
    });

    // Home Right-Click Context Menu
    const workspace = document.getElementById('os-workspace');
    if (workspace && osContextMenu) {
      workspace.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const x = Math.min(e.clientX, window.innerWidth - 230);
        const y = Math.min(e.clientY, window.innerHeight - 260);
        osContextMenu.style.left = `${x}px`;
        osContextMenu.style.top = `${y}px`;
        osContextMenu.classList.remove('hidden');
      });
    }

    document.getElementById('ctx-open-spotlight')?.addEventListener('click', () => {
      if (window.oniAPI && window.oniAPI.triggerOsAction) window.oniAPI.triggerOsAction('search');
      else openOsWindow('os-win-spotlight');
    });
    document.getElementById('ctx-add-app')?.addEventListener('click', () => {
      if (window.oniAPI && window.oniAPI.triggerOsAction) window.oniAPI.triggerOsAction('pin-app');
      else openOsWindow('os-win-add-app');
    });
    document.getElementById('ctx-toggle-widgets')?.addEventListener('click', () => osWidgetsPanel?.classList.toggle('hidden'));
    document.getElementById('ctx-open-history')?.addEventListener('click', () => {
      if (window.oniAPI && window.oniAPI.triggerOsAction) window.oniAPI.triggerOsAction('history');
      else openOsWindow('os-win-history');
    });
    document.getElementById('ctx-open-settings')?.addEventListener('click', () => {
      if (window.oniAPI && window.oniAPI.triggerOsAction) window.oniAPI.triggerOsAction('settings');
      else openOsWindow('os-win-settings');
    });
    document.getElementById('ctx-refresh-desktop')?.addEventListener('click', () => renderOniOsDesktop());

    // Close Start Menu & Context Menu on outside click
    document.addEventListener('click', (e) => {
      if (osContextMenu && !osContextMenu.classList.contains('hidden')) {
        osContextMenu.classList.add('hidden');
      }
      if (osStartMenu && !osStartMenu.classList.contains('hidden') && !osStartMenu.contains(e.target)) {
        osStartMenu.classList.add('hidden');
      }
    });

    // Keyboard shortcut Ctrl+K for Search on Home
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        if (document.body.dataset.layout === 'desktop') {
          e.preventDefault();
          openOsWindow('os-win-spotlight');
        }
      } else if (e.key === 'Escape') {
        if (osStartMenu) osStartMenu.classList.add('hidden');
        if (osContextMenu) osContextMenu.classList.add('hidden');
        closeOsWindow('os-win-spotlight');
      }
    });
  }

  function setupSearch() {
    if (engineBadge) {
      engineBadge.addEventListener('click', () => {
        currentEngineIndex = (currentEngineIndex + 1) % ENGINES.length;
        engineName.textContent = ENGINES[currentEngineIndex].name;
      });
    }

    if (searchForm) {
      searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        executeSearchOrNavigate(searchInput.value);
      });
    }
  }

  function handleOsAction(action) {
    if (!action) return;
    if (action === 'start-menu') {
      if (osStartMenu) osStartMenu.classList.toggle('hidden');
    } else if (action === 'start-menu-open') {
      if (osStartMenu) osStartMenu.classList.remove('hidden');
    } else if (action === 'home' || action === 'desktop') {
      if (osStartMenu) osStartMenu.classList.add('hidden');
      document.querySelectorAll('.os-window').forEach(w => w.classList.add('hidden'));
    } else if (action === 'search' || action === 'spotlight') {
      if (osStartMenu) osStartMenu.classList.add('hidden');
      openOsWindow('os-win-spotlight');
    } else if (action === 'history') {
      if (osStartMenu) osStartMenu.classList.add('hidden');
      openOsWindow('os-win-history');
    } else if (action === 'settings') {
      if (osStartMenu) osStartMenu.classList.add('hidden');
      openOsWindow('os-win-settings');
    } else if (action === 'pin-app' || action === 'add-app') {
      if (osStartMenu) osStartMenu.classList.add('hidden');
      openOsWindow('os-win-add-app');
    }
  }

  async function resolveThemeForPage(activeTheme) {
    if (PAGE_MODE !== 'desktop' && window.oniAPI && window.oniAPI.getThemes) {
      try {
        const allThemes = await window.oniAPI.getThemes();
        const classicTheme = (allThemes || []).find(t => t.id === 'classic');
        if (classicTheme) return classicTheme;
      } catch (e) {
        // Fallback to activeTheme
      }
    }
    return activeTheme;
  }

  async function init() {
    updateClock();
    setInterval(updateClock, 1000);
    setupSearch();
    setupOsDesktopEvents();
    renderShortcuts();
    renderOniOsDesktop();

    if (window.oniAPI) {
      try {
        if (window.oniAPI.getBookmarks) {
          const bms = await window.oniAPI.getBookmarks();
          if (Array.isArray(bms) && bms.length > 0) {
            activeShortcuts = bms.map(b => ({ title: b.title, url: b.url, icon: b.favicon || b.icon }));
            renderShortcuts();
            renderOniOsDesktop();
          }
        }
        if (window.oniAPI.onBookmarksUpdated) {
          window.oniAPI.onBookmarksUpdated((bms) => {
            if (Array.isArray(bms)) {
              activeShortcuts = bms.map(b => ({ title: b.title, url: b.url, icon: b.favicon || b.icon }));
              renderShortcuts();
              renderOniOsDesktop();
            }
          });
        }

        const [activeTheme, shieldStats] = await Promise.all([
          window.oniAPI.getActiveTheme ? window.oniAPI.getActiveTheme() : null,
          window.oniAPI.getShieldStats ? window.oniAPI.getShieldStats() : null
        ]);
        if (activeTheme) {
          const targetTheme = await resolveThemeForPage(activeTheme);
          applyNewTabTheme(targetTheme);
        }
        if (shieldStats) updateShieldTelemetry(shieldStats);

        if (window.oniAPI.onThemeChanged) {
          window.oniAPI.onThemeChanged(async ({ theme }) => {
            if (theme) {
              const targetTheme = await resolveThemeForPage(theme);
              applyNewTabTheme(targetTheme);
            }
          });
        }
        if (window.oniAPI.onShieldUpdated) {
          window.oniAPI.onShieldUpdated(updateShieldTelemetry);
        }
        if (window.oniAPI.onOsAction && PAGE_MODE === 'desktop') {
          window.oniAPI.onOsAction(handleOsAction);
        }
      } catch (e) {
        // Fallback
      }
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();

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
  const osStartBtnEdit = document.getElementById('os-start-btn-edit');
  let isStartMenuEditMode = false;
  let draggedAppIndex = null;
  const osContextMenu = document.getElementById('os-context-menu');
  const osSearchContextMenu = document.getElementById('os-search-context-menu');
  const osAppContextMenu = document.getElementById('os-app-context-menu');
  const osGridHighlight = document.getElementById('os-grid-highlight');
  let draggedDesktopAppId = null;
  let draggedDesktopItem = null;
  let activeContextApp = null;
  let activeContextSource = 'desktop';

  const DESKTOP_WIDGET_SPECS = [
    { id: 'clock', elId: 'os-widget-clock', colSpan: 3, rowSpan: 2, defaultRow: 0, widthPx: 290, heightPx: 204 },
    { id: 'search', elId: 'os-widget-search', colSpan: 3, rowSpan: 1, defaultRow: 2, widthPx: 290, heightPx: 98 },
    { id: 'shield', elId: 'os-widget-shield', colSpan: 3, rowSpan: 1, defaultRow: 3, widthPx: 290, heightPx: 98 }
  ];
  let desktopWidgetsConfig = {
    clock: { enabled: true, gridCol: null, gridRow: 0 },
    search: { enabled: true, gridCol: null, gridRow: 2 },
    shield: { enabled: true, gridCol: null, gridRow: 3 }
  };

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

  // Unified Pinned Apps (Desktop & Start Menu synchronized)
  let pinnedApps = [];
  let desktopApps = pinnedApps;
  let activeShortcuts = pinnedApps;

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
    } else if (window.oniAPI && window.oniAPI.navigate) {
      window.oniAPI.navigate(targetUrl);
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
    const vars = {
      ...((theme.chrome && theme.chrome.cssVariables) || {}),
      ...(nt.cssVariables || {})
    };
    const rootStyle = document.documentElement.style;
    Object.entries(vars).forEach(([prop, val]) => {
      rootStyle.setProperty(prop, val);
    });

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

    // 6. Pinned Apps & Desktop Layout
    if (nt.shortcuts) {
      const shortcutsSection = document.querySelector('.shortcuts-section');
      if (shortcutsSection) shortcutsSection.style.display = nt.shortcuts.visible === false ? 'none' : '';
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
    pinnedApps.forEach(s => {
      const card = document.createElement('a');
      card.className = 'shortcut-card';
      card.href = s.url;

      const iconWrap = document.createElement('div');
      iconWrap.className = 'shortcut-icon-wrap';

      const img = document.createElement('img');
      img.className = 'shortcut-icon';
      img.src = s.icon || s.favicon || '../../assets/app-icon.png';
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

      card.addEventListener('click', (e) => {
        e.preventDefault();
        if (window.oniAPI && window.oniAPI.navigate) {
          window.oniAPI.navigate(s.url);
        } else {
          window.location.href = s.url;
        }
      });

      shortcutsGrid.appendChild(card);
    });
  }

  // Context Menu Helpers
  function showSearchContextMenu(clientX, clientY) {
    if (!osSearchContextMenu) return;
    hideAllContextMenus();
    const x = Math.min(window.innerWidth - 180, Math.max(8, clientX));
    const y = Math.min(window.innerHeight - 190, Math.max(8, clientY));
    osSearchContextMenu.style.left = `${x}px`;
    osSearchContextMenu.style.top = `${y}px`;
    osSearchContextMenu.classList.remove('hidden');
  }

  function showAppContextMenu(clientX, clientY, app, source = 'desktop') {
    if (!osAppContextMenu) return;
    activeContextApp = app;
    activeContextSource = source;
    hideAllContextMenus();
    const delBtn = document.getElementById('ctx-app-delete');
    if (delBtn) {
      delBtn.textContent = '🗑 Unpin App';
    }
    const x = Math.min(window.innerWidth - 200, Math.max(8, clientX));
    const y = Math.min(window.innerHeight - 220, Math.max(8, clientY));
    osAppContextMenu.style.left = `${x}px`;
    osAppContextMenu.style.top = `${y}px`;
    osAppContextMenu.classList.remove('hidden');
  }

  function hideAllContextMenus() {
    if (osContextMenu) osContextMenu.classList.add('hidden');
    if (osSearchContextMenu) osSearchContextMenu.classList.add('hidden');
    if (osAppContextMenu) osAppContextMenu.classList.add('hidden');
  }

  // =========================================================
  // ONI OS DESKTOP ENVIRONMENT RENDERING & INTERACTION
  // =========================================================
  function getDesktopGridMetrics() {
    const iconRect = osDesktopIcons ? osDesktopIcons.getBoundingClientRect() : null;
    const width = (iconRect && iconRect.width > 0) ? iconRect.width : Math.max(400, window.innerWidth - 48);
    const height = (iconRect && iconRect.height > 0) ? iconRect.height : Math.max(400, window.innerHeight - 106);
    const leftOffset = (iconRect && iconRect.width > 0) ? iconRect.left : 24;
    const topOffset = (iconRect && iconRect.height > 0) ? iconRect.top : 22;

    const tileW = 90;
    const tileH = 98;
    const stepY = 108;
    const maxCols = Math.max(4, Math.floor((width + 10) / 100));
    const maxRows = Math.max(4, Math.floor((height + 10) / stepY));
    const stepX = maxCols > 1 ? (width - tileW) / (maxCols - 1) : 100;

    return {
      width,
      height,
      leftOffset,
      topOffset,
      tileW,
      tileH,
      stepX,
      stepY,
      maxCols,
      maxRows,
      colToX: (col) => Math.round(col * stepX),
      rowToY: (row) => Math.round(row * stepY),
      spanToWidth: (colSpan) => Math.round((colSpan - 1) * stepX + tileW),
      spanToHeight: (rowSpan) => Math.round((rowSpan - 1) * stepY + tileH),
      pointerToCol: (relX) => Math.min(maxCols - 1, Math.max(0, Math.floor((relX + (stepX - tileW) / 2) / stepX))),
      pointerToRow: (relY) => Math.min(maxRows - 1, Math.max(0, Math.floor((relY + (stepY - tileH) / 2) / stepY)))
    };
  }

  function rectFitsAndFree(col, row, colSpan, rowSpan, occupiedSet, maxCols, maxRows) {
    if (col < 0 || row < 0 || col + colSpan > maxCols || row + rowSpan > maxRows) {
      return false;
    }
    for (let dc = 0; dc < colSpan; dc++) {
      for (let dr = 0; dr < rowSpan; dr++) {
        if (occupiedSet.has(`${col + dc},${row + dr}`)) {
          return false;
        }
      }
    }
    return true;
  }

  function markRectOccupied(col, row, colSpan, rowSpan, occupiedSet) {
    for (let dc = 0; dc < colSpan; dc++) {
      for (let dr = 0; dr < rowSpan; dr++) {
        occupiedSet.add(`${col + dc},${row + dr}`);
      }
    }
  }

  function findFreeWidgetSlot(spec, occupiedSet, maxCols, maxRows) {
    const rightCol = Math.max(0, maxCols - spec.colSpan);
    if (rectFitsAndFree(rightCol, spec.defaultRow, spec.colSpan, spec.rowSpan, occupiedSet, maxCols, maxRows)) {
      return { col: rightCol, row: spec.defaultRow };
    }
    for (let c = rightCol; c >= 0; c--) {
      for (let r = 0; r <= maxRows - spec.rowSpan; r++) {
        if (rectFitsAndFree(c, r, spec.colSpan, spec.rowSpan, occupiedSet, maxCols, maxRows)) {
          return { col: c, row: r };
        }
      }
    }
    return { col: rightCol, row: Math.min(Math.max(0, maxRows - spec.rowSpan), spec.defaultRow) };
  }

  function resolveDesktopGridState(metrics, persistIfChanged = false) {
    const m = metrics || getDesktopGridMetrics();
    const widgetOccupied = new Set();
    let widgetsModified = false;
    let appsModified = false;

    const needsPlacement = [];

    // Pass 1: Place active widgets that already have valid non-overlapping coordinates
    DESKTOP_WIDGET_SPECS.forEach(spec => {
      const cfg = (desktopWidgetsConfig && desktopWidgetsConfig[spec.id]) || {
        enabled: true,
        gridCol: null,
        gridRow: null
      };
      if (cfg.enabled === false) return;

      const hasCoords = cfg.gridCol !== null && cfg.gridCol !== undefined && !isNaN(cfg.gridCol) &&
                        cfg.gridRow !== null && cfg.gridRow !== undefined && !isNaN(cfg.gridRow);
      if (!hasCoords) {
        needsPlacement.push(spec);
        return;
      }

      const col = Math.min(Math.max(0, m.maxCols - spec.colSpan), Math.max(0, Number(cfg.gridCol)));
      const row = Math.min(Math.max(0, m.maxRows - spec.rowSpan), Math.max(0, Number(cfg.gridRow)));

      if (rectFitsAndFree(col, row, spec.colSpan, spec.rowSpan, widgetOccupied, m.maxCols, m.maxRows)) {
        if (cfg.gridCol !== col || cfg.gridRow !== row) {
          desktopWidgetsConfig[spec.id] = { ...cfg, gridCol: col, gridRow: row };
          widgetsModified = true;
        }
        markRectOccupied(col, row, spec.colSpan, spec.rowSpan, widgetOccupied);
      } else {
        needsPlacement.push(spec);
      }
    });

    // Pass 2: Place newly added or colliding widgets into available space (avoiding both widgets and pinned apps)
    if (needsPlacement.length > 0) {
      const allOccupied = new Set(widgetOccupied);
      pinnedApps.forEach(app => {
        if (app.gridCol !== undefined && app.gridRow !== undefined) {
          allOccupied.add(`${app.gridCol},${app.gridRow}`);
        }
      });

      needsPlacement.forEach(spec => {
        let slot = findFreeWidgetSlot(spec, allOccupied, m.maxCols, m.maxRows);
        if (!rectFitsAndFree(slot.col, slot.row, spec.colSpan, spec.rowSpan, widgetOccupied, m.maxCols, m.maxRows)) {
          slot = findFreeWidgetSlot(spec, widgetOccupied, m.maxCols, m.maxRows);
        }
        desktopWidgetsConfig[spec.id] = {
          ...(desktopWidgetsConfig[spec.id] || {}),
          enabled: true,
          gridCol: slot.col,
          gridRow: slot.row
        };
        widgetsModified = true;
        markRectOccupied(slot.col, slot.row, spec.colSpan, spec.rowSpan, widgetOccupied);
        markRectOccupied(slot.col, slot.row, spec.colSpan, spec.rowSpan, allOccupied);
      });
    }

    // Pass 3: Ensure no Pinned App overlaps any active Widget or another Pinned App
    const usedCells = new Set(widgetOccupied);
    pinnedApps.forEach((app, idx) => {
      let col = (app.gridCol !== undefined && !isNaN(app.gridCol)) ? Number(app.gridCol) : Math.floor(idx / 6);
      let row = (app.gridRow !== undefined && !isNaN(app.gridRow)) ? Number(app.gridRow) : (idx % 6);
      col = Math.min(m.maxCols - 1, Math.max(0, col));
      row = Math.min(m.maxRows - 1, Math.max(0, row));

      if (usedCells.has(`${col},${row}`)) {
        let found = false;
        for (let c = 0; c < m.maxCols; c++) {
          for (let r = 0; r < m.maxRows; r++) {
            if (!usedCells.has(`${c},${r}`)) {
              col = c;
              row = r;
              found = true;
              break;
            }
          }
          if (found) break;
        }
      }

      if (app.gridCol !== col || app.gridRow !== row) {
        app.gridCol = col;
        app.gridRow = row;
        appsModified = true;
      }
      usedCells.add(`${col},${row}`);
    });

    if (persistIfChanged && window.oniAPI && (!osDesktop || !osDesktop.classList.contains('hidden'))) {
      if (widgetsModified && window.oniAPI.updateSettings) {
        window.oniAPI.updateSettings({ desktopWidgets: desktopWidgetsConfig });
      }
      if (appsModified && window.oniAPI.setBookmarks) {
        window.oniAPI.setBookmarks(pinnedApps);
      }
    }

    return { metrics: m, widgetOccupied };
  }

  function isCellOccupiedByActiveWidget(col, row, excludeWidgetId = null) {
    for (const spec of DESKTOP_WIDGET_SPECS) {
      if (spec.id === excludeWidgetId) continue;
      const cfg = desktopWidgetsConfig && desktopWidgetsConfig[spec.id];
      if (!cfg || cfg.enabled === false) continue;
      const wc = Number(cfg.gridCol);
      const wr = Number(cfg.gridRow);
      if (isNaN(wc) || isNaN(wr)) continue;
      if (col >= wc && col < wc + spec.colSpan && row >= wr && row < wr + spec.rowSpan) {
        return true;
      }
    }
    return false;
  }

  function planWidgetDrop(wid, targetCol, targetRow, metrics) {
    const spec = DESKTOP_WIDGET_SPECS.find(s => s.id === wid);
    if (!spec) return { valid: false };

    const m = metrics || getDesktopGridMetrics();
    const col = Math.min(Math.max(0, m.maxCols - spec.colSpan), Math.max(0, targetCol));
    const row = Math.min(Math.max(0, m.maxRows - spec.rowSpan), Math.max(0, targetRow));

    const curCfg = (desktopWidgetsConfig && desktopWidgetsConfig[wid]) || { enabled: true, gridCol: m.maxCols - spec.colSpan, gridRow: spec.defaultRow };
    const oldCol = (curCfg.gridCol !== null && curCfg.gridCol !== undefined && !isNaN(curCfg.gridCol))
      ? Number(curCfg.gridCol)
      : (m.maxCols - spec.colSpan);
    const oldRow = (curCfg.gridRow !== null && curCfg.gridRow !== undefined && !isNaN(curCfg.gridRow))
      ? Number(curCfg.gridRow)
      : spec.defaultRow;

    // Find any other active widgets overlapping target rectangle
    const overlappingSpecs = DESKTOP_WIDGET_SPECS.filter(s => {
      if (s.id === wid) return false;
      const cfg = desktopWidgetsConfig && desktopWidgetsConfig[s.id];
      if (!cfg || cfg.enabled === false) return false;
      const wc = Number(cfg.gridCol);
      const wr = Number(cfg.gridRow);
      if (isNaN(wc) || isNaN(wr)) return false;
      const horiz = col < (wc + s.colSpan) && (col + spec.colSpan) > wc;
      const vert = row < (wr + s.rowSpan) && (row + spec.rowSpan) > wr;
      return horiz && vert;
    });

    // Build set of cells occupied by non-overlapping active widgets
    const fixedWidgetCells = new Set();
    DESKTOP_WIDGET_SPECS.forEach(s => {
      if (s.id === wid) return;
      if (overlappingSpecs.some(o => o.id === s.id)) return;
      const cfg = desktopWidgetsConfig && desktopWidgetsConfig[s.id];
      if (!cfg || cfg.enabled === false) return;
      const wc = Number(cfg.gridCol);
      const wr = Number(cfg.gridRow);
      if (!isNaN(wc) && !isNaN(wr)) {
        markRectOccupied(wc, wr, s.colSpan, s.rowSpan, fixedWidgetCells);
      }
    });

    const widgetMoves = {};

    if (overlappingSpecs.length === 0) {
      if (!rectFitsAndFree(col, row, spec.colSpan, spec.rowSpan, fixedWidgetCells, m.maxCols, m.maxRows)) {
        return { valid: false };
      }
      widgetMoves[wid] = { col, row };
    } else if (overlappingSpecs.length === 1) {
      const otherSpec = overlappingSpecs[0];
      const otherCfg = desktopWidgetsConfig[otherSpec.id];
      const otherCol = Number(otherCfg.gridCol);
      const otherRow = Number(otherCfg.gridRow);

      const pairCandidates = [];
      // 1. Direct placement at (col, row) with otherSpec pushed or swapped
      if (row <= otherRow) {
        pairCandidates.push({ w: { col, row }, o: { col: otherCol, row: row + spec.rowSpan } });
      }
      if (row > otherRow) {
        pairCandidates.push({ w: { col, row }, o: { col: otherCol, row: row - otherSpec.rowSpan } });
      }
      pairCandidates.push({ w: { col, row }, o: { col: oldCol, row: oldRow } });
      pairCandidates.push({ w: { col, row }, o: { col: oldCol, row: oldRow + spec.rowSpan - otherSpec.rowSpan } });
      if (col <= otherCol) {
        pairCandidates.push({ w: { col, row }, o: { col: col + spec.colSpan, row: otherRow } });
      }
      if (col > otherCol) {
        pairCandidates.push({ w: { col, row }, o: { col: col - otherSpec.colSpan, row: otherRow } });
      }

      // 2. Stack-aligned swap (e.g., 1-row widget dropped onto lower half of 2-row widget)
      if (oldRow >= otherRow) {
        pairCandidates.push({
          w: { col, row: otherRow },
          o: { col: otherCol, row: otherRow + spec.rowSpan }
        });
      } else {
        pairCandidates.push({
          w: { col, row: otherRow + otherSpec.rowSpan - spec.rowSpan },
          o: { col: otherCol, row: oldRow }
        });
        pairCandidates.push({
          w: { col, row: oldRow + otherSpec.rowSpan },
          o: { col: otherCol, row: oldRow }
        });
      }
      pairCandidates.push({
        w: { col, row: otherRow },
        o: { col: otherCol, row: otherRow + spec.rowSpan }
      });
      pairCandidates.push({
        w: { col, row: otherRow + otherSpec.rowSpan - spec.rowSpan },
        o: { col: otherCol, row: otherRow - spec.rowSpan }
      });

      const validPair = pairCandidates.find(pair => {
        if (!rectFitsAndFree(pair.w.col, pair.w.row, spec.colSpan, spec.rowSpan, fixedWidgetCells, m.maxCols, m.maxRows)) {
          return false;
        }
        const tempOcc = new Set(fixedWidgetCells);
        markRectOccupied(pair.w.col, pair.w.row, spec.colSpan, spec.rowSpan, tempOcc);
        return rectFitsAndFree(pair.o.col, pair.o.row, otherSpec.colSpan, otherSpec.rowSpan, tempOcc, m.maxCols, m.maxRows);
      });

      if (!validPair) {
        return { valid: false };
      }
      widgetMoves[wid] = validPair.w;
      widgetMoves[otherSpec.id] = validPair.o;
    } else {
      // Multiple overlapped widgets (e.g. 2-row Clock dragged over two 1-row widgets)
      if (!rectFitsAndFree(col, row, spec.colSpan, spec.rowSpan, fixedWidgetCells, m.maxCols, m.maxRows)) {
        return { valid: false };
      }
      const tempOcc = new Set(fixedWidgetCells);
      markRectOccupied(col, row, spec.colSpan, spec.rowSpan, tempOcc);
      widgetMoves[wid] = { col, row };

      const sortedOverlapping = [...overlappingSpecs].sort((a, b) => {
        const ra = Number(desktopWidgetsConfig[a.id]?.gridRow || 0);
        const rb = Number(desktopWidgetsConfig[b.id]?.gridRow || 0);
        return ra - rb;
      });

      for (const otherSpec of sortedOverlapping) {
        const otherCfg = desktopWidgetsConfig[otherSpec.id];
        const otherCol = Number(otherCfg.gridCol);
        const cands = [];
        for (let r = oldRow; r < oldRow + spec.rowSpan; r++) {
          cands.push({ col: oldCol, row: r });
        }
        for (let r = 0; r <= m.maxRows - otherSpec.rowSpan; r++) {
          cands.push({ col: otherCol, row: r });
          cands.push({ col: oldCol, row: r });
        }
        const validCand = cands.find(cand =>
          rectFitsAndFree(cand.col, cand.row, otherSpec.colSpan, otherSpec.rowSpan, tempOcc, m.maxCols, m.maxRows)
        );
        if (!validCand) {
          return { valid: false };
        }
        widgetMoves[otherSpec.id] = { col: validCand.col, row: validCand.row };
        markRectOccupied(validCand.col, validCand.row, otherSpec.colSpan, otherSpec.rowSpan, tempOcc);
      }
    }

    // Build complete set of widget cells after widgetMoves
    const nextWidgetCells = new Set(fixedWidgetCells);
    Object.entries(widgetMoves).forEach(([id, pos]) => {
      const s = DESKTOP_WIDGET_SPECS.find(x => x.id === id);
      if (s) markRectOccupied(pos.col, pos.row, s.colSpan, s.rowSpan, nextWidgetCells);
    });

    // Check if any pinned apps fall inside nextWidgetCells; relocate them to nearest free cells
    const vacatedSet = new Set();
    for (let dc = 0; dc < spec.colSpan; dc++) {
      for (let dr = 0; dr < spec.rowSpan; dr++) {
        const vc = oldCol + dc;
        const vr = oldRow + dr;
        if (vc >= 0 && vc < m.maxCols && vr >= 0 && vr < m.maxRows && !nextWidgetCells.has(`${vc},${vr}`)) {
          vacatedSet.add(`${vc},${vr}`);
        }
      }
    }

    const usedCells = new Set(nextWidgetCells);
    const collidingApps = [];
    pinnedApps.forEach(app => {
      const key = `${app.gridCol},${app.gridRow}`;
      if (nextWidgetCells.has(key)) {
        collidingApps.push(app);
      } else {
        usedCells.add(key);
      }
    });

    const appMoves = [];
    for (const app of collidingApps) {
      const origC = Number(app.gridCol) || 0;
      const origR = Number(app.gridRow) || 0;
      let bestCell = null;
      let bestScore = Infinity;

      for (let c = 0; c < m.maxCols; c++) {
        for (let r = 0; r < m.maxRows; r++) {
          const k = `${c},${r}`;
          if (usedCells.has(k)) continue;
          const dist = Math.abs(c - origC) * 1.5 + Math.abs(r - origR) - (vacatedSet.has(k) ? 0.25 : 0);
          if (dist < bestScore) {
            bestScore = dist;
            bestCell = { col: c, row: r };
          }
        }
      }

      if (!bestCell) {
        return { valid: false };
      }
      usedCells.add(`${bestCell.col},${bestCell.row}`);
      appMoves.push({ id: app.id, col: bestCell.col, row: bestCell.row });
    }

    return { valid: true, widgetMoves, appMoves };
  }

  function renderDesktopApps(providedMetrics) {
    if (!osDesktopIcons) return;
    const { metrics } = resolveDesktopGridState(providedMetrics, false);
    osDesktopIcons.innerHTML = '';

    pinnedApps.forEach((app, idx) => {
      const tile = document.createElement('a');
      tile.className = 'os-app-tile';
      tile.href = app.url;
      tile.dataset.id = app.id || `pin_${idx}`;
      tile.title = `${app.title}\n${app.url}`;

      const col = (app.gridCol !== undefined && !isNaN(app.gridCol)) ? Number(app.gridCol) : Math.floor(idx / 6);
      const row = (app.gridRow !== undefined && !isNaN(app.gridRow)) ? Number(app.gridRow) : (idx % 6);
      tile.style.left = `${metrics.colToX(col)}px`;
      tile.style.top = `${metrics.rowToY(row)}px`;

      tile.draggable = true;

      tile.addEventListener('dragstart', (e) => {
        const m = getDesktopGridMetrics();
        draggedDesktopAppId = app.id;
        draggedDesktopItem = {
          type: 'app',
          id: app.id,
          colSpan: 1,
          rowSpan: 1,
          grabOffsetCol: 0,
          grabOffsetRow: 0,
          widthPx: m.spanToWidth(1),
          heightPx: m.spanToHeight(1)
        };
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', app.id);
        setTimeout(() => tile.classList.add('dragging'), 0);
      });

      tile.addEventListener('dragend', () => {
        tile.classList.remove('dragging');
        if (osGridHighlight) {
          osGridHighlight.classList.add('hidden');
          osGridHighlight.classList.remove('invalid');
        }
        draggedDesktopAppId = null;
        draggedDesktopItem = null;
      });

      const iconBox = document.createElement('div');
      iconBox.className = 'os-app-icon-box';

      const img = document.createElement('img');
      img.src = app.icon || app.favicon || '../../assets/app-icon.png';
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

      tile.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showAppContextMenu(e.clientX, e.clientY, app, 'desktop');
      });

      osDesktopIcons.appendChild(tile);
    });
  }

  function renderDesktopWidgets(providedMetrics, persistIfChanged = false) {
    if (!osWidgetsPanel) return;
    const { metrics } = resolveDesktopGridState(providedMetrics, persistIfChanged);

    DESKTOP_WIDGET_SPECS.forEach(spec => {
      const el = document.getElementById(spec.elId);
      if (!el) return;
      const cfg = (desktopWidgetsConfig && desktopWidgetsConfig[spec.id]) || {
        enabled: true,
        gridCol: null,
        gridRow: spec.defaultRow
      };
      const isEnabled = cfg.enabled !== false;
      el.classList.toggle('hidden', !isEnabled);
      if (!isEnabled) return;

      const col = Number(cfg.gridCol);
      const row = Number(cfg.gridRow);

      el.style.width = `${metrics.spanToWidth(spec.colSpan)}px`;
      el.style.height = `${metrics.spanToHeight(spec.rowSpan)}px`;
      el.style.left = `${metrics.colToX(col)}px`;
      el.style.top = `${metrics.rowToY(row)}px`;
      el.dataset.resolvedCol = String(col);
      el.dataset.resolvedRow = String(row);
    });
  }

  function renderStartMenuApps() {
    if (!osStartAppsGrid) return;
    osStartAppsGrid.innerHTML = '';
    if (!pinnedApps || pinnedApps.length === 0) {
      osStartAppsGrid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); font-size: 11.5px; padding: 18px 8px;">No pinned apps yet. Click "＋ Pin New App" below to add one.</div>';
      return;
    }
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

          // Auto-scroll when dragging near top/bottom edges
          const rect = osStartAppsGrid.getBoundingClientRect();
          const edgeThreshold = 45;
          const y = e.clientY;
          if (y - rect.top < edgeThreshold) {
            const factor = Math.max(1, (edgeThreshold - (y - rect.top)) / 5);
            osStartAppsGrid.scrollTop -= factor * 5;
          } else if (rect.bottom - y < edgeThreshold) {
            const factor = Math.max(1, (edgeThreshold - (rect.bottom - y)) / 5);
            osStartAppsGrid.scrollTop += factor * 5;
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
            renderShortcuts();
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

      item.addEventListener('click', (e) => {
        e.preventDefault();
        if (isStartMenuEditMode) return;
        closeStartMenu();
        launchUrlFromDesktop(app.url);
      });

      // Right-click context menu on start menu app
      item.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showAppContextMenu(e.clientX, e.clientY, app, 'start');
      });

      osStartAppsGrid.appendChild(item);
    });
  }

  function renderOniOsDesktop() {
    const m = getDesktopGridMetrics();
    renderDesktopWidgets(m, true);
    renderDesktopApps(m);
    renderStartMenuApps();
    renderSpotlightApps('');
  }

  function renderSpotlightApps(filterText) {
    if (!osSpotlightResults) return;
    const query = (filterText || '').trim();
    osSpotlightResults.innerHTML = '';

    if (!query) {
      osSpotlightResults.innerHTML = '<div class="os-spotlight-empty-hint">Type a web address or search query and press Enter.</div>';
      return;
    }

    const isUrl = /^https?:\/\//i.test(query) || /^file:\/\//i.test(query) || /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/i.test(query) || /^localhost(:\d+)?(\/.*)?$/i.test(query);
    const destUrl = isUrl ? (/^https?:\/\//i.test(query) ? query : `https://${query}`) : query;
    const engineName = (activeEngine && activeEngine.name) ? activeEngine.name : 'Google';

    if (isUrl) {
      const navItem = document.createElement('div');
      navItem.className = 'os-spotlight-suggestion';
      navItem.innerHTML = `
        <div class="os-spotlight-suggestion-left">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          <span style="font-weight:600;">Go to:</span>
          <span style="color:var(--accent-green); overflow:hidden; text-overflow:ellipsis;">${destUrl}</span>
        </div>
        <span class="os-spotlight-suggestion-badge">Enter ↵</span>
      `;
      navItem.addEventListener('click', () => {
        closeOsWindow('os-win-spotlight');
        executeSearchOrNavigate(query);
      });
      osSpotlightResults.appendChild(navItem);
    }

    const searchItem = document.createElement('div');
    searchItem.className = 'os-spotlight-suggestion';
    searchItem.innerHTML = `
      <div class="os-spotlight-suggestion-left">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <span style="font-weight:600;">Search ${engineName}:</span>
        <span style="color:#f8fafc; overflow:hidden; text-overflow:ellipsis;">"${query}"</span>
      </div>
      <span class="os-spotlight-suggestion-badge">Search</span>
    `;
    searchItem.addEventListener('click', () => {
      closeOsWindow('os-win-spotlight');
      executeSearchOrNavigate(query);
    });
    osSpotlightResults.appendChild(searchItem);
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
    } else if (winId === 'os-win-downloads') {
      await renderOsDownloadsWindow();
    } else if (winId === 'os-win-settings') {
      await renderOsSettingsWindow();
    } else if (winId === 'os-win-add-app') {
      const titleEl = document.getElementById('os-app-title');
      const urlEl = document.getElementById('os-app-url');
      const iconEl = document.getElementById('os-app-icon');
      if (titleEl) titleEl.value = '';
      if (urlEl) urlEl.value = '';
      if (iconEl) iconEl.value = '';
      if (titleEl) setTimeout(() => titleEl.focus(), 50);
    }
  }

  function closeStartMenu() {
    if (osStartMenu) osStartMenu.classList.add('hidden');
    if (isStartMenuEditMode) {
      isStartMenuEditMode = false;
      if (osStartBtnEdit) {
        osStartBtnEdit.textContent = 'Edit';
        osStartBtnEdit.classList.remove('active');
      }
      renderStartMenuApps();
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

  function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  }

  async function renderOsDownloadsWindow() {
    const body = document.getElementById('os-win-downloads-body');
    if (!body || !window.oniAPI) return;
    const downloads = await window.oniAPI.getDownloads();

    if (!downloads || downloads.length === 0) {
      body.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.08);">
          <span style="font-size:11px; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.8px;">Recent Downloads</span>
        </div>
        <div style="color:var(--text-muted); padding:32px 16px; text-align:center; font-size:12px;">
          No downloads recorded yet.
        </div>
      `;
      return;
    }

    const activeList = downloads.filter(d => d.state === 'progressing');
    const recentList = downloads.filter(d => d.state !== 'progressing');

    let html = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.08);">
        <span style="font-size:11px; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.8px;">
          Downloads (${downloads.length})
        </span>
        <button id="os-newtab-dl-clear" class="os-btn-ghost" style="color:#ef4444; border-color:rgba(239,68,68,0.3); font-size:11px; padding:3px 9px;">Clear All</button>
      </div>
    `;

    if (activeList.length > 0) {
      html += `
        <div style="margin-bottom:14px;">
          <div style="font-size:11px; font-weight:700; color:var(--accent-green); text-transform:uppercase; letter-spacing:0.6px; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
            <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:var(--accent-green); box-shadow:0 0 8px var(--accent-green);"></span>
            Active Downloads (${activeList.length})
          </div>
          <div style="display:flex; flex-direction:column; gap:8px;">
      `;

      activeList.forEach(item => {
        const pct = item.totalBytes > 0 ? Math.min(100, Math.round((item.receivedBytes / item.totalBytes) * 100)) : 0;
        const receivedStr = formatBytes(item.receivedBytes);
        const totalStr = item.totalBytes > 0 ? formatBytes(item.totalBytes) : 'unknown size';

        html += `
          <div class="os-dl-active-card">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; margin-bottom:4px;">
              <div style="font-weight:600; color:#fff; font-size:12.5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:380px;">
                ${item.filename || 'Downloading file...'}
              </div>
              <span class="os-dl-badge-pill progressing">${pct}%</span>
            </div>
            <div class="os-dl-progress-bar">
              <div class="os-dl-progress-fill" style="width: ${pct}%;"></div>
            </div>
            <div class="os-dl-meta-row">
              <span>${receivedStr} / ${totalStr}</span>
              <span style="color:var(--accent-cyan); font-weight:500;">Downloading...</span>
            </div>
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;
    }

    if (recentList.length > 0) {
      if (activeList.length > 0) {
        html += `
          <div style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.6px; margin-bottom:6px;">
            Completed &amp; Past
          </div>
        `;
      }

      html += `<div style="display:flex; flex-direction:column; gap:6px; max-height:280px; overflow-y:auto; padding-right:4px;">`;

      recentList.forEach(item => {
        const isCompleted = item.state === 'completed';
        const isCancelled = item.state === 'cancelled' || item.state === 'interrupted';
        const badgeClass = isCompleted ? 'completed' : (isCancelled ? 'cancelled' : 'progressing');
        const badgeText = isCompleted ? 'Completed' : (isCancelled ? 'Cancelled' : item.state);
        const sizeStr = item.totalBytes > 0 ? formatBytes(item.totalBytes) : formatBytes(item.receivedBytes);
        const dateStr = item.timestamp ? new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '';

        html += `
          <div class="os-list-row" style="cursor:default;">
            <div style="display:flex; align-items:center; gap:10px; overflow:hidden; max-width:340px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${isCompleted ? 'var(--accent-green)' : 'var(--text-muted)'}" stroke-width="2" style="flex-shrink:0;">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="12" y1="18" x2="12" y2="12"></line>
                <polyline points="9 15 12 18 15 15"></polyline>
              </svg>
              <div style="overflow:hidden;">
                <div style="font-weight:600; color:#fff; font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                  ${item.filename || 'Downloaded item'}
                </div>
                <div style="font-size:10.5px; color:var(--text-muted); display:flex; align-items:center; gap:6px; margin-top:2px;">
                  <span>${sizeStr}</span>
                  ${dateStr ? `<span>• ${dateStr}</span>` : ''}
                  <span class="os-dl-badge-pill ${badgeClass}">${badgeText}</span>
                </div>
              </div>
            </div>
            <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
              ${item.path ? `
                <button class="os-btn-ghost os-dl-action-open" data-path="${item.path}" style="padding:3px 8px; font-size:11px; color:var(--accent-cyan); border-color:rgba(0,229,255,0.25);">
                  Open ↗
                </button>
                <button class="os-btn-ghost os-dl-action-folder" data-path="${item.path}" title="Show in folder" style="padding:3px 8px; font-size:11px;">
                  📁
                </button>
              ` : ''}
            </div>
          </div>
        `;
      });

      html += `</div>`;
    }

    body.innerHTML = html;

    const clearDlBtn = document.getElementById('os-newtab-dl-clear');
    if (clearDlBtn) {
      clearDlBtn.addEventListener('click', async () => {
        if (window.oniAPI && window.oniAPI.clearDownloads) {
          await window.oniAPI.clearDownloads();
          renderOsDownloadsWindow();
        }
      });
    }

    body.querySelectorAll('.os-dl-action-open').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const p = btn.dataset.path;
        if (p && window.oniAPI && window.oniAPI.openDownloadFile) {
          window.oniAPI.openDownloadFile(p);
        }
      });
    });

    body.querySelectorAll('.os-dl-action-folder').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const p = btn.dataset.path;
        if (p && window.oniAPI && window.oniAPI.openDownloadFolder) {
          window.oniAPI.openDownloadFolder(p);
        }
      });
    });
  }

  let activeSettingsSection = 'general';

  async function renderOsSettingsWindow() {
    const body = document.getElementById('os-win-settings-body');
    if (!body || !window.oniAPI) return;
    const [themes, activeTheme, settings, shieldStats, accentColors] = await Promise.all([
      window.oniAPI.getThemes(),
      window.oniAPI.getActiveTheme(),
      window.oniAPI.getSettings ? window.oniAPI.getSettings() : { searchEngine: 'google' },
      window.oniAPI.getShieldStats ? window.oniAPI.getShieldStats() : { enabled: true, totalBlocked: 0 },
      window.oniAPI.getAccentColors ? window.oniAPI.getAccentColors() : []
    ]);

    const currentEngineKey = (settings && settings.searchEngine) || 'google';
    const foundEngIdx = ENGINES.findIndex(e => e.key === currentEngineKey);
    if (foundEngIdx >= 0) currentEngineIndex = foundEngIdx;

    const isShieldEnabled = !!(shieldStats && shieldStats.enabled !== false);
    const blockedCount = (shieldStats && shieldStats.totalBlocked) || 0;

    let themesHtml = '';
    (themes || []).forEach(t => {
      const isActive = activeTheme && activeTheme.id === t.id;
      themesHtml += `
        <div class="os-list-row os-theme-card" data-id="${t.id}" style="${isActive ? 'border-color:var(--accent-green); background:rgba(var(--accent-rgb),0.1);' : ''}">
          <div>
            <div style="font-weight:700; color:#fff; display:flex; align-items:center; gap:8px;">
              <span>${t.name}</span>
              ${isActive ? '<span style="font-size:10px; background:var(--accent-green); color:#04140b; font-weight:800; padding:1px 6px; border-radius:4px;">ACTIVE</span>' : ''}
            </div>
            <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">${t.description || ''}</div>
          </div>
          <button class="os-btn-primary os-theme-apply-btn" data-id="${t.id}" style="padding:4px 12px; font-size:11px; ${isActive ? 'display:none;' : ''}">Apply</button>
        </div>
      `;
    });

    // Accent Color options (Emerald preselected by default)
    const activeAccentId = (settings && settings.accentColor) || 'emerald';
    const availableAccents = Array.isArray(accentColors) && accentColors.length > 0 ? accentColors : [
      { id: 'emerald', name: 'Emerald', hex: '#00ff88' },
      { id: 'crimson', name: 'Crimson', hex: '#ff3366' },
      { id: 'cyan', name: 'Cyan', hex: '#00e5ff' },
      { id: 'violet', name: 'Violet', hex: '#a855f7' },
      { id: 'amber', name: 'Amber', hex: '#f59e0b' },
      { id: 'rose', name: 'Rose', hex: '#f43f5e' },
      { id: 'blue', name: 'Ocean Blue', hex: '#3b82f6' }
    ];

    let accentColorsHtml = '';
    availableAccents.forEach(c => {
      const isSel = c.id === activeAccentId;
      accentColorsHtml += `
        <button type="button" class="os-accent-option ${isSel ? 'active' : ''}" data-accent-id="${c.id}" title="${c.name}">
          <span class="os-accent-swatch" style="background:${c.hex}; color:${c.hex};"></span>
          <span>${c.name}</span>
        </button>
      `;
    });

    // Wallpaper options (Default wallpaper preselected + custom imported wallpapers + plus button)
    const defaultWpUrl = '../../assets/wallpaper.jpg';
    const activeWpUrl = (settings && settings.activeWallpaper) || defaultWpUrl;
    const customWallpapers = (settings && Array.isArray(settings.customWallpapers)) ? settings.customWallpapers : [];
    const isDefaultWpActive = !activeWpUrl || activeWpUrl === defaultWpUrl;

    let wallpapersHtml = `
      <div class="os-wallpaper-card ${isDefaultWpActive ? 'active' : ''}" data-wp-url="${defaultWpUrl}" style="background-image: url('${defaultWpUrl}');" title="Oni Default Wallpaper">
        ${isDefaultWpActive ? '<span class="os-wallpaper-badge">ACTIVE</span>' : ''}
        <span class="os-wallpaper-label">Default</span>
      </div>
    `;

    customWallpapers.forEach(wp => {
      if (!wp || !wp.url) return;
      const isActiveWp = activeWpUrl === wp.url;
      const safeUrl = wp.url.replace(/'/g, "\\'");
      wallpapersHtml += `
        <div class="os-wallpaper-card ${isActiveWp ? 'active' : ''}" data-wp-url="${wp.url}" style="background-image: url('${safeUrl}');" title="${wp.name || 'Custom Wallpaper'}">
          ${isActiveWp ? '<span class="os-wallpaper-badge">ACTIVE</span>' : ''}
          <button type="button" class="os-wallpaper-remove" data-remove-wp="${wp.id || wp.url}" title="Remove wallpaper">✕</button>
          <span class="os-wallpaper-label">${wp.name || 'Custom'}</span>
        </div>
      `;
    });

    wallpapersHtml += `
      <button type="button" class="os-wallpaper-add-card" id="os-btn-import-wallpaper" title="Import custom wallpaper image">
        <span class="os-wallpaper-add-icon">＋</span>
        <span class="os-wallpaper-add-text">Add Image</span>
      </button>
    `;

    let enginesHtml = '';
    ENGINES.forEach(eng => {
      const isSel = currentEngineKey === eng.key;
      enginesHtml += `
        <button class="os-btn-ghost os-engine-choice" data-key="${eng.key}" style="flex:1; padding:8px 0; font-size:11.5px; ${isSel ? 'border-color:var(--accent-green); color:var(--accent-green); background:rgba(var(--accent-rgb),0.12); font-weight:600;' : ''}">
          ${eng.name}
        </button>
      `;
    });

    const widgetsCfg = (settings && settings.desktopWidgets) || desktopWidgetsConfig || {};
    const widgetDefs = [
      {
        id: 'clock',
        title: 'System Time // Tokyo-STD',
        desc: 'Live digital clock, Kanji date telemetry, and active session status',
        enabled: !widgetsCfg.clock || widgetsCfg.clock.enabled !== false
      },
      {
        id: 'search',
        title: 'Quick Command // Web & Apps',
        desc: 'Desktop quick search bar with instant search engine switcher',
        enabled: !widgetsCfg.search || widgetsCfg.search.enabled !== false
      },
      {
        id: 'shield',
        title: 'Oni Shield // Firewall',
        desc: 'Real-time tracker neutralization and Chromium kernel telemetry',
        enabled: !widgetsCfg.shield || widgetsCfg.shield.enabled !== false
      }
    ];

    let widgetsHtml = '';
    widgetDefs.forEach(w => {
      widgetsHtml += `
        <div class="os-list-row" style="cursor:default; margin-bottom:0; ${w.enabled ? 'border-color:rgba(var(--accent-rgb),0.3); background:rgba(var(--accent-rgb),0.06);' : ''}">
          <div>
            <div style="font-weight:600; color:#fff;">${w.title}</div>
            <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">${w.desc}</div>
          </div>
          <button type="button" class="${w.enabled ? 'os-btn-danger' : 'os-btn-primary'} os-widget-toggle-btn" data-widget-id="${w.id}" style="padding:5px 14px; font-size:11px; flex-shrink:0;">
            ${w.enabled ? 'Remove' : 'Add to Home'}
          </button>
        </div>
      `;
    });

    body.innerHTML = `
      <div class="os-settings-layout">
        <aside class="os-settings-sidebar" aria-label="Settings Navigation">
          <button type="button" class="os-settings-nav-item ${activeSettingsSection === 'general' ? 'active' : ''}" data-section="general">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <span>General</span>
          </button>
          <button type="button" class="os-settings-nav-item ${activeSettingsSection === 'customization' ? 'active' : ''}" data-section="customization">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
              <polyline points="2 17 12 22 22 17"></polyline>
              <polyline points="2 12 12 17 22 12"></polyline>
            </svg>
            <span>Customization</span>
          </button>
          <button type="button" class="os-settings-nav-item ${activeSettingsSection === 'widgets' ? 'active' : ''}" data-section="widgets">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1"></rect>
              <rect x="14" y="3" width="7" height="7" rx="1"></rect>
              <rect x="14" y="14" width="7" height="7" rx="1"></rect>
              <rect x="3" y="14" width="7" height="7" rx="1"></rect>
            </svg>
            <span>Widgets</span>
          </button>
          <button type="button" class="os-settings-nav-item ${activeSettingsSection === 'privacy' ? 'active' : ''}" data-section="privacy">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
            <span>Privacy and Data</span>
          </button>
        </aside>

        <div class="os-settings-canvas">
          <!-- Section 1: General -->
          <div class="os-settings-section ${activeSettingsSection === 'general' ? '' : 'hidden'}" data-section-panel="general">
            <div class="os-settings-section-header">
              <div class="os-settings-section-title">General</div>
              <div class="os-settings-section-desc">Configure default search engine and browsing preferences.</div>
            </div>
            <div>
              <div class="os-settings-group-label">Search Engine</div>
              <div style="display:flex; gap:8px;">
                ${enginesHtml}
              </div>
            </div>
          </div>

          <!-- Section 2: Customization (Order: Theme -> Accent Color -> Wallpaper) -->
          <div class="os-settings-section ${activeSettingsSection === 'customization' ? '' : 'hidden'}" data-section-panel="customization">
            <div class="os-settings-section-header">
              <div class="os-settings-section-title">Customization</div>
              <div class="os-settings-section-desc">Personalize your Oni Browser theme, global accent color, and wallpaper.</div>
            </div>
            <div style="margin-bottom: 18px;">
              <div class="os-settings-group-label">Theme</div>
              <div style="display:flex; flex-direction:column; gap:8px;">
                ${themesHtml}
              </div>
            </div>

            <div style="margin-bottom: 18px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.08);">
              <div class="os-settings-group-label">Accent Color</div>
              <div class="os-accent-grid">
                ${accentColorsHtml}
              </div>
            </div>

            <div style="padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.08);">
              <div class="os-settings-group-label">Wallpaper</div>
              <div class="os-wallpaper-grid">
                ${wallpapersHtml}
              </div>
            </div>
          </div>

          <!-- Section 3: Widgets -->
          <div class="os-settings-section ${activeSettingsSection === 'widgets' ? '' : 'hidden'}" data-section-panel="widgets">
            <div class="os-settings-section-header">
              <div class="os-settings-section-title">Widgets</div>
              <div class="os-settings-section-desc">Add or remove desktop widgets from your Oni OS home page. Drag widgets on the home page to rearrange them on the grid.</div>
            </div>
            <div>
              <div class="os-settings-group-label">Home Page Widgets</div>
              <div style="display:flex; flex-direction:column; gap:8px;">
                ${widgetsHtml}
              </div>
            </div>
          </div>

          <!-- Section 4: Privacy and Data -->
          <div class="os-settings-section ${activeSettingsSection === 'privacy' ? '' : 'hidden'}" data-section-panel="privacy">
            <div class="os-settings-section-header">
              <div class="os-settings-section-title">Privacy and Data</div>
              <div class="os-settings-section-desc">Manage Oni Shield protection and browsing data.</div>
            </div>
            <div style="margin-bottom:18px;">
              <div class="os-settings-group-label">Oni Shield Protection</div>
              <div class="os-list-row" style="cursor:default; margin-bottom:0;">
                <div>
                  <div style="font-weight:600; color:#fff;">Ad &amp; Tracker Blocker</div>
                  <div style="font-size:11px; color:var(--text-muted);">Neutralized ${blockedCount} invasive requests</div>
                </div>
                <button id="os-set-toggle-shield" class="os-btn-ghost" style="padding:4px 12px; font-size:11px; color:${isShieldEnabled ? 'var(--accent-green)' : 'var(--text-muted)'};">
                  ${isShieldEnabled ? 'Active ✓' : 'Disabled'}
                </button>
              </div>
            </div>

            <div style="padding-top:14px; border-top:1px solid rgba(255,255,255,0.08);">
              <div class="os-settings-group-label">Browsing History &amp; Cache</div>
              <button id="os-set-btn-clear-data" class="os-btn-danger" style="width:100%; padding:8px 0; font-size:12px;">Clear Browsing History &amp; Cache</button>
            </div>
          </div>
        </div>
      </div>
    `;

    body.querySelectorAll('.os-settings-nav-item').forEach(navBtn => {
      navBtn.addEventListener('click', () => {
        const targetSection = navBtn.dataset.section;
        if (!targetSection) return;
        activeSettingsSection = targetSection;

        body.querySelectorAll('.os-settings-nav-item').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.section === targetSection);
        });
        body.querySelectorAll('.os-settings-section').forEach(panel => {
          panel.classList.toggle('hidden', panel.dataset.sectionPanel !== targetSection);
        });
      });
    });

    body.querySelectorAll('.os-theme-apply-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const tid = btn.dataset.id;
        if (tid && window.oniAPI && window.oniAPI.applyTheme) {
          const res = await window.oniAPI.applyTheme(tid);
          if (res && res.theme) applyNewTabTheme(res.theme);
          await renderOsSettingsWindow();
        }
      });
    });

    body.querySelectorAll('.os-accent-option').forEach(btn => {
      btn.addEventListener('click', async () => {
        const colorId = btn.dataset.accentId;
        if (colorId && window.oniAPI && window.oniAPI.setAccentColor) {
          const res = await window.oniAPI.setAccentColor(colorId);
          if (res && res.theme) applyNewTabTheme(res.theme);
          await renderOsSettingsWindow();
        }
      });
    });

    body.querySelectorAll('.os-wallpaper-card').forEach(card => {
      card.addEventListener('click', async (e) => {
        if (e.target.closest('.os-wallpaper-remove')) return;
        const wpUrl = card.dataset.wpUrl;
        if (wpUrl && window.oniAPI && window.oniAPI.setWallpaper) {
          const res = await window.oniAPI.setWallpaper(wpUrl);
          if (res && res.theme) applyNewTabTheme(res.theme);
          await renderOsSettingsWindow();
        }
      });
    });

    body.querySelectorAll('.os-wallpaper-remove').forEach(rmBtn => {
      rmBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const idOrUrl = rmBtn.dataset.removeWp;
        if (idOrUrl && window.oniAPI && window.oniAPI.removeWallpaper) {
          const res = await window.oniAPI.removeWallpaper(idOrUrl);
          if (res && res.theme) applyNewTabTheme(res.theme);
          await renderOsSettingsWindow();
        }
      });
    });

    const importWpBtn = document.getElementById('os-btn-import-wallpaper');
    if (importWpBtn) {
      importWpBtn.addEventListener('click', async () => {
        if (window.oniAPI && window.oniAPI.importWallpaper) {
          const res = await window.oniAPI.importWallpaper();
          if (res && !res.canceled) {
            if (res.theme) applyNewTabTheme(res.theme);
            await renderOsSettingsWindow();
          }
        }
      });
    }

    body.querySelectorAll('.os-widget-toggle-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const wid = btn.dataset.widgetId;
        if (wid && window.oniAPI && window.oniAPI.updateSettings) {
          const cur = (widgetsCfg && widgetsCfg[wid]) || { enabled: true };
          const nextEnabled = cur.enabled === false;
          const updatedWidgets = {
            ...widgetsCfg,
            [wid]: {
              enabled: nextEnabled,
              gridCol: null,
              gridRow: null
            }
          };
          desktopWidgetsConfig = updatedWidgets;
          renderDesktopWidgets(null, true);
          renderDesktopApps();
          await window.oniAPI.updateSettings({ desktopWidgets: desktopWidgetsConfig });
          await renderOsSettingsWindow();
        }
      });
    });

    body.querySelectorAll('.os-engine-choice').forEach(btn => {
      btn.addEventListener('click', async () => {
        const k = btn.dataset.key;
        if (k && window.oniAPI && window.oniAPI.updateSettings) {
          await window.oniAPI.updateSettings({ searchEngine: k });
          await renderOsSettingsWindow();
        }
      });
    });

    const shieldToggle = document.getElementById('os-set-toggle-shield');
    if (shieldToggle) {
      shieldToggle.addEventListener('click', async () => {
        if (window.oniAPI && window.oniAPI.toggleShield) {
          const stats = await window.oniAPI.getShieldStats();
          await window.oniAPI.toggleShield(!stats.enabled);
          await renderOsSettingsWindow();
        }
      });
    }

    const clearDataBtn = document.getElementById('os-set-btn-clear-data');
    if (clearDataBtn) {
      clearDataBtn.addEventListener('click', async () => {
        if (confirm('Clear all browsing history, cache, and downloads?')) {
          if (window.oniAPI && window.oniAPI.clearBrowsingData) {
            await window.oniAPI.clearBrowsingData({ history: true, cache: true, downloads: true });
            await renderOsSettingsWindow();
          }
        }
      });
    }
  }

  function setupOsDesktopEvents() {
    // Top bar menu items
    const topStartBtn = document.getElementById('os-top-start-btn');
    if (topStartBtn) {
      topStartBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (osStartMenu && !osStartMenu.classList.contains('hidden')) {
          closeStartMenu();
        } else if (osStartMenu) {
          osStartMenu.classList.remove('hidden');
        }
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
        closeStartMenu();
        if (window.oniAPI && window.oniAPI.createTab) {
          window.oniAPI.createTab('oni://newtab');
        }
      });
    }

    const startPin = document.getElementById('os-start-btn-pin') || document.getElementById('os-start-btn-control');
    if (startPin) {
      startPin.addEventListener('click', () => {
        closeStartMenu();
        if (window.oniAPI && window.oniAPI.triggerOsAction) {
          window.oniAPI.triggerOsAction('pin-app');
        } else {
          openOsWindow('os-win-add-app');
        }
      });
    }

    if (osStartBtnEdit) {
      osStartBtnEdit.addEventListener('click', (e) => {
        e.stopPropagation();
        isStartMenuEditMode = !isStartMenuEditMode;
        osStartBtnEdit.textContent = isStartMenuEditMode ? 'Done' : 'Edit';
        osStartBtnEdit.classList.toggle('active', isStartMenuEditMode);
        renderStartMenuApps();
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
          await window.oniAPI.addBookmark({ title, url, icon, favicon: icon });
        } else {
          pinnedApps.push({ title, url, icon, favicon: icon });
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

    // Individual Draggable Desktop Widgets (Clock, Search, Shield)
    DESKTOP_WIDGET_SPECS.forEach(spec => {
      const widgetEl = document.getElementById(spec.elId);
      if (!widgetEl) return;

      widgetEl.addEventListener('mousedown', (e) => {
        if (e.target.closest('input, button, a')) {
          widgetEl.draggable = false;
        } else {
          widgetEl.draggable = true;
        }
      });

      widgetEl.addEventListener('mouseup', () => {
        widgetEl.draggable = true;
      });

      widgetEl.addEventListener('dragstart', (e) => {
        if (e.target.closest('input, button, a')) {
          e.preventDefault();
          return;
        }
        const m = getDesktopGridMetrics();
        const wRect = widgetEl.getBoundingClientRect();
        const grabOffsetCol = Math.min(spec.colSpan - 1, Math.max(0, Math.floor((e.clientX - wRect.left) / m.stepX)));
        const grabOffsetRow = Math.min(spec.rowSpan - 1, Math.max(0, Math.floor((e.clientY - wRect.top) / m.stepY)));
        draggedDesktopItem = {
          type: 'widget',
          id: spec.id,
          colSpan: spec.colSpan,
          rowSpan: spec.rowSpan,
          grabOffsetCol,
          grabOffsetRow,
          widthPx: m.spanToWidth(spec.colSpan),
          heightPx: m.spanToHeight(spec.rowSpan)
        };
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', `widget:${spec.id}`);
        setTimeout(() => widgetEl.classList.add('dragging'), 0);
      });

      widgetEl.addEventListener('dragend', () => {
        widgetEl.classList.remove('dragging');
        widgetEl.draggable = true;
        if (osGridHighlight) {
          osGridHighlight.classList.add('hidden');
          osGridHighlight.classList.remove('invalid');
        }
        draggedDesktopItem = null;
      });
    });

    // Home Right-Click Context Menu & Desktop Grid Drag Drop (Pinned Apps + Widgets)
    const workspace = document.getElementById('os-workspace');
    if (workspace && osContextMenu) {
      workspace.addEventListener('contextmenu', (e) => {
        if (e.target.closest('.os-app-tile')) return;
        e.preventDefault();
        hideAllContextMenus();
        const x = Math.min(e.clientX, window.innerWidth - 230);
        const y = Math.min(e.clientY, window.innerHeight - 260);
        osContextMenu.style.left = `${x}px`;
        osContextMenu.style.top = `${y}px`;
        osContextMenu.classList.remove('hidden');
      });

      workspace.addEventListener('dragover', (e) => {
        if (!draggedDesktopItem || !osDesktopIcons) return;
        e.preventDefault();
        const m = getDesktopGridMetrics();
        const x = e.clientX - m.leftOffset;
        const y = e.clientY - m.topOffset;
        const rawCol = m.pointerToCol(x) - (draggedDesktopItem.grabOffsetCol || 0);
        const rawRow = m.pointerToRow(y) - (draggedDesktopItem.grabOffsetRow || 0);
        const col = Math.min(Math.max(0, m.maxCols - draggedDesktopItem.colSpan), Math.max(0, rawCol));
        const row = Math.min(Math.max(0, m.maxRows - draggedDesktopItem.rowSpan), Math.max(0, rawRow));

        let isValidDrop = true;
        if (draggedDesktopItem.type === 'app') {
          isValidDrop = !isCellOccupiedByActiveWidget(col, row);
        } else if (draggedDesktopItem.type === 'widget') {
          const plan = planWidgetDrop(draggedDesktopItem.id, col, row, m);
          isValidDrop = plan.valid;
        }
        e.dataTransfer.dropEffect = isValidDrop ? 'move' : 'none';

        if (osGridHighlight) {
          osGridHighlight.style.width = `${m.spanToWidth(draggedDesktopItem.colSpan)}px`;
          osGridHighlight.style.height = `${m.spanToHeight(draggedDesktopItem.rowSpan)}px`;
          osGridHighlight.style.borderRadius = draggedDesktopItem.type === 'widget' ? '18px' : '12px';
          osGridHighlight.style.left = `${m.colToX(col) + 24}px`;
          osGridHighlight.style.top = `${m.rowToY(row) + 22}px`;
          osGridHighlight.classList.toggle('invalid', !isValidDrop);
          osGridHighlight.classList.remove('hidden');
        }
      });

      workspace.addEventListener('dragleave', (e) => {
        if (e.target === workspace && osGridHighlight) {
          osGridHighlight.classList.add('hidden');
          osGridHighlight.classList.remove('invalid');
        }
      });

      workspace.addEventListener('drop', async (e) => {
        if (!draggedDesktopItem || !osDesktopIcons) return;
        e.preventDefault();
        if (osGridHighlight) {
          osGridHighlight.classList.add('hidden');
          osGridHighlight.classList.remove('invalid');
        }
        const m = getDesktopGridMetrics();
        const x = e.clientX - m.leftOffset;
        const y = e.clientY - m.topOffset;
        const rawCol = m.pointerToCol(x) - (draggedDesktopItem.grabOffsetCol || 0);
        const rawRow = m.pointerToRow(y) - (draggedDesktopItem.grabOffsetRow || 0);
        const col = Math.min(Math.max(0, m.maxCols - draggedDesktopItem.colSpan), Math.max(0, rawCol));
        const row = Math.min(Math.max(0, m.maxRows - draggedDesktopItem.rowSpan), Math.max(0, rawRow));

        if (draggedDesktopItem.type === 'app') {
          if (isCellOccupiedByActiveWidget(col, row)) return;
          const draggedApp = pinnedApps.find(a => a.id === draggedDesktopItem.id);
          if (!draggedApp) return;

          const occupant = pinnedApps.find(a => a.id !== draggedApp.id && a.gridCol === col && a.gridRow === row);
          if (occupant) {
            occupant.gridCol = draggedApp.gridCol;
            occupant.gridRow = draggedApp.gridRow;
          }
          draggedApp.gridCol = col;
          draggedApp.gridRow = row;

          renderDesktopApps(m);
          if (window.oniAPI && window.oniAPI.setBookmarks) {
            await window.oniAPI.setBookmarks(pinnedApps);
          }
        } else if (draggedDesktopItem.type === 'widget') {
          const wid = draggedDesktopItem.id;
          const plan = planWidgetDrop(wid, col, row, m);
          if (!plan.valid) return;

          Object.entries(plan.widgetMoves).forEach(([id, pos]) => {
            desktopWidgetsConfig[id] = {
              ...(desktopWidgetsConfig[id] || { enabled: true }),
              enabled: true,
              gridCol: pos.col,
              gridRow: pos.row
            };
          });

          let appsChanged = false;
          if (plan.appMoves && plan.appMoves.length > 0) {
            plan.appMoves.forEach(move => {
              const targetApp = pinnedApps.find(a => a.id === move.id);
              if (targetApp) {
                targetApp.gridCol = move.col;
                targetApp.gridRow = move.row;
                appsChanged = true;
              }
            });
          }

          renderDesktopWidgets(m, false);
          renderDesktopApps(m);

          if (window.oniAPI && window.oniAPI.updateSettings) {
            await window.oniAPI.updateSettings({ desktopWidgets: desktopWidgetsConfig });
          }
          if (appsChanged && window.oniAPI && window.oniAPI.setBookmarks) {
            await window.oniAPI.setBookmarks(pinnedApps);
          }
        }
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
    document.getElementById('ctx-open-history')?.addEventListener('click', () => {
      if (window.oniAPI && window.oniAPI.triggerOsAction) window.oniAPI.triggerOsAction('history');
      else openOsWindow('os-win-history');
    });
    document.getElementById('ctx-open-settings')?.addEventListener('click', () => {
      if (window.oniAPI && window.oniAPI.triggerOsAction) window.oniAPI.triggerOsAction('settings');
      else openOsWindow('os-win-settings');
    });
    document.getElementById('ctx-refresh-desktop')?.addEventListener('click', () => {
      renderDesktopApps();
      renderDesktopWidgets();
    });

    // Search Input Context Menu Actions
    if (osSpotlightInput) {
      osSpotlightInput.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showSearchContextMenu(e.clientX, e.clientY);
      });
    }

    document.getElementById('ctx-search-cut')?.addEventListener('click', (e) => {
      e.stopPropagation();
      hideAllContextMenus();
      if (!osSpotlightInput) return;
      const start = osSpotlightInput.selectionStart;
      const end = osSpotlightInput.selectionEnd;
      const sel = osSpotlightInput.value.substring(start, end);
      if (sel && window.oniAPI && window.oniAPI.writeClipboardText) {
        window.oniAPI.writeClipboardText(sel);
        osSpotlightInput.value = osSpotlightInput.value.substring(0, start) + osSpotlightInput.value.substring(end);
        osSpotlightInput.setSelectionRange(start, start);
        renderSpotlightApps(osSpotlightInput.value);
      }
    });

    document.getElementById('ctx-search-copy')?.addEventListener('click', (e) => {
      e.stopPropagation();
      hideAllContextMenus();
      if (!osSpotlightInput) return;
      const sel = osSpotlightInput.value.substring(osSpotlightInput.selectionStart, osSpotlightInput.selectionEnd) || osSpotlightInput.value;
      if (sel && window.oniAPI && window.oniAPI.writeClipboardText) {
        window.oniAPI.writeClipboardText(sel);
      }
    });

    document.getElementById('ctx-search-paste')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      hideAllContextMenus();
      if (!osSpotlightInput) return;
      if (window.oniAPI && window.oniAPI.readClipboardText) {
        const text = await window.oniAPI.readClipboardText();
        if (text) {
          const start = osSpotlightInput.selectionStart || 0;
          const end = osSpotlightInput.selectionEnd || 0;
          const val = osSpotlightInput.value || '';
          osSpotlightInput.value = val.substring(0, start) + text + val.substring(end);
          const newPos = start + text.length;
          osSpotlightInput.setSelectionRange(newPos, newPos);
          renderSpotlightApps(osSpotlightInput.value);
        }
      }
    });

    document.getElementById('ctx-search-select-all')?.addEventListener('click', (e) => {
      e.stopPropagation();
      hideAllContextMenus();
      if (osSpotlightInput) osSpotlightInput.select();
    });

    document.getElementById('ctx-search-clear')?.addEventListener('click', (e) => {
      e.stopPropagation();
      hideAllContextMenus();
      if (osSpotlightInput) {
        osSpotlightInput.value = '';
        renderSpotlightApps('');
        osSpotlightInput.focus();
      }
    });

    // App Context Menu Actions (Desktop & Start Menu)
    document.getElementById('ctx-app-open')?.addEventListener('click', (e) => {
      e.stopPropagation();
      hideAllContextMenus();
      if (!activeContextApp) return;
      closeStartMenu();
      launchUrlFromDesktop(activeContextApp.url);
    });

    document.getElementById('ctx-app-open-tab')?.addEventListener('click', (e) => {
      e.stopPropagation();
      hideAllContextMenus();
      if (!activeContextApp) return;
      closeStartMenu();
      if (window.oniAPI && window.oniAPI.createTab) {
        window.oniAPI.createTab(activeContextApp.url);
      }
    });

    document.getElementById('ctx-app-copy-link')?.addEventListener('click', (e) => {
      e.stopPropagation();
      hideAllContextMenus();
      if (activeContextApp && window.oniAPI && window.oniAPI.writeClipboardText) {
        window.oniAPI.writeClipboardText(activeContextApp.url);
      }
    });

    document.getElementById('ctx-app-edit')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const app = activeContextApp;
      hideAllContextMenus();
      if (!app) return;
      if (window.oniAPI && window.oniAPI.triggerOsAction) {
        window.oniAPI.triggerOsAction({ type: 'edit-app', app });
      }
    });

    document.getElementById('ctx-app-delete')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      hideAllContextMenus();
      if (!activeContextApp) return;
      const targetId = activeContextApp.id;
      const targetUrl = activeContextApp.url;
      pinnedApps = pinnedApps.filter(a => a.id !== targetId && a.url !== targetUrl);
      renderDesktopApps();
      renderStartMenuApps();
      renderShortcuts();
      if (window.oniAPI && window.oniAPI.removeBookmark) {
        await window.oniAPI.removeBookmark(targetId || targetUrl);
      }
    });

    // Mousewheel scroll while dragging in Start Menu
    window.addEventListener('wheel', (e) => {
      if (draggedAppIndex !== null && osStartAppsGrid) {
        osStartAppsGrid.scrollTop += e.deltaY;
      }
    }, { passive: true });

    // Close Start Menu & Context Menus on outside click
    document.addEventListener('click', (e) => {
      hideAllContextMenus();
      if (osStartMenu && !osStartMenu.classList.contains('hidden') && !osStartMenu.contains(e.target)) {
        closeStartMenu();
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
        hideAllContextMenus();
        closeStartMenu();
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
      if (osStartMenu) {
        if (!osStartMenu.classList.contains('hidden')) {
          closeStartMenu();
        } else {
          osStartMenu.classList.remove('hidden');
        }
      }
    } else if (action === 'start-menu-open') {
      if (osStartMenu) osStartMenu.classList.remove('hidden');
    } else if (action === 'home' || action === 'desktop') {
      closeStartMenu();
      document.querySelectorAll('.os-window').forEach(w => w.classList.add('hidden'));
    } else if (action === 'search' || action === 'spotlight') {
      closeStartMenu();
      openOsWindow('os-win-spotlight');
    } else if (action === 'history') {
      closeStartMenu();
      openOsWindow('os-win-history');
    } else if (action === 'downloads') {
      closeStartMenu();
      const win = document.getElementById('os-win-downloads');
      if (win && !win.classList.contains('hidden')) {
        closeOsWindow('os-win-downloads');
      } else {
        openOsWindow('os-win-downloads');
      }
    } else if (action === 'settings') {
      closeStartMenu();
      openOsWindow('os-win-settings');
    } else if (action === 'pin-app' || action === 'add-app') {
      closeStartMenu();
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
        const handlePinnedAppsUpdate = (bms) => {
          if (Array.isArray(bms)) {
            pinnedApps = bms.map((b, idx) => ({
              id: b.id || ('pin_' + idx),
              title: b.title || 'Untitled',
              url: b.url,
              icon: b.icon || b.favicon || '',
              favicon: b.favicon || b.icon || '',
              gridCol: (b.gridCol !== undefined && !isNaN(b.gridCol)) ? Number(b.gridCol) : Math.floor(idx / 6),
              gridRow: (b.gridRow !== undefined && !isNaN(b.gridRow)) ? Number(b.gridRow) : (idx % 6)
            }));
            renderDesktopApps();
            renderStartMenuApps();
            renderShortcuts();
          }
        };

        if (window.oniAPI.getBookmarks) {
          const bms = await window.oniAPI.getBookmarks();
          if (Array.isArray(bms)) {
            handlePinnedAppsUpdate(bms);
          }
        }
        if (window.oniAPI.onBookmarksUpdated) {
          window.oniAPI.onBookmarksUpdated(handlePinnedAppsUpdate);
        }
        if (window.oniAPI.onDesktopAppsUpdated) {
          window.oniAPI.onDesktopAppsUpdated(handlePinnedAppsUpdate);
        }

        const applySettingsState = (settings) => {
          if (!settings) return;
          if (settings.desktopWidgets) {
            desktopWidgetsConfig = {
              clock: { ...desktopWidgetsConfig.clock, ...(settings.desktopWidgets.clock || {}) },
              search: { ...desktopWidgetsConfig.search, ...(settings.desktopWidgets.search || {}) },
              shield: { ...desktopWidgetsConfig.shield, ...(settings.desktopWidgets.shield || {}) }
            };
          }
          if (settings.searchEngine) {
            const idx = ENGINES.findIndex(e => e.key === settings.searchEngine);
            if (idx >= 0) {
              currentEngineIndex = idx;
              if (engineName) engineName.textContent = ENGINES[currentEngineIndex].name;
              if (osWidgetEngineBtn) osWidgetEngineBtn.textContent = ENGINES[currentEngineIndex].name;
            }
          }
          const m = getDesktopGridMetrics();
          renderDesktopWidgets(m, true);
          renderDesktopApps(m);
        };

        const [activeTheme, shieldStats, initialSettings] = await Promise.all([
          window.oniAPI.getActiveTheme ? window.oniAPI.getActiveTheme() : null,
          window.oniAPI.getShieldStats ? window.oniAPI.getShieldStats() : null,
          window.oniAPI.getSettings ? window.oniAPI.getSettings() : null
        ]);
        if (initialSettings) {
          applySettingsState(initialSettings);
        }
        if (activeTheme) {
          const targetTheme = await resolveThemeForPage(activeTheme);
          applyNewTabTheme(targetTheme);
        }
        if (shieldStats) updateShieldTelemetry(shieldStats);

        if (window.oniAPI.onSettingsUpdated) {
          window.oniAPI.onSettingsUpdated((updatedSettings) => {
            applySettingsState(updatedSettings);
          });
        }

        if (window.oniAPI.onThemeChanged) {
          window.oniAPI.onThemeChanged(async ({ theme, settings }) => {
            if (settings) applySettingsState(settings);
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
        if (window.oniAPI.onDownloadProgress) {
          window.oniAPI.onDownloadProgress(() => {
            const win = document.getElementById('os-win-downloads');
            if (win && !win.classList.contains('hidden')) {
              renderOsDownloadsWindow();
            }
          });
        }
        if (window.oniAPI.onDownloadCompleted) {
          window.oniAPI.onDownloadCompleted(() => {
            const win = document.getElementById('os-win-downloads');
            if (win && !win.classList.contains('hidden')) {
              renderOsDownloadsWindow();
            }
          });
        }

        window.addEventListener('resize', () => {
          const m = getDesktopGridMetrics();
          renderDesktopWidgets(m, false);
          renderDesktopApps(m);
        });
      } catch (e) {
        // Fallback
      }
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();

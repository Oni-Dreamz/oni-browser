// Oni OS - Independent Popup Modals Environment Logic
(function () {
  'use strict';

  const spotlightWin = document.getElementById('os-win-spotlight');
  const spotlightForm = document.getElementById('os-spotlight-form');
  const spotlightInput = document.getElementById('os-spotlight-input');
  const spotlightResults = document.getElementById('os-spotlight-results');

  const settingsWin = document.getElementById('os-win-settings');
  const settingsBody = document.getElementById('os-win-settings-body');

  const historyWin = document.getElementById('os-win-history');
  const historyBody = document.getElementById('os-win-history-body');

  const downloadsWin = document.getElementById('os-win-downloads');
  const downloadsBody = document.getElementById('os-win-downloads-body');

  const addAppWin = document.getElementById('os-win-add-app');
  const addAppForm = document.getElementById('os-add-app-form');
  const appTitleInput = document.getElementById('os-app-title');
  const appUrlInput = document.getElementById('os-app-url');
  const appIconInput = document.getElementById('os-app-icon');

  const searchCtxMenu = document.getElementById('os-search-context-menu');

  let activeTabId = null;
  let activeTabUrl = '';
  let tabs = [];
  let currentWindowZ = 50;

  const ENGINES = [
    { key: 'google', name: 'Google', url: 'https://www.google.com/search?q=' },
    { key: 'duckduckgo', name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' },
    { key: 'brave', name: 'Brave', url: 'https://search.brave.com/search?q=' },
    { key: 'bing', name: 'Bing', url: 'https://www.bing.com/search?q=' }
  ];
  let currentEngineIndex = 0;

  function isAnyModalOpen() {
    const openModals = document.querySelectorAll('.os-window:not(.hidden)');
    return openModals.length > 0;
  }

  function reportModalsState() {
    const open = isAnyModalOpen();
    if (window.oniAPI && window.oniAPI.setModalsOpen) {
      window.oniAPI.setModalsOpen(open);
    }
  }

  function applyThemeVariables(theme) {
    if (!theme) return;
    const root = document.documentElement;
    const vars = (theme.chrome && theme.chrome.cssVariables) || theme.cssVariables || {};
    for (const [key, val] of Object.entries(vars)) {
      root.style.setProperty(key, val);
    }
  }

  function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
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

    closeOsWindow('os-win-spotlight');

    if (activeTabId && window.oniAPI && window.oniAPI.navigate) {
      window.oniAPI.navigate(destUrl, activeTabId);
    } else if (window.oniAPI && window.oniAPI.createTab) {
      window.oniAPI.createTab(destUrl);
    }
  }

  function updateSpotlightUrlFromActiveTab() {
    if (!spotlightInput || !spotlightWin || spotlightWin.classList.contains('hidden')) return;

    let currentUrl = '';
    const current = tabs.find(t => t.isActive || t.id === activeTabId);
    if (current && current.url) currentUrl = current.url;
    else if (activeTabUrl) currentUrl = activeTabUrl;

    const isHome = !currentUrl || currentUrl === 'oni://home' || currentUrl === 'oni://newtab' || currentUrl.startsWith('oni://');
    spotlightInput.value = isHome ? '' : currentUrl;
    renderSpotlightResults(spotlightInput.value.trim());

    setTimeout(() => {
      spotlightInput.focus();
    }, 60);
  }

  function renderSpotlightResults(query) {
    if (!spotlightResults) return;
    spotlightResults.innerHTML = '';
    const q = (query || '').trim();
    if (!q) {
      spotlightResults.innerHTML = '<div class="os-spotlight-empty-hint">Type a web address or search query and press Enter.</div>';
      return;
    }

    const engineName = ENGINES[currentEngineIndex].name;
    const isUrl = /^https?:\/\//i.test(q) || /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}/i.test(q);

    if (isUrl) {
      const navItem = document.createElement('div');
      navItem.className = 'os-spotlight-suggestion';
      navItem.innerHTML = `
        <div class="os-spotlight-suggestion-left">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
          <span>Navigate to: <strong>${q}</strong></span>
        </div>
        <span class="os-spotlight-suggestion-badge">Open URL</span>
      `;
      navItem.addEventListener('click', () => {
        executeSearchOrNavigate(q);
      });
      spotlightResults.appendChild(navItem);
    }

    const searchItem = document.createElement('div');
    searchItem.className = 'os-spotlight-suggestion';
    searchItem.innerHTML = `
      <div class="os-spotlight-suggestion-left">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <span>Search ${engineName} for: <strong>${q}</strong></span>
      </div>
      <span class="os-spotlight-suggestion-badge">Web Search</span>
    `;
    searchItem.addEventListener('click', () => {
      executeSearchOrNavigate(q);
    });
    spotlightResults.appendChild(searchItem);
  }

  // Floating Window Controls
  async function openOsWindow(winId, autofill = false) {
    const winEl = document.getElementById(winId);
    if (!winEl) return;

    currentWindowZ++;
    winEl.style.zIndex = currentWindowZ;
    winEl.classList.remove('hidden');

    reportModalsState();

    if (winId === 'os-win-spotlight') {
      try {
        if (window.oniAPI && window.oniAPI.getTabs) {
          const freshTabs = await window.oniAPI.getTabs();
          if (Array.isArray(freshTabs)) {
            tabs = freshTabs;
            const current = freshTabs.find(t => t.isActive);
            if (current) {
              activeTabId = current.id;
              activeTabUrl = current.url || '';
            }
          }
        }
      } catch (e) {}
      updateSpotlightUrlFromActiveTab();
    } else if (winId === 'os-win-settings') {
      await renderOsSettingsWindow();
    } else if (winId === 'os-win-history') {
      await renderOsHistoryWindow();
    } else if (winId === 'os-win-downloads') {
      await renderOsDownloadsWindow();
    } else if (winId === 'os-win-add-app') {
      editingApp = null;
      let currentUrl = '';
      try {
        if (window.oniAPI && window.oniAPI.getTabs) {
          const freshTabs = await window.oniAPI.getTabs();
          if (Array.isArray(freshTabs)) {
            tabs = freshTabs;
            const current = freshTabs.find(t => t.isActive);
            if (current) currentUrl = current.url || '';
          }
        }
      } catch (e) {}
      if (!currentUrl && activeTabId) {
        const current = tabs.find(t => t.id === activeTabId);
        if (current) currentUrl = current.url || '';
      }
      const isHome = !currentUrl || currentUrl === 'oni://home' || currentUrl === 'oni://newtab' || currentUrl.startsWith('oni://');
      await setupAddAppWindow(!isHome);
    }
  }

  let editingApp = null;

  function openEditAppWindow(app) {
    const winEl = document.getElementById('os-win-add-app');
    if (!winEl || !app) return;
    editingApp = app;
    currentWindowZ++;
    winEl.style.zIndex = currentWindowZ;
    winEl.classList.remove('hidden');
    reportModalsState();

    if (appTitleInput) appTitleInput.value = app.title || '';
    if (appUrlInput) appUrlInput.value = app.url || '';
    if (appIconInput) appIconInput.value = app.icon || app.favicon || '';
    if (appTitleInput) setTimeout(() => appTitleInput.focus(), 60);
  }

  function closeOsWindow(winId) {
    const winEl = document.getElementById(winId);
    if (winEl) {
      winEl.classList.add('hidden');
    }
    if (winId === 'os-win-add-app') {
      editingApp = null;
    }
    reportModalsState();
  }

  function closeAllOsWindows() {
    let closedAny = false;
    document.querySelectorAll('.os-window:not(.hidden)').forEach(win => {
      win.classList.add('hidden');
      closedAny = true;
    });
    editingApp = null;
    if (closedAny) {
      reportModalsState();
    }
  }

  async function setupAddAppWindow(autofill = false) {
    if (appTitleInput) appTitleInput.value = '';
    if (appUrlInput) appUrlInput.value = '';
    if (appIconInput) appIconInput.value = '';

    if (!autofill) {
      if (appTitleInput) setTimeout(() => appTitleInput.focus(), 60);
      return;
    }

    let targetUrl = '';
    let targetTitle = '';
    let targetIcon = '';

    try {
      if (window.oniAPI && window.oniAPI.getTabs) {
        const freshTabs = await window.oniAPI.getTabs();
        if (Array.isArray(freshTabs)) {
          tabs = freshTabs;
          const current = freshTabs.find(t => t.isActive);
          if (current) {
            targetUrl = current.url || '';
            targetTitle = current.title || '';
            targetIcon = current.favicon || '';
          }
        }
      }
    } catch (e) {}

    if (!targetUrl && activeTabId) {
      const current = tabs.find(t => t.id === activeTabId);
      if (current) {
        targetUrl = current.url || '';
        targetTitle = current.title || '';
        targetIcon = current.favicon || '';
      }
    }

    if (targetUrl && !targetUrl.startsWith('oni://')) {
      if (appTitleInput) appTitleInput.value = targetTitle || '';
      if (appUrlInput) appUrlInput.value = targetUrl;
      if (appIconInput) appIconInput.value = targetIcon || '';
      if (appTitleInput) setTimeout(() => appTitleInput.focus(), 60);
    } else {
      if (appTitleInput) setTimeout(() => appTitleInput.focus(), 60);
    }
  }

  // History Window View
  async function renderOsHistoryWindow() {
    if (!historyBody || !window.oniAPI) return;
    const history = await window.oniAPI.getHistory();
    if (!history || history.length === 0) {
      historyBody.innerHTML = '<div style="color:var(--text-muted); padding:18px; text-align:center;">No browsing history recorded yet.</div>';
      return;
    }

    let html = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.08);">
        <span style="font-size:11px; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.8px;">Recent History</span>
        <button id="os-hist-btn-clear" class="os-btn-ghost" style="color:#ef4444; border-color:rgba(239,68,68,0.3); font-size:11px; padding:3px 9px;">Clear All</button>
      </div>
      <div style="display:flex; flex-direction:column; gap:6px;">
    `;

    html += history.slice(0, 35).map(item => `
      <div class="os-list-row os-hist-row" data-url="${item.url}">
        <div style="overflow:hidden; max-width:400px;">
          <div style="font-weight:600; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.title || 'Untitled'}</div>
          <div style="font-size:10.5px; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.url}</div>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <button class="os-btn-ghost os-hist-del" data-id="${item.id}" style="padding:2px 7px; font-size:10px;">✕</button>
          <span style="color:var(--accent-cyan); font-size:11px; font-weight:600;">Open ↗</span>
        </div>
      </div>
    `).join('');

    html += '</div>';
    historyBody.innerHTML = html;

    historyBody.querySelectorAll('.os-hist-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.os-hist-del')) return;
        const url = row.dataset.url;
        if (url) {
          closeOsWindow('os-win-history');
          if (activeTabId && window.oniAPI && window.oniAPI.navigate) {
            window.oniAPI.navigate(url, activeTabId);
          } else if (window.oniAPI && window.oniAPI.createTab) {
            window.oniAPI.createTab(url);
          }
        }
      });
    });

    historyBody.querySelectorAll('.os-hist-del').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        if (id && window.oniAPI && window.oniAPI.removeHistory) {
          await window.oniAPI.removeHistory(id);
          renderOsHistoryWindow();
        }
      });
    });

    const clearBtn = document.getElementById('os-hist-btn-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', async () => {
        if (window.oniAPI && window.oniAPI.clearHistory) {
          await window.oniAPI.clearHistory();
          renderOsHistoryWindow();
        }
      });
    }
  }

  // Downloads Window View
  async function renderOsDownloadsWindow() {
    if (!downloadsBody || !window.oniAPI) return;
    const downloads = await window.oniAPI.getDownloads();

    if (!downloads || downloads.length === 0) {
      downloadsBody.innerHTML = `
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
        <button id="os-dl-btn-clear" class="os-btn-ghost" style="color:#ef4444; border-color:rgba(239,68,68,0.3); font-size:11px; padding:3px 9px;">Clear All</button>
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
          <div class="os-dl-active-card" id="os-dl-card-${item.id}">
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

      html += `<div style="display:flex; flex-direction:column; gap:6px;">`;

      recentList.forEach(item => {
        const isCompleted = item.state === 'completed';
        const isCancelled = item.state === 'cancelled' || item.state === 'interrupted';
        const badgeClass = isCompleted ? 'completed' : (isCancelled ? 'cancelled' : 'progressing');
        const badgeText = isCompleted ? 'Completed' : (isCancelled ? 'Cancelled' : item.state);
        const sizeStr = item.totalBytes > 0 ? formatBytes(item.totalBytes) : formatBytes(item.receivedBytes);
        const dateStr = item.timestamp ? new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '';

        html += `
          <div class="os-list-row os-dl-row" style="cursor:default;">
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

    downloadsBody.innerHTML = html;

    const clearDlBtn = document.getElementById('os-dl-btn-clear');
    if (clearDlBtn) {
      clearDlBtn.addEventListener('click', async () => {
        if (window.oniAPI && window.oniAPI.clearDownloads) {
          await window.oniAPI.clearDownloads();
          renderOsDownloadsWindow();
        }
      });
    }

    downloadsBody.querySelectorAll('.os-dl-action-open').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const p = btn.dataset.path;
        if (p && window.oniAPI && window.oniAPI.openDownloadFile) {
          window.oniAPI.openDownloadFile(p);
        }
      });
    });

    downloadsBody.querySelectorAll('.os-dl-action-folder').forEach(btn => {
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

  // Settings Window View
  async function renderOsSettingsWindow() {
    if (!settingsBody || !window.oniAPI) return;
    const [themes, activeTheme, settings, shieldStats, accentColors] = await Promise.all([
      window.oniAPI.getThemes(),
      window.oniAPI.getActiveTheme(),
      window.oniAPI.getSettings(),
      window.oniAPI.getShieldStats ? window.oniAPI.getShieldStats() : { enabled: true, totalBlocked: 0 },
      window.oniAPI.getAccentColors ? window.oniAPI.getAccentColors() : []
    ]);

    if (activeTheme) applyThemeVariables(activeTheme);

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

    const widgetsCfg = (settings && settings.desktopWidgets) || {};
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

    const html = `
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
              <div class="os-settings-section-desc">Select which desktop widgets are displayed on your Oni OS home page. Drag widgets on the home page to rearrange them on the grid.</div>
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

    settingsBody.innerHTML = html;

    // Sidebar navigation clicks
    settingsBody.querySelectorAll('.os-settings-nav-item').forEach(navBtn => {
      navBtn.addEventListener('click', () => {
        const targetSection = navBtn.dataset.section;
        if (!targetSection) return;
        activeSettingsSection = targetSection;

        settingsBody.querySelectorAll('.os-settings-nav-item').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.section === targetSection);
        });
        settingsBody.querySelectorAll('.os-settings-section').forEach(panel => {
          panel.classList.toggle('hidden', panel.dataset.sectionPanel !== targetSection);
        });
      });
    });

    settingsBody.querySelectorAll('.os-theme-apply-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const tid = btn.dataset.id;
        if (tid && window.oniAPI && window.oniAPI.applyTheme) {
          await window.oniAPI.applyTheme(tid);
          renderOsSettingsWindow();
        }
      });
    });

    // Accent Color selection
    settingsBody.querySelectorAll('.os-accent-option').forEach(btn => {
      btn.addEventListener('click', async () => {
        const colorId = btn.dataset.accentId;
        if (colorId && window.oniAPI && window.oniAPI.setAccentColor) {
          const res = await window.oniAPI.setAccentColor(colorId);
          if (res && res.theme) applyThemeVariables(res.theme);
          renderOsSettingsWindow();
        }
      });
    });

    // Wallpaper selection
    settingsBody.querySelectorAll('.os-wallpaper-card').forEach(card => {
      card.addEventListener('click', async (e) => {
        if (e.target.closest('.os-wallpaper-remove')) return;
        const wpUrl = card.dataset.wpUrl;
        if (wpUrl && window.oniAPI && window.oniAPI.setWallpaper) {
          await window.oniAPI.setWallpaper(wpUrl);
          renderOsSettingsWindow();
        }
      });
    });

    // Remove custom wallpaper
    settingsBody.querySelectorAll('.os-wallpaper-remove').forEach(rmBtn => {
      rmBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const idOrUrl = rmBtn.dataset.removeWp;
        if (idOrUrl && window.oniAPI && window.oniAPI.removeWallpaper) {
          await window.oniAPI.removeWallpaper(idOrUrl);
          renderOsSettingsWindow();
        }
      });
    });

    // Import new custom wallpaper
    const importWpBtn = document.getElementById('os-btn-import-wallpaper');
    if (importWpBtn) {
      importWpBtn.addEventListener('click', async () => {
        if (window.oniAPI && window.oniAPI.importWallpaper) {
          const res = await window.oniAPI.importWallpaper();
          if (res && !res.canceled) {
            renderOsSettingsWindow();
          }
        }
      });
    }

    // Widget Add to Home / Remove actions
    settingsBody.querySelectorAll('.os-widget-toggle-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const wid = btn.dataset.widgetId;
        if (wid && window.oniAPI && window.oniAPI.updateSettings) {
          const cur = (settings && settings.desktopWidgets && settings.desktopWidgets[wid]) || { enabled: true };
          const nextEnabled = cur.enabled === false;
          await window.oniAPI.updateSettings({
            desktopWidgets: {
              ...widgetsCfg,
              [wid]: { enabled: nextEnabled, gridCol: null, gridRow: null }
            }
          });
          renderOsSettingsWindow();
        }
      });
    });

    settingsBody.querySelectorAll('.os-engine-choice').forEach(btn => {
      btn.addEventListener('click', async () => {
        const k = btn.dataset.key;
        if (k && window.oniAPI && window.oniAPI.updateSettings) {
          await window.oniAPI.updateSettings({ searchEngine: k });
          renderOsSettingsWindow();
        }
      });
    });

    const shieldToggle = document.getElementById('os-set-toggle-shield');
    if (shieldToggle) {
      shieldToggle.addEventListener('click', async () => {
        if (window.oniAPI && window.oniAPI.toggleShield) {
          const stats = await window.oniAPI.getShieldStats();
          await window.oniAPI.toggleShield(!stats.enabled);
          renderOsSettingsWindow();
        }
      });
    }

    const clearDataBtn = document.getElementById('os-set-btn-clear-data');
    if (clearDataBtn) {
      clearDataBtn.addEventListener('click', async () => {
        if (confirm('Clear all browsing history, cache, and downloads?')) {
          if (window.oniAPI && window.oniAPI.clearBrowsingData) {
            await window.oniAPI.clearBrowsingData({ history: true, cache: true, downloads: true });
            renderOsSettingsWindow();
          }
        }
      });
    }
  }

  // Window Dragging Support
  function setupWindowDragging() {
    let draggedWin = null;
    let dragStartX = 0;
    let dragStartY = 0;
    let initialWinLeft = 0;
    let initialWinTop = 0;

    document.querySelectorAll('[data-drag-window]').forEach(bar => {
      bar.addEventListener('mousedown', (e) => {
        if (e.target.closest('.os-window-controls')) return;
        const targetId = bar.dataset.dragWindow;
        draggedWin = document.getElementById(targetId);
        if (!draggedWin) return;

        currentWindowZ++;
        draggedWin.style.zIndex = currentWindowZ;

        const rect = draggedWin.getBoundingClientRect();
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        initialWinLeft = rect.left;
        initialWinTop = rect.top;

        draggedWin.style.transform = 'none';
        draggedWin.style.left = `${initialWinLeft}px`;
        draggedWin.style.top = `${initialWinTop}px`;

        const onMouseMove = (ev) => {
          if (!draggedWin) return;
          const dx = ev.clientX - dragStartX;
          const dy = ev.clientY - dragStartY;
          draggedWin.style.left = `${Math.max(10, Math.min(window.innerWidth - draggedWin.offsetWidth - 10, initialWinLeft + dx))}px`;
          draggedWin.style.top = `${Math.max(10, Math.min(window.innerHeight - draggedWin.offsetHeight - 10, initialWinTop + dy))}px`;
        };

        const onMouseUp = () => {
          draggedWin = null;
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      });
    });

    document.querySelectorAll('[data-close-window]').forEach(btn => {
      btn.addEventListener('click', () => {
        closeOsWindow(btn.dataset.closeWindow);
      });
    });
  }

  function hideSearchContextMenu() {
    if (searchCtxMenu) searchCtxMenu.classList.add('hidden');
  }

  function showSearchContextMenu(clientX, clientY) {
    if (!searchCtxMenu) return;
    hideSearchContextMenu();
    const x = Math.min(window.innerWidth - 180, Math.max(8, clientX));
    const y = Math.min(window.innerHeight - 190, Math.max(8, clientY));
    searchCtxMenu.style.left = `${x}px`;
    searchCtxMenu.style.top = `${y}px`;
    searchCtxMenu.classList.remove('hidden');
  }

  function setupEventListeners() {
    setupWindowDragging();

    if (spotlightForm) {
      spotlightForm.addEventListener('submit', (e) => {
        e.preventDefault();
        executeSearchOrNavigate(spotlightInput.value);
      });
    }

    if (spotlightInput) {
      spotlightInput.addEventListener('input', () => {
        renderSpotlightResults(spotlightInput.value);
      });

      spotlightInput.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showSearchContextMenu(e.clientX, e.clientY);
      });
    }

    // Search context menu actions
    document.getElementById('ctx-search-cut')?.addEventListener('click', (e) => {
      e.preventDefault();
      hideSearchContextMenu();
      if (!spotlightInput) return;
      const start = spotlightInput.selectionStart;
      const end = spotlightInput.selectionEnd;
      const sel = spotlightInput.value.substring(start, end);
      if (sel) {
        if (window.oniAPI && window.oniAPI.writeClipboardText) {
          window.oniAPI.writeClipboardText(sel);
        }
        spotlightInput.value = spotlightInput.value.substring(0, start) + spotlightInput.value.substring(end);
        spotlightInput.setSelectionRange(start, start);
        spotlightInput.focus();
        renderSpotlightResults(spotlightInput.value);
      }
    });

    document.getElementById('ctx-search-copy')?.addEventListener('click', (e) => {
      e.preventDefault();
      hideSearchContextMenu();
      if (!spotlightInput) return;
      const sel = spotlightInput.value.substring(spotlightInput.selectionStart, spotlightInput.selectionEnd);
      if (sel && window.oniAPI && window.oniAPI.writeClipboardText) {
        window.oniAPI.writeClipboardText(sel);
      }
    });

    document.getElementById('ctx-search-paste')?.addEventListener('click', async (e) => {
      e.preventDefault();
      hideSearchContextMenu();
      if (!spotlightInput) return;
      let text = '';
      if (window.oniAPI && window.oniAPI.readClipboardText) {
        text = await window.oniAPI.readClipboardText();
      }
      if (text) {
        const start = spotlightInput.selectionStart;
        const end = spotlightInput.selectionEnd;
        spotlightInput.value = spotlightInput.value.substring(0, start) + text + spotlightInput.value.substring(end);
        const newCursor = start + text.length;
        spotlightInput.setSelectionRange(newCursor, newCursor);
        spotlightInput.focus();
        renderSpotlightResults(spotlightInput.value);
      }
    });

    document.getElementById('ctx-search-select-all')?.addEventListener('click', (e) => {
      e.preventDefault();
      hideSearchContextMenu();
      if (spotlightInput) {
        spotlightInput.select();
        spotlightInput.focus();
      }
    });

    document.getElementById('ctx-search-clear')?.addEventListener('click', (e) => {
      e.preventDefault();
      hideSearchContextMenu();
      if (spotlightInput) {
        spotlightInput.value = '';
        spotlightInput.focus();
        renderSpotlightResults('');
      }
    });

    // Add App Form submission
    if (addAppForm) {
      addAppForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = (appTitleInput.value || '').trim();
        const rawUrl = (appUrlInput.value || '').trim();
        const icon = (appIconInput.value || '').trim();

        if (!title || !rawUrl) return;

        let cleanUrl = rawUrl;
        if (!/^https?:\/\//i.test(cleanUrl) && !/^file:\/\//i.test(cleanUrl)) {
          cleanUrl = 'https://' + cleanUrl;
        }

        const resolvedIcon = icon || `https://www.google.com/s2/favicons?domain=${cleanUrl}&sz=64`;

        if (editingApp && window.oniAPI && window.oniAPI.getBookmarks && window.oniAPI.setBookmarks) {
          const bms = await window.oniAPI.getBookmarks();
          if (Array.isArray(bms)) {
            const idx = bms.findIndex(b => (editingApp.id && b.id === editingApp.id) || b.url === editingApp.url);
            if (idx >= 0) {
              bms[idx] = {
                ...bms[idx],
                title,
                url: cleanUrl,
                icon: resolvedIcon,
                favicon: resolvedIcon
              };
              await window.oniAPI.setBookmarks(bms);
            } else if (window.oniAPI.addBookmark) {
              await window.oniAPI.addBookmark({
                id: 'pin_' + Date.now(),
                title,
                url: cleanUrl,
                icon: resolvedIcon,
                favicon: resolvedIcon
              });
            }
          }
          editingApp = null;
        } else if (window.oniAPI && window.oniAPI.addBookmark) {
          const newApp = {
            id: 'pin_' + Date.now(),
            title,
            url: cleanUrl,
            icon: resolvedIcon,
            favicon: resolvedIcon
          };
          await window.oniAPI.addBookmark(newApp);
        }

        closeOsWindow('os-win-add-app');
      });
    }

    // Outside click & wheel handling
    document.addEventListener('pointerdown', (e) => {
      if (!e.target.closest('#os-search-context-menu')) {
        hideSearchContextMenu();
      }
      if (!isAnyModalOpen()) return;

      const insideModal = e.target.closest('.os-window:not(.hidden), .os-context-menu:not(.hidden)');
      if (!insideModal) {
        closeAllOsWindows();

        // Forward click to underlying active tab
        if (window.oniAPI && window.oniAPI.forwardInputEvent) {
          const btn = e.button === 2 ? 'right' : (e.button === 1 ? 'middle' : 'left');
          const clientX = Math.round(e.clientX);
          const clientY = Math.round(e.clientY);
          window.oniAPI.forwardInputEvent({
            type: 'mouseDown',
            x: clientX,
            y: clientY,
            button: btn,
            clickCount: 1
          });
          setTimeout(() => {
            window.oniAPI.forwardInputEvent({
              type: 'mouseUp',
              x: clientX,
              y: clientY,
              button: btn,
              clickCount: 1
            });
          }, 35);
        }
      }
    });

    document.addEventListener('wheel', (e) => {
      if (!isAnyModalOpen()) return;
      const insideModal = e.target.closest('.os-window:not(.hidden), .os-context-menu:not(.hidden)');
      if (!insideModal && window.oniAPI && window.oniAPI.forwardInputEvent) {
        window.oniAPI.forwardInputEvent({
          type: 'mouseWheel',
          x: Math.round(e.clientX),
          y: Math.round(e.clientY),
          deltaX: e.deltaX,
          deltaY: e.deltaY,
          canScroll: true
        });
      }
    }, { passive: true });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (searchCtxMenu && !searchCtxMenu.classList.contains('hidden')) {
          hideSearchContextMenu();
        } else if (isAnyModalOpen()) {
          const openWindows = Array.from(document.querySelectorAll('.os-window:not(.hidden)'));
          if (openWindows.length > 0) {
            closeOsWindow(openWindows[openWindows.length - 1].id);
          }
        }
      }
    });
  }

  async function init() {
    setupEventListeners();

    if (window.oniAPI) {
      try {
        if (window.oniAPI.getTabs) {
          const tList = await window.oniAPI.getTabs();
          if (Array.isArray(tList)) {
            tabs = tList;
            const current = tList.find(t => t.isActive);
            if (current) {
              activeTabId = current.id;
              activeTabUrl = current.url || '';
            }
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
              activeTabUrl = tab.url || '';
              tabs.forEach(t => { t.isActive = (t.id === tab.id); });
              updateSpotlightUrlFromActiveTab();
            }
          });
        }

        if (window.oniAPI.onTabSwitched) {
          window.oniAPI.onTabSwitched((tabId) => {
            const id = (tabId && typeof tabId === 'object') ? tabId.id : tabId;
            activeTabId = id;
            tabs.forEach(t => { t.isActive = (t.id === id); });
            const current = tabs.find(t => t.id === id);
            if (current) {
              activeTabUrl = current.url || '';
            }
            updateSpotlightUrlFromActiveTab();
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
              activeTabUrl = tabData.url || '';
              tabs.forEach(t => { t.isActive = (t.id === tabData.id); });
              updateSpotlightUrlFromActiveTab();
            } else if (tabData.id === activeTabId) {
              activeTabUrl = tabData.url || '';
              updateSpotlightUrlFromActiveTab();
            }
          });
        }

        if (window.oniAPI.onTabClosed) {
          window.oniAPI.onTabClosed((tabId) => {
            const id = (tabId && typeof tabId === 'object') ? tabId.id : tabId;
            tabs = tabs.filter(t => t.id !== id);
          });
        }

        if (window.oniAPI.onOsAction) {
          window.oniAPI.onOsAction((action) => {
            if (!action) return;
            const actionType = (action && typeof action === 'object') ? action.type : action;
            if (actionType === 'search' || actionType === 'spotlight') {
              openOsWindow('os-win-spotlight');
            } else if (actionType === 'history') {
              openOsWindow('os-win-history');
            } else if (actionType === 'downloads') {
              openOsWindow('os-win-downloads');
            } else if (actionType === 'settings') {
              openOsWindow('os-win-settings');
            } else if (actionType === 'pin-app' || actionType === 'add-app') {
              openOsWindow('os-win-add-app', true);
            } else if (actionType === 'edit-app' && action.app) {
              openEditAppWindow(action.app);
            } else if (actionType === 'close-modals' || actionType === 'home') {
              closeAllOsWindows();
            }
          });
        }

        if (window.oniAPI.onDownloadProgress) {
          window.oniAPI.onDownloadProgress(() => {
            if (downloadsWin && !downloadsWin.classList.contains('hidden')) {
              renderOsDownloadsWindow();
            }
          });
        }

        if (window.oniAPI.onDownloadCompleted) {
          window.oniAPI.onDownloadCompleted(() => {
            if (downloadsWin && !downloadsWin.classList.contains('hidden')) {
              renderOsDownloadsWindow();
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
      } catch (err) {}
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();

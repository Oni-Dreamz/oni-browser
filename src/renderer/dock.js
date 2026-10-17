// Oni OS - Always-on-Top Bottom Dock Tabs Manager & Persistent Popup Modals Layer
(function () {
  'use strict';

  const dockEl = document.getElementById('os-dock');
  const dockBarWrap = document.getElementById('dock-bar-wrap');
  const dockTabsEl = document.getElementById('os-dock-tabs');
  const dockSepEl = document.getElementById('dock-sep');
  const btnStart = document.getElementById('dock-btn-start');

  const startMenuEl = document.getElementById('os-start-menu');
  const startAppsGrid = document.getElementById('os-start-apps-grid');
  const startBtnNewTab = document.getElementById('os-start-btn-newtab');
  const startBtnPin = document.getElementById('os-start-btn-pin');

  // Popup Modals DOM
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

  let tabs = [];
  let activeTabId = null;
  let isStartMenuOpen = false;
  let currentSearchEngine = 'google';

  const ENGINES = {
    google: 'https://www.google.com/search?q=',
    duckduckgo: 'https://duckduckgo.com/?q=',
    brave: 'https://search.brave.com/search?q=',
    bing: 'https://www.bing.com/search?q='
  };

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

  function isAnyModalOpen() {
    const openModals = document.querySelectorAll('.os-window:not(.hidden)');
    return openModals.length > 0;
  }

  const DOCK_BAR_HEIGHT = 100;

  function reportBounds() {
    if (!dockEl || !window.oniAPI || !window.oniAPI.setDockBounds) return;
    requestAnimationFrame(() => {
      const isFullScreen = isStartMenuOpen || isAnyModalOpen();
      const dockWidth = dockEl.offsetWidth || 70;
      const width = dockWidth + 160; // 80px drop shadow glow margin on each side
      const height = DOCK_BAR_HEIGHT;
      window.oniAPI.setDockBounds({
        width,
        height,
        fullScreen: isFullScreen
      });
    });
  }

  function openStartMenu() {
    if (!startMenuEl) return;
    isStartMenuOpen = true;
    hideTooltip();
    startMenuEl.classList.remove('hidden');
    reportBounds();
  }

  function closeStartMenu() {
    if (!startMenuEl || !isStartMenuOpen) return;
    isStartMenuOpen = false;
    startMenuEl.classList.add('hidden');
    reportBounds();
  }

  function toggleStartMenu() {
    if (isStartMenuOpen) {
      closeStartMenu();
    } else {
      openStartMenu();
    }
  }

  // Window Management for Draggable Floating Modals
  async function openOsWindow(winId, options = {}) {
    const winEl = document.getElementById(winId);
    if (!winEl) return;

    // Bring clicked/opened window to the front
    document.querySelectorAll('.os-window').forEach(w => {
      w.style.zIndex = '32';
    });
    winEl.style.zIndex = '38';
    winEl.classList.remove('hidden');
    reportBounds();

    if (winId === 'os-win-spotlight') {
      if (spotlightInput) {
        spotlightInput.value = '';
        renderSpotlightResults('');
        setTimeout(() => spotlightInput.focus(), 50);
      }
    } else if (winId === 'os-win-history') {
      await renderOsHistoryWindow();
    } else if (winId === 'os-win-downloads') {
      if (window.oniAPI && window.oniAPI.hideDownloadToast) window.oniAPI.hideDownloadToast();
      await renderOsDownloadsWindow();
    } else if (winId === 'os-win-settings') {
      await renderOsSettingsWindow();
    } else if (winId === 'os-win-add-app') {
      await setupAddAppWindow(options.autofillActiveTab);
    }
  }

  function closeOsWindow(winId) {
    const winEl = document.getElementById(winId);
    if (winEl) {
      winEl.classList.add('hidden');
    }
    reportBounds();
  }

  async function setupAddAppWindow(autofill = true) {
    if (!autofill) return;

    let targetUrl = '';
    let targetTitle = '';
    let targetIcon = '';

    // Retrieve fresh active tab
    try {
      if (window.oniAPI && window.oniAPI.getTabs) {
        const freshTabs = await window.oniAPI.getTabs();
        if (Array.isArray(freshTabs)) {
          tabs = freshTabs;
          const current = freshTabs.find(t => t.isActive);
          if (current) {
            activeTabId = current.id;
            targetUrl = current.url || '';
            targetTitle = current.title || '';
            targetIcon = current.favicon || '';
          }
        }
      }
    } catch (e) {
      // ignore
    }

    if (!targetUrl && activeTabId) {
      const current = tabs.find(t => t.id === activeTabId);
      if (current) {
        targetUrl = current.url || '';
        targetTitle = current.title || '';
        targetIcon = current.favicon || '';
      }
    }

    // Auto-fill active webpage URL if it's an external web page
    if (appUrlInput) {
      if (targetUrl && !targetUrl.startsWith('oni://')) {
        appUrlInput.value = targetUrl;
      } else {
        appUrlInput.value = '';
      }
    }

    if (appTitleInput) {
      if (targetTitle && targetTitle !== 'Loading...' && targetTitle !== 'Untitled' && !targetUrl.startsWith('oni://')) {
        appTitleInput.value = targetTitle;
      } else {
        appTitleInput.value = '';
      }
    }

    if (appIconInput) {
      if (targetIcon && !targetIcon.startsWith('data:') && !targetIcon.includes('app-icon.png')) {
        appIconInput.value = targetIcon;
      } else {
        appIconInput.value = '';
      }
    }

    if (appTitleInput && !appTitleInput.value) {
      setTimeout(() => appTitleInput.focus(), 60);
    } else if (appUrlInput) {
      setTimeout(() => appUrlInput.focus(), 60);
    }
  }

  function renderStartMenuApps() {
    if (!startAppsGrid) return;
    startAppsGrid.innerHTML = '';
    pinnedApps.forEach(app => {
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
        closeStartMenu();
        if (window.oniAPI && window.oniAPI.createTab) {
          window.oniAPI.createTab(app.url);
        }
      });

      startAppsGrid.appendChild(item);
    });
  }

  function showTooltip(text, itemEl) {
    if (isStartMenuOpen || isAnyModalOpen() || !itemEl) return;
    const itemRect = itemEl.getBoundingClientRect();
    if (window.oniAPI && window.oniAPI.showDockTooltip) {
      window.oniAPI.showDockTooltip({
        text: text || 'Tab',
        relX: itemRect.left + itemRect.width / 2,
        relY: itemRect.top
      });
    }
  }

  function hideTooltip() {
    if (window.oniAPI && window.oniAPI.hideDockTooltip) {
      window.oniAPI.hideDockTooltip();
    }
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

    // Filter out the persistent home page (oni://home) from the dock tab bar
    const visibleTabs = tabs.filter(tab => !isDesktopHomeTab(tab));

    if (dockSepEl) {
      dockSepEl.classList.toggle('hidden', visibleTabs.length === 0);
    }
    dockTabsEl.classList.toggle('hidden', visibleTabs.length === 0);

    visibleTabs.forEach(tab => {
      const isActive = tab.id === activeTabId;
      const btn = document.createElement('div');
      btn.className = `os-dock-item tab-dock-item ${isActive ? 'active' : ''}`;
      btn.dataset.id = tab.id;

      if (tab.isLoading) {
        const spinner = document.createElement('div');
        spinner.className = 'dock-tab-spinner';
        btn.appendChild(spinner);
      } else {
        const img = document.createElement('img');
        img.className = 'dock-tab-favicon';
        img.src = resolveTabIcon(tab);
        img.alt = tab.title || 'Tab';
        img.onerror = () => {
          img.src = '../../assets/app-icon.png';
        };
        btn.appendChild(img);
      }

      // Close button on hover
      const closeBtn = document.createElement('button');
      closeBtn.className = 'dock-tab-close';
      closeBtn.type = 'button';
      closeBtn.textContent = '✕';
      closeBtn.title = 'Close Tab (Ctrl+W)';
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        hideTooltip();
        closeStartMenu();
        if (window.oniAPI) window.oniAPI.closeTab(tab.id);
      });
      btn.appendChild(closeBtn);

      // Switch tab on click (Modals remain retained over active tab change!)
      btn.addEventListener('click', () => {
        closeStartMenu();
        if (window.oniAPI) window.oniAPI.switchTab(tab.id);
      });

      // Middle click to close
      btn.addEventListener('auxclick', (e) => {
        if (e.button === 1) {
          e.preventDefault();
          hideTooltip();
          closeStartMenu();
          if (window.oniAPI) window.oniAPI.closeTab(tab.id);
        }
      });

      // Tooltip on hover
      btn.addEventListener('mouseenter', () => {
        showTooltip(tab.title || 'Tab', btn);
      });
      btn.addEventListener('mouseleave', () => {
        hideTooltip();
      });

      dockTabsEl.appendChild(btn);
    });

    reportBounds();
  }

  // Search Results Rendering inside Search Popup Modal
  function renderSpotlightResults(filterText) {
    if (!spotlightResults) return;
    const term = (filterText || '').toLowerCase().trim();
    spotlightResults.innerHTML = '';

    const matched = pinnedApps.filter(app => {
      if (!term) return true;
      return (app.title || '').toLowerCase().includes(term) || (app.url || '').toLowerCase().includes(term);
    });

    if (matched.length === 0) {
      spotlightResults.innerHTML = '<div style="color:var(--text-muted); font-size:12px; grid-column:1/-1; padding:8px;">No matching apps found. Press Launch to search the web.</div>';
      return;
    }

    matched.slice(0, 16).forEach(app => {
      const item = document.createElement('div');
      item.className = 'os-spotlight-item';

      const img = document.createElement('img');
      img.src = app.icon || '../../assets/app-icon.png';
      img.onerror = () => { img.src = '../../assets/app-icon.png'; };

      const span = document.createElement('span');
      span.textContent = app.title;
      span.style.overflow = 'hidden';
      span.style.textOverflow = 'ellipsis';
      span.style.whiteSpace = 'nowrap';

      item.appendChild(img);
      item.appendChild(span);

      item.addEventListener('click', () => {
        if (activeTabId && window.oniAPI && window.oniAPI.navigate) {
          window.oniAPI.navigate(app.url, activeTabId);
        } else if (window.oniAPI && window.oniAPI.createTab) {
          window.oniAPI.createTab(app.url);
        }
      });

      spotlightResults.appendChild(item);
    });
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
      const engineUrl = ENGINES[currentSearchEngine] || ENGINES.google;
      destUrl = `${engineUrl}${encodeURIComponent(query)}`;
    }

    // Retain search modal through webpage change!
    if (activeTabId && window.oniAPI && window.oniAPI.navigate) {
      window.oniAPI.navigate(destUrl, activeTabId);
    } else if (window.oniAPI && window.oniAPI.createTab) {
      window.oniAPI.createTab(destUrl);
    }
  }

  // History Popup Modal View
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

  function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  }

  // Downloads Popup Modal View
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

    // Active Downloads Section
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

    // Recent / Finished Downloads Section
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



  // Settings & Themes Popup Modal View
  async function renderOsSettingsWindow() {
    if (!settingsBody || !window.oniAPI) return;
    const [themes, activeTheme, settings, shieldStats] = await Promise.all([
      window.oniAPI.getThemes ? window.oniAPI.getThemes() : [],
      window.oniAPI.getActiveTheme ? window.oniAPI.getActiveTheme() : null,
      window.oniAPI.getSettings ? window.oniAPI.getSettings() : {},
      window.oniAPI.getShieldStats ? window.oniAPI.getShieldStats() : { blockedTotal: 0 }
    ]);

    if (settings && settings.searchEngine) {
      currentSearchEngine = settings.searchEngine;
    }

    const sortedThemes = [...(themes || [])].sort((a, b) => {
      if (a.id === 'oni-os') return -1;
      if (b.id === 'oni-os') return 1;
      if (a.id === 'classic') return -1;
      if (b.id === 'classic') return 1;
      return 0;
    });

    settingsBody.innerHTML = `
      <div style="margin-bottom:16px;">
        <div class="os-field-label">Active Operating Theme Construct</div>
        <div style="display:flex; flex-direction:column; gap:8px; margin-top:6px;">
          ${sortedThemes.map(t => `
            <div class="os-list-row os-theme-pick" data-theme-id="${t.id}" style="border-color:${activeTheme && t.id === activeTheme.id ? 'var(--accent-green)' : 'rgba(255,255,255,0.08)'};">
              <div>
                <div style="font-weight:700; color:#fff;">${t.name} ${activeTheme && t.id === activeTheme.id ? '<span style="color:var(--accent-green);font-size:10px;margin-left:6px;">● ACTIVE</span>' : ''}</div>
                <div style="font-size:11px; color:var(--text-muted);">${t.description || ''}</div>
              </div>
              <button class="os-btn-ghost" style="white-space:nowrap;">Apply</button>
            </div>
          `).join('')}
        </div>
      </div>

      <div style="margin-bottom:14px; padding-top:12px; border-top:1px solid rgba(255,255,255,0.08);">
        <div class="os-field-label">Default Search Engine</div>
        <select id="os-select-engine" class="os-field-input" style="cursor:pointer; margin-top:6px;">
          <option value="google" ${currentSearchEngine === 'google' ? 'selected' : ''}>Google</option>
          <option value="duckduckgo" ${currentSearchEngine === 'duckduckgo' ? 'selected' : ''}>DuckDuckGo</option>
          <option value="brave" ${currentSearchEngine === 'brave' ? 'selected' : ''}>Brave</option>
          <option value="bing" ${currentSearchEngine === 'bing' ? 'selected' : ''}>Bing</option>
        </select>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; padding-top:12px; border-top:1px solid rgba(255,255,255,0.08);">
        <div>
          <div style="font-weight:600; font-size:12px; color:#fff;">Oni Shield Protection</div>
          <div style="font-size:11px; color:var(--text-muted);">Blocked ${shieldStats.blockedTotal || 0} telemetry scripts &amp; ads</div>
        </div>
        <button class="os-btn-ghost" id="os-btn-toggle-shield" style="white-space:nowrap;">
          ${settings.adBlockEnabled !== false ? 'Shield Active ✓' : 'Shield Disabled ✕'}
        </button>
      </div>

      <div style="margin-top:14px; padding-top:14px; border-top:1px solid rgba(255,255,255,0.08);">
        <div class="os-field-label">Privacy &amp; Security</div>
        <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:12px; margin-top:6px;">
          <div style="font-weight:600; font-size:12.5px; color:#fff; margin-bottom:2px;">Clear Browsing Data</div>
          <div style="font-size:11px; color:var(--text-muted); margin-bottom:10px;">Delete history, cookies, cache, and more.</div>
          
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px 12px; margin-bottom:12px; font-size:11.5px; color:#d1d5db;">
            <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
              <input type="checkbox" id="os-clear-history" checked style="accent-color:var(--accent-green); cursor:pointer;">
              <span>Browsing History</span>
            </label>
            <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
              <input type="checkbox" id="os-clear-cookies" checked style="accent-color:var(--accent-green); cursor:pointer;">
              <span>Cookies &amp; Site Data</span>
            </label>
            <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
              <input type="checkbox" id="os-clear-cache" checked style="accent-color:var(--accent-green); cursor:pointer;">
              <span>Cached Images &amp; Files</span>
            </label>
            <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
              <input type="checkbox" id="os-clear-storage" checked style="accent-color:var(--accent-green); cursor:pointer;">
              <span>Storage &amp; Service Workers</span>
            </label>
          </div>

          <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
            <div id="os-clear-status" style="font-size:11px; color:var(--accent-green); font-weight:500;" class="hidden"></div>
            <button class="os-btn-danger" id="os-btn-clear-data" style="margin-left:auto; display:flex; align-items:center; gap:6px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              <span>Delete Browsing Data</span>
            </button>
          </div>
        </div>
      </div>
    `;

    settingsBody.querySelectorAll('.os-theme-pick').forEach(row => {
      row.addEventListener('click', async () => {
        const id = row.dataset.themeId;
        if (id && window.oniAPI && window.oniAPI.applyTheme) {
          await window.oniAPI.applyTheme(id);
          await renderOsSettingsWindow();
        }
      });
    });

    const engineSelect = document.getElementById('os-select-engine');
    if (engineSelect) {
      engineSelect.addEventListener('change', async (e) => {
        const newEngine = e.target.value;
        currentSearchEngine = newEngine;
        if (window.oniAPI && window.oniAPI.updateSettings) {
          await window.oniAPI.updateSettings({ searchEngine: newEngine });
        }
      });
    }

    const shieldToggle = document.getElementById('os-btn-toggle-shield');
    if (shieldToggle) {
      shieldToggle.addEventListener('click', async () => {
        const currentEnabled = settings.adBlockEnabled !== false;
        if (window.oniAPI && window.oniAPI.toggleShield) {
          await window.oniAPI.toggleShield(!currentEnabled);
          await renderOsSettingsWindow();
        }
      });
    }

    const clearDataBtn = document.getElementById('os-btn-clear-data');
    if (clearDataBtn) {
      clearDataBtn.addEventListener('click', async () => {
        const history = document.getElementById('os-clear-history')?.checked ?? true;
        const cookies = document.getElementById('os-clear-cookies')?.checked ?? true;
        const cache = document.getElementById('os-clear-cache')?.checked ?? true;
        const storage = document.getElementById('os-clear-storage')?.checked ?? true;
        const statusEl = document.getElementById('os-clear-status');

        clearDataBtn.disabled = true;
        clearDataBtn.textContent = 'Deleting...';

        try {
          if (window.oniAPI && window.oniAPI.clearBrowsingData) {
            await window.oniAPI.clearBrowsingData({ history, cookies, cache, storage });
          } else if (window.oniAPI && window.oniAPI.clearHistory && history) {
            await window.oniAPI.clearHistory();
          }

          if (history && typeof renderOsHistoryWindow === 'function') {
            await renderOsHistoryWindow();
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
          clearDataBtn.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            <span>Delete Browsing Data</span>
          `;
        }
      });
    }
  }

  function applyThemeShortcuts(theme) {
    if (theme && theme.newTab && theme.newTab.shortcuts && Array.isArray(theme.newTab.shortcuts.items)) {
      pinnedApps = theme.newTab.shortcuts.items;
      renderStartMenuApps();
    }
  }

  // Setup Dragging on Popup Modals
  function setupDraggableWindows() {
    document.querySelectorAll('[data-drag-window]').forEach(titlebar => {
      let isDragging = false;
      let startX = 0;
      let startY = 0;
      let origLeft = 0;
      let origTop = 0;
      const winEl = document.getElementById(titlebar.dataset.dragWindow);
      if (!winEl) return;

      titlebar.addEventListener('mousedown', (e) => {
        if (e.target.closest('button')) return;
        isDragging = true;
        document.querySelectorAll('.os-window').forEach(w => { w.style.zIndex = '32'; });
        winEl.style.zIndex = '40';

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
        const maxLeft = Math.max(0, window.innerWidth - 60);
        const maxTop = Math.max(8, window.innerHeight - 60);
        winEl.style.left = `${Math.min(maxLeft, Math.max(0, origLeft + dx))}px`;
        winEl.style.top = `${Math.min(maxTop, Math.max(8, origTop + dy))}px`;
      });

      window.addEventListener('mouseup', () => {
        isDragging = false;
      });
    });
  }

  async function init() {
    renderStartMenuApps();
    setupDraggableWindows();

    // Start Orb Button
    if (btnStart) {
      btnStart.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleStartMenu();
      });
      btnStart.addEventListener('mouseenter', () => {
        showTooltip('Oni OS Start Menu', btnStart);
      });
      btnStart.addEventListener('mouseleave', () => {
        hideTooltip();
      });
    }

    // Start Menu: ＋ New Browser Tab Button
    if (startBtnNewTab) {
      startBtnNewTab.addEventListener('click', () => {
        closeStartMenu();
        if (window.oniAPI && window.oniAPI.createTab) {
          window.oniAPI.createTab('oni://newtab');
        }
      });
    }

    // Start Menu: ＋ Pin New App Button (replaces Settings & Themes)
    if (startBtnPin) {
      startBtnPin.addEventListener('click', (e) => {
        e.stopPropagation();
        closeStartMenu();
        openOsWindow('os-win-add-app', { autofillActiveTab: true });
      });
    }

    // Close window buttons on all floating modals
    document.querySelectorAll('[data-close-window]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeOsWindow(btn.dataset.closeWindow);
      });
    });

    // Spotlight / Search Input Live Filter
    if (spotlightInput) {
      spotlightInput.addEventListener('input', (e) => {
        renderSpotlightResults(e.target.value);
      });
    }

    // Spotlight Form Submission
    if (spotlightForm) {
      spotlightForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = spotlightInput ? spotlightInput.value : '';
        executeSearchOrNavigate(query);
      });
    }

    // Pin New App Form Submission
    if (addAppForm) {
      addAppForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = (appTitleInput.value || '').trim();
        let url = (appUrlInput.value || '').trim();
        if (!/^https?:\/\//i.test(url) && !url.startsWith('oni://') && !url.startsWith('file://')) {
          url = `https://${url}`;
        }
        let icon = (appIconInput.value || '').trim();
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
          pinnedApps.push({ title, url, icon });
          renderStartMenuApps();
        }

        closeOsWindow('os-win-add-app');
        if (appTitleInput) appTitleInput.value = '';
        if (appUrlInput) appUrlInput.value = '';
        if (appIconInput) appIconInput.value = '';
      });
    }

    // Close Start Menu when clicking outside startMenuEl and dockEl
    document.addEventListener('click', (e) => {
      if (isStartMenuOpen) {
        if (startMenuEl && startMenuEl.contains(e.target)) return;
        if (dockEl && dockEl.contains(e.target)) return;
        closeStartMenu();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (isStartMenuOpen) {
          closeStartMenu();
        } else if (isAnyModalOpen()) {
          // Close topmost open window on Escape
          const openWindows = Array.from(document.querySelectorAll('.os-window:not(.hidden)'));
          if (openWindows.length > 0) {
            closeOsWindow(openWindows[openWindows.length - 1].id);
          }
        }
      }
    });

    window.addEventListener('blur', () => {
      hideTooltip();
      if (isStartMenuOpen) {
        closeStartMenu();
      }
    });

    if (!window.oniAPI) return;

    // Load Pinned Apps from store
    if (window.oniAPI.getBookmarks) {
      try {
        const bms = await window.oniAPI.getBookmarks();
        if (Array.isArray(bms) && bms.length > 0) {
          pinnedApps = bms.map(b => ({ title: b.title, url: b.url, icon: b.favicon || b.icon }));
          renderStartMenuApps();
        }
      } catch (e) {}
    }

    if (window.oniAPI.onBookmarksUpdated) {
      window.oniAPI.onBookmarksUpdated((bms) => {
        if (Array.isArray(bms)) {
          pinnedApps = bms.map(b => ({ title: b.title, url: b.url, icon: b.favicon || b.icon }));
          renderStartMenuApps();
          if (spotlightInput && !spotlightWin.classList.contains('hidden')) {
            renderSpotlightResults(spotlightInput.value);
          }
        }
      });
    }

    if (window.oniAPI.getActiveTheme) {
      const theme = await window.oniAPI.getActiveTheme();
      applyThemeShortcuts(theme);
    }

    if (window.oniAPI.onThemeChanged) {
      window.oniAPI.onThemeChanged(({ theme }) => {
        applyThemeShortcuts(theme);
      });
    }

    // Handle OS Actions dispatched from menubar, shortcuts, and context menu
    if (window.oniAPI.onOsAction) {
      window.oniAPI.onOsAction((action) => {
        if (action === 'start-menu') {
          toggleStartMenu();
        } else if (action === 'close-start-menu') {
          closeStartMenu();
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
          openOsWindow('os-win-add-app', { autofillActiveTab: true });
        }
      });
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

    // Track tabs and active tab seamlessly across all page navigations
    const initialTabs = await window.oniAPI.getTabs();
    if (Array.isArray(initialTabs)) {
      tabs = initialTabs;
      const active = initialTabs.find(t => t.isActive);
      if (active) activeTabId = active.id;
      else if (initialTabs.length > 0 && !activeTabId) activeTabId = initialTabs[0].id;
      renderDockTabs();
    }

    window.oniAPI.onTabCreated((tab) => {
      if (!tabs.some(t => t.id === tab.id)) {
        tabs.push(tab);
      }
      if (tab.isActive) activeTabId = tab.id;
      renderDockTabs();
    });

    window.oniAPI.onTabUpdated((updatedTab) => {
      const idx = tabs.findIndex(t => t.id === updatedTab.id);
      if (idx >= 0) {
        tabs[idx] = { ...tabs[idx], ...updatedTab };
      } else {
        tabs.push(updatedTab);
      }
      if (updatedTab.isActive) activeTabId = updatedTab.id;
      renderDockTabs();
    });

    window.oniAPI.onTabClosed((tabId) => {
      tabs = tabs.filter(t => t.id !== tabId);
      hideTooltip();
      renderDockTabs();
    });

    window.oniAPI.onTabSwitched((tabId) => {
      activeTabId = tabId;
      tabs.forEach(t => { t.isActive = (t.id === tabId); });
      hideTooltip();
      renderDockTabs();
    });

    window.addEventListener('resize', () => {
      hideTooltip();
      reportBounds();
    });

    document.addEventListener('pointerdown', () => {
      if (window.oniAPI && window.oniAPI.hideContextMenu) {
        window.oniAPI.hideContextMenu();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();

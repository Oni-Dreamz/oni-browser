const { app, BrowserWindow, WebContentsView, ipcMain, shell, Menu, MenuItem, session, clipboard, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const store = require('./store');
const oniShield = require('./adblock');

let mainWindow = null;
let dockView = null;
let modalsView = null;
let tooltipView = null;
let toastView = null;
let contextMenuView = null;
let dockBounds = { width: 340, height: 100, x: 0, y: 0 };
let isModalsViewOpen = false;
let pendingSaveAs = false;
const tabs = new Map(); // tabId -> Tab object
let activeTabId = null;
let tabCounter = 0;
let topBarHeight = 84; // Default topbar height (tabs + toolbar)
let isOverlayActive = false;
let isHtmlFullscreen = false;
let isDockHiddenByUser = false;

function isOniOsThemeActive() {
  const activeTheme = store.getActiveTheme();
  return !!(activeTheme && (activeTheme.id === 'oni-os' || (activeTheme.newTab && activeTheme.newTab.layoutMode === 'desktop')));
}

function sendToChromeAndDock(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
  if (dockView && dockView.webContents && !dockView.webContents.isDestroyed()) {
    dockView.webContents.send(channel, payload);
  }
  if (modalsView && modalsView.webContents && !modalsView.webContents.isDestroyed()) {
    modalsView.webContents.send(channel, payload);
  }
  if (tooltipView && tooltipView.webContents && !tooltipView.webContents.isDestroyed()) {
    tooltipView.webContents.send(channel, payload);
  }
  if (toastView && toastView.webContents && !toastView.webContents.isDestroyed()) {
    toastView.webContents.send(channel, payload);
  }
  if (contextMenuView && contextMenuView.webContents && !contextMenuView.webContents.isDestroyed()) {
    contextMenuView.webContents.send(channel, payload);
  }
}

function updateModalsViewBounds() {
  if (!mainWindow || mainWindow.isDestroyed() || !modalsView) return;
  if (!isModalsViewOpen || isOverlayActive || isHtmlFullscreen) {
    modalsView.setVisible(false);
    modalsView.setBounds({ x: 0, y: 0, width: 0, height: 0 });
    return;
  }
  const [winWidth, winHeight] = mainWindow.getContentSize();
  const y = topBarHeight;
  const h = Math.max(0, winHeight - y);
  mainWindow.contentView.addChildView(modalsView);
  modalsView.setBounds({ x: 0, y, width: winWidth, height: h });
  modalsView.setVisible(true);
}

function updateDockViewBounds() {
  if (!mainWindow || mainWindow.isDestroyed() || !dockView) return;
  if (!isOniOsThemeActive() || isOverlayActive || isHtmlFullscreen || isDockHiddenByUser) {
    dockView.setVisible(false);
    dockView.setBounds({ x: 0, y: 0, width: 0, height: 0 });
    if (tooltipView) {
      tooltipView.setVisible(false);
      tooltipView.setBounds({ x: 0, y: 0, width: 0, height: 0 });
    }
    return;
  }
  dockView.setVisible(true);
  const [winWidth, winHeight] = mainWindow.getContentSize();
  const maxAvailHeight = Math.max(100, winHeight - topBarHeight);
  const w = Math.min(winWidth, Math.max(200, dockBounds.width || 340));
  const h = Math.min(maxAvailHeight, Math.max(100, dockBounds.height || 100));
  const x = Math.round((winWidth - w) / 2);
  const y = Math.max(topBarHeight, winHeight - h);
  dockBounds.x = x;
  dockBounds.y = y;
  dockView.setBounds({ x, y, width: w, height: h });
}

// Search engine URL formatters
const SEARCH_ENGINES = {
  duckduckgo: 'https://duckduckgo.com/?q=',
  google: 'https://www.google.com/search?q=',
  bing: 'https://www.bing.com/search?q=',
  brave: 'https://search.brave.com/search?q='
};

function formatNavigationUrl(input) {
  const trimmed = (input || '').trim();
  if (!trimmed) return 'oni://newtab';
  if (trimmed.startsWith('oni://')) return trimmed;
  if (/^https?:\/\//i.test(trimmed) || /^file:\/\//i.test(trimmed) || trimmed === 'about:blank') {
    return trimmed;
  }
  // Check if it looks like a domain name or localhost
  if (/^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/i.test(trimmed) || /^localhost(:\d+)?(\/.*)?$/i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  // Search query
  const engine = store.getSettings().searchEngine || 'google';
  const engineUrl = SEARCH_ENGINES[engine] || SEARCH_ENGINES.google;
  return `${engineUrl}${encodeURIComponent(trimmed)}`;
}

function loadTabUrl(tab, url, options = {}) {
  if (url === 'oni://newtab?mode=classic') {
    url = 'oni://newtab';
  }
  tab.url = url;
  if (url === 'oni://home') {
    tab.title = 'Home | Oni OS';
    tab.favicon = 'assets/icon.png';
    tab.view.webContents.loadFile(path.join(__dirname, '../renderer/newtab.html'), { query: { mode: 'desktop' } });
  } else if (url === 'oni://newtab') {
    tab.title = 'New Tab | Oni';
    tab.favicon = 'assets/icon.png';
    tab.view.webContents.loadFile(path.join(__dirname, '../renderer/newtab.html'));
  } else if (url === 'oni://settings') {
    tab.title = 'Settings | Oni';
    tab.favicon = 'assets/icon.png';
    tab.view.webContents.loadFile(path.join(__dirname, '../renderer/settings.html'));
  } else if (url === 'oni://history') {
    tab.title = 'History | Oni';
    tab.favicon = 'assets/icon.png';
    tab.view.webContents.loadFile(path.join(__dirname, '../renderer/history.html'));
  } else if (url === 'oni://bookmarks') {
    tab.title = 'Pinned Apps | Oni';
    tab.favicon = 'assets/icon.png';
    tab.view.webContents.loadFile(path.join(__dirname, '../renderer/bookmarks.html'));
  } else {
    if (options.postData) {
      const { data, contentType, boundary } = options.postData;
      let extraHeaders = '';
      if (contentType) {
        extraHeaders = `content-type: ${contentType}${boundary ? '; boundary=' + boundary : ''}\n`;
      }
      tab.view.webContents.loadURL(url, {
        postData: data,
        extraHeaders
      });
    } else {
      tab.view.webContents.loadURL(url);
    }
  }
}

function getActiveViewBounds() {
  if (!mainWindow) return { x: 0, y: 0, width: 0, height: 0 };
  const [width, height] = mainWindow.getContentSize();
  if (isHtmlFullscreen) {
    return { x: 0, y: 0, width, height };
  }
  const y = topBarHeight;
  const h = Math.max(0, height - y);
  return { x: 0, y, width, height: h };
}

function normalizeInternalUrl(rawUrl) {
  if (!rawUrl) return rawUrl;
  const normalized = rawUrl.replace(/\\/g, '/');
  if (normalized.includes('/renderer/newtab.html')) {
    if (rawUrl.includes('mode=desktop')) return 'oni://home';
    return 'oni://newtab';
  }
  if (normalized.includes('/renderer/settings.html')) return 'oni://settings';
  if (normalized.includes('/renderer/history.html')) return 'oni://history';
  if (normalized.includes('/renderer/bookmarks.html')) return 'oni://bookmarks';
  return rawUrl;
}

function updateActiveViewBounds() {
  if (activeTabId && tabs.has(activeTabId)) {
    const tab = tabs.get(activeTabId);
    const bounds = getActiveViewBounds();
    tab.view.setBounds(bounds);
  }
  updateDockViewBounds();
  updateModalsViewBounds();
}

function canGoBack(wc) {
  if (!wc || wc.isDestroyed()) return false;
  return wc.navigationHistory ? wc.navigationHistory.canGoBack() : wc.canGoBack();
}

function canGoForward(wc) {
  if (!wc || wc.isDestroyed()) return false;
  return wc.navigationHistory ? wc.navigationHistory.canGoForward() : wc.canGoForward();
}

function goBack(wc) {
  if (!wc || wc.isDestroyed()) return;
  if (wc.navigationHistory) wc.navigationHistory.goBack();
  else wc.goBack();
}

function goForward(wc) {
  if (!wc || wc.isDestroyed()) return;
  if (wc.navigationHistory) wc.navigationHistory.goForward();
  else wc.goForward();
}

function createTab(initialUrl = 'oni://newtab', options = {}) {
  if (initialUrl === 'oni://newtab?mode=classic') {
    initialUrl = 'oni://newtab';
  }
  const switchToTab = options.switchToTab !== false;
  tabCounter++;
  const id = `tab_${Date.now()}_${tabCounter}`;
  
  const view = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true
    }
  });
  try {
    view.setBackgroundColor('#08090d');
  } catch (e) {}

  const tab = {
    id,
    view,
    url: initialUrl,
    title: initialUrl === 'oni://home' ? 'Home | Oni OS' : (initialUrl === 'oni://newtab' ? 'New Tab | Oni' : 'Loading...'),
    favicon: initialUrl.startsWith('oni://') ? 'assets/icon.png' : '',
    isLoading: true,
    canGoBack: false,
    canGoForward: false,
    isMuted: false,
    zoomFactor: 1.0
  };

  const wc = view.webContents;

  // WebContents event bindings
  wc.on('did-start-loading', () => {
    hideContextMenuView();
    tab.isLoading = true;
    notifyTabUpdated(tab);
  });

  wc.on('did-stop-loading', () => {
    tab.isLoading = false;
    tab.canGoBack = canGoBack(wc);
    tab.canGoForward = canGoForward(wc);
    notifyTabUpdated(tab);
  });

  wc.on('page-title-updated', (event, title) => {
    tab.title = title || 'Untitled';
    if (!tab.url.startsWith('oni://')) {
      store.addHistory({ title: tab.title, url: tab.url });
    }
    notifyTabUpdated(tab);
  });

  wc.on('page-favicon-updated', (event, favicons) => {
    if (favicons && favicons.length > 0) {
      tab.favicon = favicons[0];
      notifyTabUpdated(tab);
    }
  });

  wc.on('did-navigate', (event, newUrl) => {
    tab.url = normalizeInternalUrl(newUrl);
    if (tab.url.startsWith('oni://')) {
      tab.favicon = 'assets/icon.png';
    }
    tab.canGoBack = canGoBack(wc);
    tab.canGoForward = canGoForward(wc);
    notifyTabUpdated(tab);
  });

  wc.on('did-navigate-in-page', (event, newUrl) => {
    tab.url = normalizeInternalUrl(newUrl);
    tab.canGoBack = canGoBack(wc);
    tab.canGoForward = canGoForward(wc);
    notifyTabUpdated(tab);
  });

  wc.on('will-navigate', (event, navUrl) => {
    if (/\.(exe|msi|zip|7z|dmg|pkg|tar|gz|rar)$/i.test(navUrl.split('?')[0])) {
      event.preventDefault();
      wc.downloadURL(navUrl);
    }
  });

  // Handle target="_blank" and window.open
  wc.setWindowOpenHandler((details) => {
    const { url, postBody } = details;
    if (/\.(exe|msi|zip|7z|dmg|pkg|tar|gz|rar)$/i.test(url.split('?')[0])) {
      wc.downloadURL(url);
      return { action: 'deny' };
    }
    if (postBody && postBody.data) {
      createTab(url, { postData: postBody });
      return { action: 'deny' };
    }
    createTab(url);
    return { action: 'deny' };
  });

  // Context Menu
  wc.on('context-menu', (event, params) => {
    const isHome = wc.getURL().startsWith('oni://home');
    if (!isHome && contextMenuView && contextMenuView.webContents && !contextMenuView.webContents.isDestroyed()) {
      showContextMenuView(wc, params);
      return;
    }

    const menu = new Menu();

    if (params.linkURL) {
      menu.append(new MenuItem({
        label: 'Open Link in New Tab',
        click: () => createTab(params.linkURL)
      }));
      menu.append(new MenuItem({
        label: 'Copy Link Address',
        click: () => require('electron').clipboard.writeText(params.linkURL)
      }));
      menu.append(new MenuItem({ type: 'separator' }));
    }

    if (params.selectionText) {
      menu.append(new MenuItem({
        label: `Search "${params.selectionText.substring(0, 20)}..."`,
        click: () => {
          const searchUrl = formatNavigationUrl(params.selectionText);
          createTab(searchUrl);
        }
      }));
      menu.append(new MenuItem({ label: 'Copy', role: 'copy' }));
      menu.append(new MenuItem({ type: 'separator' }));
    }

    if (params.isEditable) {
      menu.append(new MenuItem({ label: 'Cut', role: 'cut' }));
      menu.append(new MenuItem({ label: 'Copy', role: 'copy' }));
      menu.append(new MenuItem({ label: 'Paste', role: 'paste' }));
      menu.append(new MenuItem({ label: 'Select All', role: 'selectAll' }));
      menu.append(new MenuItem({ type: 'separator' }));
    }

    menu.append(new MenuItem({
      label: 'Back',
      enabled: canGoBack(wc),
      click: () => goBack(wc)
    }));
    menu.append(new MenuItem({
      label: 'Forward',
      enabled: canGoForward(wc),
      click: () => goForward(wc)
    }));
    menu.append(new MenuItem({
      label: 'Reload',
      accelerator: 'CmdOrCtrl+R',
      click: () => wc.reload()
    }));
    menu.append(new MenuItem({ type: 'separator' }));
    menu.append(new MenuItem({
      label: 'Inspect Element',
      click: () => wc.inspectElement(params.x, params.y)
    }));

    menu.popup({ window: mainWindow });
  });

  // HTML5 Fullscreen (video players)
  wc.on('enter-html-full-screen', () => {
    isHtmlFullscreen = true;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window:htmlFullscreenChange', true);
      const [width, height] = mainWindow.getContentSize();
      view.setBounds({ x: 0, y: 0, width, height });
      // Bring active tab view to front above topbar
      mainWindow.contentView.addChildView(view);
    }
    updateDockViewBounds();
  });

  wc.on('leave-html-full-screen', () => {
    isHtmlFullscreen = false;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window:htmlFullscreenChange', false);
    }
    updateActiveViewBounds();
    bringDockAndTooltipToFront();
  });

  // Find in page results
  wc.on('found-in-page', (event, result) => {
    if (mainWindow) {
      mainWindow.webContents.send('tab:findResult', result);
    }
  });

  // Add view to mainWindow and keep dockView & tooltipView on top
  mainWindow.contentView.addChildView(view);
  bringDockAndTooltipToFront();
  tabs.set(id, tab);

  // Load URL
  loadTabUrl(tab, initialUrl, options);

  // Switch to this new tab if requested
  if (switchToTab) {
    switchTab(id);
  } else {
    view.setVisible(false);
  }

  sendToChromeAndDock('tab:created', sanitizeTab(tab));

  return sanitizeTab(tab);
}

function getOrCreateOniOsHomeTab(switchToIt = false) {
  for (const [, t] of tabs.entries()) {
    if (t.url === 'oni://home') {
      if (switchToIt) switchTab(t.id);
      return t;
    }
  }
  const created = createTab('oni://home', { switchToTab: switchToIt });
  return tabs.get(created.id);
}

function switchTab(tabId) {
  if (!tabs.has(tabId)) return;
  hideContextMenuView();

  // Hide all views except the active one
  for (const [id, tab] of tabs.entries()) {
    if (id === tabId) {
      tab.view.setVisible(!isOverlayActive);
    } else {
      tab.view.setVisible(false);
    }
  }

  activeTabId = tabId;
  bringDockAndTooltipToFront();
  updateActiveViewBounds();

  sendToChromeAndDock('tab:switched', tabId);
  const activeTab = tabs.get(tabId);
  if (activeTab) {
    notifyTabUpdated(activeTab);
  }
}

function closeTab(tabId) {
  if (!tabs.has(tabId)) return;
  hideContextMenuView();

  const tab = tabs.get(tabId);

  // Keep the persistent Oni OS home desktop tab (oni://home) alive
  if (tab.url === 'oni://home') {
    return;
  }

  const browserTabsBefore = Array.from(tabs.values()).filter(t => t.url !== 'oni://home');
  const currentBrowserIndex = browserTabsBefore.findIndex(t => t.id === tabId);

  // Remove from window
  mainWindow.contentView.removeChildView(tab.view);
  try {
    tab.view.webContents.close();
  } catch (e) {
    // ignore
  }
  tabs.delete(tabId);

  sendToChromeAndDock('tab:closed', tabId);

  // If this was the active tab, switch to an adjacent browser tab, or route to oni://home (Oni OS) / new blank tab (Classic)
  if (activeTabId === tabId) {
    const remainingBrowserTabs = Array.from(tabs.values()).filter(t => t.url !== 'oni://home');
    if (remainingBrowserTabs.length > 0) {
      const nextTab =
        remainingBrowserTabs[Math.min(currentBrowserIndex, remainingBrowserTabs.length - 1)] ||
        remainingBrowserTabs[remainingBrowserTabs.length - 1];
      switchTab(nextTab.id);
    } else if (isOniOsThemeActive()) {
      getOrCreateOniOsHomeTab(true);
    } else {
      createTab('oni://newtab');
    }
  }
}

function sanitizeTab(tab) {
  return {
    id: tab.id,
    url: tab.url,
    title: tab.title,
    favicon: tab.favicon,
    isLoading: tab.isLoading,
    canGoBack: tab.canGoBack,
    canGoForward: tab.canGoForward,
    isMuted: tab.isMuted,
    zoomFactor: tab.zoomFactor,
    isActive: tab.id === activeTabId,
    isDesktopHome: tab.url === 'oni://home'
  };
}

function notifyTabUpdated(tab) {
  sendToChromeAndDock('tab:updated', sanitizeTab(tab));
}

function setupDownloads() {
  const sess = session.defaultSession;
  try {
    sess.setDownloadPath(app.getPath('downloads'));
  } catch (e) {}

  // Automatically approve download permissions for programmatic downloads / redirects (e.g. OBS Studio)
  sess.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(true);
  });
  sess.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
    return true;
  });

  sess.on('will-download', (event, item) => {
    const baseFilename = item.getFilename() || 'download';
    let savePath = '';

    if (pendingSaveAs) {
      pendingSaveAs = false;
      // Do not set savePath: Electron will prompt the native Save As file dialog
    } else {
      const userDownloadsDir = app.getPath('downloads');
      savePath = path.join(userDownloadsDir, baseFilename);
      let counter = 1;
      const ext = path.extname(baseFilename);
      const nameWithoutExt = path.basename(baseFilename, ext);
      while (fs.existsSync(savePath)) {
        savePath = path.join(userDownloadsDir, `${nameWithoutExt} (${counter})${ext}`);
        counter++;
      }
      item.setSavePath(savePath);
    }

    const downloadId = 'dl_' + Date.now();
    const downloadItem = {
      id: downloadId,
      filename: baseFilename,
      path: savePath || item.getSavePath(),
      state: 'progressing',
      totalBytes: item.getTotalBytes(),
      receivedBytes: item.getReceivedBytes(),
      timestamp: Date.now()
    };
    store.addOrUpdateDownload(downloadItem);
    sendToChromeAndDock('download:progress', downloadItem);

    item.on('updated', (e, state) => {
      downloadItem.state = state;
      downloadItem.path = item.getSavePath() || downloadItem.path;
      if (downloadItem.path) {
        downloadItem.filename = path.basename(downloadItem.path);
      }
      downloadItem.receivedBytes = item.getReceivedBytes();
      store.addOrUpdateDownload(downloadItem);
      sendToChromeAndDock('download:progress', downloadItem);
    });

    item.once('done', (e, state) => {
      downloadItem.state = state;
      downloadItem.path = item.getSavePath() || downloadItem.path;
      if (downloadItem.path) {
        downloadItem.filename = path.basename(downloadItem.path);
      }
      downloadItem.receivedBytes = item.getReceivedBytes();
      store.addOrUpdateDownload(downloadItem);
      sendToChromeAndDock('download:progress', downloadItem);

      if (state === 'completed') {
        sendToChromeAndDock('download:completed', downloadItem);
        try {
          const { Notification } = require('electron');
          if (Notification && Notification.isSupported()) {
            new Notification({
              title: 'Oni OS • Download Complete',
              body: downloadItem.filename,
              icon: path.join(__dirname, '../../assets/app-icon.png')
            }).show();
          }
        } catch (err) {}
      }
    });
  });
}

function bringDockAndTooltipToFront() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (modalsView) {
    mainWindow.contentView.addChildView(modalsView);
  }
  if (dockView) {
    mainWindow.contentView.addChildView(dockView);
  }
  if (tooltipView) {
    mainWindow.contentView.addChildView(tooltipView);
  }
  if (toastView) {
    mainWindow.contentView.addChildView(toastView);
  }
  if (contextMenuView) {
    mainWindow.contentView.addChildView(contextMenuView);
  }
}

function createModalsView() {
  modalsView = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  try {
    modalsView.setBackgroundColor('#00000000');
  } catch (e) {
    // ignore
  }
  mainWindow.contentView.addChildView(modalsView);
  modalsView.webContents.loadFile(path.join(__dirname, '../renderer/modals.html'));
  modalsView.setVisible(false);
  modalsView.setBounds({ x: 0, y: 0, width: 0, height: 0 });
}

function createToastView() {
  toastView = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  try {
    toastView.setBackgroundColor('#00000000');
  } catch (e) {
    // ignore
  }
  mainWindow.contentView.addChildView(toastView);
  toastView.webContents.loadFile(path.join(__dirname, '../renderer/toast.html'));
  toastView.setVisible(false);
  toastView.setBounds({ x: 0, y: 0, width: 0, height: 0 });
}

function showToastView(data) {
  if (!mainWindow || mainWindow.isDestroyed() || !toastView || !data) return;
  const [winWidth, winHeight] = mainWindow.getContentSize();
  const w = 360;
  const h = 64;
  const x = Math.max(10, Math.min(winWidth - w - 10, typeof data.x === 'number' ? data.x : 200));
  const y = Math.max(topBarHeight + 2, typeof data.y === 'number' ? data.y : (topBarHeight + 4));

  mainWindow.contentView.addChildView(toastView);
  if (contextMenuView) {
    mainWindow.contentView.addChildView(contextMenuView);
  }
  toastView.setBounds({ x, y, width: w, height: h });
  toastView.setVisible(true);
  toastView.webContents.send('toast:display', data);
}

function hideToastView() {
  if (toastView && !toastView.webContents.isDestroyed()) {
    toastView.setVisible(false);
    toastView.setBounds({ x: 0, y: 0, width: 0, height: 0 });
  }
}

function createContextMenuView() {
  contextMenuView = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  try {
    contextMenuView.setBackgroundColor('#00000000');
  } catch (e) {
    // ignore
  }
  mainWindow.contentView.addChildView(contextMenuView);
  contextMenuView.webContents.loadFile(path.join(__dirname, '../renderer/contextmenu.html'));
  contextMenuView.setVisible(false);
  contextMenuView.setBounds({ x: 0, y: 0, width: 0, height: 0 });
}

function showContextMenuView(wc, params) {
  if (!mainWindow || mainWindow.isDestroyed() || !contextMenuView) return;
  const [winWidth, winHeight] = mainWindow.getContentSize();
  const y = topBarHeight;
  const h = Math.max(0, winHeight - y);

  // Bring contextMenuView to the very front of the child view stack
  mainWindow.contentView.addChildView(contextMenuView);
  contextMenuView.setBounds({ x: 0, y, width: winWidth, height: h });
  contextMenuView.setVisible(true);

  contextMenuView.webContents.send('os:show-context-menu', {
    x: params.x,
    y: params.y,
    linkURL: params.linkURL || '',
    srcURL: params.srcURL || '',
    mediaType: params.mediaType || '',
    selectionText: (params.selectionText || '').trim(),
    isEditable: !!params.isEditable,
    editFlags: params.editFlags || {},
    pageURL: params.pageURL || wc.getURL(),
    canGoBack: canGoBack(wc),
    canGoForward: canGoForward(wc)
  });
}

function hideContextMenuView() {
  if (contextMenuView && !contextMenuView.webContents.isDestroyed()) {
    contextMenuView.setVisible(false);
    contextMenuView.setBounds({ x: 0, y: 0, width: 0, height: 0 });
  }
}

function createDockView() {
  dockView = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  try {
    dockView.setBackgroundColor('#00000000');
  } catch (e) {
    // ignore
  }
  mainWindow.contentView.addChildView(dockView);
  dockView.webContents.loadFile(path.join(__dirname, '../renderer/dock.html'));
  updateDockViewBounds();
}

function createTooltipView() {
  tooltipView = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  try {
    tooltipView.setBackgroundColor('#00000000');
  } catch (e) {
    // ignore
  }
  mainWindow.contentView.addChildView(tooltipView);
  tooltipView.webContents.loadFile(path.join(__dirname, '../renderer/tooltip.html'));
  tooltipView.setVisible(false);
  tooltipView.setBounds({ x: 0, y: 0, width: 0, height: 0 });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 850,
    minHeight: 600,
    frame: false, // Frameless for custom Oni chrome
    titleBarStyle: 'hidden',
    title: 'Oni Browser',
    icon: path.join(__dirname, '../../assets/app-icon.png'),
    backgroundColor: '#0c0d12',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true
    }
  });

  // Create independent Modals view, always-on-top Oni OS Dock view, Tooltip view, Toast view, and Context Menu view
  createModalsView();
  createDockView();
  createTooltipView();
  createToastView();
  createContextMenuView();

  // Load the browser chrome UI
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Window resize handler
  mainWindow.on('resize', () => {
    hideContextMenuView();
    updateActiveViewBounds();
  });

  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window:maximizedChange', true);
    updateActiveViewBounds();
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window:maximizedChange', false);
    updateActiveViewBounds();
  });

  // When UI is ready, spawn the persistent Oni OS home tab and initial browser tab
  mainWindow.webContents.once('did-finish-load', () => {
    const startInOs = isOniOsThemeActive();
    getOrCreateOniOsHomeTab(startInOs);
    if (!startInOs) {
      createTab('oni://newtab');
    }
  });

  // Setup Oni Shield
  oniShield.setup();
  oniShield.addListener((stats) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('shield:updated', stats);
    }
  });

  setupDownloads();
}

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
ipcMain.handle('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window:maximize', () => {
  if (!mainWindow) return false;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
    return false;
  } else {
    mainWindow.maximize();
    return true;
  }
});

ipcMain.handle('window:close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('window:isMaximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

// Tab IPC
ipcMain.handle('tab:create', (event, url) => {
  return createTab(url || 'oni://newtab');
});

ipcMain.handle('tab:close', (event, id) => {
  closeTab(id);
});

ipcMain.handle('tab:switch', (event, id) => {
  switchTab(id);
});

ipcMain.handle('tab:reload', (event, id) => {
  const targetId = id || activeTabId;
  if (targetId && tabs.has(targetId)) {
    const tab = tabs.get(targetId);
    if (tab.url.startsWith('oni://')) {
      loadTabUrl(tab, tab.url);
    } else {
      tab.view.webContents.reload();
    }
  }
});

ipcMain.handle('tab:goBack', (event, id) => {
  const targetId = id || activeTabId;
  if (targetId && tabs.has(targetId)) {
    const tab = tabs.get(targetId);
    if (canGoBack(tab.view.webContents)) {
      goBack(tab.view.webContents);
    }
  }
});

ipcMain.handle('tab:goForward', (event, id) => {
  const targetId = id || activeTabId;
  if (targetId && tabs.has(targetId)) {
    const tab = tabs.get(targetId);
    if (canGoForward(tab.view.webContents)) {
      goForward(tab.view.webContents);
    }
  }
});

ipcMain.handle('tab:navigate', (event, { url, id }) => {
  const targetId = id || activeTabId;
  if (targetId && tabs.has(targetId)) {
    const tab = tabs.get(targetId);
    const destUrl = formatNavigationUrl(url);
    loadTabUrl(tab, destUrl);
  }
});

ipcMain.handle('tab:forwardInputEvent', (event, inputEvent) => {
  if (!activeTabId || !tabs.has(activeTabId)) return;
  const tab = tabs.get(activeTabId);
  if (!tab || !tab.view || tab.view.webContents.isDestroyed()) return;
  try {
    tab.view.webContents.sendInputEvent(inputEvent);
  } catch (err) {}
});

ipcMain.handle('tab:stop', (event, id) => {
  const targetId = id || activeTabId;
  if (targetId && tabs.has(targetId)) {
    tabs.get(targetId).view.webContents.stop();
  }
});

ipcMain.handle('tab:zoom', (event, { delta, id }) => {
  const targetId = id || activeTabId;
  if (targetId && tabs.has(targetId)) {
    const tab = tabs.get(targetId);
    const current = tab.view.webContents.getZoomFactor();
    const next = Math.max(0.25, Math.min(3.0, current + delta));
    tab.view.webContents.setZoomFactor(next);
    tab.zoomFactor = next;
    notifyTabUpdated(tab);
    return next;
  }
  return 1.0;
});

ipcMain.handle('tab:resetZoom', (event, id) => {
  const targetId = id || activeTabId;
  if (targetId && tabs.has(targetId)) {
    const tab = tabs.get(targetId);
    tab.view.webContents.setZoomFactor(1.0);
    tab.zoomFactor = 1.0;
    notifyTabUpdated(tab);
  }
});

ipcMain.handle('tab:toggleMute', (event, id) => {
  const targetId = id || activeTabId;
  if (targetId && tabs.has(targetId)) {
    const tab = tabs.get(targetId);
    const muted = !tab.view.webContents.isAudioMuted();
    tab.view.webContents.setAudioMuted(muted);
    tab.isMuted = muted;
    notifyTabUpdated(tab);
    return muted;
  }
  return false;
});

ipcMain.handle('tab:toggleDevTools', (event, id) => {
  const targetId = id || activeTabId;
  if (targetId && tabs.has(targetId)) {
    const wc = tabs.get(targetId).view.webContents;
    if (wc.isDevToolsOpened()) {
      wc.closeDevTools();
    } else {
      wc.openDevTools({ mode: 'right' });
    }
  }
});

ipcMain.handle('tab:getAll', () => {
  return Array.from(tabs.values()).map(sanitizeTab);
});

// Find in page
ipcMain.handle('tab:findInPage', (event, { text, forward = true }) => {
  if (activeTabId && tabs.has(activeTabId)) {
    const wc = tabs.get(activeTabId).view.webContents;
    if (text) {
      return wc.findInPage(text, { forward, findNext: true });
    }
  }
  return null;
});

ipcMain.handle('tab:stopFindInPage', (event, action = 'clearSelection') => {
  if (activeTabId && tabs.has(activeTabId)) {
    tabs.get(activeTabId).view.webContents.stopFindInPage(action);
  }
});

// Pinned Apps (Unified Bookmarks & Desktop Apps) IPC
function broadcastPinnedAppsUpdated(list) {
  sendToChromeAndDock('bookmarks:updated', list);
  sendToChromeAndDock('desktop-apps:updated', list);
  for (const tab of tabs.values()) {
    if (tab.view && tab.view.webContents && !tab.view.webContents.isDestroyed()) {
      tab.view.webContents.send('bookmarks:updated', list);
      tab.view.webContents.send('desktop-apps:updated', list);
    }
  }
}

ipcMain.handle('bookmarks:get', () => store.getBookmarks());
ipcMain.handle('bookmarks:add', (event, bookmark) => {
  const list = store.addBookmark(bookmark);
  broadcastPinnedAppsUpdated(list);
  return list;
});
ipcMain.handle('bookmarks:remove', (event, idOrUrl) => {
  const list = store.removeBookmark(idOrUrl);
  broadcastPinnedAppsUpdated(list);
  return list;
});
ipcMain.handle('bookmarks:set', (event, list) => {
  const updated = store.setBookmarks(list);
  broadcastPinnedAppsUpdated(updated);
  return updated;
});
ipcMain.handle('bookmarks:isBookmarked', (event, url) => store.isBookmarked(url));

// Desktop Apps (Home Page Layout) IPC - 100% unified with Pinned Apps
ipcMain.handle('desktop-apps:get', () => store.getBookmarks());
ipcMain.handle('desktop-apps:set', (event, list) => {
  const updated = store.setBookmarks(list);
  broadcastPinnedAppsUpdated(updated);
  return updated;
});
ipcMain.handle('desktop-apps:add', (event, app) => {
  const list = store.addBookmark(app);
  broadcastPinnedAppsUpdated(list);
  return list;
});
ipcMain.handle('desktop-apps:remove', (event, idOrUrl) => {
  const list = store.removeBookmark(idOrUrl);
  broadcastPinnedAppsUpdated(list);
  return list;
});

// Clipboard IPC (for context menus)
ipcMain.handle('clipboard:readText', () => {
  const { clipboard } = require('electron');
  return clipboard.readText();
});
ipcMain.handle('clipboard:writeText', (event, text) => {
  const { clipboard } = require('electron');
  clipboard.writeText(text || '');
  return true;
});

// History IPC
ipcMain.handle('history:get', () => store.getHistory());
ipcMain.handle('history:remove', (event, id) => store.removeHistory(id));
ipcMain.handle('history:clear', () => {
  const res = store.clearHistory();
  sendToChromeAndDock('history:updated', []);
  return res;
});

// Privacy & Browsing Data IPC
ipcMain.handle('privacy:clearData', async (event, options = {}) => {
  const {
    history = true,
    cookies = true,
    cache = true,
    storage = true,
    downloads = false
  } = options;

  const ses = session.defaultSession;

  if (cache) {
    try {
      await ses.clearCache();
      await ses.clearHostResolverCache();
      await ses.clearAuthCache();
    } catch (e) {
      console.error('Failed clearing network cache:', e);
    }
  }

  const storagesToClear = [];
  if (cookies) storagesToClear.push('cookies');
  if (storage) {
    storagesToClear.push('localstorage', 'indexdb', 'websql', 'serviceworkers', 'cachestorage');
  }
  if (cache) {
    storagesToClear.push('shadercache');
  }

  if (storagesToClear.length > 0) {
    try {
      await ses.clearStorageData({
        storages: storagesToClear
      });
    } catch (e) {
      console.error('Failed clearing storage data:', e);
    }
  }

  if (history) {
    store.clearHistory();
    sendToChromeAndDock('history:updated', []);
  }

  if (downloads) {
    store.clearDownloads();
    sendToChromeAndDock('downloads:updated', []);
  }

  return { success: true };
});

// Downloads IPC
ipcMain.handle('downloads:get', () => store.getDownloads());
ipcMain.handle('downloads:clear', () => store.clearDownloads());
ipcMain.handle('downloads:openFile', (event, filePath) => {
  if (filePath) shell.openPath(filePath);
});
ipcMain.handle('downloads:openFolder', (event, filePath) => {
  if (filePath) shell.showItemInFolder(filePath);
});

// Settings IPC
ipcMain.handle('settings:get', () => store.getSettings());
ipcMain.handle('settings:update', (event, newSettings) => store.updateSettings(newSettings));

// Themes IPC
function broadcastThemeChange(payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (payload.theme && payload.theme.behavior && payload.theme.behavior.windowBackgroundColor) {
      try {
        mainWindow.setBackgroundColor(payload.theme.behavior.windowBackgroundColor);
      } catch (e) {
        // ignore
      }
    }
    sendToChromeAndDock('theme:changed', payload);
  }
  for (const [, tab] of tabs.entries()) {
    if (tab.url && tab.url.startsWith('oni://') && !tab.view.webContents.isDestroyed()) {
      tab.view.webContents.send('theme:changed', payload);
    }
  }
  updateActiveViewBounds();
}

ipcMain.handle('themes:getAll', () => store.getThemes());
ipcMain.handle('themes:getActive', () => store.getActiveTheme());
ipcMain.handle('themes:apply', (event, themeId) => {
  const result = store.applyTheme(themeId);
  if (result.theme && result.theme.behavior && result.theme.behavior.adBlockEnabled !== undefined) {
    oniShield.setEnabled(result.theme.behavior.adBlockEnabled);
  }

  // Mirror open browser tabs seamlessly across theme switches
  const browserTabs = Array.from(tabs.values()).filter(t => t.url !== 'oni://home');
  if (isOniOsThemeActive()) {
    const homeTab = getOrCreateOniOsHomeTab(false);
    if (browserTabs.length === 0 && homeTab) {
      switchTab(homeTab.id);
    }
  } else {
    const currentActive = activeTabId && tabs.has(activeTabId) ? tabs.get(activeTabId) : null;
    if (!currentActive || currentActive.url === 'oni://home') {
      if (browserTabs.length > 0) {
        switchTab(browserTabs[browserTabs.length - 1].id);
      } else {
        createTab('oni://newtab');
      }
    }
  }

  broadcastThemeChange(result);
  return result;
});
ipcMain.handle('themes:save', (event, options) => {
  const result = store.saveCurrentConfigAsTheme(options);
  broadcastBookmarksUpdated(store.getBookmarks());
  broadcastThemeChange(result);
  return result;
});

// Customization (Accent Color & Wallpaper) IPC
ipcMain.handle('customization:getAccentColors', () => store.getAccentColors());
ipcMain.handle('customization:setAccentColor', (event, colorId) => {
  const result = store.setAccentColor(colorId);
  broadcastThemeChange(result);
  return result;
});
ipcMain.handle('customization:setWallpaper', (event, wallpaperUrl) => {
  const result = store.setWallpaper(wallpaperUrl);
  broadcastThemeChange(result);
  return result;
});
ipcMain.handle('customization:importWallpaper', async () => {
  if (!mainWindow || mainWindow.isDestroyed()) return { canceled: true };
  const dialogResult = await dialog.showOpenDialog(mainWindow, {
    title: 'Import Wallpaper Image',
    properties: ['openFile'],
    filters: [
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'avif'] }
    ]
  });
  if (dialogResult.canceled || !dialogResult.filePaths || dialogResult.filePaths.length === 0) {
    return { canceled: true };
  }
  const result = store.addCustomWallpaper(dialogResult.filePaths[0]);
  if (result) {
    broadcastThemeChange(result);
  }
  return result || { canceled: true };
});
ipcMain.handle('customization:removeWallpaper', (event, idOrUrl) => {
  const result = store.removeCustomWallpaper(idOrUrl);
  broadcastThemeChange(result);
  return result;
});

// Shield IPC
ipcMain.handle('shield:getStats', () => oniShield.getStats());
ipcMain.handle('shield:toggle', (event, enabled) => oniShield.setEnabled(enabled));

// UI Layout IPC
ipcMain.handle('ui:setTopBarHeight', (event, height) => {
  topBarHeight = height;
  updateActiveViewBounds();
});

ipcMain.handle('ui:setOverlayOpen', (event, isOpen) => {
  isOverlayActive = !!isOpen;
  if (activeTabId && tabs.has(activeTabId)) {
    tabs.get(activeTabId).view.setVisible(!isOverlayActive);
  }
  updateDockViewBounds();
  updateModalsViewBounds();
});

ipcMain.handle('ui:setModalsOpen', (event, isOpen) => {
  isModalsViewOpen = !!isOpen;
  updateModalsViewBounds();
});

ipcMain.handle('ui:setDockBounds', (event, bounds) => {
  if (bounds && typeof bounds.width === 'number') {
    dockBounds.width = bounds.width;
    dockBounds.height = bounds.height || 100;
    dockBounds.fullScreen = !!bounds.fullScreen;
    updateDockViewBounds();
  }
});

// Separate Entity Dock Tooltip IPC
ipcMain.handle('tooltip:show', (event, data) => {
  if (!mainWindow || mainWindow.isDestroyed() || !tooltipView || !data || !data.text) return;
  const [winWidth, winHeight] = mainWindow.getContentSize();
  const dockX = (dockBounds && typeof dockBounds.x === 'number') ? dockBounds.x : Math.round((winWidth - (dockBounds.width || 340)) / 2);
  const dockY = (dockBounds && typeof dockBounds.y === 'number') ? dockBounds.y : (winHeight - 100);

  const centerX = dockX + (typeof data.relX === 'number' ? data.relX : 0);
  const targetY = dockY + (typeof data.relY === 'number' ? data.relY : 0);

  // Dynamic width based on string length, with generous padding for glow shadow
  const textLen = (data.text || '').length;
  const pillW = Math.min(320, Math.max(100, Math.round(textLen * 7.8 + 40)));
  const totalW = pillW + 28; // 14px padding each side for outer glow
  const totalH = 42; // pill + glow padding

  const x = Math.max(8, Math.min(winWidth - totalW - 8, Math.round(centerX - totalW / 2)));
  const y = Math.max(topBarHeight + 4, Math.round(targetY - totalH - 4));

  tooltipView.setBounds({ x, y, width: totalW, height: totalH });
  tooltipView.setVisible(true);
  tooltipView.webContents.send('tooltip:update', data.text);
});

function hideTooltipView() {
  if (tooltipView && !tooltipView.webContents.isDestroyed()) {
    tooltipView.setVisible(false);
    tooltipView.setBounds({ x: 0, y: 0, width: 0, height: 0 });
  }
}

ipcMain.handle('tooltip:hide', () => {
  hideTooltipView();
});

ipcMain.handle('toast:show', (event, data) => {
  showToastView(data);
});

ipcMain.handle('toast:hide', () => {
  hideToastView();
});

ipcMain.handle('dock:focus', () => {
  if (dockView && dockView.webContents && !dockView.webContents.isDestroyed()) {
    dockView.webContents.focus();
  }
});

ipcMain.handle('ui:toggleDock', (event, explicitState) => {
  if (typeof explicitState === 'boolean') {
    isDockHiddenByUser = !explicitState;
  } else {
    isDockHiddenByUser = !isDockHiddenByUser;
  }
  updateDockViewBounds();
  const isVisible = !isDockHiddenByUser;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('ui:dockVisibilityChange', isVisible);
  }
  return isVisible;
});

ipcMain.handle('ui:getDockVisibility', () => {
  return !isDockHiddenByUser;
});

ipcMain.handle('os:triggerAction', (event, action) => {
  hideContextMenuView();
  const actionType = (action && typeof action === 'object') ? action.type : action;
  if (actionType === 'downloads') {
    hideToastView();
  }
  if (actionType === 'home') {
    getOrCreateOniOsHomeTab(true);
    if (dockView && dockView.webContents && !dockView.webContents.isDestroyed()) {
      dockView.webContents.send('os:action', 'close-start-menu');
    }
    return;
  }

  // Route popup modals to independent modalsView
  if (['search', 'spotlight', 'history', 'downloads', 'settings', 'pin-app', 'add-app', 'edit-app', 'close-modals'].includes(actionType)) {
    if (modalsView && modalsView.webContents && !modalsView.webContents.isDestroyed()) {
      modalsView.webContents.focus();
      modalsView.webContents.send('os:action', action);
    }
    return;
  }

  if (dockView && dockView.webContents && !dockView.webContents.isDestroyed()) {
    dockView.webContents.focus();
    dockView.webContents.send('os:action', action);
  }
});

ipcMain.handle('context:action', async (event, { action, params = {} }) => {
  const activeTab = tabs.get(activeTabId);
  const wc = activeTab ? activeTab.view.webContents : null;
  if (!wc || wc.isDestroyed()) return;

  switch (action) {
    case 'open-link-new-tab':
      if (params.linkURL) createTab(params.linkURL);
      break;
    case 'open-link-new-window':
      if (params.linkURL) createTab(params.linkURL);
      break;
    case 'copy-link-address':
      if (params.linkURL) clipboard.writeText(params.linkURL);
      break;
    case 'save-link-as':
      if (params.linkURL) {
        pendingSaveAs = true;
        wc.downloadURL(params.linkURL);
      }
      break;
    case 'open-image-new-tab':
      if (params.srcURL) createTab(params.srcURL);
      break;
    case 'save-image-as':
      if (params.srcURL) {
        pendingSaveAs = true;
        wc.downloadURL(params.srcURL);
      }
      break;
    case 'copy-image':
      if (typeof wc.copyImageAt === 'function') {
        wc.copyImageAt(params.x, params.y);
      }
      break;
    case 'copy-image-address':
      if (params.srcURL) clipboard.writeText(params.srcURL);
      break;
    case 'search-image-web':
      if (params.srcURL) {
        createTab(`https://www.google.com/searchbyimage?image_url=${encodeURIComponent(params.srcURL)}`);
      }
      break;
    case 'copy':
      wc.copy();
      break;
    case 'cut':
      wc.cut();
      break;
    case 'paste':
      wc.paste();
      break;
    case 'select-all':
      wc.selectAll();
      break;
    case 'undo':
      wc.undo();
      break;
    case 'redo':
      wc.redo();
      break;
    case 'search-selection':
      if (params.selectionText) {
        createTab(formatNavigationUrl(params.selectionText));
      }
      break;
    case 'back':
      if (canGoBack(wc)) goBack(wc);
      break;
    case 'forward':
      if (canGoForward(wc)) goForward(wc);
      break;
    case 'reload':
      wc.reload();
      break;
    case 'save-page-as':
      pendingSaveAs = true;
      wc.downloadURL(params.pageURL || wc.getURL());
      break;
    case 'print':
      wc.print();
      break;
    case 'view-source':
      createTab('view-source:' + (params.pageURL || wc.getURL()));
      break;
    case 'inspect-element':
      wc.inspectElement(params.x, params.y);
      break;
  }
  hideContextMenuView();
});

ipcMain.handle('context:hide', () => {
  hideContextMenuView();
});



const { session } = require('electron');
const store = require('./store');

// Core ad and tracker domain signatures
const BLOCK_PATTERNS = [
  '*://*.doubleclick.net/*',
  '*://*.google-analytics.com/*',
  '*://*.googlesyndication.com/*',
  '*://*.googleadservices.com/*',
  '*://*.adservice.google.com/*',
  '*://*.adnxs.com/*',
  '*://*.facebook.net/tr/*',
  '*://*.scorecardresearch.com/*',
  '*://*.quantserve.com/*',
  '*://*.criteo.com/*',
  '*://*.criteo.net/*',
  '*://*.outbrain.com/*',
  '*://*.taboola.com/*',
  '*://*.amazon-adsystem.com/*',
  '*://*.adsrvr.org/*',
  '*://*.rubiconproject.com/*',
  '*://*.pubmatic.com/*',
  '*://*.moatads.com/*',
  '*://*.casalemedia.com/*',
  '*://*.openx.net/*',
  '*://*.smartadserver.com/*',
  '*://*.adcolony.com/*',
  '*://*.chartbeat.com/*',
  '*://*.hotjar.com/*',
  '*://*.branch.io/*',
  '*://*.appsflyer.com/*'
];

class OniShield {
  constructor() {
    this.totalBlocked = 0;
    this.siteBlockedCounts = new Map(); // domain -> count
    this.enabled = store.getSettings().adBlockEnabled !== false;
    this.listeners = [];
  }

  setup(sess = session.defaultSession) {
    sess.webRequest.onBeforeRequest({ urls: BLOCK_PATTERNS }, (details, callback) => {
      if (!this.enabled) {
        callback({ cancel: false });
        return;
      }

      // Never block Cloudflare Turnstile, Google authentication, or security challenge requests
      if (details.url && (
        details.url.includes('/cdn-cgi/') ||
        details.url.includes('challenges.cloudflare.com') ||
        details.url.includes('turnstile') ||
        details.url.includes('accounts.google.com') ||
        details.url.includes('/recaptcha/') ||
        details.url.includes('gstatic.com/recaptcha')
      )) {
        callback({ cancel: false });
        return;
      }

      // If top-level navigation (e.g. user clicked sponsored ad redirect like googleadservices.com/pagead/)
      if (details.resourceType === 'mainFrame') {
        try {
          const parsed = new URL(details.url);
          const adurl = parsed.searchParams.get('adurl') ||
                        parsed.searchParams.get('ad_url') ||
                        parsed.searchParams.get('dest') ||
                        parsed.searchParams.get('target') ||
                        parsed.searchParams.get('url');
          if (adurl && /^https?:\/\//i.test(adurl)) {
            this.totalBlocked++;
            this.notifyListeners();
            callback({ redirectURL: adurl });
            return;
          }
        } catch (e) {}

        // Allow mainFrame navigations (e.g. ad click redirects) to proceed to destination page
        callback({ cancel: false });
        return;
      }

      // Check if URL matches blocked trackers
      this.totalBlocked++;
      try {
        const parsed = new URL(details.url);
        const host = parsed.hostname;
        const current = this.siteBlockedCounts.get(host) || 0;
        this.siteBlockedCounts.set(host, current + 1);
      } catch (e) {
        // ignore
      }

      this.notifyListeners();
      callback({ cancel: true });
    });
  }

  addListener(fn) {
    this.listeners.push(fn);
  }

  notifyListeners() {
    for (const fn of this.listeners) {
      try {
        fn(this.getStats());
      } catch (e) {
        // ignore
      }
    }
  }

  setEnabled(val) {
    this.enabled = !!val;
    store.updateSettings({ adBlockEnabled: this.enabled });
    this.notifyListeners();
  }

  getStats() {
    return {
      enabled: this.enabled,
      totalBlocked: this.totalBlocked,
      activeDomainsBlocked: this.siteBlockedCounts.size
    };
  }
}

module.exports = new OniShield();

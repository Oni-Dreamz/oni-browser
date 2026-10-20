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

      const reqUrl = (details.url || '').toLowerCase();
      const reqInit = (details.initiator || '').toLowerCase();
      const reqRef = (details.referrer || '').toLowerCase();

      // Ensure all requests where url, initiator, or referrer contains google., gstatic., googleapis., or youtube.
      // are completely bypassed by the adblocker so auth and Google services never fail with net::ERR_BLOCKED_BY_CLIENT.
      const isGoogleEcosystem = (str) =>
        str && (
          str.includes('google.') ||
          str.includes('gstatic.') ||
          str.includes('googleapis.') ||
          str.includes('youtube.')
        );

      if (isGoogleEcosystem(reqUrl) || isGoogleEcosystem(reqInit) || isGoogleEcosystem(reqRef)) {
        callback({ cancel: false });
        return;
      }

      // Exempt domains and CDNs from adblocking to avoid breaking authentication, virtualized lists (e.g. Twitch directory streams), or DRM video playback
      const isExemptDomain = (str) =>
        str && (
          str.includes('twitch.tv') ||
          str.includes('ttvnw.net') ||
          str.includes('jtvnw.net') ||
          str.includes('amazon-adsystem.com') ||
          str.includes('media-amazon.com') ||
          str.includes('reddit.com') ||
          str.includes('redditmedia.com') ||
          str.includes('redditstatic.com') ||
          str.includes('twitter.com') ||
          str.includes('x.com') ||
          str.includes('twimg.com') ||
          str.includes('t.co') ||
          str.includes('netflix.com') ||
          str.includes('nflx')
        );

      if (isExemptDomain(reqUrl) || isExemptDomain(reqInit) || isExemptDomain(reqRef)) {
        callback({ cancel: false });
        return;
      }

      // Never block Cloudflare Turnstile, Twitch/Reddit OAuth, or security challenge endpoints
      if (
        reqUrl.includes('/cdn-cgi/') ||
        reqUrl.includes('challenges.cloudflare.com') ||
        reqUrl.includes('turnstile') ||
        reqUrl.includes('passport.twitch.tv') ||
        reqUrl.includes('id.twitch.tv') ||
        reqUrl.includes('reddit.com/account') ||
        reqUrl.includes('oauth') ||
        reqUrl.includes('openid') ||
        reqUrl.includes('/recaptcha/')
      ) {
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

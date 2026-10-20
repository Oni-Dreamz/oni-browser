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
      let pageUrl = '';
      try {
        if (details.webContents && !details.webContents.isDestroyed() && details.webContents.getURL) {
          pageUrl = (details.webContents.getURL() || '').toLowerCase();
        }
      } catch (_) {}
      let frameUrl = '';
      try {
        if (details.frame && details.frame.url) {
          frameUrl = (details.frame.url || '').toLowerCase();
        }
      } catch (_) {}
      const reqInitOrigin = (details.initiatorOrigin || '').toLowerCase();
      const reqInit = (details.initiator || '').toLowerCase();
      const reqRef = (details.referrer || '').toLowerCase();

      // Ensure requests belonging to authentication flows, streaming services, or platform integrity
      // are completely bypassed by the adblocker to prevent breakage on Twitch infinite scroll,
      // Netflix login/profile/playback, and X.com Google sign-in.
      const isCriticalOrAuth = (str) =>
        str && (
          str.includes('google') ||       // google.com, google-analytics, googleadservices, googlesyndication, accounts.google
          str.includes('gstatic') ||
          str.includes('googleapis') ||
          str.includes('doubleclick') ||   // required for Google Identity Services / GSI on X.com
          str.includes('youtube') ||
          str.includes('twitch.tv') ||    // required for Twitch integrity, GQL, and category directory infinite scroll
          str.includes('ttvnw.net') ||
          str.includes('jtvnw.net') ||
          str.includes('amazon-adsystem.com') || // required for Twitch device and ad telemetry handshake
          str.includes('media-amazon.com') ||
          str.includes('netflix.com') ||  // required for Netflix session persistence, profile switching, and DRM
          str.includes('nflxext.com') ||
          str.includes('nflxvideo.net') ||
          str.includes('nflxso.net') ||
          str.includes('nflx') ||
          str.includes('disneyplus.com') ||
          str.includes('crunchyroll.com') ||
          str.includes('twitter.com') ||
          str.includes('x.com') ||
          str.includes('twimg.com') ||
          str.includes('t.co') ||
          str.includes('reddit.com') ||
          str.includes('redditmedia.com') ||
          str.includes('redditstatic.com')
        );

      if (
        isCriticalOrAuth(pageUrl) ||
        isCriticalOrAuth(frameUrl) ||
        isCriticalOrAuth(reqInitOrigin) ||
        isCriticalOrAuth(reqUrl) ||
        isCriticalOrAuth(reqInit) ||
        isCriticalOrAuth(reqRef)
      ) {
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

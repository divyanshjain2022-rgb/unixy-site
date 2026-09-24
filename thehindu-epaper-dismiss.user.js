// ==UserScript==
// @name         ePaper Auto Dismiss Prompts
// @namespace    https://epaper.thehindu.com
// @version      2.0
// @description  Auto-dismiss login, subscription, and paywall prompts on The Hindu & Indian Express ePaper
// @match        https://epaper.thehindu.com/*
// @match        https://indianexpress.com/epaper/*
// @match        https://www.indianexpress.com/epaper/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  const host = location.hostname;
  const isTheHindu = host.includes('thehindu.com');
  const isIE = host.includes('indianexpress.com');

  // --- Selectors by site ---

  const COMMON_SELECTORS = [
    '#credential_picker_container',
    '#credential_picker_iframe',
    '[class*="paywall"]',
    '[class*="Paywall"]',
    '[class*="login-prompt"]',
    '[class*="LoginPrompt"]',
  ];

  const HINDU_SELECTORS = [
    '.tp-modal',
    '.tp-backdrop',
    '.tp-iframe-wrapper',
    '.tp-close',
    '[id^="offer"]',
    '[id*="piano"]',
    '[class*="subscribe"]',
    '[class*="Subscribe"]',
    '[class*="session-logout"]',
    '[class*="SessionLogout"]',
  ];

  const IE_SELECTORS = [
    '[class*="ev-widget"]',
    '[class*="ev-modal"]',
    '[class*="ev-overlay"]',
    '[class*="evolok"]',
    '[id*="ev-widget"]',
    '[id*="evolok"]',
    '[class*="sublime"]',
    '[class*="meter-"]',
    '[class*="adblock"]',
    '[class*="Adblock"]',
    '#ev-reg-overlay',
    '#ev-login-overlay',
    '.subscription-paywall',
    '.subscribe-overlay',
    '.meter-paywall',
  ];

  const SELECTORS = [
    ...COMMON_SELECTORS,
    ...(isTheHindu ? HINDU_SELECTORS : []),
    ...(isIE ? IE_SELECTORS : []),
  ];

  const OBSERVER_PATTERN = isTheHindu
    ? /tp-|paywall|piano|subscribe|login-prompt|session-logout|credential_picker/i
    : /ev-widget|ev-modal|ev-overlay|evolok|sublime|paywall|subscribe|login-prompt|credential_picker|meter-|adblock/i;

  const OBSERVER_ID_PATTERN = isTheHindu
    ? /offer|piano|credential_picker/i
    : /ev-|evolok|credential_picker|sublime|meter/i;

  function dismissPrompts() {
    for (const sel of SELECTORS) {
      document.querySelectorAll(sel).forEach((el) => el.remove());
    }

    // Remove paywall/login iframes
    document.querySelectorAll('iframe').forEach((iframe) => {
      const src = iframe.src || '';
      if (
        src.includes('tinypass') ||
        src.includes('piano.io') ||
        src.includes('accounts.google.com/gsi') ||
        src.includes('evolok') ||
        src.includes('ev.indianexpress.com')
      ) {
        iframe.remove();
      }
    });

    // Restore scrolling
    if (document.body) {
      document.body.style.overflow = '';
      document.body.style.position = '';
    }
    document.documentElement.style.overflow = '';
  }

  // --- The Hindu: intercept Piano/tinypass ---
  if (isTheHindu) {
    Object.defineProperty(window, 'tp', {
      configurable: true,
      set(val) {
        this._tp = val;
        if (val && typeof val === 'object') {
          val.push = function (args) {
            if (Array.isArray(args)) {
              const method = args[0];
              if (
                method === 'showOffer' ||
                method === 'showTemplate' ||
                method === 'init'
              ) {
                return;
              }
            }
            return Array.prototype.push.call(this, args);
          };
        }
      },
      get() {
        return this._tp;
      },
    });
  }

  // --- Indian Express: intercept Evolok metering ---
  if (isIE) {
    // Force metering to always allow access
    Object.defineProperty(window, 'ev_meter_result', {
      configurable: true,
      writable: true,
      value: 'ALLOW_ACCESS',
    });

    // Intercept Evolok event manager to suppress registration/login prompts
    window.addEventListener('DOMContentLoaded', () => {
      // Hide subscription div that ecommerce.min.js shows
      const style = document.createElement('style');
      style.textContent = `
        .subscription-paywall,
        .subscribe-overlay,
        .meter-paywall,
        [class*="ev-widget-login"],
        [class*="ev-widget-reg"],
        [class*="ev-overlay"],
        [id*="ev-reg"],
        [id*="ev-login"],
        .adblock-msg,
        [class*="adblock-detect"],
        #credential_picker_container {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }
      `;
      document.head.appendChild(style);
    });
  }

  // --- Google One Tap (both sites) ---
  window.addEventListener('DOMContentLoaded', () => {
    if (window.google && window.google.accounts && window.google.accounts.id) {
      window.google.accounts.id.cancel();
    }
  });

  // --- MutationObserver ---
  const observer = new MutationObserver((mutations) => {
    let shouldDismiss = false;
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue;
        const cls = (node.className || '').toString();
        const id = node.id || '';
        if (OBSERVER_PATTERN.test(cls) || OBSERVER_ID_PATTERN.test(id)) {
          shouldDismiss = true;
          break;
        }
        if (node.querySelector) {
          try {
            if (node.querySelector(SELECTORS.join(','))) {
              shouldDismiss = true;
              break;
            }
          } catch (_) {}
        }
      }
      if (shouldDismiss) break;
    }
    if (shouldDismiss) dismissPrompts();
  });

  if (document.documentElement) {
    observer.observe(document.documentElement, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.documentElement, { childList: true, subtree: true });
    });
  }

  // Periodic fallback
  setInterval(dismissPrompts, 2000);
})();

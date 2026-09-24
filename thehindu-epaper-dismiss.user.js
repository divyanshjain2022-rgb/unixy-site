// ==UserScript==
// @name         The Hindu ePaper - Auto Dismiss Prompts
// @namespace    https://epaper.thehindu.com
// @version      1.0
// @description  Auto-dismiss login, subscription, and paywall prompts on The Hindu ePaper
// @match        https://epaper.thehindu.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  const SELECTORS = [
    '.tp-modal',
    '.tp-backdrop',
    '.tp-iframe-wrapper',
    '[id^="offer"]',
    '[class*="paywall"]',
    '[class*="Paywall"]',
    '[class*="subscribe"]',
    '[class*="Subscribe"]',
    '[class*="login-prompt"]',
    '[class*="LoginPrompt"]',
    '[class*="session-logout"]',
    '[class*="SessionLogout"]',
    '.tp-close',
    '#credential_picker_container',
    '#credential_picker_iframe',
    '[id*="piano"]',
  ];

  function dismissPrompts() {
    for (const sel of SELECTORS) {
      document.querySelectorAll(sel).forEach((el) => {
        el.remove();
      });
    }

    // Piano/tinypass iframes
    document.querySelectorAll('iframe').forEach((iframe) => {
      const src = iframe.src || '';
      if (
        src.includes('tinypass') ||
        src.includes('piano.io') ||
        src.includes('accounts.google.com/gsi')
      ) {
        iframe.remove();
      }
    });

    // Restore scrolling if body was locked
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.documentElement.style.overflow = '';
  }

  // Intercept Piano before it initializes
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

  // Kill Google One Tap
  window.addEventListener('DOMContentLoaded', () => {
    if (window.google && window.google.accounts) {
      window.google.accounts.id.cancel();
    }
  });

  // MutationObserver to catch dynamically injected modals
  const observer = new MutationObserver((mutations) => {
    let shouldDismiss = false;
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue;
        const html = node.className || '';
        const id = node.id || '';
        if (
          html.toString().match(/tp-|paywall|piano|subscribe|login-prompt|session-logout|credential_picker/i) ||
          id.match(/offer|piano|credential_picker/i)
        ) {
          shouldDismiss = true;
          break;
        }
        if (node.querySelector && node.querySelector(SELECTORS.join(','))) {
          shouldDismiss = true;
          break;
        }
      }
      if (shouldDismiss) break;
    }
    if (shouldDismiss) {
      dismissPrompts();
    }
  });

  if (document.documentElement) {
    observer.observe(document.documentElement, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.documentElement, { childList: true, subtree: true });
    });
  }

  // Periodic fallback sweep
  setInterval(dismissPrompts, 2000);
})();

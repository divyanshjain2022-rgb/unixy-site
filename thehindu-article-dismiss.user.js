// ==UserScript==
// @name         The Hindu Articles - Dismiss Paywall
// @namespace    https://www.thehindu.com
// @version      1.0
// @description  Auto-dismiss Piano paywall on The Hindu article pages
// @match        https://www.thehindu.com/*
// @match        https://thehindu.com/*
// @exclude      https://epaper.thehindu.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  // Block Piano from showing offers/templates
  Object.defineProperty(window, 'tp', {
    configurable: true,
    set: function (val) {
      this._tp = val;
      if (val && typeof val === 'object') {
        var origPush = Array.prototype.push;
        val.push = function (args) {
          if (Array.isArray(args)) {
            var method = args[0];
            if (
              method === 'showOffer' ||
              method === 'showTemplate' ||
              method === 'init' ||
              method === 'setCustomVariable'
            ) {
              return;
            }
          }
          return origPush.call(this, args);
        };
      }
    },
    get: function () {
      return this._tp;
    }
  });

  // Block tinypass/piano script loading
  var origCreate = document.createElement;
  document.createElement = function (tag) {
    var el = origCreate.call(document, tag);
    if (tag.toLowerCase() === 'script') {
      var srcDesc = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
      if (srcDesc && srcDesc.set) {
        var origSrcSet = srcDesc.set;
        Object.defineProperty(el, 'src', {
          configurable: true,
          enumerable: true,
          get: function () {
            return el.getAttribute('src') || '';
          },
          set: function (val) {
            if (typeof val === 'string' && (val.indexOf('tinypass') !== -1 || val.indexOf('piano.io') !== -1)) {
              return;
            }
            origSrcSet.call(el, val);
          }
        });
      }
    }
    return el;
  };

  function clearPaywall() {
    var selectors = [
      '.tp-modal',
      '.tp-backdrop',
      '.tp-iframe-wrapper',
      '.tp-close',
      '[id*="piano"]',
      '[class*="tp-container"]',
      '[class*="paywall"]',
      '[class*="Paywall"]',
      '[class*="subscribe-block"]',
      '[class*="subscription-block"]',
      '#credential_picker_container',
      '#credential_picker_iframe'
    ];

    var i, els;
    for (i = 0; i < selectors.length; i++) {
      els = document.querySelectorAll(selectors[i]);
      for (var j = 0; j < els.length; j++) {
        els[j].remove();
      }
    }

    // Remove tinypass/piano iframes
    var iframes = document.querySelectorAll('iframe');
    for (i = 0; i < iframes.length; i++) {
      var src = iframes[i].src || '';
      if (src.indexOf('tinypass') !== -1 || src.indexOf('piano.io') !== -1 || src.indexOf('buy.tinypass.com') !== -1) {
        iframes[i].remove();
      }
    }

    // Unhide article content that Piano truncated
    var bodySelectors = [
      '.articlebodycontent',
      '.article-body',
      '[class*="article-body"]',
      '[class*="articleBody"]',
      '.paywall-body',
      '.content-body'
    ];
    for (i = 0; i < bodySelectors.length; i++) {
      var articleBody = document.querySelector(bodySelectors[i]);
      if (articleBody) {
        articleBody.style.maxHeight = 'none';
        articleBody.style.overflow = 'visible';
        articleBody.style.height = 'auto';
      }
    }

    // Remove gradient fade overlay on truncated articles
    var gradients = document.querySelectorAll('[class*="gradient"], [class*="fade-out"], [class*="content-mask"]');
    for (i = 0; i < gradients.length; i++) {
      gradients[i].remove();
    }

    // Restore body scroll
    if (document.body) {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.classList.remove('tp-modal-open');
    }
    document.documentElement.style.overflow = '';
  }

  // Inject CSS to force content visible and hide paywall elements
  window.addEventListener('DOMContentLoaded', function () {
    var style = document.createElement('style');
    style.textContent = [
      '.tp-modal, .tp-backdrop, .tp-iframe-wrapper, [class*="paywall"],',
      '[class*="subscribe-block"], [class*="subscription-block"],',
      '#credential_picker_container, #credential_picker_iframe {',
      '  display: none !important;',
      '  visibility: hidden !important;',
      '}',
      '.articlebodycontent, .article-body, [class*="article-body"],',
      '[class*="articleBody"], .paywall-body, .content-body {',
      '  max-height: none !important;',
      '  overflow: visible !important;',
      '  height: auto !important;',
      '}',
      '[class*="gradient"], [class*="fade-out"], [class*="content-mask"] {',
      '  display: none !important;',
      '}',
      'body.tp-modal-open {',
      '  overflow: auto !important;',
      '  position: static !important;',
      '}'
    ].join('\n');
    document.head.appendChild(style);

    clearPaywall();

    // Kill Google One Tap
    if (window.google && window.google.accounts && window.google.accounts.id) {
      window.google.accounts.id.cancel();
    }
  });

  // MutationObserver for dynamically injected paywall elements
  var observer = new MutationObserver(function (mutations) {
    var shouldClear = false;
    var i, k, m, node, cls, id;
    for (i = 0; i < mutations.length; i++) {
      m = mutations[i];
      for (k = 0; k < m.addedNodes.length; k++) {
        node = m.addedNodes[k];
        if (node.nodeType !== 1) { continue; }
        cls = (node.className || '').toString();
        id = node.id || '';
        if (/tp-|paywall|piano|tinypass|subscribe-block|credential_picker/i.test(cls) ||
            /piano|offer|credential_picker/i.test(id)) {
          shouldClear = true;
          break;
        }
      }
      if (shouldClear) { break; }
    }
    if (shouldClear) { clearPaywall(); }
  });

  if (document.documentElement) {
    observer.observe(document.documentElement, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      observer.observe(document.documentElement, { childList: true, subtree: true });
    });
  }

  // Periodic fallback
  setInterval(clearPaywall, 2000);
})();

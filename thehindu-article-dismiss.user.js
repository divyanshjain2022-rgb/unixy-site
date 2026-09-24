// ==UserScript==
// @name         The Hindu Articles - Dismiss Paywall
// @namespace    https://www.thehindu.com
// @version      1.1
// @description  Auto-dismiss Piano paywall on The Hindu article pages
// @match        https://www.thehindu.com/*
// @match        https://thehindu.com/*
// @exclude      https://epaper.thehindu.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  // Intercept tp.push to block only offer/template display
  // DO NOT block 'init' — the page's own scripts depend on it for rendering
  Object.defineProperty(window, 'tp', {
    configurable: true,
    set: function (val) {
      this._tp = val;
      if (val && typeof val === 'object') {
        var origPush = Array.prototype.push;
        val.push = function (args) {
          if (Array.isArray(args)) {
            var method = args[0];
            if (method === 'showOffer' || method === 'showTemplate') {
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

  function clearPaywall() {
    // Remove Piano modals and backdrops
    var selectors = [
      '.tp-modal',
      '.tp-backdrop',
      '.tp-iframe-wrapper',
      '.tp-close',
      '[class*="tp-container-inner"]',
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
    var gradients = document.querySelectorAll('[class*="fade-out"], [class*="content-mask"]');
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

    // Neuter Piano offer/template methods if Piano has loaded
    if (window.tp && window.tp.offer && typeof window.tp.offer.show === 'function') {
      window.tp.offer.show = function () {};
    }
    if (window.tp && window.tp.template && typeof window.tp.template.show === 'function') {
      window.tp.template.show = function () {};
    }
  }

  // Inject CSS to hide paywall overlays and force article content visible
  var earlyStyle = document.createElement('style');
  earlyStyle.textContent = [
    '.tp-modal, .tp-backdrop, .tp-iframe-wrapper,',
    '[class*="tp-container-inner"],',
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
    'body.tp-modal-open {',
    '  overflow: auto !important;',
    '  position: static !important;',
    '}'
  ].join('\n');

  if (document.head) {
    document.head.appendChild(earlyStyle);
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      document.head.appendChild(earlyStyle);
    });
  }

  window.addEventListener('DOMContentLoaded', function () {
    clearPaywall();

    // Kill Google One Tap
    if (window.google && window.google.accounts && window.google.accounts.id) {
      window.google.accounts.id.cancel();
    }
  });

  // MutationObserver for dynamically injected paywall elements
  var observer = new MutationObserver(function (mutations) {
    var shouldClear = false;
    var i, k, m, node, cls;
    for (i = 0; i < mutations.length; i++) {
      m = mutations[i];
      for (k = 0; k < m.addedNodes.length; k++) {
        node = m.addedNodes[k];
        if (node.nodeType !== 1) { continue; }
        cls = (node.className || '').toString();
        if (/tp-modal|tp-backdrop|tp-iframe|tp-container|credential_picker/i.test(cls) ||
            /tp-modal|tp-backdrop|tp-iframe|tp-container|credential_picker/i.test(node.id || '')) {
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

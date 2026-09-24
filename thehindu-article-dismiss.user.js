// ==UserScript==
// @name         The Hindu Articles - Dismiss Paywall
// @namespace    https://www.thehindu.com
// @version      1.2
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

  // Inject CSS early to override .articlepaywall rules before they take effect
  // The Hindu hides all schemaDiv children except first 2 paragraphs via:
  //   .articlepaywall div[id^="content-body"]>div[id^="schemaDiv"]>* { display:none }
  // And adds a gradient overlay via .articleblock-container::before
  var earlyStyle = document.createElement('style');
  earlyStyle.textContent = [
    '.articlepaywall div[id^="content-body"] > *,',
    '.articlepaywall div[id^="content-body"] > div[id^="schemaDiv"] > * {',
    '  display: block !important;',
    '}',
    '.articlepaywall .articleblock-container::before {',
    '  display: none !important;',
    '  content: none !important;',
    '}',
    '.articlepaywall .article-ad {',
    '  display: block !important;',
    '}',
    '.tp-modal, .tp-backdrop, .tp-iframe-wrapper,',
    '[class*="tp-container-inner"],',
    '#credential_picker_container, #credential_picker_iframe {',
    '  display: none !important;',
    '  visibility: hidden !important;',
    '}',
    'body.tp-modal-open {',
    '  overflow: auto !important;',
    '  position: static !important;',
    '}'
  ].join('\n');

  if (document.head) {
    document.head.appendChild(earlyStyle);
  } else if (document.documentElement) {
    document.documentElement.appendChild(earlyStyle);
  }

  function clearPaywall() {
    // Remove .articlepaywall class from any element that has it
    var paywalled = document.querySelectorAll('.articlepaywall');
    for (var i = 0; i < paywalled.length; i++) {
      paywalled[i].classList.remove('articlepaywall');
    }

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
    for (i = 0; i < selectors.length; i++) {
      var els = document.querySelectorAll(selectors[i]);
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

    // Restore body scroll
    if (document.body) {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.classList.remove('tp-modal-open');
    }
    document.documentElement.style.overflow = '';

    // Neuter Piano offer/template methods if loaded
    if (window.tp && window.tp.offer && typeof window.tp.offer.show === 'function') {
      window.tp.offer.show = function () {};
    }
    if (window.tp && window.tp.template && typeof window.tp.template.show === 'function') {
      window.tp.template.show = function () {};
    }
  }

  window.addEventListener('DOMContentLoaded', function () {
    // Ensure style is in head
    if (earlyStyle.parentNode !== document.head) {
      document.head.appendChild(earlyStyle);
    }
    clearPaywall();

    // Kill Google One Tap
    if (window.google && window.google.accounts && window.google.accounts.id) {
      window.google.accounts.id.cancel();
    }
  });

  // MutationObserver — watch for .articlepaywall being added
  var observer = new MutationObserver(function (mutations) {
    var shouldClear = false;
    var i, k, m, node, cls;
    for (i = 0; i < mutations.length; i++) {
      m = mutations[i];
      // Check for class changes that add articlepaywall
      if (m.type === 'attributes' && m.attributeName === 'class') {
        var target = m.target;
        if (target.classList && target.classList.contains('articlepaywall')) {
          shouldClear = true;
          break;
        }
      }
      // Check for added paywall nodes
      for (k = 0; k < m.addedNodes.length; k++) {
        node = m.addedNodes[k];
        if (node.nodeType !== 1) { continue; }
        cls = (node.className || '').toString();
        if (/tp-modal|tp-backdrop|tp-iframe|tp-container|credential_picker|articlepaywall/i.test(cls) ||
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
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    });
  }

  // Periodic fallback
  setInterval(clearPaywall, 2000);
})();

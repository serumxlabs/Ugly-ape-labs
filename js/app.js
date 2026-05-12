/**
 * Project dashboard — config-driven template for NFT/token projects.
 * All project-specific copy and URLs come from window.UGLY_APE_SQUAD_CONFIG (js/config.js).
 */

(function () {
  'use strict';

  const BREAKPOINT = 900;
  const CONFIG = window.UGLY_APE_SQUAD_CONFIG || { holderPortalUrl: '', endpoints: {}, discordConnectUrl: '' };
  const BASE_PATH = '';
  const PORTAL_URL = (CONFIG.holderPortalUrl || '').replace(/\/$/, '');
  const HOLDINGS_ENDPOINT = PORTAL_URL && CONFIG.endpoints?.holdings ? PORTAL_URL + CONFIG.endpoints.holdings : '';

  // ----- Apply project config to DOM (template: brand, hero, token, footer, etc.) -----
  function applyProjectConfig() {
    var c = CONFIG;
    var projectName = c.projectName || 'Project';
    var logoUrl = c.logoUrl || 'assets/logo.png';
    var social = c.social || {};
    var token = c.token || {};
    var hero = c.hero || {};
    var tokenSymbol = (token.symbol || 'Token').toUpperCase();

    document.title = projectName + ' — NFT & Token';

    // Hero
    var heroTitle = document.getElementById('hero-title');
    var heroTitleInner = document.getElementById('hero-title-inner');
    if (heroTitleInner) heroTitleInner.textContent = hero.title || projectName;
    var heroTagline = document.getElementById('hero-tagline');
    if (heroTagline) heroTagline.textContent = hero.tagline || '';

    var dashTitle = document.getElementById('dashboard-title');
    if (dashTitle) {
      var dashLabel = c.dashboardTitle != null && String(c.dashboardTitle).length ? c.dashboardTitle : projectName;
      dashTitle.textContent = dashLabel;
    }
    var heroSectionTitleInner = document.getElementById('hero-section-title-inner');
    if (heroSectionTitleInner) heroSectionTitleInner.textContent = hero.title || projectName;
    function resolveHeroAssetUrl(src) {
      var s = String(src || '').replace(/^\.\//, '');
      if (!s) return '';
      return s.indexOf('/') === 0 ? s : '/' + s;
    }
    var heroTracks = Array.isArray(hero.musicTracks) && hero.musicTracks.length
      ? hero.musicTracks
      : hero.musicSrc
        ? [{ src: hero.musicSrc, label: hero.musicLabel || 'Music' }]
        : [];
    var heroAudioEl = document.getElementById('hero-audio');
    var heroTrackSelect = document.getElementById('hero-audio-track');
    if (heroTrackSelect) {
      while (heroTrackSelect.firstChild) heroTrackSelect.removeChild(heroTrackSelect.firstChild);
      if (!heroTracks.length) {
        heroTrackSelect.hidden = true;
      } else {
        heroTrackSelect.hidden = false;
        heroTracks.forEach(function (t, i) {
          var opt = document.createElement('option');
          opt.value = String(i);
          opt.textContent = t.label || 'Track ' + (i + 1);
          opt.setAttribute('data-src', resolveHeroAssetUrl(t.src));
          heroTrackSelect.appendChild(opt);
        });
        heroTrackSelect.selectedIndex = 0;
      }
    }
    if (heroAudioEl && heroTracks.length) {
      var u0 = resolveHeroAssetUrl(heroTracks[0].src);
      if (u0) heroAudioEl.src = u0;
    }
    var dashLogos = document.querySelectorAll('.dashboard__logo-img, .footer__logo');
    dashLogos.forEach(function (img) { if (img && logoUrl) img.src = logoUrl; });
    var logoAlt = document.querySelector('.dashboard__logo-img');
    if (logoAlt) logoAlt.alt = projectName;

    // Token section only: logo img (menu uses CSS mask icon)
    var sectionThumbs = document.querySelectorAll('.section__thumb, .panel__thumb');
    sectionThumbs.forEach(function (img) { if (img && token.logoUrl) img.src = token.logoUrl; });
    var tokenLabels = document.querySelectorAll('[data-config="token-label"]');
    var tokenLabelText = (token.navLabel != null && token.navLabel !== '') ? token.navLabel : tokenSymbol;
    tokenLabels.forEach(function (el) { el.textContent = tokenLabelText; });

    // Token section: token address, Solana logo, Dexscreener + Birdeye + Solscan links
    var contractEl = document.getElementById('tokenomics-contract');
    if (contractEl && c.tokenMint) contractEl.textContent = c.tokenMint;
    var solanaLogoEl = document.getElementById('tokenomics-solana-logo');
    if (solanaLogoEl) solanaLogoEl.src = hero.solanaLogoUrl || '/assets/solana-logo.svg';
    var dexscreenerLink = document.getElementById('tokenomics-dexscreener-link');
    if (dexscreenerLink) {
      dexscreenerLink.href =
        c.tokenDexscreenerUrl ||
        (c.tokenMint ? 'https://dexscreener.com/solana/' + encodeURIComponent(c.tokenMint) : '#');
    }
    var dextoolsLink = document.getElementById('tokenomics-dextools-link');
    if (dextoolsLink && c.tokenDextoolsPairUrl) dextoolsLink.href = c.tokenDextoolsPairUrl;
    var birdeyeLink = document.getElementById('tokenomics-birdeye-link');
    if (birdeyeLink) birdeyeLink.href = c.tokenBirdeyeUrl || ('https://birdeye.so/solana/token/' + (c.tokenMint || ''));
    var solscanLink = document.getElementById('tokenomics-solscan-link');
    if (solscanLink && c.tokenMint) solscanLink.href = 'https://solscan.io/token/' + c.tokenMint;

    // Social links (sticky + footer)
    var socialXEls = document.querySelectorAll('[data-config="social-x"], .footer__link-x');
    socialXEls.forEach(function (a) { if (social.x) a.href = social.x; });
    var socialDiscordEls = document.querySelectorAll('[data-config="social-discord"], .footer__link-discord');
    socialDiscordEls.forEach(function (a) { if (social.discord) a.href = social.discord; });

    // Token section
    var tokenPriceLabel = document.getElementById('tokenomics-price-label');
    if (tokenPriceLabel && token.priceLabel) tokenPriceLabel.textContent = token.priceLabel;
    var tokenChartLabel = document.getElementById('tokenomics-chart-label');
    if (tokenChartLabel && token.chartLabel) tokenChartLabel.textContent = token.chartLabel;
    var tokenSummary = document.getElementById('tokenomics-summary-text');
    if (tokenSummary && token.summaryText) tokenSummary.textContent = token.summaryText;
    var tokenSectionLead = document.getElementById('token-section-lead');
    if (tokenSectionLead && token.sectionLead) tokenSectionLead.textContent = token.sectionLead;

    // Optional shop link (sidebar)
    var shopUrl = c.shopUrl;
    var shopLink = document.querySelector('[data-config="shop-link"]');
    if (shopLink) {
      if (shopUrl) { shopLink.href = shopUrl; shopLink.style.display = ''; }
      else { shopLink.style.display = 'none'; }
    }

    // Footer
    var footerCopyText = document.getElementById('footer-copy-text');
    if (footerCopyText) footerCopyText.textContent = c.footerCopy || projectName;

    // Partners
    var partnersLead = document.getElementById('partners-lead');
    if (partnersLead) partnersLead.textContent = c.partnersLead || 'Partners.';
    var partnersGrid = document.getElementById('partners-grid');
    if (partnersGrid && c.partners && c.partners.length) {
      partnersGrid.innerHTML = c.partners.map(function (p) {
        return '<div class="partners__item"><img src="' + (p.logo || '') + '" alt="' + (p.name || '') + '" class="partners__logo" loading="lazy"><span class="partners__name">' + (p.name || '') + '</span></div>';
      }).join('');
    }

    // Utilities (GOTM Labz + Coming soon cards)
    var utilitiesLead = document.getElementById('utilities-lead');
    if (utilitiesLead && c.utilitiesLead) utilitiesLead.textContent = c.utilitiesLead;
    var utilitiesGrid = document.getElementById('utilities-grid');
    if (utilitiesGrid && c.utilities && c.utilities.length) {
      utilitiesGrid.innerHTML = c.utilities
        .map(function (u) {
          var variant = ((u.variant || '') + '').toLowerCase();
          if (variant === 'lunarverse') {
            var lvHref = escapeHtml(u.url || u.href || '');
            if (!lvHref) return '';
            var ctaLabel = escapeHtml(u.ctaLabel || 'Open');
            return (
              '<a href="' +
              lvHref +
              '" class="card card--lunarverse" target="_blank" rel="noopener">' +
              '<div class="card__bg"></div>' +
              '<div class="card__lunarverse-content">' +
              '<h3 class="card__title">' +
              escapeHtml(u.name || '') +
              '</h3>' +
              '<p class="card__text">' +
              escapeHtml(u.description || '') +
              '</p>' +
              '<span class="btn btn--outline">' +
              ctaLabel +
              '</span>' +
              '</div></a>'
            );
          }
          if (u.links && u.links.length) {
            var buttonsHtml = u.links.map(function (l) {
              return (
                '<a href="' +
                escapeHtml(l.url || '#') +
                '" class="btn btn--outline" target="_blank" rel="noopener">' +
                escapeHtml(l.label || '') +
                '</a>'
              );
            }).join('');
            return (
              '<div class="card card--gotm">' +
              '<div class="card__bg"></div>' +
              '<div class="card__gotm-content">' +
              '<h3 class="card__title">' +
              escapeHtml(u.name || '') +
              '</h3>' +
              '<p class="card__text">' +
              escapeHtml(u.description || '') +
              '</p>' +
              '<div class="card__gotm-buttons">' +
              buttonsHtml +
              '</div>' +
              '</div></div>'
            );
          }
          return '';
        })
        .join('');
    }
    var utilitiesComingLabel = document.getElementById('utilities-coming-label');
    var utilitiesComingGrid = document.getElementById('utilities-coming-grid');
    if (utilitiesComingGrid && c.utilitiesComingSoon && c.utilitiesComingSoon.length) {
      if (utilitiesComingLabel) utilitiesComingLabel.hidden = false;
      utilitiesComingGrid.innerHTML = c.utilitiesComingSoon.map(function (u) {
        var desc = (u.description || '').replace(/\n/g, '<br>');
        var imgSrc = u.image ? escapeHtml(u.image) : '';
        var expandable = !!u.expandable;
        var cardClass = 'card card--coming-soon' + (expandable ? ' card--coming-soon-expandable' : '');
        var readMoreBtn = expandable
          ? '<button type="button" class="card__read-more link" aria-expanded="false">Read more</button>'
          : '';
        return '<div class="' + cardClass + '">' +
          (imgSrc ? '<div class="card__coming-soon-image"><img src="' + imgSrc + '" alt="" loading="lazy" /></div>' : '') +
          '<div class="card__coming-soon-content">' +
            '<h3 class="card__title">' + escapeHtml(u.name || '') + '</h3>' +
            '<div class="card__text-wrap">' +
              '<p class="card__text">' + desc + '</p>' +
            '</div>' +
            readMoreBtn +
          '</div></div>';
      }).join('');
      utilitiesComingGrid.querySelectorAll('.card__read-more').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var card = btn.closest('.card--coming-soon');
          if (!card) return;
          var isExpanded = card.classList.toggle('card--expanded');
          btn.setAttribute('aria-expanded', isExpanded);
          btn.textContent = isExpanded ? 'Read less' : 'Read more';
        });
      });
    } else if (utilitiesComingLabel) {
      utilitiesComingLabel.hidden = true;
    }

    // Holders labels (sidebar + mobile panel key labels)
    var labels = c.holdingsLabels || {};
    ['token', 'col1', 'col2', 'totalNfts'].forEach(function (key) {
      if (!labels[key]) return;
      document.querySelectorAll('[data-holdings-key="' + key + '"]').forEach(function (el) {
        el.textContent = labels[key];
      });
    });
    var holdersLead = document.getElementById('holders-lead');
    if (holdersLead && c.holdersLead) holdersLead.textContent = c.holdersLead;
    var sortOpts = c.holdersSortOptions || {};
    var sortToken = document.querySelector('#holders-sort option[value="token"]');
    if (sortToken && sortOpts.token) sortToken.textContent = sortOpts.token;
    var sortCol1 = document.querySelector('#holders-sort option[value="col1"]');
    if (sortCol1 && sortOpts.col1) sortCol1.textContent = sortOpts.col1;
    var sortCol2 = document.querySelector('#holders-sort option[value="col2"]');
    if (sortCol2 && sortOpts.col2) sortCol2.textContent = sortOpts.col2;
    var thToken = document.querySelector('.holders-table th[data-col="token"]');
    if (thToken && labels.token) thToken.textContent = labels.token;
    var thCol1 = document.querySelector('.holders-table th[data-col="col1"]');
    if (thCol1 && labels.col1) thCol1.textContent = labels.col1;
    var thCol2 = document.querySelector('.holders-table th[data-col="col2"]');
    if (thCol2 && labels.col2) thCol2.textContent = labels.col2;

    var mutants = c.mutants || {};
    var mutantsMintBtn = document.getElementById('mutants-mint-btn');
    if (mutantsMintBtn && mutants.mintUrl) mutantsMintBtn.href = mutants.mintUrl;
    var mutantsPartner = document.querySelector('.mutants__partner-brand');
    if (mutantsPartner && mutants.partnerUrl) mutantsPartner.href = mutants.partnerUrl;
    var mutantsLogo = document.querySelector('.mutants__partner-logo');
    if (mutantsLogo && mutants.partnerLogoUrl) mutantsLogo.src = mutants.partnerLogoUrl.replace(/^\.\//, '');
    var mutantsLead = document.getElementById('mutants-section-lead');
    if (mutantsLead && mutants.sectionLead) mutantsLead.textContent = mutants.sectionLead;
  }
  applyProjectConfig();

  (function normalizeLegacyPaths() {
    var p = (window.location.pathname || '').replace(/\/$/, '') || '/';
    if (p === '/merch-packs') {
      history.replaceState(null, '', '/' + (window.location.hash || ''));
    }
    if (window.location.hash === '#intro') {
      history.replaceState(null, '', p + '#collections');
    }
  })();

  var mainHome = document.getElementById('main-home');
  if (mainHome) mainHome.hidden = false;
  document.body.classList.add('route-home');

  // ----- Section highlighting -----
  const navLinks = document.querySelectorAll('[data-section]');
  const sections = document.querySelectorAll('.section');
  var navScrollInProgress = false;
  var navScrollTargetId = null;

  function setActiveSection(sectionId) {
    navLinks.forEach(function (link) {
      const id = link.getAttribute('data-section');
      link.classList.toggle('dashboard__link--active', id === sectionId);
      link.classList.toggle('dashboard-bottom__item--active', id === sectionId);
    });
  }

  function getSectionIdFromHash() {
    const hash = window.location.hash.slice(1);
    return hash || 'home';
  }

  function scrollToSection(id) {
    const el = document.getElementById(id);
    if (!el) return;
    navScrollInProgress = true;
    navScrollTargetId = id;
    var base = (window.location.pathname || '/').replace(/\/$/, '') || '/';
    window.history.replaceState(null, '', base + '#' + id);
    setActiveSection(id);
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(function () {
      navScrollInProgress = false;
      navScrollTargetId = null;
    }, 1200);
  }

  navLinks.forEach(function (link) {
    link.addEventListener('click', function (e) {
      const sectionId = link.getAttribute('data-section');
      if (sectionId && link.getAttribute('href')?.startsWith('#')) {
        e.preventDefault();
        scrollToSection(sectionId);
      }
    });
  });

  window.addEventListener('hashchange', function () {
    if (!navScrollInProgress) setActiveSection(getSectionIdFromHash());
  });

  const observer = new IntersectionObserver(
    function (entries) {
      if (navScrollInProgress) return;
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;
        if (id) {
          setActiveSection(id);
          if (window.location.hash !== '#' + id) {
            window.history.replaceState(null, '', (window.location.pathname || '/') + '#' + id);
          }
        }
      });
    },
    { rootMargin: '-15% 0px -70% 0px', threshold: 0 }
  );
  sections.forEach(function (section) {
    if (section.id) observer.observe(section);
  });

  setActiveSection(getSectionIdFromHash());

  // ----- Hero ambient audio (play / pause + track list) -----
  (function () {
    var audio = document.getElementById('hero-audio');
    var btn = document.getElementById('hero-audio-btn');
    var trackSelect = document.getElementById('hero-audio-track');
    var iconPlay = btn && btn.querySelector('.hero-home__audio-icon--play');
    var iconPause = btn && btn.querySelector('.hero-home__audio-icon--pause');
    if (!audio || !btn) return;
    function syncUi() {
      var playing = !audio.paused;
      if (iconPlay) iconPlay.hidden = playing;
      if (iconPause) iconPause.hidden = !playing;
      btn.setAttribute('aria-pressed', playing ? 'true' : 'false');
      btn.setAttribute('aria-label', playing ? 'Pause music' : 'Play music');
    }
    function applySelectedTrackSrc() {
      if (!trackSelect || trackSelect.hidden || trackSelect.selectedIndex < 0) return;
      var opt = trackSelect.options[trackSelect.selectedIndex];
      var src = opt && opt.getAttribute('data-src');
      if (!src) return;
      var wasPlaying = !audio.paused;
      audio.pause();
      audio.src = src;
      audio.load();
      if (wasPlaying) {
        var p = audio.play();
        if (p && typeof p.catch === 'function') p.catch(function () {});
      } else {
        syncUi();
      }
    }
    btn.addEventListener('click', function () {
      if (audio.paused) {
        var p = audio.play();
        if (p && typeof p.catch === 'function') p.catch(function () {});
      } else {
        audio.pause();
      }
    });
    if (trackSelect) {
      trackSelect.addEventListener('change', applySelectedTrackSrc);
    }
    audio.addEventListener('play', syncUi);
    audio.addEventListener('pause', syncUi);
    audio.addEventListener('ended', syncUi);
    syncUi();
  })();

  // ----- Wallet (Solana) -----
  function getDetectedWallets() {
    var list = [];
    // Phantom: check window.solana first (Firefox sometimes only has this), then window.phantom.solana
    if (window.solana?.isPhantom) {
      list.push({ name: 'Phantom', provider: window.solana });
    }
    if (window.phantom?.solana?.isPhantom && !list.some(function (w) { return w.provider === window.phantom.solana; })) {
      list.push({ name: 'Phantom', provider: window.phantom.solana });
    }
    if (window.solflare?.isSolflare) {
      list.push({ name: 'Solflare', provider: window.solflare });
    }
    if (window.solana && !list.some(function (w) { return w.provider === window.solana; })) {
      var label = window.solana.isPhantom ? 'Phantom' : window.solana.isSolflare ? 'Solflare' : 'Solana';
      list.push({ name: label, provider: window.solana });
    }
    return list;
  }

  function getSolanaProvider() {
    var wallets = getDetectedWallets();
    var connected = wallets.filter(function (w) { return w.provider.publicKey; });
    if (connected.length) return connected[0].provider;
    if (wallets.length) return wallets[0].provider;
    return null;
  }

  function getWalletPublicKey() {
    var provider = getSolanaProvider();
    return provider && provider.publicKey ? provider.publicKey.toString() : null;
  }
  window.getWalletPublicKey = getWalletPublicKey;
  window.getSolanaProvider = getSolanaProvider;

  function isWalletConnected() {
    return !!getWalletPublicKey();
  }

  function updateConnectWalletButtonLabel() {
    var pk = getWalletPublicKey();
    var label = pk ? truncateWalletDisplay(pk) + ' \u2713' : 'Connect';
    document.querySelectorAll('#btn-connect-wallet .btn__text, #btn-connect-wallet-mobile .btn__text').forEach(function (el) {
      el.textContent = label;
    });
  }

  function setWalletConnected(connected) {
    document.body.classList.toggle('wallet-connected', connected);
    updateConnectWalletButtonLabel();
    if (typeof syncVerifyModalState === 'function') syncVerifyModalState();
    if (connected && window.checkAlreadyVerified) window.checkAlreadyVerified();
  }

  function connectWithProvider(provider) {
    return provider.connect({ onlyIfTrusted: false })
      .then(function () {
        setWalletConnected(true);
        hideHoldings();
        if (typeof linkWalletToDiscord === 'function') {
          var w = getWalletPublicKey();
          if (w) linkWalletToDiscord(w);
        }
      })
      .catch(function (err) {
        if (err.code !== 4001) console.warn('Wallet connect error', err);
        throw err;
      });
  }

  var walletPicker = document.getElementById('wallet-picker');
  var walletPickerBackdrop = document.getElementById('wallet-picker-backdrop');
  var walletPickerClose = document.getElementById('wallet-picker-close');
  var walletPickerList = document.getElementById('wallet-picker-list');

  function openWalletPicker() {
    if (!walletPicker || !walletPickerList) return Promise.reject();
    return new Promise(function (resolve, reject) {
      function renderWallets(wallets) {
        walletPickerList.innerHTML = '';
        wallets.forEach(function (w) {
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'wallet-picker__btn';
          btn.textContent = w.name;
          btn.addEventListener('click', function () {
            closeWalletPicker();
            connectWithProvider(w.provider)
              .then(function () {
                if (walletPicker._resolve) walletPicker._resolve();
                walletPicker._resolve = null;
              })
              .catch(function (err) {
                var msg = (err && (err.message || String(err))) || 'Connection failed';
                alert('Wallet connect failed: ' + msg);
              });
          });
          walletPickerList.appendChild(btn);
        });
        walletPicker.setAttribute('aria-hidden', 'false');
        walletPicker._resolve = resolve;
      }
      function done(wallets) {
        if (wallets.length) {
          renderWallets(wallets);
        } else {
          walletPicker.setAttribute('aria-hidden', 'true');
          alert('No Solana wallet extension detected. Install or enable Phantom, Solflare, or another Solana wallet in this browser.');
          reject(new Error('No provider'));
        }
      }
      walletPicker.setAttribute('aria-hidden', 'false');
      walletPickerList.innerHTML = '<p class="wallet-picker__detecting">Detecting wallets…</p>';
      walletPicker._resolve = resolve;
      var delays = [100, 400, 900, 1600];
      var idx = 0;
      function check() {
        var wallets = getDetectedWallets();
        if (wallets.length) {
          renderWallets(wallets);
          return;
        }
        idx++;
        if (idx < delays.length) {
          setTimeout(check, delays[idx] - delays[idx - 1]);
        } else {
          done([]);
        }
      }
      setTimeout(check, delays[0]);
    });
  }

  function closeWalletPicker() {
    if (walletPicker) walletPicker.setAttribute('aria-hidden', 'true');
    if (walletPicker && walletPicker._resolve) {
      walletPicker._resolve();
      walletPicker._resolve = null;
    }
  }

  function connectWallet() {
    return openWalletPicker();
  }

  (function initWalletListener() {
    getDetectedWallets().forEach(function (w) {
      if (w.provider && typeof w.provider.on === 'function') {
        w.provider.on('accountChanged', function (pk) {
          if (pk) {
            setWalletConnected(true);
            if (typeof linkWalletToDiscord === 'function') linkWalletToDiscord(getWalletPublicKey());
          } else {
            setWalletConnected(false);
          }
          hideHoldings();
        });
      }
    });
    if (getWalletPublicKey()) setWalletConnected(true);
  })();

  document.getElementById('btn-connect-wallet')?.addEventListener('click', connectWallet);
  document.getElementById('btn-connect-wallet-mobile')?.addEventListener('click', connectWallet);
  walletPickerBackdrop?.addEventListener('click', closeWalletPicker);
  walletPickerClose?.addEventListener('click', closeWalletPicker);

  // ----- Holdings UI -----
  const holdingsPanels = document.querySelectorAll('.holdings');

  function showHoldings(data) {
    var tokenVal = data && data.tokenFormatted != null ? data.tokenFormatted : (data && data.token != null ? String(data.token) : '—');
    var col1 = data && data.col1Count != null ? String(data.col1Count) : '—';
    var col2 = data && data.col2Count != null ? String(data.col2Count) : '—';
    var totalNfts = data && data.totalNfts != null ? String(data.totalNfts) : '—';
    [
      [document.getElementById('holdings-token'), document.getElementById('holdings-token-mobile')],
      [document.getElementById('holdings-col1'), document.getElementById('holdings-col1-mobile')],
      [document.getElementById('holdings-col2'), document.getElementById('holdings-col2-mobile')],
      [document.getElementById('holdings-total-nfts'), document.getElementById('holdings-total-nfts-mobile')],
    ].forEach(function (pair, i) {
      var val = [tokenVal, col1, col2, totalNfts][i];
      if (pair[0]) pair[0].textContent = val;
      if (pair[1]) pair[1].textContent = val;
    });
    holdingsPanels.forEach(function (panel) {
      panel.classList.remove('holdings--hidden');
      panel.classList.add('holdings--visible');
    });
    document.body.classList.add('holdings-verified');
  }

  function hideHoldings() {
    holdingsPanels.forEach(function (panel) {
      panel.classList.add('holdings--hidden');
      panel.classList.remove('holdings--visible');
    });
    document.body.classList.remove('holdings-verified');
  }

  function setVerifyLoading(loading) {
    var modalBtn = document.getElementById('verify-modal-btn-verify');
    var sidebarBtn = document.getElementById('btn-verify');
    var panelBtn = document.getElementById('btn-verify-panel');
    if (modalBtn) {
      modalBtn.disabled = loading;
      modalBtn.textContent = loading ? 'Checking…' : 'Verify holdings';
    }
    [sidebarBtn, panelBtn].forEach(function (btn) {
      if (!btn) return;
      btn.disabled = loading;
      btn.textContent = loading ? 'Checking…' : 'Verify';
    });
  }

  function fetchVerifyHoldings(walletAddress) {
    var url = window.location.origin + '/api/verify?wallet=' + encodeURIComponent(walletAddress);
    return fetch(url, { credentials: 'include' })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        if (data) return data;
        if (HOLDINGS_ENDPOINT) {
          var portalUrl = HOLDINGS_ENDPOINT + (HOLDINGS_ENDPOINT.indexOf('?') >= 0 ? '&' : '?') + 'wallet=' + encodeURIComponent(walletAddress);
          return fetch(portalUrl, { method: 'GET', credentials: 'include' })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (d) {
              if (!d) return null;
              return {
                tokenFormatted: d.token != null ? String(d.token) : '0',
                col1Count: 0,
                col2Count: 0,
                totalNfts: d.nfts != null ? d.nfts : 0,
              };
            });
        }
        return null;
      });
  }

  function isDiscordConnected() {
    return document.body.classList.contains('discord-connected');
  }

  function truncateWalletDisplay(addr) {
    if (!addr) return '';
    var s = String(addr).trim();
    if (s.length <= 12) return s;
    return s.slice(0, 4) + '…' + s.slice(-4);
  }
  function normalizeWalletAddr(a) {
    return String(a || '').trim().toLowerCase();
  }

  var linkedWalletThisSession = null;
  var linkedWalletsList = [];
  var walletPendingUnlink = null;

  function fetchLinkedWalletsFromServer() {
    if (!isDiscordConnected()) {
      linkedWalletsList = [];
      return Promise.resolve(linkedWalletsList);
    }
    return fetch(window.location.origin + '/api/wallets', { credentials: 'include', cache: 'no-store' })
      .then(function (r) {
        return r.ok ? r.json() : { wallets: [] };
      })
      .then(function (data) {
        linkedWalletsList = (data && data.wallets) || [];
        return linkedWalletsList;
      })
      .catch(function () {
        linkedWalletsList = [];
        return linkedWalletsList;
      });
  }

  function buildLinkedWalletRowsHTML(wallets) {
    return wallets.map(function (w) {
      var disp = truncateWalletDisplay(w);
      return (
        '<div class="linked-wallets__row" data-wallet="' +
        String(w).replace(/"/g, '&quot;') +
        '"><span class="linked-wallets__addr">' +
        String(disp).replace(/</g, '&lt;') +
        '</span><button type="button" class="linked-wallets__unlink" data-wallet="' +
        String(w).replace(/"/g, '&quot;') +
        '" aria-label="Unlink wallet ' +
        String(disp).replace(/"/g, '&quot;') +
        '" title="Unlink wallet"><img class="linked-wallets__unlink-icon" src="/assets/link-cancel.svg?v=2" alt="" width="20" height="20" /></button></div>'
      );
    }).join('');
  }

  function renderLinkedWalletsUI() {
    var dashEl = document.getElementById('dashboard-linked-wallets');
    var panelEl = document.getElementById('panel-linked-wallets');
    var verifyStep = document.getElementById('verify-modal-linked-step');
    var verifyList = document.getElementById('verify-modal-linked-wallets');
    var soloBtn = document.getElementById('verify-modal-btn-unlink-solo');
    var pk = getWalletPublicKey();
    var n = linkedWalletsList.length;
    var disc = isDiscordConnected();

    if (!disc || n === 0) {
      if (dashEl) {
        dashEl.hidden = true;
        dashEl.innerHTML = '';
      }
      if (panelEl) {
        panelEl.hidden = true;
        panelEl.innerHTML = '';
      }
      if (verifyStep) verifyStep.hidden = true;
      if (verifyList) verifyList.innerHTML = '';
      if (soloBtn) soloBtn.hidden = true;
      return;
    }

    /* Sidebar + panel: always list every Discord-linked wallet (1 or more) with unlink — not only when n>1 */
    var html = buildLinkedWalletRowsHTML(linkedWalletsList);
    if (dashEl) {
      dashEl.innerHTML = html;
      dashEl.hidden = false;
    }
    if (panelEl) {
      panelEl.innerHTML = html;
      panelEl.hidden = false;
    }

    if (n > 1) {
      if (verifyList) verifyList.innerHTML = html;
      if (verifyStep) verifyStep.hidden = false;
    } else {
      if (verifyList) verifyList.innerHTML = '';
      if (verifyStep) verifyStep.hidden = true;
    }

    /* Unlink is on each row above; hide solo verify-modal button to avoid duplicate / missing when n was 1 */
    if (soloBtn) soloBtn.hidden = true;
  }

  function closeUnlinkWalletModal() {
    var m = document.getElementById('unlink-wallet-modal');
    if (m) m.setAttribute('aria-hidden', 'true');
    walletPendingUnlink = null;
  }

  function openUnlinkWalletModal(walletAddress) {
    walletPendingUnlink = walletAddress != null ? String(walletAddress).trim() : '';
    if (!walletPendingUnlink) return;
    var msgEl = document.getElementById('unlink-wallet-modal-msg');
    var m = document.getElementById('unlink-wallet-modal');
    if (msgEl) {
      msgEl.textContent =
        'Assets held in wallet ' +
        truncateWalletDisplay(walletPendingUnlink) +
        ' will no longer be associated with your Discord login. You can link this wallet again later from this site.';
    }
    if (m) m.setAttribute('aria-hidden', 'false');
  }

  function confirmUnlinkWallet() {
    var w = walletPendingUnlink;
    if (!w) return;
    fetch(window.location.origin + '/api/wallets/unlink', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet: w }),
    })
      .then(function (r) {
        return r
          .json()
          .catch(function () {
            return {};
          })
          .then(function (data) {
            return { ok: r.ok, data: data };
          });
      })
      .then(function (res) {
        closeUnlinkWalletModal();
        if (!res.ok) {
          var err = (res.data && res.data.error) || 'Could not unlink wallet.';
          alert(err);
          return;
        }
        var pk = getWalletPublicKey();
        if (pk && normalizeWalletAddr(pk) === normalizeWalletAddr(w)) {
          linkedWalletThisSession = null;
          hasVerifiedThisSession = false;
          hideHoldings();
        }
        return fetchLinkedWalletsFromServer().then(function () {
          renderLinkedWalletsUI();
          syncVerifyModalState();
          updateConnectWalletButtonLabel();
        });
      })
      .catch(function () {
        closeUnlinkWalletModal();
        alert('Network error. Try again.');
      });
  }

  function linkWalletToDiscord(walletAddress) {
    var addr = walletAddress != null ? String(walletAddress).trim() : '';
    if (!addr || !isDiscordConnected()) return Promise.resolve();
    if (linkedWalletThisSession && normalizeWalletAddr(linkedWalletThisSession) === normalizeWalletAddr(addr)) {
      return fetchLinkedWalletsFromServer().then(function () {
        renderLinkedWalletsUI();
        syncVerifyModalState();
      });
    }
    var base = window.location.origin + '/api/wallets/link';
    function doPost() {
      return fetch(base, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ wallet: addr }),
      });
    }
    function doGet() {
      return fetch(base + '?wallet=' + encodeURIComponent(addr), { method: 'GET', credentials: 'include' });
    }
    function attempt(delay) {
      return new Promise(function (r) { setTimeout(r, delay || 0); })
        .then(doPost)
        .then(function (r) {
          if (r.ok) { linkedWalletThisSession = addr; return r; }
          if (r.status === 404) return doGet().then(function (g) { if (g.ok) linkedWalletThisSession = addr; return g; });
          if (r.status === 401 && delay !== 1200) return attempt(delay === 0 ? 400 : 1200);
          return r;
        })
        .catch(function () {});
    }
    return attempt(0).then(function () {
      return fetchLinkedWalletsFromServer();
    }).then(function () {
      renderLinkedWalletsUI();
      syncVerifyModalState();
    });
  }

  function doVerify(onSuccess) {
    var wallet = getWalletPublicKey();
    if (!wallet) return;
    setVerifyLoading(true);
    function done(data) {
      setVerifyLoading(false);
      showHoldings(data || {});
      linkWalletToDiscord(wallet);
      if (typeof onSuccess === 'function') onSuccess();
    }
    function fail(err) {
      setVerifyLoading(false);
      console.warn('Verify failed', err);
      showHoldings({});
      alert('Could not load holdings. Check console or try again.');
    }
    fetchVerifyHoldings(wallet).then(done).catch(fail);
  }

  // ----- Verify modal (3 steps) -----
  var verifyModal = document.getElementById('verify-modal');
  var verifyModalBackdrop = document.getElementById('verify-modal-backdrop');
  var verifyModalClose = document.getElementById('verify-modal-close');
  var verifyModalBtnDiscord = document.getElementById('verify-modal-btn-discord');
  var verifyModalDiscordConnected = document.getElementById('verify-modal-discord-connected');
  var verifyModalDiscordAvatar = document.getElementById('verify-modal-discord-avatar');
  var verifyModalDiscordUsername = document.getElementById('verify-modal-discord-username');
  var verifyModalBtnWallet = document.getElementById('verify-modal-btn-wallet');
  var verifyModalWalletConnected = document.getElementById('verify-modal-wallet-connected');
  var verifyModalWalletAddress = document.getElementById('verify-modal-wallet-address');
  var verifyModalBtnVerify = document.getElementById('verify-modal-btn-verify');
  var verifyModalSuccess = document.getElementById('verify-modal-success');
  var heroVerifyActions = document.getElementById('hero-verify-actions');
  var hasVerifiedThisSession = false;

  function openVerifyModal() {
    if (!verifyModal) return;
    verifyModal.setAttribute('aria-hidden', 'false');
    syncVerifyModalState();
  }

  function closeVerifyModal() {
    if (verifyModal) verifyModal.setAttribute('aria-hidden', 'true');
  }

  function getDiscordAvatarUrl(user) {
    if (!user || !user.id) return '';
    if (user.avatar) {
      var ext = user.avatar.startsWith('a_') ? 'gif' : 'png';
      return 'https://cdn.discordapp.com/avatars/' + user.id + '/' + user.avatar + '.' + ext;
    }
    return 'https://cdn.discordapp.com/embed/avatars/' + (parseInt(user.discriminator, 10) % 5) + '.png';
  }

  function syncVerifyModalState() {
    var discordOk = isDiscordConnected();
    var walletOk = !!getWalletPublicKey();

    if (verifyModalBtnDiscord) {
      verifyModalBtnDiscord.hidden = !!discordOk;
      verifyModalBtnDiscord.disabled = false;
    }
    if (verifyModalDiscordConnected) {
      verifyModalDiscordConnected.hidden = !discordOk;
      if (discordOk && discordUser) {
        if (verifyModalDiscordAvatar) {
          verifyModalDiscordAvatar.src = getDiscordAvatarUrl(discordUser);
          verifyModalDiscordAvatar.alt = (discordUser.global_name || discordUser.username) || 'Discord';
        }
        if (verifyModalDiscordUsername) {
          verifyModalDiscordUsername.textContent = discordUser.global_name || discordUser.username || 'Connected';
        }
      }
    }

    if (verifyModalBtnWallet) {
      verifyModalBtnWallet.disabled = !discordOk;
      verifyModalBtnWallet.hidden = !!walletOk;
    }
    if (verifyModalWalletConnected) {
      verifyModalWalletConnected.hidden = !walletOk;
      if (walletOk && verifyModalWalletAddress) {
        var addr = getWalletPublicKey();
        verifyModalWalletAddress.textContent = addr ? (addr.slice(0, 4) + '…' + addr.slice(-4)) : '';
      }
    }

    if (verifyModalBtnVerify) {
      verifyModalBtnVerify.disabled = !discordOk || !walletOk;
      verifyModalBtnVerify.hidden = hasVerifiedThisSession;
    }
    if (verifyModalSuccess) {
      verifyModalSuccess.hidden = !hasVerifiedThisSession;
    }
    if (heroVerifyActions) {
      heroVerifyActions.classList.toggle('hero-home__actions--verified', hasVerifiedThisSession);
    }
    var verifyBtnSidebar = document.getElementById('btn-verify');
    var verifyBtnPanel = document.getElementById('btn-verify-panel');
    if (verifyBtnSidebar) verifyBtnSidebar.hidden = hasVerifiedThisSession;
    if (verifyBtnPanel) verifyBtnPanel.hidden = hasVerifiedThisSession;

    renderLinkedWalletsUI();
  }

  function setVerifySuccessInModal() {
    hasVerifiedThisSession = true;
    syncVerifyModalState();
  }

  function checkAlreadyVerified() {
    if (!isDiscordConnected() || !getWalletPublicKey()) return;
    if (hasVerifiedThisSession) return;
    fetchVerifyHoldings(getWalletPublicKey()).then(function (data) {
      if (data) {
        hasVerifiedThisSession = true;
        showHoldings(data);
        syncVerifyModalState();
      }
    });
  }
  window.checkAlreadyVerified = checkAlreadyVerified;

  document.getElementById('btn-verify')?.addEventListener('click', openVerifyModal);
  document.getElementById('btn-verify-panel')?.addEventListener('click', function () {
    closeMobilePanel();
    openVerifyModal();
  });

  if (verifyModalBackdrop) verifyModalBackdrop.addEventListener('click', closeVerifyModal);
  if (verifyModalClose) verifyModalClose.addEventListener('click', closeVerifyModal);

  if (verifyModalBtnDiscord) {
    verifyModalBtnDiscord.addEventListener('click', function () {
      window.location.href = getDiscordAuthUrl();
    });
  }

  if (verifyModalBtnWallet) {
    verifyModalBtnWallet.addEventListener('click', function () {
      if (verifyModalBtnWallet.disabled) return;
      connectWallet().then(syncVerifyModalState).catch(function () {});
    });
  }

  if (verifyModalBtnVerify) {
    verifyModalBtnVerify.addEventListener('click', function () {
      if (verifyModalBtnVerify.disabled) return;
      doVerify(function () {
        setVerifySuccessInModal();
      });
    });
  }

  function onLinkedWalletsContainerClick(e) {
    var btn = e.target.closest('.linked-wallets__unlink');
    if (!btn || !btn.getAttribute('data-wallet')) return;
    e.preventDefault();
    openUnlinkWalletModal(btn.getAttribute('data-wallet'));
  }
  document.getElementById('dashboard-linked-wallets')?.addEventListener('click', onLinkedWalletsContainerClick);
  document.getElementById('panel-linked-wallets')?.addEventListener('click', onLinkedWalletsContainerClick);
  document.getElementById('verify-modal-linked-wallets')?.addEventListener('click', onLinkedWalletsContainerClick);

  document.getElementById('verify-modal-btn-unlink-solo')?.addEventListener('click', function (e) {
    e.preventDefault();
    if (linkedWalletsList.length !== 1) return;
    openUnlinkWalletModal(linkedWalletsList[0]);
  });

  document.getElementById('unlink-wallet-modal-backdrop')?.addEventListener('click', closeUnlinkWalletModal);
  document.getElementById('unlink-wallet-modal-close')?.addEventListener('click', closeUnlinkWalletModal);
  document.getElementById('unlink-wallet-modal-cancel')?.addEventListener('click', closeUnlinkWalletModal);
  document.getElementById('unlink-wallet-modal-confirm')?.addEventListener('click', confirmUnlinkWallet);

  // ----- Discord login -----
  var discordUser = null;

  function getDiscordAuthUrl() {
    if (CONFIG.discordConnectUrl && (CONFIG.discordConnectUrl.startsWith('http://') || CONFIG.discordConnectUrl.startsWith('https://'))) {
      return CONFIG.discordConnectUrl;
    }
    return window.location.origin + '/api/discord/auth';
  }

  function setDiscordUI(connected, userOrUsername) {
    document.body.classList.toggle('discord-connected', !!connected);
    if (connected && userOrUsername != null) {
      discordUser = typeof userOrUsername === 'object' ? userOrUsername : { global_name: userOrUsername, username: userOrUsername };
    } else {
      discordUser = null;
    }
    var name = discordUser && (discordUser.global_name || discordUser.username);
    var btnSidebar = document.getElementById('btn-connect-discord');
    var btnMobile = document.getElementById('btn-connect-discord-mobile');
    var wrapSidebar = document.getElementById('discord-connected-sidebar');
    var wrapMobile = document.getElementById('discord-connected-mobile');
    if (btnSidebar) {
      btnSidebar.hidden = !!connected;
      var textSidebar = btnSidebar.querySelector('.btn__text');
      if (textSidebar) textSidebar.textContent = 'Login'; else btnSidebar.textContent = 'Login';
      btnSidebar.title = 'Sign in with Discord';
      btnSidebar.dataset.discordConnected = connected ? '1' : '0';
    }
    if (btnMobile) {
      btnMobile.hidden = !!connected;
      var textMobile = btnMobile.querySelector('.btn__text');
      if (textMobile) textMobile.textContent = 'Login'; else btnMobile.textContent = 'Login';
      btnMobile.title = 'Sign in with Discord';
      btnMobile.dataset.discordConnected = connected ? '1' : '0';
    }
    if (wrapSidebar) {
      wrapSidebar.hidden = !connected;
      if (connected && discordUser) {
        var avSidebar = document.getElementById('discord-avatar-sidebar');
        var nameSidebar = document.getElementById('discord-username-sidebar');
        if (avSidebar) avSidebar.src = getDiscordAvatarUrl(discordUser);
        if (avSidebar) avSidebar.alt = name || 'Discord';
        if (nameSidebar) nameSidebar.textContent = name || 'Connected';
      }
    }
    if (wrapMobile) {
      wrapMobile.hidden = !connected;
      if (connected && discordUser) {
        var avMobile = document.getElementById('discord-avatar-mobile');
        var nameMobile = document.getElementById('discord-username-mobile');
        if (avMobile) avMobile.src = getDiscordAvatarUrl(discordUser);
        if (avMobile) avMobile.alt = name || 'Discord';
        if (nameMobile) nameMobile.textContent = name || 'Connected';
      }
    }
    syncVerifyModalState();
    if (connected) {
      fetchLinkedWalletsFromServer().then(function () {
        renderLinkedWalletsUI();
        syncVerifyModalState();
      });
      if (typeof getWalletPublicKey === 'function') {
        var w = getWalletPublicKey();
        if (w && typeof linkWalletToDiscord === 'function') setTimeout(function () { linkWalletToDiscord(w); }, 400);
      }
      if (window.checkAlreadyVerified) window.checkAlreadyVerified();
    } else {
      linkedWalletsList = [];
      linkedWalletThisSession = null;
      renderLinkedWalletsUI();
      syncVerifyModalState();
    }
    if (typeof window.refreshMerchWaitlistUI === 'function') window.refreshMerchWaitlistUI();
  }

  function fetchDiscordMe() {
    return fetch(window.location.origin + '/api/discord/me', {
      credentials: 'include',
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    })
      .then(function (res) {
        if (!res.ok) return null;
        return res.json();
      })
      .then(function (data) {
        if (data && data.connected && data.user) {
          setDiscordUI(true, data.user);
          return data.user;
        }
        setDiscordUI(false);
        return null;
      })
      .catch(function () {
        setDiscordUI(false);
        return null;
      });
  }

  function connectDiscord() {
    if (document.body.classList.contains('discord-connected')) {
      logoutDiscord();
      return;
    }
    window.location.href = getDiscordAuthUrl();
  }

  function logoutDiscord() {
    fetch(window.location.origin + '/api/discord/logout', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
      .then(function () {
        setDiscordUI(false);
      })
      .catch(function () {
        setDiscordUI(false);
      });
  }

  document.getElementById('btn-connect-discord')?.addEventListener('click', function (e) {
    e.preventDefault();
    if (document.body.classList.contains('discord-connected')) logoutDiscord();
    else window.location.href = getDiscordAuthUrl();
  });
  document.getElementById('btn-connect-discord-mobile')?.addEventListener('click', function (e) {
    e.preventDefault();
    if (document.body.classList.contains('discord-connected')) logoutDiscord();
    else window.location.href = getDiscordAuthUrl();
  });
  document.getElementById('btn-discord-logout-sidebar')?.addEventListener('click', function (e) {
    e.preventDefault();
    logoutDiscord();
  });
  document.getElementById('btn-discord-logout-mobile')?.addEventListener('click', function (e) {
    e.preventDefault();
    logoutDiscord();
  });

  // On load: check Discord session and ?discord= query; reopen verify modal when returning from Discord
  (function onLoadDiscordAndModal() {
    var params = new URLSearchParams(window.location.search);
    var discordParam = params.get('discord');
    if (discordParam === 'connected') {
      openVerifyModal();
    }
    function done() {
      if (discordParam === 'connected' || discordParam === 'error') {
        var cleanUrl = window.location.pathname + (window.location.hash || '') || '/';
        window.history.replaceState(null, '', cleanUrl);
      }
    }
    function retryConnected(attempt) {
      fetchDiscordMe().then(function (user) {
        if (discordParam === 'connected' && !user && attempt < 3) {
          var waits = [400, 1200, 2500];
          setTimeout(function () { retryConnected(attempt + 1); }, waits[attempt]);
          return;
        }
        done();
      }).catch(done);
    }
    retryConnected(0);
  })();

  // ----- Mobile panel -----
  var mobilePanel = document.getElementById('mobile-panel');
  var panelHandle = document.getElementById('panel-handle');

  function openMobilePanel() {
    if (window.innerWidth >= BREAKPOINT) return;
    if (mobilePanel) {
      mobilePanel.classList.remove('panel--hidden');
      mobilePanel.setAttribute('aria-hidden', 'false');
    }
  }

  function closeMobilePanel() {
    if (mobilePanel) {
      mobilePanel.classList.add('panel--hidden');
      mobilePanel.setAttribute('aria-hidden', 'true');
    }
  }

  panelHandle?.addEventListener('click', function () {
    if (mobilePanel?.classList.contains('panel--hidden')) openMobilePanel();
    else closeMobilePanel();
  });

  document.getElementById('btn-more-mobile')?.addEventListener('click', function () {
    if (mobilePanel?.classList.contains('panel--hidden')) openMobilePanel();
    else closeMobilePanel();
  });

  document.getElementById('btn-panel-close')?.addEventListener('click', closeMobilePanel);

  // Close panel when a "more" menu link is clicked (section nav still handled by [data-section] links)
  mobilePanel?.querySelectorAll('.panel__link').forEach(function (link) {
    link.addEventListener('click', closeMobilePanel);
  });

  function updateMutantsSectionFromCollections(collections) {
    var cfg = CONFIG.mutants || {};
    var slug = cfg.collectionSlug || 'mutant_ugly_ape_squad_collection';
    var total = cfg.totalSupply != null ? Number(cfg.totalSupply) : 2222;
    var mintedEl = document.getElementById('mutants-minted');
    var totalEl = document.getElementById('mutants-total');
    var fillEl = document.getElementById('mutants-progress-fill');
    var barEl = document.getElementById('mutants-progress');
    if (!mintedEl || !fillEl) return;
    if (totalEl) totalEl.textContent = String(total);
    var col = null;
    if (collections && collections.length) {
      for (var i = 0; i < collections.length; i++) {
        if (collections[i].symbol === slug) {
          col = collections[i];
          break;
        }
      }
    }
    var minted = col && col.supply != null ? Number(col.supply) : null;
    if (minted == null || isNaN(minted)) {
      mintedEl.textContent = '—';
      fillEl.style.width = '0%';
      if (barEl) {
        barEl.setAttribute('aria-valuenow', '0');
        barEl.setAttribute('aria-valuemax', String(total));
        barEl.setAttribute('aria-valuetext', 'Minted count unavailable');
      }
      return;
    }
    var pct = total > 0 ? Math.min(100, Math.max(0, (minted / total) * 100)) : 0;
    mintedEl.textContent = String(Math.round(minted));
    fillEl.style.width = pct + '%';
    if (barEl) {
      barEl.setAttribute('aria-valuenow', String(Math.round(minted)));
      barEl.setAttribute('aria-valuemax', String(total));
      barEl.setAttribute('aria-valuetext', Math.round(minted) + ' of ' + total + ' minted');
    }
  }

  // ----- Collections embeds + Mutants mint progress (shared /api/collections) -----
  var grid = document.getElementById('collections-grid');
  var mutantsSection = document.getElementById('mutants');
  if (grid || mutantsSection) {
    fetch(window.location.origin + '/api/collections', { credentials: 'include' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        var cols = data && data.collections ? data.collections : [];
        if (grid) {
          grid.innerHTML = '';
          if (cols.length) {
            cols.forEach(function (c) {
              var card = document.createElement('div');
              card.className = 'card card--nft card--embed';
              var cardImages = CONFIG.collectionCardImages || {};
              var overrideImg = c.symbol && cardImages[c.symbol] ? cardImages[c.symbol] : null;
              var mediaSrc = overrideImg || c.animationUrl || c.image;
              var mediaHtml = '';
              if (mediaSrc) {
                var isGif = !overrideImg && (/\.gif(\?|$)/i.test(mediaSrc) || (c.animationUrl && !c.image));
                if (isGif) {
                  mediaHtml = '<div class="embed__media embed__media--video"><img src="' + escapeHtml(mediaSrc) + '" alt="" loading="lazy" /></div>';
                } else {
                  mediaHtml = '<div class="embed__media"><img src="' + escapeHtml(mediaSrc) + '" alt="" loading="lazy" /></div>';
                }
              } else {
                mediaHtml = '<div class="embed__media embed__media--placeholder" aria-hidden="true"></div>';
              }
              var stats = [];
              if (c.supply != null && Number(c.supply) > 1) stats.push({ label: 'Supply', value: formatNum(c.supply) });
              if (c.listedCount != null) stats.push({ label: 'Listed', value: formatNum(c.listedCount) });
              if (c.floorPriceSol != null) stats.push({ label: 'Floor', value: c.floorPriceSol + ' SOL' });
              if (c.volumeAllSol != null) stats.push({ label: 'Volume', value: c.volumeAllSol + ' SOL' });
              if (c.avgPrice24hrSol != null) stats.push({ label: '24h avg', value: c.avgPrice24hrSol + ' SOL' });
              var statsHtml = stats.length ? '<div class="embed__stats">' + stats.map(function (s) {
                return '<div class="embed__stat"><span class="embed__stat-label">' + escapeHtml(s.label) + '</span><span class="embed__stat-value">' + escapeHtml(s.value) + '</span></div>';
              }).join('') + '</div>' : '';
              var meUrl = c.marketplaceUrl || ('https://magiceden.io/marketplace/' + encodeURIComponent(c.symbol || ''));
              var tensorUrl = c.tensorUrl || ('https://www.tensor.trade/trade/' + encodeURIComponent(c.symbol || ''));
              var actionsHtml =
                '<div class="collections__actions">' +
                '<a href="' + escapeHtml(meUrl) + '" class="collections__btn" target="_blank" rel="noopener" aria-label="Trade on Magic Eden">' +
                  '<img src="assets/magic-eden.png" alt="Magic Eden" class="collections__btn-img collections__btn-img--me" loading="lazy" />' +
                '</a>' +
                '<a href="' + escapeHtml(tensorUrl) + '" class="collections__btn" target="_blank" rel="noopener" aria-label="Trade on Tensor">' +
                  '<img src="assets/tensor.png" alt="Tensor" class="collections__btn-img" loading="lazy" />' +
                '</a>' +
                '</div>';
              card.innerHTML =
                mediaHtml +
                '<div class="embed__body">' +
                  '<h3 class="card__title">' + escapeHtml(c.name || c.symbol) + '</h3>' +
                  statsHtml +
                  actionsHtml +
                '</div>';
              grid.appendChild(card);
            });
          }
        }
        updateMutantsSectionFromCollections(cols);
      })
      .catch(function () {
        updateMutantsSectionFromCollections([]);
      });
  }

  function escapeHtml(s) {
    if (s == null) return '';
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }
  function formatNum(n) {
    if (n == null) return '—';
    if (typeof n !== 'number') return String(n);
    if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return String(n);
  }

  function discordAvatarUrlFromUser(u) {
    if (!u || !u.id) return '';
    if (u.avatar) {
      var ext = u.avatar.startsWith('a_') ? 'gif' : 'png';
      return 'https://cdn.discordapp.com/avatars/' + u.id + '/' + u.avatar + '.' + ext;
    }
    return 'https://cdn.discordapp.com/embed/avatars/' + (parseInt(u.discriminator, 10) % 5 || 0) + '.png';
  }

  function xHandleFromUrl(url) {
    if (!url || typeof url !== 'string') return '';
    try {
      var u = new URL(url.indexOf('://') >= 0 ? url : 'https://' + url);
      var path = u.pathname.replace(/^\/+|\/+$/g, '');
      var parts = path.split('/');
      var handle = parts[parts.length - 1];
      return handle ? '@' + handle : '';
    } catch (_) { return ''; }
  }

  // ----- Team (config + Discord id → display name + avatar via /api/discord/public-users) -----
  var teamGrid = document.getElementById('team-grid');
  if (teamGrid && window.UGLY_APE_SQUAD_CONFIG && Array.isArray(window.UGLY_APE_SQUAD_CONFIG.team) && window.UGLY_APE_SQUAD_CONFIG.team.length > 0) {
    var teamList = window.UGLY_APE_SQUAD_CONFIG.team;
    var placeholderSvg =
      'data:image/svg+xml,' +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%23666" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/></svg>'
      );
    function renderTeamCards(discordById) {
      discordById = discordById || {};
      teamGrid.innerHTML = '';
      teamList.forEach(function (member) {
        var did = member.discordId != null ? String(member.discordId) : '';
        var d = did && discordById[did];
        var name = (d && d.displayName) ? d.displayName : member.name || 'Team';
        var image = member.image || '';
        var imgSrc =
          (d && d.avatarUrl) ? d.avatarUrl : image ? image : placeholderSvg;
        var role = member.role || '';
        var xUrl = member.xProfileUrl || '';
        var card = document.createElement('div');
        card.className = 'card card--team';
        var handleDisplay = xHandleFromUrl(xUrl);
        var xLine =
          xUrl && handleDisplay
            ? '<p class="card__meta card__meta--handle"><a class="link link--external" href="' +
              escapeHtml(xUrl) +
              '" target="_blank" rel="noopener">' +
              escapeHtml(handleDisplay) +
              '</a></p>'
            : '';
        card.innerHTML =
          '<div class="card__avatar-wrap">' +
          '<img class="card__avatar card__avatar--img" src="' +
          escapeHtml(imgSrc) +
          '" alt="" loading="lazy" />' +
          '</div>' +
          '<h3 class="card__title">' +
          escapeHtml(name) +
          '</h3>' +
          xLine +
          (role ? '<p class="card__text card__text--role">' + escapeHtml(role) + '</p>' : '');
        teamGrid.appendChild(card);
      });
    }
    var teamDiscordIds = teamList
      .map(function (m) {
        return m.discordId != null ? String(m.discordId).trim() : '';
      })
      .filter(Boolean);
    if (teamDiscordIds.length) {
      fetch(window.location.origin + '/api/discord/public-users?ids=' + encodeURIComponent(teamDiscordIds.join(',')), {
        credentials: 'include',
      })
        .then(function (r) {
          if (!r.ok) {
            console.warn('[Team] /api/discord/public-users failed:', r.status, r.statusText);
            return { users: [], configured: null };
          }
          return r.json();
        })
        .then(function (data) {
          if (data && data.configured === false) {
            console.warn(
              '[Team] Discord avatars need DISCORD_BOT_TOKEN on the server. Add it in Vercel → Project → Settings → Environment Variables (same token as local .env).'
            );
          }
          var map = {};
          (data.users || []).forEach(function (u) {
            if (u && u.id) map[String(u.id)] = u;
          });
          renderTeamCards(map);
        })
        .catch(function () {
          renderTeamCards({});
        });
    } else {
      renderTeamCards({});
    }
  }

  // ----- Holders table (with live $ value from /api/prices) -----
  var holdersTbody = document.getElementById('holders-tbody');
  var holdersSortSelect = document.getElementById('holders-sort');
  if (holdersTbody && holdersSortSelect) {
    function formatUsd(n) {
      if (n == null || isNaN(n)) return '—';
      if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
      if (n >= 1e3) return '$' + (n / 1e3).toFixed(2) + 'K';
      if (n >= 1) return '$' + n.toFixed(2);
      if (n >= 0.01) return '$' + n.toFixed(2);
      return '$' + n.toFixed(4);
    }
    var HOLDERS_ME_LISTINGS_WALLET = '1BWutmTvYPwDtmw9abTkS4Ssr8no61spGAvW1X6NDix';

    function loadHolders(sort) {
      sort = sort || 'total';
      if (sort === 'nfts') sort = 'total';
      var table = document.getElementById('holders-table');
      if (table) table.className = 'holders-table holders-table--sort-' + sort;
      holdersTbody.innerHTML = '<tr><td colspan="6" class="holders-loading">Loading…</td></tr>';
      Promise.all([
        fetch(window.location.origin + '/api/holders?sort=' + encodeURIComponent(sort), { credentials: 'include' }).then(function (r) { return r.ok ? r.json() : null; }),
        fetch(window.location.origin + '/api/prices', { credentials: 'include' }).then(function (r) { return r.ok ? r.json() : null; }),
        fetch(window.location.origin + '/api/collections', { credentials: 'include' }).then(function (r) { return r.ok ? r.json() : null; }),
      ]).then(function (arr) {
        var data = arr[0];
        var prices = arr[1] || {};
        var collectionsData = arr[2];
        var tokenUsd = prices.tokenUsd;
        var solUsd = prices.solUsd;
        var floorCol1Sol = null;
        var floorCol2Sol = null;
        if (collectionsData && collectionsData.collections && Array.isArray(collectionsData.collections)) {
          var cols = collectionsData.collections;
          if (cols[0] && cols[0].floorPriceSol != null) floorCol1Sol = parseFloat(String(cols[0].floorPriceSol), 10);
          if (cols[1] && cols[1].floorPriceSol != null) floorCol2Sol = parseFloat(String(cols[1].floorPriceSol), 10);
        }
        var solUsdNum = solUsd != null ? Number(solUsd) : null;
        var tokenUsdNum = tokenUsd != null ? Number(tokenUsd) : null;
        if (!data || !data.holders) {
          holdersTbody.innerHTML = '<tr><td colspan="6" class="holders-empty">No data</td></tr>';
          return;
        }
        var list = data.holders.map(function (h) {
          var tokenBal = h.tokenBalance != null ? Number(h.tokenBalance) : null;
          var col1Count = Number(h.col1Count) || 0;
          var col2Count = Number(h.col2Count) || 0;
          var tokenValueUsd = (tokenUsdNum != null && !isNaN(tokenUsdNum) && tokenBal != null && !isNaN(tokenBal)) ? tokenBal * tokenUsdNum : null;
          var nftValueCol1 = (solUsdNum != null && !isNaN(solUsdNum) && floorCol1Sol != null && !isNaN(floorCol1Sol)) ? col1Count * floorCol1Sol * solUsdNum : null;
          var nftValueCol2 = (solUsdNum != null && !isNaN(solUsdNum) && floorCol2Sol != null && !isNaN(floorCol2Sol)) ? col2Count * floorCol2Sol * solUsdNum : null;
          var nftValueUsd = null;
          if (solUsdNum != null && !isNaN(solUsdNum) && (floorCol1Sol != null || floorCol2Sol != null)) {
            var nftSol = col1Count * (floorCol1Sol || 0) + col2Count * (floorCol2Sol || 0);
            nftValueUsd = nftSol * solUsdNum;
          }
          var totalValueUsd = null;
          if (tokenValueUsd != null || nftValueUsd != null) {
            totalValueUsd = (tokenValueUsd != null ? tokenValueUsd : 0) + (nftValueUsd != null ? nftValueUsd : 0);
          }
          return {
            h: h,
            tokenBal: tokenBal != null ? tokenBal : 0,
            tokenValueUsd: tokenValueUsd,
            totalValueUsd: totalValueUsd,
            nftValueCol1: nftValueCol1,
            nftValueCol2: nftValueCol2,
            col1Count: col1Count,
            col2Count: col2Count,
          };
        });
        if (sort === 'token') {
          list.sort(function (a, b) { return b.tokenBal - a.tokenBal; });
        } else if (sort === 'col2') {
          list.sort(function (a, b) {
            var va = a.nftValueCol2 != null ? a.nftValueCol2 : -1;
            var vb = b.nftValueCol2 != null ? b.nftValueCol2 : -1;
            if (va >= 0 && vb >= 0) return vb - va;
            if (va >= 0) return -1;
            if (vb >= 0) return 1;
            return b.col2Count - a.col2Count;
          });
        } else if (sort === 'col1') {
          list.sort(function (a, b) {
            var va = a.nftValueCol1 != null ? a.nftValueCol1 : -1;
            var vb = b.nftValueCol1 != null ? b.nftValueCol1 : -1;
            if (va >= 0 && vb >= 0) return vb - va;
            if (va >= 0) return -1;
            if (vb >= 0) return 1;
            return b.col1Count - a.col1Count;
          });
        } else {
          list.sort(function (a, b) {
            var va = a.totalValueUsd != null ? a.totalValueUsd : -1;
            var vb = b.totalValueUsd != null ? b.totalValueUsd : -1;
            return vb - va;
          });
        }
        var rows = list.map(function (item, i) {
          var h = item.h;
          var valueUsd =
            sort === 'total'
              ? item.totalValueUsd
              : sort === 'token'
                ? item.tokenValueUsd
                : sort === 'col1'
                  ? item.nftValueCol1
                  : sort === 'col2'
                    ? item.nftValueCol2
                    : null;
          var valueCell = valueUsd != null ? formatUsd(valueUsd) : '—';
          var baseName = h.displayName || (h.wallet && h.wallet.length > 12 ? h.wallet.slice(0, 4) + '…' + h.wallet.slice(-4) : (h.wallet || '—'));
          var displayName = baseName + (h.walletCount > 1 ? ' (' + h.walletCount + ' wallets)' : '');
          var walletLink = h.wallet ? 'https://solscan.io/account/' + encodeURIComponent(h.wallet) : null;
          var walletLower = (h.wallet || '').toLowerCase();
          var isMeListings = walletLower === HOLDERS_ME_LISTINGS_WALLET.toLowerCase();
          var nameClass = 'holders-wallet';
          if (isMeListings) nameClass += ' holders-wallet--special';
          else if (h.discordId) nameClass += ' holders-wallet--discord';
          var label = isMeListings ? 'ME Listings' : displayName;
          var nameCell = walletLink && !isMeListings
            ? '<a href="' + escapeHtml(walletLink) + '" target="_blank" rel="noopener" class="' + nameClass + '">' + escapeHtml(label) + '</a>'
            : '<span class="' + nameClass + '">' + escapeHtml(label) + '</span>';
          return '<tr>' +
            '<td>' + (i + 1) + '</td>' +
            '<td>' + nameCell + '</td>' +
            '<td data-col="token">' + escapeHtml(h.tokenBalanceFormatted || '0') + '</td>' +
            '<td data-col="col1">' + (h.col1Count || 0) + '</td>' +
            '<td data-col="col2">' + (h.col2Count || 0) + '</td>' +
            '<td>' + escapeHtml(valueCell) + '</td>' +
            '</tr>';
        });
        holdersTbody.innerHTML = rows.length ? rows.join('') : '<tr><td colspan="6" class="holders-empty">No holders</td></tr>';
      }).catch(function () {
        holdersTbody.innerHTML = '<tr><td colspan="6" class="holders-empty">Failed to load</td></tr>';
      });
    }
    loadHolders('total');
    holdersSortSelect.addEventListener('change', function () {
      loadHolders(holdersSortSelect.value);
    });
  }

  // ----- Tokenomics: DEXTools-style price + metrics + 15m chart -----
  var priceUsdEl = document.getElementById('tokenomics-price-usd');
  var change24El = document.getElementById('tokenomics-change-24h');
  var priceSolEl = document.getElementById('tokenomics-price-sol');
  var mcapEl = document.getElementById('tokenomics-mcap');
  var liqEl = document.getElementById('tokenomics-liq');
  var volEl = document.getElementById('tokenomics-vol');
  var chartEl = document.getElementById('token-chart');
  var chartHintEl = document.getElementById('token-chart-hint');

  function formatUsd(val) {
    if (val == null || isNaN(val)) return '—';
    if (val >= 1e9) return '$' + (val / 1e9).toFixed(2) + 'B';
    if (val >= 1e6) return '$' + (val / 1e6).toFixed(2) + 'M';
    if (val >= 1e3) return '$' + (val / 1e3).toFixed(2) + 'K';
    if (val >= 1) return '$' + val.toFixed(2);
    if (val >= 0.01) return '$' + val.toFixed(4);
    return val < 0.0001 ? '$' + val.toExponential(2) : '$' + val.toFixed(6);
  }

  function formatPrice(val) {
    if (val == null || isNaN(val)) return '—';
    if (val >= 1) return val.toFixed(2);
    if (val >= 0.01) return val.toFixed(4);
    return val < 0.0001 ? val.toExponential(2) : val.toFixed(6);
  }

  /** Right-axis / crosshair labels for OHLC when USD price is sub-penny (Lightweight Charts defaults show 0.00). */
  function formatChartPriceScale(val) {
    if (val == null || isNaN(val)) return '';
    var v = Number(val);
    var a = Math.abs(v);
    if (a >= 1) return v.toFixed(4);
    if (a >= 0.01) return v.toFixed(6);
    if (a >= 1e-12) {
      var decimals = Math.min(14, Math.max(6, -Math.floor(Math.log10(a)) + 2));
      return v.toFixed(decimals);
    }
    return v.toExponential(4);
  }

  if (priceUsdEl || priceSolEl) {
    fetch(window.location.origin + '/api/prices', { credentials: 'include' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (p) {
        if (!p) return;
        if (priceUsdEl && p.tokenUsd != null) priceUsdEl.textContent = '$' + formatPrice(p.tokenUsd);
        if (priceSolEl && p.tokenPerSol != null) priceSolEl.textContent = formatPrice(p.tokenPerSol) + ' SOL';
        if (change24El && p.priceChange24h != null) {
          var pc = p.priceChange24h;
          change24El.textContent = (pc >= 0 ? '+' : '') + pc.toFixed(2) + '% 24H';
          change24El.classList.remove('tokenomics__change--pos', 'tokenomics__change--neg');
          change24El.classList.add(pc >= 0 ? 'tokenomics__change--pos' : 'tokenomics__change--neg');
        }
        if (mcapEl) mcapEl.textContent = p.marketCapUsd != null ? formatUsd(p.marketCapUsd) : '—';
        if (liqEl) liqEl.textContent = p.liquidityUsd != null ? formatUsd(p.liquidityUsd) : '—';
        if (volEl) volEl.textContent = p.volume24hUsd != null ? formatUsd(p.volume24hUsd) : '—';
      });
  }

  if (chartEl) {
    fetch(window.location.origin + '/api/token-ohlc?type=15m', { credentials: 'include' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        var items = (data && data.data && data.data.items) ? data.data.items : [];
        if (chartHintEl) chartHintEl.textContent = data && data.message ? data.message : '';
        if (items.length === 0) {
          if (chartHintEl && !chartHintEl.textContent) chartHintEl.textContent = 'Chart needs TOKEN_MINT (SPL mint) in server .env. Pool OHLC uses GeckoTerminal / Dex liquidity.';
          return;
        }
        var candlestickData = items.map(function (c) {
          return {
            time: c.unix_time,
            open: c.o,
            high: c.h,
            low: c.l,
            close: c.c,
          };
        }).sort(function (a, b) { return a.time - b.time; });
        if (typeof window.LightweightCharts === 'undefined') return;
        var chart = window.LightweightCharts.createChart(chartEl, {
          layout: { background: { color: 'transparent' }, textColor: '#8b8f9a' },
          grid: { vertLines: { color: '#2a2d38' }, horzLines: { color: '#2a2d38' } },
          width: chartEl.clientWidth,
          height: 280,
          timeScale: { borderColor: '#2a2d38', timeVisible: true, secondsVisible: false },
          rightPriceScale: { borderColor: '#2a2d38', scaleMargins: { top: 0.1, bottom: 0.2 } },
        });
        var candleSeries = chart.addCandlestickSeries({
          priceFormat: {
            type: 'custom',
            minMove: 1e-15,
            formatter: formatChartPriceScale,
          },
          upColor: '#14f195',
          downColor: '#f87171',
          borderDownColor: '#f87171',
          borderUpColor: '#14f195',
        });
        candleSeries.setData(candlestickData);
        chart.timeScale().fitContent();
        window.addEventListener('resize', function () {
          chart.applyOptions({ width: chartEl.clientWidth });
        });
      });
  }
})();

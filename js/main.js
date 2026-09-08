// Marks that scripting is on, so CSS can hide reveal elements until they enter view.
document.documentElement.classList.add('js');
var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
var isMobile = !!(window.matchMedia && window.matchMedia('(max-width: 640px)').matches);
function playVideo(v) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }

// Collect dropdown: reliable toggle + keep the mobile panel pinned under the header
(function () {
  // expose the header's real height so the mobile (fixed) panel sits right below it
  var header = document.querySelector('header');
  function setHeaderHeight() {
    if (header) document.documentElement.style.setProperty('--header-h', header.offsetHeight + 'px');
  }
  setHeaderHeight();
  window.addEventListener('resize', setHeaderHeight);
  window.addEventListener('orientationchange', setHeaderHeight);

  // hamburger toggle for the mobile menu panel
  var toggle = document.getElementById('navToggle');
  var nav = document.querySelector('nav');
  function closeNav() {
    document.body.classList.remove('nav-open');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  }
  if (toggle && nav) {
    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = document.body.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      // show the Collect platforms expanded whenever the menu opens
      var d = document.querySelector('.collect-menu');
      if (d && open) d.setAttribute('open', '');
    });
    // choosing a page closes the panel (platform links open a new tab, so close too)
    nav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', closeNav);
    });
    // tapping anywhere outside the header closes it
    document.addEventListener('click', function (e) {
      if (document.body.classList.contains('nav-open') && !e.target.closest('header')) closeNav();
    });
  }

  var menu = document.querySelector('.collect-menu');
  if (!menu) return;
  var summary = menu.querySelector('summary');

  // take over the toggle so a tap reliably opens/closes it (native <details> can be
  // flaky on touch inside the horizontally-scrolling nav)
  if (summary) {
    summary.addEventListener('click', function (e) {
      e.preventDefault();
      if (menu.hasAttribute('open')) menu.removeAttribute('open');
      else menu.setAttribute('open', '');
    });
  }

  // close when a platform link is chosen (they open in a new tab)
  menu.querySelectorAll('.collect-list a').forEach(function (a) {
    a.addEventListener('click', function () { menu.removeAttribute('open'); });
  });

  // close when tapping anywhere else
  document.addEventListener('click', function (e) {
    if (menu.hasAttribute('open') && !menu.contains(e.target)) menu.removeAttribute('open');
  });
})();

// Elements with .reveal fade up once they enter the viewport.
(function () {
  var els = document.querySelectorAll('.reveal');
  if (!els.length) return;
  if (reduceMotion || !('IntersectionObserver' in window)) {
    els.forEach(function (el) { el.classList.add('in'); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    });
  }, { threshold: 0, rootMargin: '0px 0px -10% 0px' });
  els.forEach(function (el) { io.observe(el); });
})();

// Heroes and bands carry data-src and data-src-mobile; phones get the lighter file.
(function () {
  document.querySelectorAll('video[data-src]').forEach(function (v) {
    v.src = (isMobile && v.dataset.srcMobile) || v.dataset.src;
  });
})();

// Ambient loops (autoplay, muted, no controls) play only while on screen:
// no decoding off screen, and no sound once the visitor has scrolled past the homepage hero.
(function () {
  var vids = document.querySelectorAll('video[autoplay][muted]:not([controls])');
  if (!vids.length || !('IntersectionObserver' in window)) return;
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      var v = en.target;
      v.dataset.inView = en.isIntersecting ? '1' : '0';
      if (document.body.classList.contains('lightbox-open')) return;
      if (en.isIntersecting) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
      else v.pause();
    });
  }, { threshold: 0.15 });
  vids.forEach(function (v) { io.observe(v); });
})();

// Hero: the sound toggle, and on the homepage a rotation through the works on the page.
// Two stacked video elements crossfade; the next work is readied a few seconds before the current one ends.
(function () {
  var hero = document.querySelector('.hero-full, .hero-band');
  if (!hero) return;
  var vids = Array.prototype.slice.call(hero.querySelectorAll('video'));
  var soundBtn = document.getElementById('heroSound');
  var muted = true;

  function setMuted(m) {
    muted = m;
    vids.forEach(function (v) { v.muted = m; });
    if (soundBtn) {
      soundBtn.setAttribute('aria-pressed', m ? 'false' : 'true');
      soundBtn.setAttribute('aria-label', m ? 'Turn sound on' : 'Turn sound off');
    }
  }
  if (soundBtn) {
    soundBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      setMuted(!muted);
      var v = hero.querySelector('video.is-active') || vids[0];
      if (!muted && v && v.paused) playVideo(v);
    });
  }

  var listEl = document.getElementById('heroRotation');
  if (!listEl || vids.length < 2) return;
  var items;
  try { items = JSON.parse(listEl.textContent); } catch (err) { return; }
  if (!items || !items.length) return;

  var titleEl = hero.querySelector('.hero-caption .title');
  var subEl = hero.querySelector('.hero-caption .sub');
  var index = Math.floor(Math.random() * items.length);   // a different work each visit
  var active = 0;                                          // which of the two elements is showing
  var inView = true, held = false, preloaded = -1;

  function srcOf(item) { return (isMobile && item.mobile) || item.src; }
  function load(v, item) {
    v.classList.toggle('contain', !!item.square);
    if (item.poster) v.setAttribute('poster', item.poster);
    v.muted = true;
    v.src = srcOf(item);
    v.load();
  }
  function caption(item) {
    if (titleEl) titleEl.textContent = item.title || '';
    if (subEl) subEl.textContent = item.sub || '';
  }
  function current() {
    var it = items[index];
    return { video: it.full || it.src, title: it.title || '', sub: it.sub || '', link: it.link, linklabel: it.linklabel };
  }

  function onTime(e) {
    var v = e.target;
    if (!v.classList.contains('is-active') || !(v.duration > 0)) return;
    if (preloaded === -1 && v.duration - v.currentTime < 3) {
      preloaded = (index + 1) % items.length;
      var n = vids[1 - active];
      load(n, items[preloaded]);
      playVideo(n);            // hidden and muted: makes phones buffer it ahead of time
    }
  }
  function onEnded(e) {
    var v = e.target;
    if (!v.classList.contains('is-active')) return;
    var n = vids[1 - active];
    if (preloaded === -1) { preloaded = (index + 1) % items.length; load(n, items[preloaded]); }
    index = preloaded; preloaded = -1;
    try { n.currentTime = 0; } catch (err) {}
    n.muted = muted;
    if (!held && inView) playVideo(n);
    n.classList.add('is-active');
    v.classList.remove('is-active');
    active = 1 - active;
    caption(items[index]);
    v.pause();
  }
  vids.forEach(function (v) {
    v.classList.add('rotor');
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('ended', onEnded);
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        inView = en.isIntersecting;
        if (held) return;
        if (inView) playVideo(vids[active]); else vids[active].pause();
      });
    }, { threshold: 0.15 }).observe(hero);
  }

  hero.__current = current;
  hero.__pause = function () { held = true; vids.forEach(function (v) { v.pause(); }); };
  hero.__resume = function () { held = false; if (inView) playVideo(vids[active]); };

  var first = vids[active];
  load(first, items[index]);
  first.classList.add('is-active');
  caption(items[index]);
  first.muted = muted;
  playVideo(first);
})();

// Gallery cards with data-preview play a short silent clip over the poster:
// on hover where there is a mouse, while in view on touch screens.
(function () {
  var cards = document.querySelectorAll('.work[data-preview]');
  if (!cards.length || reduceMotion) return;
  var conn = navigator.connection;
  if (conn && conn.saveData) return;
  var hoverable = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  function ensure(card) {
    var v = card.querySelector('video.preview');
    if (v) return v;
    v = document.createElement('video');
    v.className = 'preview';
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.setAttribute('muted', '');
    v.setAttribute('playsinline', '');
    v.setAttribute('aria-hidden', 'true');
    v.preload = 'none';
    v.src = card.dataset.preview;
    // only fade in once frames are actually being shown
    v.addEventListener('playing', function () { card.classList.add('playing'); });
    var thumb = card.querySelector('.thumb');
    if (thumb) thumb.appendChild(v);
    return v;
  }
  function start(card) {
    var v = ensure(card);
    if (!v.getAttribute('src')) v.src = card.dataset.preview;
    playVideo(v);
  }
  function stop(card) {
    var v = card.querySelector('video.preview');
    if (v) {
      v.pause();
      if (!hoverable) { v.removeAttribute('src'); v.load(); }
    }
    card.classList.remove('playing');
  }

  if (hoverable) {
    cards.forEach(function (c) {
      c.addEventListener('mouseenter', function () { start(c); });
      c.addEventListener('mouseleave', function () { stop(c); });
    });
  } else if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) start(en.target); else stop(en.target); });
    }, { threshold: 0.6 });
    cards.forEach(function (c) { io.observe(c); });
  }
})();

// Lightbox for gallery works, with prev/next navigation.
// The page's hero video (if any) is included in the cycle.
(function () {
  var lb = document.getElementById('lightbox');
  if (!lb) return;
  var media = document.getElementById('lbMedia');
  var title = document.getElementById('lbTitle');
  var sub = document.getElementById('lbSub');
  var link = document.getElementById('lbLink');

  var entries = [];

  // hero video first in the cycle
  var hero = document.querySelector('.hero');
  var heroVideo = hero && hero.querySelector('video');
  var rotating = !!(hero && typeof hero.__current === 'function');
  if (heroVideo && (rotating || heroVideo.dataset.full || heroVideo.dataset.src || heroVideo.getAttribute('src'))) {
    var cap = hero.querySelector('.hero-caption');
    entries.push(rotating ? hero.__current() : {
      video: heroVideo.dataset.full || heroVideo.dataset.src || heroVideo.getAttribute('src'),
      title: cap ? (cap.querySelector('.title') || {}).textContent || '' : '',
      sub: cap ? (cap.querySelector('.sub') || cap.querySelector('span:last-child') || {}).textContent || '' : ''
    });
    // heroes without controls (the loops) open the lightbox on click
    if (!heroVideo.controls) {
      hero.querySelectorAll('video').forEach(function (v) {
        v.style.cursor = 'pointer';
        v.addEventListener('click', function () { open(0); });
      });
      var playBtn = hero.querySelector('.hero-play');
      if (playBtn) playBtn.addEventListener('click', function (e) { e.stopPropagation(); open(0); });
    }
  }
  function pauseHero() {
    if (hero && hero.__pause) hero.__pause();
    else if (heroVideo) heroVideo.pause();
  }
  function resumeHero() {
    if (hero && hero.__resume) hero.__resume();
    else if (heroVideo && !heroVideo.controls && heroVideo.dataset.inView !== '0') playVideo(heroVideo);
  }

  var heroOffset = entries.length;
  var all = Array.prototype.slice.call(document.querySelectorAll('.work'));
  all.forEach(function (w) {
    // cards with data-href navigate to their own page instead of opening the lightbox
    if (w.dataset.href) {
      w.addEventListener('click', function () { window.location.href = w.dataset.href; });
      return;
    }
    var index = entries.length;
    entries.push({
      video: w.dataset.video,
      image: w.dataset.image,
      youtube: w.dataset.youtube,
      start: w.dataset.start,
      title: w.dataset.title || '',
      sub: w.dataset.sub || '',
      link: w.dataset.link,
      linklabel: w.dataset.linklabel
    });
    w.addEventListener('click', function () { open(index); });
  });

  // title links inside cards go to the sales page without opening the lightbox
  document.querySelectorAll('.work .meta a').forEach(function (a) {
    a.addEventListener('click', function (e) { e.stopPropagation(); });
  });

  var current = -1;
  var clearTimer = null;

  function show(index) {
    current = (index + entries.length) % entries.length;
    var e = entries[current];
    media.innerHTML = '';
    if (e.youtube) {
      // privacy-friendly: nothing loads from YouTube until this point (on click)
      var wrap = document.createElement('div');
      wrap.className = 'lb-embed';
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + e.youtube + '?autoplay=1&rel=0' + (e.start ? '&start=' + e.start : '');
      f.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share';
      f.allowFullscreen = true;
      f.setAttribute('title', e.title);
      wrap.appendChild(f);
      media.appendChild(wrap);
    } else if (e.video) {
      var v = document.createElement('video');
      v.src = e.video;
      v.controls = true;
      v.autoplay = true;
      v.playsInline = true;
      media.appendChild(v);
    } else if (e.image) {
      var img = document.createElement('img');
      img.src = e.image;
      img.alt = e.title;
      media.appendChild(img);
    }
    title.textContent = e.title;
    sub.textContent = e.sub;
    if (e.link) {
      link.href = e.link;
      link.target = /^https?:/.test(e.link) ? '_blank' : '_self';
      link.textContent = e.linklabel || 'More ↗';
      link.style.display = 'inline';
    } else {
      link.style.display = 'none';
    }
  }

  function open(index) {
    if (clearTimer) { clearTimeout(clearTimer); clearTimer = null; }
    if (index === 0 && rotating) entries[0] = hero.__current();
    show(index);
    lb.classList.add('open');
    lb.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lightbox-open');
    document.body.style.overflow = 'hidden';
    pauseHero();
  }

  function close() {
    // stop playback at once; clear the frame after the fade so it does not empty mid-transition
    var playing = media.querySelector('video');
    if (playing) playing.pause();
    lb.classList.remove('open');
    lb.setAttribute('aria-hidden', 'true');
    current = -1;
    document.body.classList.remove('lightbox-open');
    document.body.style.overflow = '';
    clearTimer = setTimeout(function () {
      clearTimer = null;
      if (!lb.classList.contains('open')) media.innerHTML = '';
    }, reduceMotion ? 0 : 320);
    resumeHero();
  }

  function step(delta) {
    if (current !== -1) show(current + delta);
  }

  document.getElementById('lbClose').addEventListener('click', close);
  var prevBtn = document.getElementById('lbPrev');
  var nextBtn = document.getElementById('lbNext');
  if (prevBtn) prevBtn.addEventListener('click', function (e) { e.stopPropagation(); step(-1); });
  if (nextBtn) nextBtn.addEventListener('click', function (e) { e.stopPropagation(); step(1); });
  lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
  document.addEventListener('keydown', function (e) {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'ArrowRight') step(1);
  });

  // swipe navigation on touch screens
  var touchX = null;
  lb.addEventListener('touchstart', function (e) { touchX = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', function (e) {
    if (touchX === null) return;
    var dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 60) step(dx > 0 ? -1 : 1);
    touchX = null;
  }, { passive: true });
})();

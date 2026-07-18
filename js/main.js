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
  var heroVideo = hero && hero.querySelector('video[src]');
  if (heroVideo) {
    var cap = hero.querySelector('.hero-caption');
    entries.push({
      video: heroVideo.getAttribute('src'),
      title: cap ? (cap.querySelector('.title') || {}).textContent || '' : '',
      sub: cap ? (cap.querySelector('span:last-child') || {}).textContent || '' : ''
    });
    // heroes without controls (homepage loop) open the lightbox on click
    if (!heroVideo.controls) {
      heroVideo.style.cursor = 'pointer';
      heroVideo.addEventListener('click', function () { open(0); });
    }
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

  function show(index) {
    current = (index + entries.length) % entries.length;
    var e = entries[current];
    media.innerHTML = '';
    if (e.video) {
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
      link.textContent = e.linklabel || 'More ↗';
      link.style.display = 'inline';
    } else {
      link.style.display = 'none';
    }
  }

  function open(index) {
    show(index);
    lb.classList.add('open');
    lb.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (heroVideo) heroVideo.pause();
  }

  function close() {
    lb.classList.remove('open');
    lb.setAttribute('aria-hidden', 'true');
    media.innerHTML = '';
    current = -1;
    document.body.style.overflow = '';
    if (heroVideo && !heroVideo.controls) heroVideo.play();
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

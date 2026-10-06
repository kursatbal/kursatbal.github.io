/* Ana sayfa etkileri: harf harf giriş, 3B rack (LED'ler + fareyle dönme), terminal yazımı,
   kaydırmayla beliren bölümler, kart ışığı/eğilmesi, manyetik düğmeler.
   Hareket azaltma tercihi varsa hiçbiri çalışmaz. */
(function () {
  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Terminal metni (örnek çıktı, contoso.local) ----
  var scenes = [
    [['PS C:\\> ', 'Get-ADDomainController -Filter * | Select Name, Site', 'c'],
     ['', 'Name  Site     OperatingSystem\n----  ----     ---------------\nDC01  Merkez   Windows Server 2022\nDC02  Merkez   Windows Server 2022\nDC03  Yedek    Windows Server 2022', 'd']],
    [['PS C:\\> ', 'repadmin /replsummary', 'c'],
     ['', 'Source DSA   largest delta   fails/total\nDC01         00m:41s          0 / 6\nDC02         00m:12s          0 / 6\nDC03         01m:03s          0 / 6', 'k']],
    [['PS C:\\> ', '.\\KusoADCheck.ps1 -Quick', 'c'],
     ['', '[1/21] Privileged accounts ...... tamam\n[2/21] Kerberos & krbtgt ........ uyarı\n[3/21] Replication health ....... tamam\nRisk skoru (örnek): 97 / 100', 'w']]
  ];
  var esc = function (s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;'); };
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  var termEl = document.getElementById('term-screen');
  function renderStatic() {                 // hareket yok: son sahneyi olduğu gibi göster
    if (!termEl) return;
    var sc = scenes[2], html = '';
    sc.forEach(function (l) {
      html += l[2] === 'c'
        ? '<span class="tp">' + esc(l[0]) + '</span><span class="tc">' + esc(l[1]) + '</span>\n'
        : '<span class="t' + l[2] + '">' + esc(l[1]) + '</span>\n';
    });
    termEl.innerHTML = html + '<span class="tp">PS C:\\&gt; </span>';
  }
  var typing = false, typingOn = false;
  async function typeLoop() {
    if (typing) return; typing = true;
    var si = 0;
    while (true) {
      if (!typingOn) { await sleep(300); continue; }
      var sc = scenes[si % scenes.length]; si++;
      var html = '';
      termEl.innerHTML = '';
      for (var k = 0; k < sc.length; k++) {
        var l = sc[k];
        if (l[2] === 'c') {
          var head = '<span class="tp">' + esc(l[0]) + '</span><span class="tc">';
          for (var i = 0; i <= l[1].length; i++) {
            if (!typingOn) { await sleep(300); i--; continue; }
            termEl.innerHTML = html + head + esc(l[1].slice(0, i)) + '</span><span class="term-cur"></span>';
            await sleep(26 + Math.random() * 38);
          }
          html += head + esc(l[1]) + '</span>\n'; await sleep(420);
        } else {
          var rows = l[1].split('\n');
          for (var r = 0; r < rows.length; r++) {
            html += '<span class="t' + l[2] + '">' + esc(rows[r]) + '</span>\n';
            termEl.innerHTML = html + '<span class="term-cur"></span>'; await sleep(250);
          }
        }
      }
      termEl.innerHTML = html + '<span class="tp">PS C:\\&gt; </span><span class="term-cur"></span>';
      await sleep(2800);
    }
  }

  if (reduced || !window.gsap || !window.ScrollTrigger) {
    root.classList.remove('fx'); renderStatic(); return;
  }

  var gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // ---- Başlık: harf harf giriş ----
  var name = document.querySelector('.hero-name');
  if (name) {
    var txt = name.textContent.trim();
    name.setAttribute('aria-label', txt);
    name.innerHTML = '';
    txt.split(' ').forEach(function (word, wi, arr) {
      var w = document.createElement('span');
      w.className = 'word'; w.setAttribute('aria-hidden', 'true');
      word.split('').forEach(function (c) {
        var o = document.createElement('span'); o.className = 'ch-wrap';
        var i = document.createElement('span'); i.className = 'ch'; i.textContent = c;
        o.appendChild(i); w.appendChild(o);
      });
      name.appendChild(w);
      if (wi < arr.length - 1) name.appendChild(document.createTextNode(' '));
    });
    name.style.visibility = 'visible';
    var tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
    tl.fromTo('.hero-avatar', { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.8, ease: 'back.out(1.6)' }, 0)
      .from('.hero-name .ch', { yPercent: 115, rotate: 6, duration: 1.1, stagger: 0.035 }, 0.1)
      .fromTo('.hero-title', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9 }, '-=0.7')
      .fromTo('.hero-links .btn', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, stagger: 0.1 }, '-=0.6')
      .fromTo('.rack-stage', { x: 60, opacity: 0, scale: 0.92 }, { x: 0, opacity: 1, scale: 1, duration: 1.3, ease: 'expo.out' }, 0.2);
  }

  // ---- Rack: LED'ler yanıp söner, fareyle döner ----
  var rack = document.getElementById('rack');
  if (rack) {
    var leds = [].slice.call(rack.querySelectorAll('.led'));
    setInterval(function () {
      if (document.hidden) return;
      leds.forEach(function (l) { var r = Math.random(); l.className = 'led' + (r < 0.45 ? ' on' : (r < 0.5 ? ' am' : '')); });
    }, 480);
    if (fine) {
      var qx = gsap.quickTo(rack, 'rotationY', { duration: 0.8, ease: 'power3.out' });
      var qy = gsap.quickTo(rack, 'rotationX', { duration: 0.8, ease: 'power3.out' });
      gsap.set(rack, { rotationY: -28, rotationX: -10 });
      document.addEventListener('pointermove', function (e) {
        qx(-28 + (e.clientX / innerWidth - 0.5) * 34);
        qy(-10 - (e.clientY / innerHeight - 0.5) * 14);
      });
    } else {
      gsap.fromTo(rack, { rotationY: -36 }, { rotationY: -18, duration: 6, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    }
  }

  // ---- Terminal: görünür olunca yazar, görünmezken durur ----
  if (termEl) {
    renderStatic();
    new IntersectionObserver(function (en) {
      typingOn = en[0].isIntersecting;
      if (typingOn && !typing) typeLoop();
    }, { threshold: 0.25 }).observe(document.getElementById('term'));
  }

  // ---- Kaydırmayla beliren öğeler ----
  gsap.set('.reveal', { opacity: 0, y: 36 });
  ScrollTrigger.batch('.reveal', {
    start: 'top 90%', once: true,
    onEnter: function (els) { gsap.to(els, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.12, overwrite: true }); }
  });

  // ---- Kartlar: fare ışığı + hafif 3B eğilme ----
  if (fine) {
    document.querySelectorAll('.card').forEach(function (card) {
      var tilt = card.classList.contains('tool-card');
      var rx = tilt ? gsap.quickTo(card, 'rotationX', { duration: 0.5, ease: 'power3.out' }) : null;
      var ry = tilt ? gsap.quickTo(card, 'rotationY', { duration: 0.5, ease: 'power3.out' }) : null;
      if (tilt) gsap.set(card, { transformPerspective: 900 });
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var x = e.clientX - r.left, y = e.clientY - r.top;
        card.style.setProperty('--mx', x + 'px'); card.style.setProperty('--my', y + 'px');
        if (tilt) { ry((x / r.width - 0.5) * 7); rx(-(y / r.height - 0.5) * 7); }
      });
      card.addEventListener('pointerleave', function () { if (tilt) { rx(0); ry(0); } });
    });

    // ---- Manyetik düğmeler ----
    document.querySelectorAll('.hero-links .btn').forEach(function (b) {
      var bx = gsap.quickTo(b, 'x', { duration: 0.4, ease: 'power3.out' });
      var by = gsap.quickTo(b, 'y', { duration: 0.4, ease: 'power3.out' });
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        bx((e.clientX - (r.left + r.width / 2)) * 0.25); by((e.clientY - (r.top + r.height / 2)) * 0.35);
      });
      b.addEventListener('pointerleave', function () { bx(0); by(0); });
    });
  }

  window.__fxReady = true;
  ScrollTrigger.refresh();
})();

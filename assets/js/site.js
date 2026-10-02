(function () {
  var doc = document;

  // Tema düğmesi
  var tt = doc.getElementById('theme-toggle');
  if (tt) tt.addEventListener('click', function () {
    var next = doc.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    doc.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
  });

  // Mobil menü
  var nt = doc.getElementById('nav-toggle'), nav = doc.getElementById('nav');
  if (nt && nav) nt.addEventListener('click', function () {
    var open = nav.classList.toggle('is-open');
    nt.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  // Okuma ilerlemesi
  var bar = doc.getElementById('rpbar');
  if (bar && doc.querySelector('.prose')) {
    var upd = function () {
      var h = doc.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = h > 0 ? Math.min(window.scrollY / h * 100, 100) + '%' : '0';
    };
    window.addEventListener('scroll', upd, { passive: true });
    upd();
  }

  // Kod bloklarına "Kopyala"
  doc.querySelectorAll('.prose pre').forEach(function (pre) {
    var b = doc.createElement('button');
    b.type = 'button'; b.className = 'copy-btn'; b.textContent = 'Kopyala';
    b.addEventListener('click', function () {
      var code = pre.querySelector('code');
      var txt = (code || pre).innerText;
      var done = function () { b.textContent = 'Kopyalandı'; setTimeout(function () { b.textContent = 'Kopyala'; }, 1500); };
      if (navigator.clipboard) navigator.clipboard.writeText(txt).then(done, function () {});
    });
    pre.appendChild(b);
  });

  // İçindekiler: görünen başlığı vurgula
  var links = doc.querySelectorAll('.toc a');
  if (links.length && 'IntersectionObserver' in window) {
    var map = {};
    links.forEach(function (a) { map[decodeURIComponent(a.hash.slice(1))] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && map[en.target.id]) {
          links.forEach(function (l) { l.classList.remove('is-current'); });
          map[en.target.id].classList.add('is-current');
        }
      });
    }, { rootMargin: '-80px 0px -70% 0px' });
    doc.querySelectorAll('.prose h2[id], .prose h3[id]').forEach(function (h) { io.observe(h); });
  }

  // Arama
  var input = doc.getElementById('search-input');
  if (input && window.SEARCH_INDEX) {
    var res = doc.getElementById('search-results'), status = doc.getElementById('search-status');
    var data = null;
    var norm = function (s) { return (s || '').toLocaleLowerCase('tr').normalize('NFKD').replace(/[̀-ͯ]/g, ''); };
    var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    var months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    var fmt = function (d) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || ''); return m ? (+m[3]) + ' ' + months[+m[2] - 1] + ' ' + m[1] : esc(d); };
    var render = function (q) {
      if (!data) return;
      var terms = norm(q).split(/\s+/).filter(Boolean);
      var hits = data.filter(function (p) {
        if (!terms.length) return true;
        var hay = norm([p.title, p.description, p.category, (p.tags || []).join(' '), p.content].join(' '));
        return terms.every(function (t) { return hay.indexOf(t) > -1; });
      });
      status.textContent = terms.length ? hits.length + ' sonuç' : data.length + ' yazı';
      res.innerHTML = hits.map(function (p) {
        return '<a class="post-row post-row--nocover" href="' + p.url + '"><div class="post-row-body"><div class="label">' + esc(p.category || 'Yazı') + ' · ' + fmt(p.date) +
          '</div><h3 class="post-row-title">' + esc(p.title) + '</h3>' + (p.description ? '<p class="post-row-desc">' + esc(p.description) + '</p>' : '') + '</div></a>';
      }).join('');
    };
    fetch(window.SEARCH_INDEX).then(function (r) { return r.json(); }).then(function (j) { data = j; render(input.value); });
    input.addEventListener('input', function () { render(input.value); });
  }
})();

(function () {
      document.documentElement.classList.add('js');

      var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      var yearEl = document.getElementById('year');
      if (yearEl) yearEl.textContent = String(new Date().getFullYear());

      var header = document.getElementById('site-header');
      var toggle = document.getElementById('nav-toggle');
      var menu = document.getElementById('nav-menu');
      var mqNav = window.matchMedia('(max-width: 960px)');

      function setMenu(open) {
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
        menu.classList.toggle('is-open', open);
        document.body.style.overflow = open ? 'hidden' : '';
      }

      toggle.addEventListener('click', function () {
        setMenu(toggle.getAttribute('aria-expanded') !== 'true');
      });

      menu.querySelectorAll('a').forEach(function (link) {
        link.addEventListener('click', function () { setMenu(false); });
      });

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') setMenu(false);
      });

      function onNavBreakpoint() {
        if (!mqNav.matches) setMenu(false);
      }
      if (mqNav.addEventListener) mqNav.addEventListener('change', onNavBreakpoint);
      else mqNav.addListener(onNavBreakpoint);

      window.addEventListener('scroll', function () {
        header.classList.toggle('is-scrolled', window.scrollY > 60);
      }, { passive: true });

      /* Stagger 80ms en grids de tarjetas */
      ['.featured-card', '.symptom-card', '.secondary-card', '.gallery-item', '.metric-chip'].forEach(function (sel) {
        document.querySelectorAll(sel).forEach(function (card, i) {
          card.style.transitionDelay = (i * 80) + 'ms';
        });
      });

      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              var title = entry.target.matches('.section-title')
                ? entry.target
                : entry.target.querySelector('.section-title');
              if (title) title.classList.add('is-visible');
              io.unobserve(entry.target);
            }
          });
        }, { threshold: 0.15, rootMargin: '0px 0px -5% 0px' });

        document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
        document.querySelectorAll('.section-title').forEach(function (el) { io.observe(el); });
      } else {
        document.querySelectorAll('.reveal, .section-title').forEach(function (el) {
          el.classList.add('is-visible');
        });
      }

      /* Count-up en métricas */
      function animateCounter(el) {
        var target = +el.dataset.target;
        var suffix = el.dataset.suffix || '';
        var duration = 1500;
        var start = performance.now();
        var easeOutQuart = function (t) { return 1 - Math.pow(1 - t, 4); };

        function update(now) {
          var progress = Math.min((now - start) / duration, 1);
          el.textContent = Math.floor(easeOutQuart(progress) * target) + suffix;
          if (progress < 1) requestAnimationFrame(update);
        }
        requestAnimationFrame(update);
      }

      if (!reduceMotion && 'IntersectionObserver' in window) {
        var counterObserver = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              animateCounter(entry.target);
              counterObserver.unobserve(entry.target);
            }
          });
        }, { threshold: 0.5 });

        document.querySelectorAll('.stat-number[data-target]').forEach(function (el) {
          counterObserver.observe(el);
        });
      } else {
        document.querySelectorAll('.stat-number[data-target]').forEach(function (el) {
          el.textContent = el.dataset.target + (el.dataset.suffix || '');
        });
      }

      document.querySelectorAll('.btn').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          var rect = btn.getBoundingClientRect();
          var size = Math.max(rect.width, rect.height) * 2;
          var ripple = document.createElement('span');
          ripple.className = 'btn-ripple';
          ripple.style.width = ripple.style.height = size + 'px';
          ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
          ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
          btn.appendChild(ripple);
          ripple.addEventListener('animationend', function () { ripple.remove(); });
        });
      });

      var navLinks = Array.prototype.slice.call(menu.querySelectorAll('a[href^="#"]'));
      if (navLinks.length && 'IntersectionObserver' in window) {
        var navSections = [];
        navLinks.forEach(function (link) {
          var section = document.getElementById(link.getAttribute('href').slice(1));
          if (section) navSections.push({ link: link, section: section });
        });
        var navIO = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            var match = navSections.filter(function (item) { return item.section === entry.target; })[0];
            if (!match) return;
            if (entry.isIntersecting) {
              navLinks.forEach(function (l) { l.classList.remove('is-active'); });
              match.link.classList.add('is-active');
            }
          });
        }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
        navSections.forEach(function (item) { navIO.observe(item.section); });
      }
    })();

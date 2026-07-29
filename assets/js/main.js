(function () {
      document.documentElement.classList.add('js');

      var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      var yearEl = document.getElementById('year');
      if (yearEl) yearEl.textContent = String(new Date().getFullYear());

      var header = document.getElementById('site-header');
      var toggle = document.getElementById('nav-toggle');
      var menu = document.getElementById('nav-menu');
      var mqNav = window.matchMedia('(max-width: 960px)');

      if (toggle && menu) {
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
      }

      var progressBar = document.getElementById('scroll-progress');
      var scrollTicking = false;
      function onScroll() {
        /* Leer layout antes de escribir estilos. Al revés, el classList.toggle
           invalida el estilo y el scrollHeight siguiente fuerza un recálculo
           de layout sincrónico en cada frame de scroll. */
        var y = window.scrollY;
        var doc = document.documentElement;
        var max = progressBar ? doc.scrollHeight - doc.clientHeight : 0;

        if (header) header.classList.toggle('is-scrolled', y > 60);
        if (progressBar) {
          var ratio = max > 0 ? Math.min(y / max, 1) : 0;
          progressBar.style.transform = 'scaleX(' + ratio + ')';
        }
        scrollTicking = false;
      }
      window.addEventListener('scroll', function () {
        if (!scrollTicking) {
          window.requestAnimationFrame(onScroll);
          scrollTicking = true;
        }
      }, { passive: true });
      onScroll();

      /* Stagger 80ms en grids de tarjetas, tope 480ms: el índice es global a la
         página, así que sin tope la tarjeta 14 esperaba 1040ms + 0.6s de
         transición para aparecer estando ya en pantalla. */
      ['.featured-card', '.symptom-card', '.secondary-card', '.gallery-item', '.metric-chip', '.process-step', '.prep-card'].forEach(function (sel) {
        document.querySelectorAll(sel).forEach(function (card, i) {
          card.style.transitionDelay = (Math.min(i, 6) * 80) + 'ms';
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

      /* menu puede ser null: sin la guarda, esto lanza y mata todo el JS
         posterior (cursor, carrusel de video). */
      var navLinks = menu ? Array.prototype.slice.call(menu.querySelectorAll('a[href^="#"]')) : [];
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

      /* Cursor personalizado — punto al instante, anillo con persecución rápida */
      (function () {
        if (!window.matchMedia('(pointer: fine)').matches) return;
        if (reduceMotion) return;
        if (document.querySelector('.cursor-dot')) return;

        var dot = document.createElement('div');
        dot.className = 'cursor-dot';
        dot.setAttribute('aria-hidden', 'true');
        var ring = document.createElement('div');
        ring.className = 'cursor-ring';
        ring.setAttribute('aria-hidden', 'true');
        document.body.appendChild(dot);
        document.body.appendChild(ring);

        var mx = -100, my = -100, rx = -100, ry = -100;
        /* Antes: 0.07 (muy lento). ~0.45 se siente al ritmo del cursor, con un chase leve. */
        var RING_EASE = 0.45;
        var raf = null;

        function tick() {
          dot.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0) translate(-50%,-50%)';
          rx += (mx - rx) * RING_EASE;
          ry += (my - ry) * RING_EASE;
          ring.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0) translate(-50%,-50%)';
          /* Detiene el loop al converger; se reanuda solo con el próximo mousemove. */
          if (Math.abs(mx - rx) > 0.1 || Math.abs(my - ry) > 0.1) {
            raf = requestAnimationFrame(tick);
          } else {
            raf = null;
          }
        }

        document.addEventListener('mousemove', function (e) {
          mx = e.clientX;
          my = e.clientY;
          if (raf === null) raf = requestAnimationFrame(tick);
        }, { passive: true });

        var hoverEls = document.querySelectorAll('a, button, [role="button"], summary, .featured-card, .symptom-card, .secondary-card, .float-cta__book, .wa-float');
        hoverEls.forEach(function (el) {
          el.addEventListener('mouseenter', function () { document.body.classList.add('cursor-hover'); });
          el.addEventListener('mouseleave', function () { document.body.classList.remove('cursor-hover'); });
        });

        document.querySelectorAll('.statement-section, .ticker, .contact-shell').forEach(function (el) {
          el.addEventListener('mouseenter', function () { document.body.classList.add('cursor-on-dark'); });
          el.addEventListener('mouseleave', function () { document.body.classList.remove('cursor-on-dark'); });
        });
      })();

      /* Video reel: default = reproducir al entrar */
      (function () {
        var shell = document.querySelector('[data-video-reel]');
        if (!shell) return;

        var track = shell.querySelector('[data-reel-track]');
        var cards = Array.prototype.slice.call(shell.querySelectorAll('[data-reel-card]'));
        var dots = Array.prototype.slice.call(shell.querySelectorAll('[data-reel-dot]'));
        var prevBtn = shell.querySelector('[data-reel-prev]');
        var nextBtn = shell.querySelector('[data-reel-next]');
        var toggleBtn = shell.querySelector('[data-reel-toggle]');
        var index = 0;
        var userPaused = false;
        var inView = true;
        var mqDesktop = window.matchMedia('(min-width: 900px)');

        function ensureSrc(video) {
          if (!video) return;
          video.muted = true;
          video.defaultMuted = true;
          video.playsInline = true;
          video.setAttribute('muted', '');
          video.setAttribute('playsinline', '');
          if (video.getAttribute('src')) return;
          var src = video.getAttribute('data-src');
          if (!src) return;
          video.src = src;
          video.load();
        }

        function tryPlay(video) {
          if (!video || userPaused || reduceMotion) return;
          ensureSrc(video);
          var run = function () {
            var p = video.play();
            if (p && p.catch) p.catch(function () {});
          };
          if (video.readyState >= 2) run();
          else video.addEventListener('loadeddata', run, { once: true });
        }

        function pauseAll() {
          cards.forEach(function (card) {
            var v = card.querySelector('video');
            if (v && !v.paused) v.pause();
          });
        }

        function playActive() {
          if (userPaused || reduceMotion || !inView) return;
          if (mqDesktop.matches) {
            cards.forEach(function (card) {
              tryPlay(card.querySelector('video'));
            });
            return;
          }
          cards.forEach(function (card, i) {
            var v = card.querySelector('video');
            if (!v) return;
            if (i === index) tryPlay(v);
            else if (!v.paused) v.pause();
          });
        }

        function setIndex(next) {
          index = (next + cards.length) % cards.length;
          cards.forEach(function (card, i) {
            card.classList.toggle('is-active', i === index);
          });
          dots.forEach(function (dot, i) {
            var on = i === index;
            dot.classList.toggle('is-active', on);
            dot.setAttribute('aria-selected', on ? 'true' : 'false');
          });
          if (!mqDesktop.matches && track) {
            var offset = cards[index].offsetLeft;
            track.style.transform = 'translateX(' + (-offset) + 'px)';
          } else if (track) {
            track.style.transform = '';
          }
          playActive();
        }

        function syncToggleLabel() {
          if (!toggleBtn) return;
          toggleBtn.textContent = userPaused ? 'Reproducir' : 'Pausar';
          toggleBtn.setAttribute('aria-pressed', userPaused ? 'true' : 'false');
          toggleBtn.setAttribute('aria-label', userPaused ? 'Reproducir videos' : 'Pausar videos');
        }

        if (prevBtn) prevBtn.addEventListener('click', function () { setIndex(index - 1); });
        if (nextBtn) nextBtn.addEventListener('click', function () { setIndex(index + 1); });
        dots.forEach(function (dot, i) {
          dot.addEventListener('click', function () { setIndex(i); });
        });
        if (toggleBtn) {
          toggleBtn.addEventListener('click', function () {
            userPaused = !userPaused;
            syncToggleLabel();
            if (userPaused) pauseAll();
            else {
              inView = true;
              playActive();
            }
          });
        }

        if (mqDesktop.addEventListener) {
          mqDesktop.addEventListener('change', function () { setIndex(index); });
        } else if (mqDesktop.addListener) {
          mqDesktop.addListener(function () { setIndex(index); });
        }

        var resizeTimer;
        window.addEventListener('resize', function () {
          clearTimeout(resizeTimer);
          resizeTimer = setTimeout(function () { setIndex(index); }, 120);
        }, { passive: true });

        /* Estado visual inicial SIN cargar ni reproducir video */
        userPaused = false;
        inView = false;
        setIndex(0);
        syncToggleLabel();

        /* Carga y reproducción diferidas: nada de video se descarga hasta que
           la sección entra en vista. Al salir de vista, se pausa. */
        if ('IntersectionObserver' in window) {
          var ioReel = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
              inView = entry.isIntersecting;
              if (inView) {
                playActive();
                setTimeout(playActive, 300);
              } else {
                pauseAll();
              }
            });
          }, { threshold: 0.15, rootMargin: '200px 0px' });
          ioReel.observe(shell);
        } else {
          /* Sin IntersectionObserver (navegador antiguo): reproducir de inmediato */
          inView = true;
          playActive();
        }
      })();
    })();

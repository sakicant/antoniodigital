// Antonio Digital — deliberately minimal. Mobile menu + footer year only.
(function () {
  "use strict";

  var toggle = document.querySelector(".nav-toggle");
  var mobileNav = document.getElementById("mobileNav");
  if (toggle && mobileNav) {
    toggle.addEventListener("click", function () {
      var open = mobileNav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    mobileNav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        mobileNav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  var year = document.getElementById("year");
  if (year) { year.textContent = new Date().getFullYear(); }

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Cinematic mode runs only where the scroll libraries loaded (pages flagged
  // "cinematic") and motion is allowed. Everywhere else the quiet reveals run.
  var cinematic = !reduceMotion && !!(window.gsap && window.ScrollTrigger) && !!document.querySelector(".hero");

  // Fire the hero entrance once the first paint is in.
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { document.body.classList.add("hero-ready"); });
  });

  // Quiet scroll reveals. Tag a curated set, stagger true lists, reveal once.
  // Skipped under cinematic mode, where GSAP owns the reveals instead.
  if (!cinematic) (function () {
    var groups = [
      [".sec-head", 0],
      [".svc-row", 1], [".u-card", 1], [".tier", 1],
      [".work-item", 1], [".work-link", 1],
      [".about-grid > *", 1], [".spec-copy", 0], [".spec-list", 0],
      [".proof-fig", 0], [".seo-proof", 0], [".contact-info", 0], [".contact-form-card", 0],
      [".cta .wrap > *", 1], [".svc-note", 0]
    ];
    var targets = [];
    groups.forEach(function (g) {
      var stagger = g[1];
      document.querySelectorAll(g[0]).forEach(function (el, i) {
        if (el.closest(".hero") || el.hasAttribute("data-reveal")) return;
        el.setAttribute("data-reveal", "");
        if (stagger) { el.style.setProperty("--i", String(Math.min(i, 6))); }
        targets.push(el);
      });
    });
    if (!targets.length) return;
    if (reduceMotion || !("IntersectionObserver" in window)) {
      targets.forEach(function (el) { el.classList.add("is-in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add("is-in"); io.unobserve(entry.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    targets.forEach(function (el) { io.observe(el); });
  })();

  // Header condenses once the page has scrolled.
  (function () {
    var root = document.documentElement, ticking = false;
    function update() { root.classList.toggle("scrolled", window.scrollY > 12); ticking = false; }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  })();

  // Cinematic scroll: smooth momentum + section transitions (GSAP + Lenis).
  if (cinematic) (function () {
    var gsap = window.gsap, ST = window.ScrollTrigger;
    gsap.registerPlugin(ST);

    // Buttery momentum scroll, wired into ScrollTrigger's clock.
    if (window.Lenis) {
      var lenis = new Lenis({
        duration: 1.1, smoothWheel: true,
        easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }
      });
      lenis.on("scroll", ST.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    }

    // Hero drifts up and dims as you scroll past it; the screenshot floats slower.
    gsap.to(".hero .hero-copy", {
      yPercent: -14, autoAlpha: 0.35, ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true }
    });
    gsap.to(".hero .frame", {
      yPercent: -9, ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true }
    });

    // Each section arrives: its heading wipes up, its content rises in sequence.
    gsap.utils.toArray("main > section:not(.hero)").forEach(function (sec) {
      var h = sec.querySelector("h2");
      if (h) {
        gsap.fromTo(h,
          { clipPath: "inset(0 0 100% 0)", y: 28 },
          { clipPath: "inset(0 0 0% 0)", y: 0, duration: 1, ease: "power4.out",
            scrollTrigger: { trigger: sec, start: "top 82%" } });
      }
      var items = gsap.utils.toArray(sec.querySelectorAll(
        ".lead, .svc-row, .svc-note, .about-body > *, .about-portrait, .cta-actions, .cta .sub"
      ));
      if (items.length) {
        gsap.from(items, {
          y: 40, autoAlpha: 0, duration: 0.9, ease: "power3.out", stagger: 0.08,
          scrollTrigger: { trigger: sec, start: "top 78%" }
        });
      }
    });

    // The portrait holds a slow zoom through its section (cinematic drift).
    var portrait = document.querySelector(".about-portrait img");
    if (portrait) {
      gsap.fromTo(portrait, { scale: 1.18 }, {
        scale: 1, ease: "none",
        scrollTrigger: { trigger: ".about", start: "top bottom", end: "bottom top", scrub: true }
      });
    }

    window.addEventListener("load", function () { ST.refresh(); });
  })();

  // Warm light in the hero drifts toward the cursor (desktop, motion on).
  (function () {
    var hero = document.querySelector(".hero");
    if (!hero || reduceMotion || !window.matchMedia || !window.matchMedia("(hover: hover)").matches) return;
    var pending = false, px = 0, py = 0;
    hero.addEventListener("pointermove", function (e) {
      var r = hero.getBoundingClientRect();
      px = ((e.clientX - r.left) / r.width) * 100;
      py = ((e.clientY - r.top) / r.height) * 100;
      if (!pending) {
        pending = true;
        requestAnimationFrame(function () {
          hero.style.setProperty("--spot-x", px.toFixed(1) + "%");
          hero.style.setProperty("--spot-y", py.toFixed(1) + "%");
          pending = false;
        });
      }
    });
  })();

  // Contact form: submit to contact.php via fetch, show inline status.
  var form = document.getElementById("contactForm");
  if (form) {
    var status = form.querySelector(".form-status");
    var button = form.querySelector('button[type="submit"]');
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      status.className = "form-status";
      status.textContent = "Šaljem...";
      button.disabled = true;
      fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { "Accept": "application/json" }
      })
        .then(function (r) { return r.json().catch(function () { return { success: false, error: "Greška na poslužitelju." }; }); })
        .then(function (data) {
          button.disabled = false;
          if (data.success) {
            status.className = "form-status ok";
            status.textContent = "Poruka je poslana. Javljam se u najkraćem roku.";
            form.reset();
          } else {
            status.className = "form-status err";
            status.textContent = data.error || "Slanje nije uspjelo. Pišite mi na WhatsApp ili email.";
          }
        })
        .catch(function () {
          button.disabled = false;
          status.className = "form-status err";
          status.textContent = "Slanje nije uspjelo. Pišite mi na WhatsApp ili email.";
        });
    });
  }
})();

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

  // Fire the hero entrance once the first paint is in.
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { document.body.classList.add("hero-ready"); });
  });

  // Quiet scroll reveals. Tag a curated set, stagger true lists, reveal once.
  (function () {
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

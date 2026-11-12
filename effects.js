// Antonio Digital — homepage scroll choreography (loaded on cinematic pages).
// The particle-network background lives in the site-wide bg.js; this file only
// adds Lenis smooth scroll + light GSAP reveals, DESKTOP POINTERS ONLY, so
// touch scrolling on phones is never intercepted and nothing is hidden.
(function () {
  "use strict";

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var desktop = !window.matchMedia || window.matchMedia("(min-width: 861px) and (pointer: fine)").matches;

  if (!document.querySelector(".hero") || !desktop || reduce) return;

  var lenis = null;
  if (window.Lenis) {
    lenis = new window.Lenis({
      duration: 1.1, smoothWheel: true,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }
    });
    var raf = function (t) { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }

  if (window.gsap && window.ScrollTrigger) {
    var gsap = window.gsap, ST = window.ScrollTrigger;
    gsap.registerPlugin(ST);
    if (lenis) lenis.on("scroll", ST.update);
    gsap.utils.toArray("main > section:not(.hero)").forEach(function (sec) {
      var h = sec.querySelector("h2");
      if (h) gsap.from(h, { y: 30, autoAlpha: 0, duration: 0.8, ease: "power3.out",
        scrollTrigger: { trigger: sec, start: "top 84%" } });
      var items = gsap.utils.toArray(sec.querySelectorAll(".lead, .svc-row, .svc-note, .about-body > *, .about-portrait, .cta-actions, .cta .sub"));
      if (items.length) gsap.from(items, { y: 34, autoAlpha: 0, duration: 0.7, ease: "power3.out", stagger: 0.07,
        scrollTrigger: { trigger: sec, start: "top 80%" } });
    });
    window.addEventListener("load", function () { ST.refresh(); });
  }
})();

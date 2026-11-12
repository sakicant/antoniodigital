// Antonio Digital — homepage effects (loaded only on cinematic pages).
// 1) Mreža: a particle network background (gold dots + links, cursor-reactive)
//    on a 2D canvas behind the hero. Degrades to the plain dark hero if canvas
//    is unavailable; cannot break layout or scrolling.
// 2) Lenis smooth scroll + light GSAP reveals — DESKTOP POINTERS ONLY, so
//    touch scrolling on phones is never intercepted and nothing is hidden.
(function () {
  "use strict";

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var desktop = !window.matchMedia || window.matchMedia("(min-width: 861px) and (pointer: fine)").matches;

  /* ------------------------------------------------------------------ *
   * Hero background: particle network. Purely decorative, behind the
   * hero content. Animates on every device.
   * ------------------------------------------------------------------ */
  (function network() {
    var canvas = document.querySelector(".hero-bg, .page-bg");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    var dpr = 1, N = 70, pts = [], mouse = { x: -9e9, y: -9e9 };
    function fit() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor((canvas.clientWidth || 1) * dpr));
      canvas.height = Math.max(1, Math.floor((canvas.clientHeight || 1) * dpr));
    }
    function seed() {
      pts = [];
      for (var i = 0; i < N; i++) pts.push({
        x: Math.random() * canvas.width, y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4 * dpr, vy: (Math.random() - 0.5) * 0.4 * dpr
      });
    }
    fit(); seed();
    window.addEventListener("resize", function () { fit(); seed(); });
    canvas.addEventListener("pointermove", function (e) {
      var r = canvas.getBoundingClientRect();
      mouse.x = (e.clientX - r.left) * dpr; mouse.y = (e.clientY - r.top) * dpr;
    });
    canvas.addEventListener("pointerleave", function () { mouse.x = -9e9; mouse.y = -9e9; });
    (function frame() {
      requestAnimationFrame(frame);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      var i, j, maxD = 150 * dpr;
      for (i = 0; i < N; i++) { var p = pts[i]; p.x += p.vx; p.y += p.vy; if (p.x < 0 || p.x > canvas.width) p.vx *= -1; if (p.y < 0 || p.y > canvas.height) p.vy *= -1; }
      ctx.lineWidth = dpr; ctx.strokeStyle = "rgb(245,183,60)";
      for (i = 0; i < N; i++) for (j = i + 1; j < N; j++) {
        var a = pts[i], b = pts[j], dx = a.x - b.x, dy = a.y - b.y, d = Math.sqrt(dx * dx + dy * dy);
        if (d < maxD) { ctx.globalAlpha = (1 - d / maxD) * 0.4; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
      }
      for (i = 0; i < N; i++) {
        var q = pts[i], mx = q.x - mouse.x, my = q.y - mouse.y, md = Math.sqrt(mx * mx + my * my);
        if (md < maxD * 1.5) { ctx.globalAlpha = (1 - md / (maxD * 1.5)) * 0.75; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke(); }
      }
      ctx.globalAlpha = 1; ctx.fillStyle = "rgba(245,183,60,0.85)";
      for (i = 0; i < N; i++) { ctx.beginPath(); ctx.arc(pts[i].x, pts[i].y, 1.7 * dpr, 0, 6.2832); ctx.fill(); }
    })();
  })();

  /* ------------------------------------------------------------------ *
   * Lenis smooth scroll + light GSAP reveals. Desktop pointers only.
   * On phones/tablets this whole block is skipped: native scroll, no
   * hidden content.
   * ------------------------------------------------------------------ */
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

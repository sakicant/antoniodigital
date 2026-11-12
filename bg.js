// Antonio Digital — site-wide background: a particle network (gold dots +
// links, cursor-reactive) on a fixed full-page canvas behind all content.
// Injected on every page except the /primjeri/ demo pages. Purely decorative.
(function () {
  "use strict";
  var canvas = document.querySelector(".page-bg");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  var dpr = 1, N = 70, pts = [], mouse = { x: -9e9, y: -9e9 };
  function fit() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor((canvas.clientWidth || window.innerWidth) * dpr));
    canvas.height = Math.max(1, Math.floor((canvas.clientHeight || window.innerHeight) * dpr));
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
  // The canvas is fixed at the viewport origin, so client coords map directly.
  window.addEventListener("pointermove", function (e) { mouse.x = e.clientX * dpr; mouse.y = e.clientY * dpr; });

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

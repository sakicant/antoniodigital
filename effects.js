// Antonio Digital — homepage effects (loaded only on cinematic pages).
// 1) Silk: an animated WebGL background ported from React Bits' "Silk"
//    shader (MIT). Degrades to the plain dark hero if WebGL is missing.
// 2) Lenis smooth scroll + light GSAP reveals — DESKTOP POINTERS ONLY, so
//    touch scrolling on phones is never intercepted and nothing is hidden.
(function () {
  "use strict";

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var desktop = !window.matchMedia || window.matchMedia("(min-width: 861px) and (pointer: fine)").matches;

  /* ------------------------------------------------------------------ *
   * Silk background (WebGL). Runs on every device; purely decorative,
   * sits behind the hero content and cannot break layout or scrolling.
   * ------------------------------------------------------------------ */
  (function silk() {
    var canvas = document.querySelector(".hero-bg");
    if (!canvas) return;
    var gl = canvas.getContext("webgl", { antialias: true, alpha: true, premultipliedAlpha: false });
    if (!gl) return; // no WebGL -> the dark hero background simply shows through

    var vertSrc =
      "attribute vec2 position; attribute vec2 uv; varying vec2 vUv;" +
      "void main(){ vUv = uv; gl_Position = vec4(position, 0.0, 1.0); }";

    var fragSrc = [
      "precision highp float;",
      "varying vec2 vUv;",
      "uniform float uTime;",
      "uniform vec3  uColor;",
      "uniform float uSpeed;",
      "uniform float uScale;",
      "uniform float uRotation;",
      "uniform float uNoiseIntensity;",
      "const float e = 2.71828182845904523536;",
      "float noise(vec2 texCoord){",
      "  float G = e;",
      "  vec2 r = (G * sin(G * texCoord));",
      "  return fract(r.x * r.y * (1.0 + texCoord.x));",
      "}",
      "vec2 rotateUvs(vec2 uv, float angle){",
      "  float c = cos(angle); float s = sin(angle);",
      "  mat2 rot = mat2(c, -s, s, c);",
      "  return uv * rot;",
      "}",
      "void main(){",
      "  float rnd = noise(gl_FragCoord.xy);",
      "  vec2 uv = rotateUvs(vUv * uScale, uRotation);",
      "  vec2 tex = uv * uScale;",
      "  float tOffset = uSpeed * uTime;",
      "  tex.y += 0.03 * sin(8.0 * tex.x - tOffset);",
      "  float pattern = 0.6 + 0.4 * sin(5.0 * (tex.x + tex.y +",
      "      cos(3.0 * tex.x + 5.0 * tex.y) + 0.02 * tOffset) +",
      "      sin(20.0 * (tex.x + tex.y - 0.1 * tOffset)));",
      "  vec4 col = vec4(uColor, 1.0) * vec4(vec3(pattern), 1.0) - rnd / 15.0 * uNoiseIntensity;",
      "  col.a = 1.0;",
      "  gl_FragColor = col;",
      "}"
    ].join("\n");

    function compile(type, src) {
      var sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) return null;
      return sh;
    }
    var vs = compile(gl.VERTEX_SHADER, vertSrc);
    var fs = compile(gl.FRAGMENT_SHADER, fragSrc);
    if (!vs || !fs) return;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    // Full-screen triangle: interleaved position(2) + uv(2).
    var verts = new Float32Array([-1, -1, 0, 0, 3, -1, 2, 0, -1, 3, 0, 2]);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
    var posLoc = gl.getAttribLocation(prog, "position");
    var uvLoc = gl.getAttribLocation(prog, "uv");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(uvLoc);
    gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 16, 8);

    gl.uniform3f(gl.getUniformLocation(prog, "uColor"), 0.30, 0.22, 0.12); // warm dark bronze
    gl.uniform1f(gl.getUniformLocation(prog, "uSpeed"), 2.1);
    gl.uniform1f(gl.getUniformLocation(prog, "uScale"), 1.4);
    gl.uniform1f(gl.getUniformLocation(prog, "uRotation"), 0.0);
    gl.uniform1f(gl.getUniformLocation(prog, "uNoiseIntensity"), 1.3);
    var uTime = gl.getUniformLocation(prog, "uTime");

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var w = canvas.clientWidth || canvas.offsetWidth;
      var h = canvas.clientHeight || canvas.offsetHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    window.addEventListener("resize", resize);
    resize();

    var start = performance.now();
    function frame(now) {
      gl.uniform1f(uTime, (now - start) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      requestAnimationFrame(frame);
    }
    if (reduce) {
      gl.uniform1f(uTime, 2.0);
      gl.drawArrays(gl.TRIANGLES, 0, 3); // one static frame, no motion
    } else {
      requestAnimationFrame(frame);
    }
  })();

  /* ------------------------------------------------------------------ *
   * Lenis smooth scroll + light GSAP reveals. Desktop pointers only.
   * On phones/tablets this whole block is skipped: native scroll, no
   * hidden content.
   * ------------------------------------------------------------------ */
  if (!desktop || reduce) return;

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
    // Reveal section headings and their content as they arrive. gsap.from
    // only sets a from-state when it actually runs (desktop), so a failed
    // load can never leave content hidden.
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

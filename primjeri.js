// Antonio Digital — /primjeri/ demo page. A set of animated background
// options (WebGL shaders + 2D canvas) so the client can compare and pick.
// Each canvas only animates while near the viewport.
(function () {
  "use strict";

  /* Visibility gate: set canvas._on while it is near the viewport. */
  function gate(canvas) {
    canvas._on = true;
    if (!("IntersectionObserver" in window)) return;
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { canvas._on = e.isIntersecting; });
    }, { rootMargin: "140px" }).observe(canvas);
  }

  function fit(canvas) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = canvas.clientWidth || canvas.offsetWidth;
    var h = canvas.clientHeight || canvas.offsetHeight;
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    return dpr;
  }

  /* ---------- Generic full-screen fragment-shader runner ---------- */
  function shader(canvas, frag) {
    var gl = canvas.getContext("webgl", { antialias: true, alpha: true });
    if (!gl) return false;
    var vert = "attribute vec2 p; varying vec2 vUv;" +
      "void main(){ vUv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }";
    function compile(t, s) {
      var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o);
      if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) { return null; }
      return o;
    }
    var vs = compile(gl.VERTEX_SHADER, vert), fs = compile(gl.FRAGMENT_SHADER, frag);
    if (!vs || !fs) return false;
    var pr = gl.createProgram();
    gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { return false; }
    gl.useProgram(pr);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var uTime = gl.getUniformLocation(pr, "uTime");
    var uRes = gl.getUniformLocation(pr, "uRes");
    var uMouse = gl.getUniformLocation(pr, "uMouse");
    var mouse = [0.5, 0.5];
    canvas.addEventListener("pointermove", function (e) {
      var r = canvas.getBoundingClientRect();
      mouse[0] = (e.clientX - r.left) / r.width;
      mouse[1] = 1.0 - (e.clientY - r.top) / r.height;
    });
    function resize() { fit(canvas); gl.viewport(0, 0, canvas.width, canvas.height); }
    window.addEventListener("resize", resize); resize();
    gate(canvas);
    var start = performance.now();
    function frame(now) {
      if (canvas._on) {
        gl.uniform1f(uTime, (now - start) / 1000);
        if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
        if (uMouse) gl.uniform2f(uMouse, mouse[0], mouse[1]);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    return true;
  }

  /* ---------- Shaders ---------- */
  var SILK = [
    "precision highp float; varying vec2 vUv;",
    "uniform float uTime;",
    "const float e = 2.71828182845904523536;",
    "float noise(vec2 t){ float G=e; vec2 r=(G*sin(G*t)); return fract(r.x*r.y*(1.0+t.x)); }",
    "vec2 rot(vec2 uv,float a){ float c=cos(a),s=sin(a); return uv*mat2(c,-s,s,c); }",
    "void main(){",
    "  float rnd=noise(gl_FragCoord.xy);",
    "  vec2 uv=rot(vUv*1.4,0.0); vec2 tex=uv*1.4; float t=2.1*uTime;",
    "  tex.y+=0.03*sin(8.0*tex.x-t);",
    "  float p=0.6+0.4*sin(5.0*(tex.x+tex.y+cos(3.0*tex.x+5.0*tex.y)+0.02*t)+sin(20.0*(tex.x+tex.y-0.1*t)));",
    "  vec3 col=vec3(0.30,0.22,0.12)*p - rnd/15.0*1.3;",
    "  gl_FragColor=vec4(col,1.0);",
    "}"
  ].join("\n");

  var AURORA = [
    "precision highp float; varying vec2 vUv; uniform float uTime;",
    "float hash(float n){ return fract(sin(n)*43758.5453); }",
    "float noise(vec2 x){ vec2 p=floor(x),f=fract(x); f=f*f*(3.0-2.0*f); float n=p.x+p.y*57.0;",
    "  return mix(mix(hash(n),hash(n+1.0),f.x),mix(hash(n+57.0),hash(n+58.0),f.x),f.y); }",
    "void main(){",
    "  vec2 uv=vUv; float t=uTime*0.12; float a=0.0;",
    "  for(float i=0.0;i<3.0;i++){",
    "    float w=0.34+i*0.17+0.12*sin(uv.x*3.0+t*6.0+i*1.7)+0.07*noise(vec2(uv.x*4.0,t*3.0+i));",
    "    a+=smoothstep(0.15,0.0,abs(uv.y-w))*(0.65-i*0.14);",
    "  }",
    "  vec3 g=vec3(0.10,0.85,0.60), pu=vec3(0.45,0.30,0.95);",
    "  vec3 col=mix(g,pu,uv.x)*a + vec3(0.02,0.03,0.05);",
    "  gl_FragColor=vec4(col,1.0);",
    "}"
  ].join("\n");

  var PLASMA = [
    "precision highp float; varying vec2 vUv; uniform float uTime; uniform vec2 uRes;",
    "void main(){",
    "  vec2 uv=(vUv-0.5); uv.x*=uRes.x/uRes.y; float t=uTime*0.5; float v=0.0;",
    "  v+=sin(uv.x*4.0+t);",
    "  v+=sin(uv.y*4.0+t*1.3);",
    "  v+=sin((uv.x+uv.y)*4.0+t*0.7);",
    "  float cx=uv.x+0.5*sin(t*0.3), cy=uv.y+0.5*cos(t*0.4);",
    "  v+=sin(sqrt(80.0*(cx*cx+cy*cy))+t);",
    "  v*=0.25;",
    "  vec3 col=vec3(0.5+0.5*sin(3.1415*v), 0.5+0.5*sin(3.1415*v+2.0), 0.5+0.5*sin(3.1415*v+4.0));",
    "  col=mix(vec3(0.03,0.04,0.06),col,0.6);",
    "  gl_FragColor=vec4(col,1.0);",
    "}"
  ].join("\n");

  /* ---------- 2D canvas: particle network (cursor-reactive) ---------- */
  function network(canvas) {
    var ctx = canvas.getContext("2d"); if (!ctx) return;
    var dpr = fit(canvas), pts = [], N = 68, mouse = { x: -9999, y: -9999 };
    for (var i = 0; i < N; i++) pts.push({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.45 * dpr, vy: (Math.random() - 0.5) * 0.45 * dpr
    });
    window.addEventListener("resize", function () { dpr = fit(canvas); });
    canvas.addEventListener("pointermove", function (e) {
      var r = canvas.getBoundingClientRect();
      mouse.x = (e.clientX - r.left) * dpr; mouse.y = (e.clientY - r.top) * dpr;
    });
    canvas.addEventListener("pointerleave", function () { mouse.x = -9999; mouse.y = -9999; });
    gate(canvas);
    function frame() {
      requestAnimationFrame(frame);
      if (!canvas._on) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      var i, j, maxD = 150 * dpr;
      for (i = 0; i < N; i++) {
        var p = pts[i]; p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      }
      ctx.lineWidth = dpr;
      for (i = 0; i < N; i++) for (j = i + 1; j < N; j++) {
        var a = pts[i], b = pts[j], dx = a.x - b.x, dy = a.y - b.y, d = Math.sqrt(dx * dx + dy * dy);
        if (d < maxD) {
          ctx.globalAlpha = (1 - d / maxD) * 0.45;
          ctx.strokeStyle = "#f5b73c";
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
      for (i = 0; i < N; i++) {
        var q = pts[i], mx = q.x - mouse.x, my = q.y - mouse.y, md = Math.sqrt(mx * mx + my * my);
        if (md < maxD * 1.5) {
          ctx.globalAlpha = (1 - md / (maxD * 1.5)) * 0.8;
          ctx.strokeStyle = "#f5b73c";
          ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      for (i = 0; i < N; i++) {
        ctx.fillStyle = "rgba(245,183,60,0.85)";
        ctx.beginPath(); ctx.arc(pts[i].x, pts[i].y, 1.7 * dpr, 0, 6.2832); ctx.fill();
      }
    }
    requestAnimationFrame(frame);
  }

  /* ---------- 2D canvas: drifting gradient blobs ---------- */
  function blobs(canvas) {
    var ctx = canvas.getContext("2d"); if (!ctx) return;
    var dpr = fit(canvas);
    var cols = ["245,183,60", "226,166,33", "120,90,200", "40,120,160"];
    var B = cols.map(function (c, i) {
      return { c: c, x: Math.random(), y: Math.random(), r: 0.45 + Math.random() * 0.25,
        px: Math.random() * 6.28, py: Math.random() * 6.28, sx: 0.08 + Math.random() * 0.08, sy: 0.08 + Math.random() * 0.08 };
    });
    window.addEventListener("resize", function () { dpr = fit(canvas); });
    gate(canvas);
    var start = performance.now();
    function frame(now) {
      requestAnimationFrame(frame);
      if (!canvas._on) return;
      var t = (now - start) / 1000;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "lighter";
      var W = canvas.width, H = canvas.height, R = Math.max(W, H);
      B.forEach(function (b) {
        var x = (b.x + 0.18 * Math.sin(t * b.sx + b.px)) * W;
        var y = (b.y + 0.18 * Math.cos(t * b.sy + b.py)) * H;
        var rad = b.r * R * 0.6;
        var g = ctx.createRadialGradient(x, y, 0, x, y, rad);
        g.addColorStop(0, "rgba(" + b.c + ",0.42)");
        g.addColorStop(1, "rgba(" + b.c + ",0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, rad, 0, 6.2832); ctx.fill();
      });
      ctx.globalCompositeOperation = "source-over";
    }
    requestAnimationFrame(frame);
  }

  /* ---------- Wire up ---------- */
  var builders = { silk: SILK, aurora: AURORA, plasma: PLASMA };
  document.querySelectorAll(".fx-canvas").forEach(function (c) {
    var fx = c.getAttribute("data-fx");
    if (builders[fx]) { if (!shader(c, builders[fx])) c.classList.add("fx-failed"); }
    else if (fx === "network") network(c);
    else if (fx === "blobs") blobs(c);
  });
})();

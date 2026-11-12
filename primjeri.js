// Antonio Digital — /primjeri/ effect library. A growing catalogue of
// animated backgrounds (WebGL shaders + 2D canvas) to choose from.
// Each effect lazy-initialises when scrolled near and tears down when it
// leaves, so many WebGL contexts can share one page without hitting limits.
(function () {
  "use strict";

  var GOLD = "245,183,60";

  function fit(canvas) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor((canvas.clientWidth || 1) * dpr));
    canvas.height = Math.max(1, Math.floor((canvas.clientHeight || 1) * dpr));
    return dpr;
  }

  /* Lazy lifecycle: init on near-view, stop on far-view. initFn returns a
     stop() that cancels animation and releases resources. */
  function register(canvas, initFn) {
    var started = false, stop = null;
    function enter() { if (!started) { started = true; stop = initFn(canvas); } }
    function leave() { if (started) { started = false; if (stop) stop(); stop = null; } }
    if (!("IntersectionObserver" in window)) { enter(); return; }
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { e.isIntersecting ? enter() : leave(); });
    }, { rootMargin: "220px" }).observe(canvas);
  }

  /* ---------------- WebGL shader runner ---------------- */
  function shaderInit(frag) {
    return function (canvas) {
      var gl = canvas.getContext("webgl", { antialias: true, alpha: true });
      if (!gl) { canvas.classList.add("fx-failed"); return null; }
      var vert = "attribute vec2 p; varying vec2 vUv;" +
        "void main(){ vUv = p*0.5+0.5; gl_Position = vec4(p,0.0,1.0); }";
      function c(t, s) { var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return gl.getShaderParameter(o, gl.COMPILE_STATUS) ? o : null; }
      var vs = c(gl.VERTEX_SHADER, vert), fs = c(gl.FRAGMENT_SHADER, frag);
      if (!vs || !fs) { canvas.classList.add("fx-failed"); return null; }
      var pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { canvas.classList.add("fx-failed"); return null; }
      gl.useProgram(pr);
      var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      var loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      var uTime = gl.getUniformLocation(pr, "uTime"), uRes = gl.getUniformLocation(pr, "uRes"), uMouse = gl.getUniformLocation(pr, "uMouse");
      var mouse = [0.5, 0.5];
      function move(e) { var r = canvas.getBoundingClientRect(); mouse[0] = (e.clientX - r.left) / r.width; mouse[1] = 1.0 - (e.clientY - r.top) / r.height; }
      canvas.addEventListener("pointermove", move);
      function resize() { fit(canvas); gl.viewport(0, 0, canvas.width, canvas.height); }
      window.addEventListener("resize", resize); resize();
      var raf, run = true, panel = canvas.closest(".fx-panel"), t = 0, last = performance.now(), drew = false;
      (function frame(now) {
        if (!run) return;
        var hov = !panel || panel.matches(":hover");
        if (hov) t += (now - last) / 1000;
        last = now;
        if (hov || !drew) {
          gl.uniform1f(uTime, t);
          if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
          if (uMouse) gl.uniform2f(uMouse, mouse[0], mouse[1]);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
          drew = true;
        }
        raf = requestAnimationFrame(frame);
      })(last);
      return function () {
        run = false; cancelAnimationFrame(raf);
        window.removeEventListener("resize", resize);
        canvas.removeEventListener("pointermove", move);
        var ext = gl.getExtension("WEBGL_lose_context"); if (ext) ext.loseContext();
      };
    };
  }

  /* ---------------- Fragment shaders ---------------- */
  var NOISE2D =
    "float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }" +
    "float noise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);" +
    " return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }" +
    "float fbm(vec2 p){ float s=0.0,a=0.5; for(int i=0;i<5;i++){ s+=a*noise(p); p=p*2.0+vec2(1.3,1.7); a*=0.5; } return s; }";

  var SH = {
    silk: [
      "precision highp float; varying vec2 vUv; uniform float uTime;",
      "const float e=2.71828182845904523536;",
      "float n(vec2 t){ float G=e; vec2 r=(G*sin(G*t)); return fract(r.x*r.y*(1.0+t.x)); }",
      "void main(){ float rnd=n(gl_FragCoord.xy); vec2 uv=vUv*1.4; vec2 tex=uv*1.4; float t=2.1*uTime;",
      " tex.y+=0.03*sin(8.0*tex.x-t);",
      " float p=0.6+0.4*sin(5.0*(tex.x+tex.y+cos(3.0*tex.x+5.0*tex.y)+0.02*t)+sin(20.0*(tex.x+tex.y-0.1*t)));",
      " gl_FragColor=vec4(vec3(0.30,0.22,0.12)*p - rnd/15.0*1.3,1.0); }"
    ].join("\n"),

    aurora: [
      "precision highp float; varying vec2 vUv; uniform float uTime;",
      "float hash(float n){ return fract(sin(n)*43758.5453); }",
      "float nz(vec2 x){ vec2 p=floor(x),f=fract(x); f=f*f*(3.0-2.0*f); float k=p.x+p.y*57.0;",
      " return mix(mix(hash(k),hash(k+1.0),f.x),mix(hash(k+57.0),hash(k+58.0),f.x),f.y); }",
      "void main(){ vec2 uv=vUv; float t=uTime*0.12; float a=0.0;",
      " for(float i=0.0;i<3.0;i++){ float w=0.34+i*0.17+0.12*sin(uv.x*3.0+t*6.0+i*1.7)+0.07*nz(vec2(uv.x*4.0,t*3.0+i));",
      "  a+=smoothstep(0.15,0.0,abs(uv.y-w))*(0.65-i*0.14); }",
      " vec3 col=mix(vec3(0.10,0.85,0.60),vec3(0.45,0.30,0.95),uv.x)*a+vec3(0.02,0.03,0.05);",
      " gl_FragColor=vec4(col,1.0); }"
    ].join("\n"),

    plasma: [
      "precision highp float; varying vec2 vUv; uniform float uTime; uniform vec2 uRes;",
      "void main(){ vec2 uv=(vUv-0.5); uv.x*=uRes.x/uRes.y; float t=uTime*0.5; float v=0.0;",
      " v+=sin(uv.x*4.0+t); v+=sin(uv.y*4.0+t*1.3); v+=sin((uv.x+uv.y)*4.0+t*0.7);",
      " float cx=uv.x+0.5*sin(t*0.3), cy=uv.y+0.5*cos(t*0.4); v+=sin(sqrt(80.0*(cx*cx+cy*cy))+t); v*=0.25;",
      " vec3 col=vec3(0.5+0.5*sin(3.1415*v),0.5+0.5*sin(3.1415*v+2.0),0.5+0.5*sin(3.1415*v+4.0));",
      " gl_FragColor=vec4(mix(vec3(0.03,0.04,0.06),col,0.6),1.0); }"
    ].join("\n"),

    mesh: [
      "precision highp float; varying vec2 vUv; uniform float uTime;",
      NOISE2D,
      "vec3 pal(float t){ return 0.5+0.5*cos(6.2831*(t+vec3(0.0,0.33,0.67))); }",
      "void main(){ vec2 uv=vUv*2.0; float t=uTime*0.1;",
      " float n=fbm(uv+vec2(t,t*0.5)+fbm(uv+t));",
      " vec3 col=mix(vec3(0.04,0.05,0.07),pal(n*0.6+t*0.1),0.6);",
      " gl_FragColor=vec4(col,1.0); }"
    ].join("\n"),

    iridescence: [
      "precision highp float; varying vec2 vUv; uniform float uTime; uniform vec2 uRes;",
      "void main(){ vec2 uv=(vUv-0.5); uv.x*=uRes.x/uRes.y; float t=uTime*0.3;",
      " float d=length(uv); float a=atan(uv.y,uv.x);",
      " vec3 col=0.5+0.5*cos(vec3(0.0,2.0,4.0)+d*8.0-t*2.0+a*2.0);",
      " gl_FragColor=vec4(mix(vec3(0.03,0.04,0.06),col,0.5),1.0); }"
    ].join("\n"),

    waves: [
      "precision highp float; varying vec2 vUv; uniform float uTime;",
      "void main(){ vec2 uv=vUv; float t=uTime*0.5;",
      " float w=sin(uv.x*6.2831+t)*0.1+sin(uv.x*12.0-t*1.3)*0.04;",
      " float v=0.5+0.5*sin((uv.y+w)*20.0);",
      " gl_FragColor=vec4(mix(vec3(0.05,0.06,0.09),vec3(0.96,0.72,0.24),v*0.6),1.0); }"
    ].join("\n"),

    threads: [
      "precision highp float; varying vec2 vUv; uniform float uTime;",
      "void main(){ vec2 uv=vUv; float t=uTime*0.3; float c=0.0;",
      " for(float i=0.0;i<6.0;i++){ float off=(i+0.5)/6.0;",
      "  float yy=off+0.06*sin(uv.x*8.0+t+i)+0.03*sin(uv.x*17.0-t*1.4+i);",
      "  c+=smoothstep(0.012,0.0,abs(uv.y-yy)); }",
      " gl_FragColor=vec4(vec3(0.96,0.72,0.24)*c+vec3(0.02,0.025,0.035),1.0); }"
    ].join("\n"),

    fog: [
      "precision highp float; varying vec2 vUv; uniform float uTime;",
      NOISE2D,
      "void main(){ vec2 uv=vUv*3.0; float t=uTime*0.08;",
      " float n=fbm(uv+vec2(t*2.0,t));",
      " vec3 col=mix(vec3(0.03,0.035,0.05),vec3(0.96,0.72,0.24)*0.55,n);",
      " gl_FragColor=vec4(col,1.0); }"
    ].join("\n"),

    ripple: [
      "precision highp float; varying vec2 vUv; uniform float uTime; uniform vec2 uRes; uniform vec2 uMouse;",
      "void main(){ vec2 uv=(vUv-0.5); uv.x*=uRes.x/uRes.y; vec2 m=(uMouse-0.5); m.x*=uRes.x/uRes.y;",
      " float d=length(uv-m); float r=sin(d*42.0-uTime*3.0)*exp(-d*3.0);",
      " float d2=length(uv); r+=0.5*sin(d2*30.0-uTime*2.0);",
      " vec3 col=vec3(0.96,0.72,0.24)*(0.5+0.5*r)*0.5+vec3(0.03,0.035,0.05);",
      " gl_FragColor=vec4(col,1.0); }"
    ].join("\n")
  };

  /* ---------------- 2D canvas effects ---------------- */
  function loop(canvas, draw) {
    var raf, run = true, panel = canvas.closest(".fx-panel"), t = 0, last = performance.now(), drew = false;
    (function frame(now) {
      if (!run) return;
      var hov = !panel || panel.matches(":hover");
      if (hov) t += (now - last) / 1000;
      last = now;
      if (hov || !drew) { draw(t); drew = true; }
      raf = requestAnimationFrame(frame);
    })(last);
    return function () { run = false; cancelAnimationFrame(raf); };
  }

  function network(canvas) {
    var ctx = canvas.getContext("2d"); if (!ctx) return null;
    var dpr = fit(canvas), N = 68, pts = [], mouse = { x: -9e9, y: -9e9 };
    for (var i = 0; i < N; i++) pts.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, vx: (Math.random() - 0.5) * 0.45 * dpr, vy: (Math.random() - 0.5) * 0.45 * dpr });
    function rs() { dpr = fit(canvas); } window.addEventListener("resize", rs);
    function mv(e) { var r = canvas.getBoundingClientRect(); mouse.x = (e.clientX - r.left) * dpr; mouse.y = (e.clientY - r.top) * dpr; }
    function lv() { mouse.x = -9e9; mouse.y = -9e9; }
    canvas.addEventListener("pointermove", mv); canvas.addEventListener("pointerleave", lv);
    var stop = loop(canvas, function () {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      var i, j, maxD = 150 * dpr;
      for (i = 0; i < N; i++) { var p = pts[i]; p.x += p.vx; p.y += p.vy; if (p.x < 0 || p.x > canvas.width) p.vx *= -1; if (p.y < 0 || p.y > canvas.height) p.vy *= -1; }
      ctx.lineWidth = dpr; ctx.strokeStyle = "rgb(" + GOLD + ")";
      for (i = 0; i < N; i++) for (j = i + 1; j < N; j++) { var a = pts[i], b = pts[j], dx = a.x - b.x, dy = a.y - b.y, d = Math.sqrt(dx * dx + dy * dy); if (d < maxD) { ctx.globalAlpha = (1 - d / maxD) * 0.45; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); } }
      for (i = 0; i < N; i++) { var q = pts[i], mx = q.x - mouse.x, my = q.y - mouse.y, md = Math.sqrt(mx * mx + my * my); if (md < maxD * 1.5) { ctx.globalAlpha = (1 - md / (maxD * 1.5)) * 0.8; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke(); } }
      ctx.globalAlpha = 1; ctx.fillStyle = "rgba(" + GOLD + ",0.85)";
      for (i = 0; i < N; i++) { ctx.beginPath(); ctx.arc(pts[i].x, pts[i].y, 1.7 * dpr, 0, 6.2832); ctx.fill(); }
    });
    return function () { stop(); window.removeEventListener("resize", rs); canvas.removeEventListener("pointermove", mv); canvas.removeEventListener("pointerleave", lv); };
  }

  function blobs(canvas) {
    var ctx = canvas.getContext("2d"); if (!ctx) return null;
    var dpr = fit(canvas), cols = ["245,183,60", "226,166,33", "120,90,200", "40,120,160"];
    var B = cols.map(function (c) { return { c: c, x: Math.random(), y: Math.random(), r: 0.45 + Math.random() * 0.25, px: Math.random() * 6.28, py: Math.random() * 6.28, sx: 0.08 + Math.random() * 0.08, sy: 0.08 + Math.random() * 0.08 }; });
    function rs() { dpr = fit(canvas); } window.addEventListener("resize", rs);
    var stop = loop(canvas, function (t) {
      var W = canvas.width, H = canvas.height, R = Math.max(W, H);
      ctx.clearRect(0, 0, W, H); ctx.globalCompositeOperation = "lighter";
      B.forEach(function (b) {
        var x = (b.x + 0.18 * Math.sin(t * b.sx + b.px)) * W, y = (b.y + 0.18 * Math.cos(t * b.sy + b.py)) * H, rad = b.r * R * 0.6;
        var g = ctx.createRadialGradient(x, y, 0, x, y, rad); g.addColorStop(0, "rgba(" + b.c + ",0.42)"); g.addColorStop(1, "rgba(" + b.c + ",0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rad, 0, 6.2832); ctx.fill();
      });
      ctx.globalCompositeOperation = "source-over";
    });
    return function () { stop(); window.removeEventListener("resize", rs); };
  }

  function stars(canvas) {
    var ctx = canvas.getContext("2d"); if (!ctx) return null;
    var dpr = fit(canvas), N = 150, st = [];
    function seed() { st = []; for (var i = 0; i < N; i++) st.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, z: Math.random() * 1 + 0.3, ph: Math.random() * 6.28 }); }
    seed();
    function rs() { dpr = fit(canvas); seed(); } window.addEventListener("resize", rs);
    var stop = loop(canvas, function (t) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (var i = 0; i < N; i++) { var s = st[i]; s.y += s.z * 0.25 * dpr; if (s.y > canvas.height) { s.y = 0; s.x = Math.random() * canvas.width; }
        var tw = 0.5 + 0.5 * Math.sin(t * 2.0 + s.ph); ctx.globalAlpha = (0.25 + 0.75 * tw) * s.z;
        ctx.fillStyle = "rgba(" + GOLD + ",0.9)"; ctx.beginPath(); ctx.arc(s.x, s.y, s.z * 1.3 * dpr, 0, 6.2832); ctx.fill(); }
      ctx.globalAlpha = 1;
    });
    return function () { stop(); window.removeEventListener("resize", rs); };
  }

  function matrix(canvas) {
    var ctx = canvas.getContext("2d"); if (!ctx) return null;
    var dpr = fit(canvas), fontSize = 16 * dpr, cols, drops;
    var glyphs = "01アイウエオカキクケコサシスセソ<>/\\|=+*".split("");
    function setup() { cols = Math.floor(canvas.width / fontSize); drops = []; var rows = canvas.height / fontSize; for (var i = 0; i < cols; i++) drops[i] = Math.random() * rows; }
    setup();
    function rs() { dpr = fit(canvas); fontSize = 16 * dpr; setup(); } window.addEventListener("resize", rs);
    var last = 0;
    var stop = loop(canvas, function (t) {
      if (t - last < 0.05) return; last = t;
      ctx.fillStyle = "rgba(14,17,22,0.18)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = fontSize + "px monospace";
      for (var i = 0; i < cols; i++) {
        var ch = glyphs[(Math.random() * glyphs.length) | 0], x = i * fontSize, y = drops[i] * fontSize;
        ctx.fillStyle = "rgba(" + GOLD + ",0.95)"; ctx.fillText(ch, x, y);
        if (y > canvas.height && Math.random() > 0.975) drops[i] = 0; drops[i] += 1;
      }
    });
    return function () { stop(); window.removeEventListener("resize", rs); };
  }

  function bokeh(canvas) {
    var ctx = canvas.getContext("2d"); if (!ctx) return null;
    var dpr = fit(canvas), N = 26, o = [];
    function seed() { o = []; for (var i = 0; i < N; i++) o.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, r: (20 + Math.random() * 70) * dpr, s: (0.15 + Math.random() * 0.4) * dpr, ph: Math.random() * 6.28, a: 0.06 + Math.random() * 0.12 }); }
    seed();
    function rs() { dpr = fit(canvas); seed(); } window.addEventListener("resize", rs);
    var stop = loop(canvas, function (t) {
      ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.globalCompositeOperation = "lighter";
      for (var i = 0; i < N; i++) { var b = o[i]; b.y -= b.s; if (b.y + b.r < 0) { b.y = canvas.height + b.r; b.x = Math.random() * canvas.width; }
        var x = b.x + Math.sin(t * 0.4 + b.ph) * 20 * dpr;
        var g = ctx.createRadialGradient(x, b.y, 0, x, b.y, b.r); g.addColorStop(0, "rgba(" + GOLD + "," + b.a + ")"); g.addColorStop(1, "rgba(" + GOLD + ",0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, b.y, b.r, 0, 6.2832); ctx.fill(); }
      ctx.globalCompositeOperation = "source-over";
    });
    return function () { stop(); window.removeEventListener("resize", rs); };
  }

  function grid(canvas) {
    var ctx = canvas.getContext("2d"); if (!ctx) return null;
    var dpr = fit(canvas), gap = 34 * dpr;
    function rs() { dpr = fit(canvas); gap = 34 * dpr; } window.addEventListener("resize", rs);
    var stop = loop(canvas, function (t) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      var cx = canvas.width / 2, cy = canvas.height / 2;
      for (var x = gap / 2; x < canvas.width; x += gap) for (var y = gap / 2; y < canvas.height; y += gap) {
        var d = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
        var w = Math.sin(d * 0.012 - t * 2.0);
        var r = (0.6 + 0.9 * (0.5 + 0.5 * w)) * dpr;
        ctx.globalAlpha = 0.25 + 0.6 * (0.5 + 0.5 * w);
        ctx.fillStyle = "rgba(" + GOLD + ",1)"; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
      }
      ctx.globalAlpha = 1;
    });
    return function () { stop(); window.removeEventListener("resize", rs); };
  }

  var CANVAS2D = { network: network, blobs: blobs, stars: stars, matrix: matrix, bokeh: bokeh, grid: grid };

  /* ---------------- Wire up ---------------- */
  document.querySelectorAll(".fx-canvas").forEach(function (canvas) {
    var fx = canvas.getAttribute("data-fx");
    if (SH[fx]) register(canvas, shaderInit(SH[fx]));
    else if (CANVAS2D[fx]) register(canvas, CANVAS2D[fx]);
  });

  /* ================= UI demos (text, cards, buttons, scroll) ================= */

  // Text: stagger — wrap each word and give it an index for the CSS delay.
  document.querySelectorAll(".t-stagger").forEach(function (el) {
    var words = el.textContent.trim().split(/\s+/); el.textContent = "";
    words.forEach(function (w, i) { var s = document.createElement("span"); s.className = "w"; s.style.setProperty("--i", i); s.textContent = w; el.appendChild(s); el.appendChild(document.createTextNode(" ")); });
  });

  // Text: typewriter.
  document.querySelectorAll("[data-type]").forEach(function (el) {
    var full = el.getAttribute("data-type"), i = 0, del = false, host = el.closest(".demo-item"); el.classList.add("t-caret");
    (function tick() {
      if (host && !host.matches(":hover")) { el.textContent = ""; i = 0; del = false; return setTimeout(tick, 200); }
      el.textContent = full.slice(0, i); var d = 120;
      if (!del) { i++; if (i > full.length) { i = full.length; del = true; d = 1500; } }
      else { i--; if (i < 0) { i = 0; del = false; d = 600; } else d = 55; }
      setTimeout(tick, d);
    })();
  });

  // Text: rotating word.
  document.querySelectorAll("[data-rotate]").forEach(function (el) {
    var words = el.getAttribute("data-rotate").split("|"), b = el.querySelector("b") || el, i = 0, host = el.closest(".demo-item");
    b.textContent = words[0];
    setInterval(function () { if (host && !host.matches(":hover")) return; b.style.opacity = "0"; setTimeout(function () { i = (i + 1) % words.length; b.textContent = words[i]; b.style.opacity = "1"; }, 260); }, 2200);
  });

  // Text: scramble / decode.
  document.querySelectorAll("[data-scramble]").forEach(function (el) {
    var full = el.getAttribute("data-scramble"), chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&", f = 0, host = el.closest(".demo-item");
    (function run() {
      if (host && !host.matches(":hover")) { el.textContent = ""; f = 0; return setTimeout(run, 200); }
      var out = "";
      for (var i = 0; i < full.length; i++) out += (i < f / 2) ? full[i] : (full[i] === " " ? " " : chars[(Math.random() * chars.length) | 0]);
      el.textContent = out; f++;
      if (f / 2 < full.length) setTimeout(run, 40); else setTimeout(function () { f = 0; run(); }, 2400);
    })();
  });

  // Cards: tilt toward the cursor.
  document.querySelectorAll(".card-tilt").forEach(function (c) {
    c.addEventListener("pointermove", function (e) { var r = c.getBoundingClientRect(); var px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5; c.style.setProperty("--rx", (px * 16).toFixed(2) + "deg"); c.style.setProperty("--ry", (-py * 16).toFixed(2) + "deg"); });
    c.addEventListener("pointerleave", function () { c.style.setProperty("--rx", "0deg"); c.style.setProperty("--ry", "0deg"); });
  });

  // Cards: spotlight that follows the cursor.
  document.querySelectorAll(".card-spot").forEach(function (c) {
    c.addEventListener("pointermove", function (e) { var r = c.getBoundingClientRect(); c.style.setProperty("--mx", (e.clientX - r.left) + "px"); c.style.setProperty("--my", (e.clientY - r.top) + "px"); });
  });

  // Buttons: magnetic pull.
  document.querySelectorAll(".db-mag").forEach(function (b) {
    b.addEventListener("pointermove", function (e) { var r = b.getBoundingClientRect(); b.style.transform = "translate(" + ((e.clientX - r.left - r.width / 2) * 0.3) + "px," + ((e.clientY - r.top - r.height / 2) * 0.45) + "px)"; });
    b.addEventListener("pointerleave", function () { b.style.transform = "translate(0,0)"; });
  });

  // Buttons: click ripple.
  document.querySelectorAll(".db-ripple").forEach(function (b) {
    b.addEventListener("click", function (e) { var r = b.getBoundingClientRect(), rip = document.createElement("span"); rip.className = "rip"; var s = Math.max(r.width, r.height); rip.style.width = rip.style.height = s + "px"; rip.style.left = (e.clientX - r.left) + "px"; rip.style.top = (e.clientY - r.top) + "px"; b.appendChild(rip); setTimeout(function () { rip.remove(); }, 600); });
  });

  // Scroll: progress bar.
  var prog = document.querySelector(".scroll-progress");
  if (prog) { var sp = function () { var h = document.documentElement; prog.style.transform = "scaleX(" + (h.scrollTop / ((h.scrollHeight - h.clientHeight) || 1)) + ")"; }; window.addEventListener("scroll", sp, { passive: true }); sp(); }

  // Scroll: reveal on enter.
  var revs = document.querySelectorAll(".sc-reveal");
  if (revs.length && "IntersectionObserver" in window) { var rio = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); rio.unobserve(e.target); } }); }, { rootMargin: "0px 0px -10% 0px" }); revs.forEach(function (el) { rio.observe(el); }); }
  else revs.forEach(function (el) { el.classList.add("in"); });

  // Scroll: parallax.
  var paras = document.querySelectorAll("[data-parallax]");
  if (paras.length) { var pp = function () { paras.forEach(function (el) { var r = el.getBoundingClientRect(); var c = r.top + r.height / 2 - window.innerHeight / 2; el.style.transform = "translateY(" + (-c * (parseFloat(el.getAttribute("data-parallax")) || 0.15)).toFixed(1) + "px)"; }); }; window.addEventListener("scroll", pp, { passive: true }); pp(); }

  // Scroll: count-up.
  var cs = document.querySelectorAll("[data-count]");
  if (cs.length && "IntersectionObserver" in window) {
    var cio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return; var el = e.target, target = parseFloat(el.getAttribute("data-count")), suf = el.getAttribute("data-suffix") || "", t0 = null;
        (function step(ts) { if (!t0) t0 = ts; var p = Math.min((ts - t0) / 1400, 1); el.textContent = Math.floor((1 - Math.pow(1 - p, 3)) * target) + suf; if (p < 1) requestAnimationFrame(step); })();
        cio.unobserve(el);
      });
    }); cs.forEach(function (el) { cio.observe(el); });
  }
})();

/*!
 * <csv-porto> · Animação "navio saindo do porto" da CSV Aduaneiro
 * Web component sem dependências. Uso:
 *   <script src="https://moralesmozart.github.io/csvelasco/embed/porto.js" defer></script>
 *   <csv-porto style="height:480px"></csv-porto>
 *
 * Atributos opcionais:
 *   hud="false"            esconde o painel de liberação (DUIMP, NCM...)
 *   labels="A|B|C"         textos do painel, separados por |  (o último fica amarelo)
 *   speed="55"             segundos para o navio cruzar a tela
 *   horizon="0.5"          altura da linha d'água (0 = topo, 1 = base)
 */
(function () {
  if (customElements.get("csv-porto")) return;

  const DEFAULT_LABELS = [
    "DUIMP 26BR0004471-3 · REGISTRADA",
    "NCM 8479.89.99 · VALIDADA",
    "LPCO ANATEL · DEFERIDA",
    "PARAMETRIZAÇÃO · CANAL VERDE",
    "CARGA · LIBERADA"
  ];
  const COLS = ["#C0392B", "#FFC928", "#1F6FB2", "#2E9E66", "#E07B39", "#7A8CA5", "#B03A7A"];

  function rnd(seed) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

  class CsvPorto extends HTMLElement {
    static get observedAttributes() { return ["hud", "labels", "speed", "horizon"]; }

    constructor() {
      super();
      const root = this.attachShadow({ mode: "open" });
      root.innerHTML = '<style>:host{display:block;position:relative;height:420px;background:#050B16;overflow:hidden}canvas{position:absolute;inset:0;width:100%;height:100%;display:block}</style><canvas role="img" aria-label="Animação: navio porta-contêineres saindo do porto à noite"></canvas>';
      this.cv = root.querySelector("canvas");
      this.cx = this.cv.getContext("2d");
      this.raf = 0; this.visible = true; this.t0 = performance.now();
      this.RM = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      this.frame = this.frame.bind(this);
    }

    get opts() {
      const labels = (this.getAttribute("labels") || "").split("|").map(s => s.trim()).filter(Boolean);
      return {
        hud: this.getAttribute("hud") !== "false",
        labels: labels.length ? labels : DEFAULT_LABELS,
        speed: Math.max(10, parseFloat(this.getAttribute("speed")) || 55),
        horizon: this.hasAttribute("horizon") && !isNaN(parseFloat(this.getAttribute("horizon"))) ? Math.min(.9, Math.max(.2, parseFloat(this.getAttribute("horizon")))) : 0
      };
    }

    connectedCallback() {
      this.setup();
      this.ro = new ResizeObserver(() => { this.setup(); if (this.RM) this.frame(performance.now()); });
      this.ro.observe(this);
      this.io = new IntersectionObserver(es => {
        this.visible = es[0].isIntersecting;
        cancelAnimationFrame(this.raf);
        if (this.visible) this.raf = requestAnimationFrame(this.frame);
      });
      this.io.observe(this);
      this.raf = requestAnimationFrame(this.frame);
    }
    disconnectedCallback() { cancelAnimationFrame(this.raf); this.ro && this.ro.disconnect(); this.io && this.io.disconnect(); }
    attributeChangedCallback() { if (this.RM && this.W) this.frame(performance.now()); }

    setup() {
      const cv = this.cv, cx = this.cx;
      this.DPR = Math.min(2, window.devicePixelRatio || 1);
      this.W = cv.clientWidth; this.H = cv.clientHeight;
      cv.width = this.W * this.DPR; cv.height = this.H * this.DPR;
      cx.setTransform(this.DPR, 0, 0, this.DPR, 0, 0);
      const W = this.W, H = this.H, r = rnd(7);
      this.stars = Array.from({ length: 90 }, () => ({ x: r() * W, y: r() * H * .5, a: r() * .6 + .1, t: r() * 6 }));
      this.shimmer = Array.from({ length: 70 }, () => ({ x: r() * W, y: r(), l: 20 + r() * 70, s: .2 + r() * .6 }));
      const stack = (seed, n, max) => { const q = rnd(seed); return Array.from({ length: n }, () => Array.from({ length: 1 + Math.floor(q() * max) }, () => COLS[Math.floor(q() * COLS.length)])); };
      this.stacks = stack(11, 26, 4).map(c => c.length < 2 ? c.concat(c) : c);
      this.pier = stack(23, 40, 4);
    }

    hz() { const h = this.opts.horizon; return this.H * (h || (this.W < 900 ? .66 : .5)); }

    drawSky(t) {
      const { cx, W } = this, base = this.hz();
      const g = cx.createLinearGradient(0, 0, 0, base);
      g.addColorStop(0, "#03070F"); g.addColorStop(.55, "#08182E"); g.addColorStop(.9, "#103A5C"); g.addColorStop(1, "#1D6E8A");
      cx.fillStyle = g; cx.fillRect(0, 0, W, base);
      const rg = cx.createRadialGradient(W * .72, base, 10, W * .72, base, W * .55);
      rg.addColorStop(0, "rgba(70,217,240,.35)"); rg.addColorStop(.4, "rgba(70,217,240,.08)"); rg.addColorStop(1, "rgba(70,217,240,0)");
      cx.fillStyle = rg; cx.fillRect(0, 0, W, base);
      this.stars.forEach(s => { cx.globalAlpha = s.a * (.6 + .4 * Math.sin(t * .001 + s.t)); cx.fillStyle = "#CFE7FF"; cx.fillRect(s.x, s.y % base, 1.2, 1.2); });
      cx.globalAlpha = 1;
      cx.fillStyle = "#0B2238";
      const r = rnd(5); let x = W * .42;
      while (x < W) { const w = 14 + r() * 40, h = 8 + r() * 38; cx.fillRect(x, base - h, w, h); x += w + 2 + r() * 8; }
      cx.fillStyle = "rgba(255,201,40,.5)";
      const r4 = rnd(9); for (let i = 0; i < 40; i++) cx.fillRect(W * .42 + r4() * W * .58, base - 4 - r4() * 30, 1.5, 1.5);
    }

    drawPort(t) {
      const { cx, W, H } = this, s = H / 760, base = this.hz();
      cx.fillStyle = "#071322"; cx.fillRect(0, base - 6 * s, W * .42, 10 * s);
      const cw = 20 * s, ch = 9 * s; let x = 4;
      this.pier.forEach(col => { if (x > W * .38) return; col.forEach((c, i) => { cx.fillStyle = c; cx.globalAlpha = .55; cx.fillRect(x, base - 6 * s - ch * (i + 1), cw - 1.5, ch - 1.5); }); x += cw; });
      cx.globalAlpha = 1;
      [.06, .15, .24, .33].forEach((f, i) => {
        const cxp = W * f, top = base - 150 * s, legW = 34 * s;
        cx.strokeStyle = "#16385A"; cx.lineWidth = Math.max(1.5, 3 * s);
        cx.beginPath();
        cx.moveTo(cxp, base - 6 * s); cx.lineTo(cxp, top); cx.moveTo(cxp + legW, base - 6 * s); cx.lineTo(cxp + legW, top);
        cx.moveTo(cxp, base - 60 * s); cx.lineTo(cxp + legW, base - 60 * s);
        cx.moveTo(cxp - 30 * s, top); cx.lineTo(cxp + legW + 120 * s, top);
        cx.moveTo(cxp, top); cx.lineTo(cxp + legW * .5, top - 36 * s); cx.lineTo(cxp + legW, top);
        cx.moveTo(cxp + legW * .5, top - 36 * s); cx.lineTo(cxp + legW + 120 * s, top);
        cx.stroke();
        const sx = cxp + legW + 30 * s + ((Math.sin(t * .0004 + i * 1.7) + 1) / 2) * 80 * s;
        const sy = top + 20 * s + ((Math.sin(t * .0007 + i) + 1) / 2) * 80 * s;
        cx.strokeStyle = "rgba(70,217,240,.5)"; cx.lineWidth = 1; cx.beginPath(); cx.moveTo(sx, top); cx.lineTo(sx, sy); cx.stroke();
        cx.fillStyle = "#E07B39"; cx.globalAlpha = .8; cx.fillRect(sx - 10 * s, sy, 20 * s, 8 * s); cx.globalAlpha = 1;
        const on = (Math.floor(t / 700) + i) % 2 === 0;
        cx.fillStyle = on ? "#FF5E57" : "rgba(255,94,87,.25)";
        cx.beginPath(); cx.arc(cxp + legW * .5, top - 38 * s, 2.6 * s + 1, 0, Math.PI * 2); cx.fill();
        if (on) { cx.fillStyle = "rgba(255,94,87,.25)"; cx.beginPath(); cx.arc(cxp + legW * .5, top - 38 * s, 9 * s, 0, Math.PI * 2); cx.fill(); }
      });
    }

    drawWater(t) {
      const { cx, W, H } = this, base = this.hz();
      const g = cx.createLinearGradient(0, base, 0, H);
      g.addColorStop(0, "#0D2E48"); g.addColorStop(.35, "#061A2E"); g.addColorStop(1, "#030A14");
      cx.fillStyle = g; cx.fillRect(0, base, W, H - base);
      cx.strokeStyle = "rgba(70,217,240,.07)"; cx.lineWidth = 1;
      const vx = W * .72;
      for (let i = -12; i <= 12; i++) { cx.beginPath(); cx.moveTo(vx, base); cx.lineTo(vx + i * W * .18, H); cx.stroke(); }
      for (let k = 0; k < 9; k++) { const p = ((k + (t * .00012) % 1) / 9); const y = base + (H - base) * p * p; cx.beginPath(); cx.moveTo(0, y); cx.lineTo(W, y); cx.stroke(); }
      this.shimmer.forEach(sh => { const y = base + 4 + sh.y * sh.y * (H - base); const x = (sh.x + t * .01 * sh.s) % (W + 100) - 50; cx.strokeStyle = `rgba(150,220,255,${.05 + .12 * (1 - sh.y)})`; cx.beginPath(); cx.moveTo(x, y); cx.lineTo(x + sh.l * (.4 + sh.y), y); cx.stroke(); });
      const rg = cx.createRadialGradient(W * .72, base, 4, W * .72, base, W * .3);
      rg.addColorStop(0, "rgba(70,217,240,.18)"); rg.addColorStop(1, "rgba(70,217,240,0)");
      cx.fillStyle = rg; cx.fillRect(0, base, W, H - base);
    }

    drawShip(x, y, s, t, refl) {
      const cx = this.cx, L = 440 * s;
      cx.save(); cx.translate(x, y);
      if (refl) { cx.scale(1, -.55); cx.globalAlpha = .18; }
      const cw = 17 * s, ch = 9 * s; let px = L * .2;
      this.stacks.forEach(col => { if (px > L * .9) return; col.forEach((c, i) => { cx.fillStyle = c; cx.fillRect(px, -30 * s - ch * (i + 1), cw - 1.4, ch - 1.4); }); px += cw; });
      cx.fillStyle = "#DCE6F0"; cx.fillRect(L * .06, -94 * s, L * .09, 64 * s);
      cx.fillStyle = "#0A1628"; cx.fillRect(L * .06, -94 * s, L * .09, 6 * s);
      cx.fillStyle = "#FFC928"; for (let i = 0; i < 5; i++) cx.fillRect(L * .065 + i * L * .016, -82 * s, L * .01, 4 * s);
      cx.fillStyle = "#2A3E55"; cx.fillRect(L * .09, -114 * s, 3 * s, 22 * s);
      cx.beginPath(); cx.moveTo(0, -30 * s); cx.lineTo(L * .95, -30 * s); cx.lineTo(L, -42 * s); cx.lineTo(L * .93, 8 * s); cx.lineTo(L * .05, 8 * s); cx.closePath();
      cx.fillStyle = "#0B1A2D"; cx.fill();
      cx.fillStyle = "#A3282A"; cx.fillRect(L * .05, 0, L * .88, 8 * s);
      cx.strokeStyle = "rgba(70,217,240,.55)"; cx.lineWidth = 1; cx.beginPath(); cx.moveTo(0, -30 * s); cx.lineTo(L * .95, -30 * s); cx.lineTo(L, -42 * s); cx.stroke();
      if (!refl) {
        const on = Math.floor(t / 500) % 2 === 0;
        cx.fillStyle = on ? "#3DD68C" : "rgba(61,214,140,.3)"; cx.beginPath(); cx.arc(L * .99, -44 * s, 2.5 * s + .8, 0, 7); cx.fill();
        cx.fillStyle = "#FFFFFF"; cx.beginPath(); cx.arc(L * .095, -116 * s, 2 * s + .6, 0, 7); cx.fill();
      }
      cx.restore();
    }

    drawHud(x, y, L, s, t, labels) {
      const cx = this.cx, top = y - 130 * s, bx = x - 12 * s, bw = L + 24 * s, bh = y + 16 * s - top;
      const pulse = .55 + .45 * Math.sin(t * .004);
      cx.strokeStyle = `rgba(70,217,240,${.5 + .3 * pulse})`; cx.lineWidth = 1.5;
      const k = 14 * s + 6;
      const corner = (ax, ay, dx, dy) => { cx.beginPath(); cx.moveTo(ax, ay + dy * k); cx.lineTo(ax, ay); cx.lineTo(ax + dx * k, ay); cx.stroke(); };
      corner(bx, top, 1, 1); corner(bx + bw, top, -1, 1); corner(bx, top + bh, 1, -1); corner(bx + bw, top + bh, -1, -1);
      const sy = top + ((t * .08) % bh);
      const lg = cx.createLinearGradient(0, sy - 16, 0, sy); lg.addColorStop(0, "rgba(70,217,240,0)"); lg.addColorStop(1, "rgba(70,217,240,.28)");
      cx.fillStyle = lg; cx.fillRect(bx, sy - 16, bw, 16);
      const n = labels.length, step = Math.floor(t / 1600) % (n + 1), shown = Math.min(step, n);
      const fs = Math.max(9, 11 * s + 2);
      cx.font = `500 ${fs}px "JetBrains Mono", ui-monospace, Menlo, monospace`;
      for (let i = 0; i < shown; i++) {
        const txt = labels[i], yy = top - 12 - (shown - 1 - i) * (fs + 9), last = i === n - 1;
        const tw = cx.measureText(txt).width + 26;
        cx.fillStyle = last ? "rgba(255,201,40,.95)" : "rgba(5,11,22,.72)"; cx.fillRect(bx, yy - fs - 3, tw, fs + 8);
        cx.fillStyle = last ? "#191200" : (i === step - 1 ? "#EAF2FA" : "#8EA5BE"); cx.fillText(txt, bx + 20, yy + 1);
        cx.fillStyle = last ? "#191200" : "#3DD68C"; cx.fillText("✓", bx + 6, yy + 1);
      }
    }

    frame(now) {
      if (!this.W) return;
      const { cx, W, H, RM } = this, o = this.opts, t = now - this.t0;
      cx.clearRect(0, 0, W, H);
      this.drawSky(t); this.drawWater(t); this.drawPort(t);
      const s = Math.max(.55, Math.min(1.25, H / 760)) * (W < 600 ? .75 : 1), L = 440 * s;
      const span = W + L * 1.4, dur = o.speed * 1000;
      const p = RM ? .42 : ((t % dur) / dur);
      const x = W * .28 + p * span - L * .2, y = this.hz() + 12 * s, bob = RM ? 0 : Math.sin(t * .0015) * 1.2;
      cx.strokeStyle = "rgba(200,235,255,.22)"; cx.lineWidth = 1.2;
      for (let i = 1; i < 6; i++) { cx.beginPath(); cx.moveTo(x + L * .02, y + 6 * s); cx.lineTo(x - i * 36 * s, y + 6 * s + i * 5 * s); cx.stroke(); }
      this.drawShip(x, y + bob, s, t, true);
      this.drawShip(x, y + bob, s, t, false);
      if (o.hud) this.drawHud(x, y + bob, L, s, RM ? 1600 * o.labels.length : t, o.labels);
      if (!RM && this.visible) this.raf = requestAnimationFrame(this.frame);
    }
  }

  customElements.define("csv-porto", CsvPorto);
})();

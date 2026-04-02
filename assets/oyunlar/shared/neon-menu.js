const NeonMenu = (function() {
  const DIFFS = [
    { id: 'easy', name: 'KOLAY', color: '#4fffb0', desc: 'RAHAT BİR MACERAYA HAZIR MISIN' },
    { id: 'normal', name: 'NORMAL', color: '#f9c74f', desc: 'DENGELİ BİR MEYDAN OKUMA SENİ BEKLİYOR' },
    { id: 'hard', name: 'ZOR', color: '#ff2244', desc: 'SADECE GÜÇLÜLER GEÇEBİLİR — İYİ ŞANSLAR' },
  ];

  let onStartCallback = null;
  let onRestartCallback = null;
  let currentInstruction = { name: "GAME", howToPlay: "" };
  let menuContainer = null;
  
  // morph state
  let morphVal = 0;
  let morphTarget = 0;
  let morphRaf = null;
  let lastRendered = -99;
  let blinkT;

  const $ = id => document.getElementById(id);
  
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function hexRgb(h) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h);
    return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [0, 0, 0];
  }
  function lerpHex(c1, c2, t) {
    const a = hexRgb(c1), b = hexRgb(c2);
    return `rgb(${[0, 1, 2].map(i => Math.round(lerp(a[i], b[i], t))).join(',')})`;
  }
  function accentColor(v) {
    return v <= 1 ? lerpHex(DIFFS[0].color, DIFFS[1].color, v)
      : lerpHex(DIFFS[1].color, DIFFS[2].color, v - 1);
  }

  function sa(id, k, v) { const e = $(id); if (e) e.setAttribute(k, String(v)); }
  function so(id, v) { const e = $(id); if (e) e.setAttribute('opacity', String(v)); }
  function sf(id, v) { const e = $(id); if (e) e.setAttribute('fill', String(v)); }
  function ss(id, k, v) { const e = $(id); if (e) e.style[k] = v; }

  function renderFace(v) {
    if (Math.abs(v - lastRendered) < 0.003) return;
    lastRendered = v;

    const c = accentColor(v);
    const t01 = clamp(v, 0, 1);
    const t12 = clamp(v - 1, 0, 1);
    const tE = 1 - t01;
    const tH = t12;
    const tN = 1 - Math.abs(v - 1);

    menuContainer.style.setProperty('--neon-menu-c', c);
    
    if ($('nm-diff-name')) $('nm-diff-name').style.color = c;
    if ($('nm-cta')) {
      $('nm-cta').style.borderColor = c;
      $('nm-cta').style.color = c;
    }
    if ($('nm-glow')) {
      $('nm-glow').style.background = `radial-gradient(circle,${c} 0%,transparent 65%)`;
      $('nm-glow').style.opacity = lerp(.12, .19, tH).toFixed(2);
    }

    ['nm-head', 'nm-visor', 'nm-ear-l', 'nm-ear-r', 'nm-collar'].forEach(id => {
      const e = $(id); if (e) e.setAttribute('stroke', c);
    });
    if ($('nm-collar-line')) $('nm-collar-line').setAttribute('stroke', c);
    if ($('nm-body-stroke')) $('nm-body-stroke').setAttribute('stroke', c);

    ['nm-el-iris', 'nm-er-iris', 'nm-el-glow', 'nm-er-glow'].forEach(id => sf(id, c));
    ['nm-brow-l', 'nm-brow-r'].forEach(id => { const e = $(id); if (e) e.setAttribute('stroke', c); });
    if ($('nm-mouth-path')) $('nm-mouth-path').setAttribute('stroke', c);

    const browLpts = { easy: [32, 64, 52, 54, 68, 62], normal: [32, 66, 52, 58, 68, 64], hard: [30, 76, 50, 60, 68, 68] };
    const browRpts = { easy: [92, 62, 108, 54, 128, 64], normal: [92, 64, 108, 58, 128, 66], hard: [92, 68, 110, 60, 130, 76] };
    
    function interpBrow(pts) {
      const [a, b] = t12 > 0 ? [pts.normal, pts.hard] : [pts.easy, pts.normal];
      const t = t12 > 0 ? t12 : t01;
      const p = a.map((val, i) => lerp(val, b[i], t));
      return t12 > 0.5 ? `M${p[0]} ${p[1]} L${p[2]} ${p[3]} L${p[4]} ${p[5]}` : `M${p[0]} ${p[1]} Q${p[2]} ${p[3]} ${p[4]} ${p[5]}`;
    }
    sa('nm-brow-l', 'd', interpBrow(browLpts));
    sa('nm-brow-r', 'd', interpBrow(browRpts));
    const bw = t12 > 0 ? lerp(5, 7, t12) : lerp(4, 5, t01);
    ['nm-brow-l', 'nm-brow-r'].forEach(id => sa(id, 'stroke-width', bw.toFixed(1)));

    const mcy = t12 > 0 ? lerp(6, -14, t12) : lerp(14, 6, t01);
    const mw = lerp(28, 24, tH);
    sa('nm-mouth-path', 'd', `M${-mw.toFixed(1)} 0 Q0 ${mcy.toFixed(1)} ${mw.toFixed(1)} 0`);

    so('nm-mouth-bg', 0);
    ss('nm-teeth-grp', 'opacity', 0);

    const irisR = lerp(lerp(15, 14, t01), lerp(14, 12.5, t12), t12 > 0 ? 1 : 0);
    const pupilR = lerp(lerp(7.5, 7, t01), lerp(7, 5.5, t12), t12 > 0 ? 1 : 0);
    ['nm-el-iris', 'nm-er-iris'].forEach(id => sa(id, 'r', irisR.toFixed(1)));
    ['nm-el-pupil', 'nm-er-pupil'].forEach(id => sa(id, 'r', pupilR.toFixed(1)));

    const shineOp = lerp(lerp(.85, .7, t01), lerp(.7, 0, t12), t12 > 0 ? 1 : 0);
    ['nm-el-shine', 'nm-er-shine'].forEach(id => so(id, shineOp.toFixed(2)));
    ['nm-el-slit', 'nm-er-slit'].forEach(id => so(id, (tH * 0.75).toFixed(3)));

    const eyeY = lerp(83, 85, tH);
    sa('nm-eye-l', 'transform', `translate(56,${eyeY.toFixed(1)})`);
    sa('nm-eye-r', 'transform', `translate(104,${eyeY.toFixed(1)})`);

    so('nm-blush-l', (tE * 0.48).toFixed(3));
    so('nm-blush-r', (tE * 0.48).toFixed(3));
    so('nm-sweat', (tN * 0.9).toFixed(3));
    so('nm-veins', (tH * 0.95).toFixed(3));

    ss('nm-hair-easy', 'opacity', (1 - tH).toFixed(3));
    ss('nm-hair-hard', 'opacity', tH.toFixed(3));
    ['nm-hair-band', 'nm-hair-top'].forEach(id => { const e = $(id); if (e) e.setAttribute('stroke', c); });

    const snapIdx = Math.round(clamp(v, 0, 2));
    if ($('nm-diff-name')) $('nm-diff-name').textContent = DIFFS[snapIdx].name;
    if ($('nm-diff-desc')) $('nm-diff-desc').textContent = DIFFS[snapIdx].desc;
    for (let i = 0; i < 3; i++) {
      if ($('nm-lbl-' + i)) {
        $('nm-lbl-' + i).classList.remove('active');
        $('nm-lbl-' + i).style.color = '';
      }
    }
    if ($('nm-lbl-' + snapIdx)) {
      $('nm-lbl-' + snapIdx).classList.add('active');
      $('nm-lbl-' + snapIdx).style.color = DIFFS[snapIdx].color;
    }
  }

  function morphTo(target) {
    morphTarget = target;
    if (morphRaf) return;
    (function tick() {
      const d = morphTarget - morphVal;
      if (Math.abs(d) < 0.004) {
        morphVal = morphTarget;
        renderFace(morphVal);
        morphRaf = null;
        applyAnim(Math.round(morphVal));
        return;
      }
      morphVal += d * 0.11;
      renderFace(morphVal);
      morphRaf = requestAnimationFrame(tick);
    })();
  }

  function applyAnim(idx) {
    const ch = $('nm-char');
    if (!ch) return;
    ch.classList.remove('neon-menu-anim-float', 'neon-menu-anim-shudder');
    void ch.offsetWidth;
    ch.classList.add(idx === 2 ? 'neon-menu-anim-shudder' : 'neon-menu-anim-float');
  }

  function doBlink() {
    ['nm-el-lid', 'nm-er-lid'].forEach(id => {
      const e = $(id); if (!e) return;
      e.setAttribute('opacity', '1');
      setTimeout(() => e.setAttribute('opacity', '0'), 110);
    });
  }
  
  function resetBlink(idx) {
    clearInterval(blinkT);
    if (idx < 2) blinkT = setInterval(doBlink, idx === 0 ? 2600 : 4400);
  }

  let curPct = 0, dragging = false;
  function pctToVal(p) { return p / 50; }
  function valToPct(v) { return v * 50; }

  function setPct(p, snap = false) {
    curPct = clamp(p, 0, 100);
    const v = pctToVal(curPct);
    const snapped = snap ? Math.round(clamp(v, 0, 2)) : v;
    const finalPct = snap ? valToPct(snapped) : curPct;
    if ($('nm-knob')) $('nm-knob').style.left = finalPct + '%';
    if ($('nm-fill')) $('nm-fill').style.width = finalPct + '%';
    curPct = finalPct;
    morphTo(snapped);
    if (snap) resetBlink(Math.round(snapped));
  }

  function toPct(cx) {
    const tr = $('nm-track');
    if (!tr) return 0;
    const r = tr.getBoundingClientRect();
    return (cx - r.left) / r.width * 100;
  }

  function buildSVG() {
    return `
      <div class="neon-menu-stage" id="nm-stage">
        <div class="neon-menu-stage-glow" id="nm-glow"></div>
        <svg id="nm-char" viewBox="0 0 160 180" xmlns="http://www.w3.org/2000/svg">
          <defs><clipPath id="nm-visor-clip"><rect x="26" y="44" width="108" height="82" rx="16" /></clipPath></defs>
          <ellipse cx="80" cy="176" rx="38" ry="5" fill="rgba(0,0,0,.45)" />
          <rect x="64" y="124" width="32" height="20" rx="6" fill="#151520" />
          <rect x="68" y="128" width="24" height="3" rx="1.5" fill="rgba(255,255,255,.08)" />
          <rect x="68" y="134" width="24" height="3" rx="1.5" fill="rgba(255,255,255,.08)" />
          <path d="M18 158 Q14 148 22 142 Q44 136 80 138 Q116 136 138 142 Q146 148 142 158 Q110 168 80 170 Q50 168 18 158Z" fill="#14141f" />
          <path id="nm-body-stroke" d="M22 142 Q44 136 80 138 Q116 136 138 142 Q146 148 142 158" fill="none" stroke="#4fffb0" stroke-width="1.5" stroke-linecap="round" opacity=".55" />
          <ellipse cx="80" cy="140" rx="38" ry="9" fill="#1c1c2a" id="nm-collar" />
          <path id="nm-collar-line" d="M46 140 Q80 148 114 140" fill="none" stroke="#4fffb0" stroke-width="1.2" stroke-linecap="round" opacity=".4" />
          <rect id="nm-ear-l" x="8" y="58" width="14" height="30" rx="7" fill="#151520" stroke="#4fffb0" stroke-width="1.5" />
          <rect id="nm-ear-r" x="138" y="58" width="14" height="30" rx="7" fill="#151520" stroke="#4fffb0" stroke-width="1.5" />
          <line x1="11" y1="68" x2="20" y2="68" stroke="rgba(255,255,255,.25)" stroke-width="1.2" />
          <line x1="11" y1="74" x2="20" y2="74" stroke="rgba(255,255,255,.25)" stroke-width="1.2" />
          <line x1="140" y1="68" x2="149" y2="68" stroke="rgba(255,255,255,.25)" stroke-width="1.2" />
          <line x1="140" y1="74" x2="149" y2="74" stroke="rgba(255,255,255,.25)" stroke-width="1.2" />
          <rect id="nm-head" x="18" y="22" width="124" height="108" rx="26" fill="#1a1a2a" stroke="#4fffb0" stroke-width="2" />
          <rect x="26" y="30" width="108" height="92" rx="20" fill="#101018" stroke="rgba(255,255,255,.04)" stroke-width=".5" />
          <g id="nm-hair-easy">
            <rect id="nm-hair-band" x="28" y="18" width="104" height="16" rx="8" fill="#1a1a2a" stroke="#4fffb0" stroke-width="1.5" />
            <circle id="nm-hair-top" cx="80" cy="10" r="9" fill="#1a1a2a" stroke="#4fffb0" stroke-width="1.5" />
            <circle cx="55" cy="16" r="6" fill="#1a1a2a" stroke="#4fffb0" stroke-width="1.2" opacity=".7" />
            <circle cx="105" cy="16" r="6" fill="#1a1a2a" stroke="#4fffb0" stroke-width="1.2" opacity=".7" />
          </g>
          <g id="nm-hair-hard" opacity="0">
            <polygon points="62,22 56,4 70,18" fill="#1a1a2a" stroke="#ff2244" stroke-width="1.5" stroke-linejoin="round" />
            <polygon points="80,20 75,2 90,16" fill="#1a1a2a" stroke="#ff2244" stroke-width="1.5" stroke-linejoin="round" />
            <polygon points="98,22 104,4 90,18" fill="#1a1a2a" stroke="#ff2244" stroke-width="1.5" stroke-linejoin="round" />
          </g>
          <rect id="nm-visor" x="26" y="44" width="108" height="82" rx="16" fill="#070710" stroke="#4fffb0" stroke-width="1.5" />
          <rect x="30" y="47" width="48" height="7" rx="3.5" fill="rgba(255,255,255,.05)" />
          <g clip-path="url(#nm-visor-clip)">
            <path id="nm-brow-l" d="M32 64 Q52 54 68 62" fill="none" stroke="#4fffb0" stroke-width="4.5" stroke-linecap="round" />
            <path id="nm-brow-r" d="M92 62 Q108 54 128 64" fill="none" stroke="#4fffb0" stroke-width="4.5" stroke-linecap="round" />
            <g id="nm-eye-l" transform="translate(56,83)">
              <circle cx="0" cy="0" r="20" fill="#070710" />
              <circle id="nm-el-glow" cx="0" cy="0" r="18" fill="#4fffb0" opacity=".12" />
              <circle id="nm-el-iris" cx="0" cy="0" r="14" fill="#4fffb0" />
              <circle id="nm-el-pupil" cx="0" cy="0" r="7" fill="#04040e" />
              <circle id="nm-el-shine" cx="4" cy="-5" r="3.5" fill="white" opacity=".85" />
              <rect id="nm-el-slit" x="-15" y="-5" width="30" height="10" rx="5" fill="#04040e" opacity="0" />
              <rect id="nm-el-lid" x="-21" y="-21" width="42" height="21" fill="#070710" opacity="0" class="neon-menu-no-trans" />
            </g>
            <g id="nm-eye-r" transform="translate(104,83)">
              <circle cx="0" cy="0" r="20" fill="#070710" />
              <circle id="nm-er-glow" cx="0" cy="0" r="18" fill="#4fffb0" opacity=".12" />
              <circle id="nm-er-iris" cx="0" cy="0" r="14" fill="#4fffb0" />
              <circle id="nm-er-pupil" cx="0" cy="0" r="7" fill="#04040e" />
              <circle id="nm-er-shine" cx="4" cy="-5" r="3.5" fill="white" opacity=".85" />
              <rect id="nm-er-slit" x="-15" y="-5" width="30" height="10" rx="5" fill="#04040e" opacity="0" />
              <rect id="nm-er-lid" x="-21" y="-21" width="42" height="21" fill="#070710" opacity="0" class="neon-menu-no-trans" />
            </g>
            <ellipse id="nm-blush-l" cx="34" cy="96" rx="12" ry="8" fill="#ff6eb4" opacity="0" />
            <ellipse id="nm-blush-r" cx="126" cy="96" rx="12" ry="8" fill="#ff6eb4" opacity="0" />
            <g id="nm-mouth-group" transform="translate(80,112)">
              <path id="nm-mouth-bg" d="M-22 0 Q0 12 22 0 L22 12 Q0 20 -22 12 Z" fill="#04040e" opacity="0" />
              <path id="nm-mouth-path" d="M-28 0 Q0 14 28 0" fill="none" stroke="#4fffb0" stroke-width="4" stroke-linecap="round" />
              <g id="nm-teeth-grp" opacity="0">
                <rect x="-18" y="1" width="9" height="8" rx="2" fill="rgba(255,255,255,.88)" />
                <rect x="-8" y="0" width="9" height="9" rx="2" fill="rgba(255,255,255,.88)" />
                <rect x="2" y="0" width="9" height="9" rx="2" fill="rgba(255,255,255,.88)" />
                <rect x="12" y="1" width="7" height="8" rx="2" fill="rgba(255,255,255,.88)" />
              </g>
            </g>
            <g id="nm-sweat" opacity="0">
              <path d="M128 52 Q132 60 128 67 Q123 67 123 60 Q123 52 128 52Z" fill="#4fc3f7" />
              <circle cx="128" cy="50" r="3" fill="#4fc3f7" />
            </g>
            <g id="nm-veins" opacity="0">
              <path d="M34 50 L28 42 L38 38 L32 30" fill="none" stroke="#ff2244" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M126 50 L132 42 L122 38 L128 30" fill="none" stroke="#ff2244" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
            </g>
          </g>
        </svg>
      </div>
    `;
  }

  function initUI() {
    if (!document.getElementById('neon-menu-style')) {
      const link = document.createElement('link');
      link.id = 'neon-menu-style';
      link.rel = 'stylesheet';
      link.href = '../shared/neon-menu.css';
      document.head.appendChild(link);
    }

    if (!menuContainer) {
      menuContainer = document.createElement('div');
      menuContainer.id = 'neon-menu-container';
      document.body.appendChild(menuContainer);
    }
  }

  function initializeSlider() {
    const tr = $('nm-track');
    if (!tr) return;
    tr.addEventListener('mousedown', e => { dragging = true; setPct(toPct(e.clientX)); });
    window.addEventListener('mousemove', e => { if (dragging) setPct(toPct(e.clientX)); });
    window.addEventListener('mouseup', () => { if (dragging) { dragging = false; setPct(curPct, true); } });
    tr.addEventListener('touchstart', e => { e.preventDefault(); dragging = true; setPct(toPct(e.touches[0].clientX)); }, { passive: false });
    window.addEventListener('touchmove', e => { if (!dragging) return; e.preventDefault(); setPct(toPct(e.touches[0].clientX)); }, { passive: false });
    window.addEventListener('touchend', () => { if (dragging) { dragging = false; setPct(curPct, true); } });
  }

  return {
    init: async function({ onStart, onRestart }) {
      initUI();
      onStartCallback = onStart;
      onRestartCallback = onRestart || onStart;
      
      try {
        const response = await fetch('instruction.json');
        currentInstruction = await response.json();
      } catch (e) {
        console.warn("Could not load instruction.json", e);
      }
    },
    
    showStart: function() {
      menuContainer.innerHTML = `
        <div class="neon-menu-title">${currentInstruction.name}</div>
        <div class="neon-menu-instructions">${currentInstruction.howToPlay}</div>
        
        ${buildSVG()}

        <div class="neon-menu-diff-name" id="nm-diff-name">KOLAY</div>
        <div class="neon-menu-diff-desc" id="nm-diff-desc">RAHAT BİR MACERAYA HAZIR MISIN</div>

        <div class="neon-menu-slider-wrap">
          <div class="neon-menu-tier-labels">
            <span class="neon-menu-tier-label active" id="nm-lbl-0">Kolay</span>
            <span class="neon-menu-tier-label" id="nm-lbl-1">Normal</span>
            <span class="neon-menu-tier-label" id="nm-lbl-2">Zor</span>
          </div>
          <div class="neon-menu-track" id="nm-track">
            <div class="neon-menu-track-fill" id="nm-fill"></div>
            <div class="neon-menu-knob" id="nm-knob"></div>
          </div>
        </div>

        <button class="neon-menu-cta" id="nm-cta">BAŞLA</button>
      `;
      
      menuContainer.classList.add('active');

      initializeSlider();

      // Read saved difficulty or use normal as default
      let savedDiff = localStorage.getItem('neonDifficulty') || 'normal';
      let idx = DIFFS.findIndex(d => d.id === savedDiff);
      if(idx === -1) idx = 1;
      
      morphVal = idx;
      lastRendered = -99;
      setPct(idx * 50, true);

      $('nm-cta').addEventListener('click', () => {
        const finalIdx = Math.round(clamp(pctToVal(curPct), 0, 2));
        const d = DIFFS[finalIdx];
        
        localStorage.setItem('neonDifficulty', d.id);
        if (window.NEON && window.NEON.setDiff) {
            window.NEON.setDiff(d.id);
        }

        const ch = $('nm-char');
        ch.classList.remove('neon-menu-anim-pop'); 
        void ch.offsetWidth; 
        ch.classList.add('neon-menu-anim-pop');
        
        // Let animation play shortly before starting
        setTimeout(() => {
          menuContainer.classList.remove('active');
          if (onStartCallback) onStartCallback();
        }, 150);
      });
    },
    
    showGameOver: function(score, bestScore, extraMessage = "") {
      menuContainer.innerHTML = `
        <div class="neon-menu-title" style="color: #ff2d78;">OYUN BİTTİ</div>
        ${extraMessage ? `<div class="neon-menu-instructions" style="color: #ff2d78;">${extraMessage}</div>` : ''}
        
        ${buildSVG()}

        <div class="neon-menu-score-summary">
            Skor: <span class="neon-menu-score-val">${score}</span><br>
            En İyi: <span class="neon-menu-score-val">${bestScore}</span>
        </div>

        <button class="neon-menu-cta" id="nm-restart-btn">TEKRAR DENE</button>
      `;

      menuContainer.classList.add('active');

      // Always show angry/sad face (hard face) with pink/red color for game over
      morphVal = 2; // Hard face look
      lastRendered = -99;
      renderFace(2);
      
      // Override some colors for game over
      menuContainer.style.setProperty('--neon-menu-c', '#ff2d78');
      if ($('nm-cta')) {
          $('nm-restart-btn').style.borderColor = '#ff2d78';
          $('nm-restart-btn').style.color = '#ff2d78';
      }

      $('nm-restart-btn').addEventListener('click', () => {
          menuContainer.classList.remove('active');
          if (onRestartCallback) onRestartCallback();
      });
    }
  };
})();

(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const NS = 'http://www.w3.org/2000/svg';
  const setKidText = Dino.kidText({
    '郵差走小路': ['ㄧㄡˊ', 'ㄔㄞ', 'ㄗㄡˇ', 'ㄒㄧㄠˇ', 'ㄌㄨˋ'],
    '點一下，開始送信！': ['ㄉㄧㄢˇ', 'ㄧ', 'ㄒㄧㄚˋ', '', 'ㄎㄞ', 'ㄕˇ', 'ㄙㄨㄥˋ', 'ㄒㄧㄣˋ', ''],
    '按住郵差，走到朋友家': ['ㄢˋ', 'ㄓㄨˋ', 'ㄧㄡˊ', 'ㄔㄞ', '', 'ㄗㄡˇ', 'ㄉㄠˋ', 'ㄆㄥˊ', 'ㄧㄡˇ', 'ㄐㄧㄚ'],
    '按住郵差，照星星走到郵筒': ['ㄢˋ', 'ㄓㄨˋ', 'ㄧㄡˊ', 'ㄔㄞ', '', 'ㄓㄠˋ', 'ㄒㄧㄥ', 'ㄒㄧㄥ', 'ㄗㄡˇ', 'ㄉㄠˋ', 'ㄧㄡˊ', 'ㄊㄨㄥˇ'],
    '沿著路走喔': ['ㄧㄢˊ', 'ㄓㄜ˙', 'ㄌㄨˋ', 'ㄗㄡˇ', 'ㄛ'],
    '回到路上': ['ㄏㄨㄟˊ', 'ㄉㄠˋ', 'ㄌㄨˋ', 'ㄕㄤˋ'],
    '送到了！': ['ㄙㄨㄥˋ', 'ㄉㄠˋ', 'ㄌㄜ˙', ''],
    '寫出注音ㄑ': ['ㄒㄧㄝˇ', 'ㄔㄨ', 'ㄓㄨˋ', 'ㄧㄣ', ''],
    ...Object.fromEntries('CLMNSUVWZJO23'.split('').map(g => [`照著寫 ${g}`, ['ㄓㄠˋ', 'ㄓㄜ˙', 'ㄒㄧㄝˇ', '', '']])),
    '新手': ['ㄒㄧㄣ', 'ㄕㄡˇ'],
    '信都送到了！': ['ㄒㄧㄣˋ', 'ㄉㄡ', 'ㄙㄨㄥˋ', 'ㄉㄠˋ', 'ㄌㄜ˙', ''],
    '簡單': ['ㄐㄧㄢˇ', 'ㄉㄢ'], '普通': ['ㄆㄨˇ', 'ㄊㄨㄥ'], '困難': ['ㄎㄨㄣˋ', 'ㄋㄢˊ'],
    '知道了': ['ㄓ', 'ㄉㄠˋ', 'ㄌㄜ˙'],
    '再玩一次': ['ㄗㄞˋ', 'ㄨㄢˊ', 'ㄧ', 'ㄘˋ'], '回首頁': ['ㄏㄨㄟˊ', 'ㄕㄡˇ', 'ㄧㄝˋ']
  });

  // 關卡池（導演 2026-10-22：每輪 5 關、池子 20–30 條、可用注音／英文）：橫式座標 1000×600；直式手機自動轉成上→下。
  // tier 1 簡單、2 中等、3 難；glyph＝照著寫（字形不轉向、不鏡像）；cross＝路會交叉，後半段畫成橋
  const POOL = [
    { tier: 1, pts: [[110, 300], [890, 300]], lines: true },
    { tier: 1, pts: [[110, 420], [500, 170], [890, 420]] },
    { tier: 1, pts: [[110, 480], [890, 130]], lines: true },
    { tier: 1, pts: [[110, 200], [350, 450], [650, 150], [890, 400]] },
    { tier: 1, pts: [[110, 150], [600, 150], [600, 470], [890, 470]], lines: true },
    { tier: 2, pts: [[110, 430], [300, 170], [500, 430], [700, 170], [890, 400]] },
    { tier: 2, pts: [[110, 470], [260, 150], [420, 470], [580, 150], [740, 470], [890, 170]], lines: true },
    { tier: 2, pts: [[110, 500], [300, 500], [300, 350], [500, 350], [500, 200], [700, 200], [700, 100], [890, 100]], lines: true },
    { tier: 2, pts: [[120, 150], [780, 150], [880, 300], [780, 450], [120, 450]] },
    { tier: 2, pts: [[110, 480], [300, 160], [560, 120], [760, 300], [620, 480], [890, 480]] },
    { tier: 2, pts: [[110, 450], [250, 180], [400, 450], [550, 180], [700, 450], [890, 300]] },
    { tier: 3, pts: [[100, 500], [380, 470], [620, 300], [680, 130], [520, 70], [400, 150], [430, 330], [560, 470], [760, 520], [900, 400]], cross: [520, 70] },
    { tier: 3, pts: [[110, 120], [880, 120], [880, 300], [120, 300], [120, 480], [890, 480]], lines: true },
    { tier: 3, pts: [[110, 520], [230, 90], [350, 520], [470, 90], [590, 520], [710, 90], [890, 500]], lines: true },
    { tier: 3, pts: [[90, 300], [220, 120], [360, 480], [500, 120], [640, 480], [780, 120], [910, 300]] },
    { glyph: 'ㄑ', pts: [[640, 70], [380, 300], [650, 530]], lines: true },
    { glyph: 'C', pts: [[640, 140], [500, 85], [370, 170], [330, 300], [370, 430], [500, 515], [640, 460]] },
    { glyph: 'L', pts: [[400, 80], [400, 510], [660, 510]], lines: true },
    { glyph: 'M', pts: [[300, 510], [330, 90], [500, 330], [670, 90], [700, 510]], lines: true },
    { glyph: 'N', pts: [[350, 510], [350, 90], [650, 510], [650, 90]], lines: true },
    { glyph: 'S', pts: [[650, 150], [500, 80], [360, 170], [420, 280], [580, 330], [640, 440], [500, 525], [350, 460]] },
    { glyph: 'U', pts: [[360, 80], [360, 370], [430, 505], [570, 505], [640, 370], [640, 80]] },
    { glyph: 'V', pts: [[330, 80], [500, 515], [670, 80]], lines: true },
    { glyph: 'W', pts: [[230, 80], [360, 515], [500, 220], [640, 515], [770, 80]], lines: true },
    { glyph: 'Z', pts: [[330, 100], [670, 100], [330, 500], [670, 500]], lines: true },
    { glyph: 'J', pts: [[620, 80], [620, 400], [560, 510], [440, 505], [370, 420]] },
    { glyph: 'O', pts: [[500, 80], [355, 145], [310, 300], [355, 455], [500, 520], [645, 455], [690, 300], [645, 145], [520, 84]] },
    { glyph: '2', pts: [[360, 180], [450, 90], [580, 105], [625, 220], [540, 340], [360, 510], [665, 510]] },
    { glyph: '3', pts: [[370, 140], [500, 85], [625, 160], [585, 270], [470, 300], [600, 330], [635, 445], [500, 520], [365, 460]] }
  ];
  const GLYPH_AUDIO = { '2': 'assets/audio/kidapp-two.mp3', '3': 'assets/audio/kidapp-three.mp3' };
  let LEVELS = [];
  // 每輪 5 關：簡單→簡單/中等→照著寫→中等→難；非字形路隨機鏡像、上下翻、點位微調，每次都不一樣
  function makeRound(prev) {
    const fresh = list => { const f = list.filter(L => !prev.includes(L)); return Dino.shuffle(f.length ? f : list); };
    const of = t => POOL.filter(L => L.tier === t), t1 = fresh(of(1)), t12 = fresh([...of(1), ...of(2)]), t2 = fresh(of(2));
    const picks = [t1[0], t12.find(L => L !== t1[0]), fresh(POOL.filter(L => L.glyph))[0], t2.find(L => L !== t12[0]) || t2[0], fresh(of(3))[0]];
    return picks.map(L => {
      if (L.glyph) return { ...L, keep: true, src: L };
      const mx = Math.random() < .5, my = Math.random() < .5, n = L.pts.length;
      const tf = ([x, y]) => [mx ? 1000 - x : x, my ? 600 - y : y];
      const pts = L.pts.map((p, k) => { const [x, y] = tf(p); const j = k && k < n - 1 && !L.cross ? 22 : 0;
        return [Math.round(x + (Math.random() * 2 - 1) * j), Math.round(Math.min(540, Math.max(60, y + (Math.random() * 2 - 1) * j)))]; });
      return { ...L, pts, cross: L.cross && tf(L.cross), src: L };
    });
  }
  const COURIERS = [['chick_abao', 'walk_r'], ['feifei', 'walk_r'], ['iggy', 'walk_r'], ['pairo', 'walk_r'], ['xiaokong', 'run_r']];
  const FRIENDS = ['chick_abao', 'feifei', 'iggy', 'pairo', 'xiaokong'];
  // 難度（導演 2026-10-22）：路寬＋可走出路外多遠（grace）＋出去後手指最多再走多遠（travel）；困難＝一出去就退回
  // 新手（導演 2026-10-22，不預設）：路更寬、郵差被框在路裡，不扣分不退回；停 3 秒自動再示範
  const MODES = {
    novice: { road: 130, slack: 10, grace: 0, travel: 0, fence: true },
    easy: { road: 110, slack: 10, grace: 90, travel: 360 },
    mid: { road: 84, slack: 8, grace: 60, travel: 240 },
    hard: { road: 66, slack: 14, grace: 0, travel: 0 }
  };
  const STEP = 5;
  let mode = 'easy';
  try { const m = localStorage.getItem('dinopost-path-mode'); if (MODES[m]) mode = m; } catch { /* ok */ }

  const S = { level: 0, back: false, idleT: 0, round: [], offs: 0, samples: [], i: 0, status: [], checkpoints: [], cp: 0, drag: false, done: false, hinting: false,
    offset: [0, 0], offNow: false, offTravel: 0, lastP: null, lastMark: null, courier: null, friend: null, results: [], trails: [], el: {} };

  const say = text => { const b = $('bubble'); setKidText(b, text); b.classList.remove('is-pop'); void b.offsetWidth; b.classList.add('is-pop'); };
  const el = (tag, attrs = {}, parent) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); parent?.append(n); return n; };
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const ease = k => k < .5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
  const onTol = () => MODES[mode].road / 2 + MODES[mode].slack;
  const prompt = () => { const g = LEVELS[S.level].glyph; return g ? (g === 'ㄑ' ? '寫出注音ㄑ' : `照著寫 ${g}`) : '按住郵差，走到朋友家'; };
  const inGame = () => $('ready').hidden && $('finish').hidden;

  function pathD(pts, lines) {
    if (lines || pts.length < 3) return 'M' + pts.map(p => p.join(' ')).join(' L');
    // Catmull-Rom 轉貝茲，讓彎路圓順
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    for (let k = 0; k < pts.length - 1; k++) {
      const p0 = pts[k - 1] || pts[k], p1 = pts[k], p2 = pts[k + 1], p3 = pts[k + 2] || p2;
      d += ` C${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]} ${p2[1]}`;
    }
    return d;
  }
  const polyD = list => 'M' + list.map(p => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L');

  // 一段路：邊框、路面、中線、方向箭頭、走過的綠色軌跡
  function drawRoad(svg, list, width) {
    const d = polyD(list);
    el('path', { d, class: 'road-edge', 'stroke-width': width + 16 }, svg);
    el('path', { d, class: 'road', 'stroke-width': width }, svg);
    el('path', { d, class: 'road-mid' }, svg);
    const trail = el('path', { d, class: 'trail', 'stroke-width': width * .42 }, svg);
    for (let k = 20; k < list.length - 14; k += 34) {
      const [x, y] = list[k], [ax, ay] = list[k + 3];
      el('path', { class: 'arrow', d: 'M-9 -13 L7 0 L-9 13', transform: `translate(${x} ${y}) rotate(${Math.atan2(ay - y, ax - x) * 180 / Math.PI}) scale(${width / 110})` }, svg);
    }
    return trail;
  }

  function build() {
    stopHint();
    const L = LEVELS[S.level];
    const box = $('stage').getBoundingClientRect();
    const portrait = box.height > box.width * 1.05 && !L.keep;
    let X0 = 0, Y0 = 0, W = portrait ? 600 : 1000, H = portrait ? 1000 : 600;
    const pts = portrait ? L.pts.map(([x, y]) => [y, x]) : L.pts;
    if (L.keep) {   // 注音關不轉向：畫面框住字形再放大，直式手機也夠大
      const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), pad = 190;
      X0 = Math.min(...xs) - pad; Y0 = Math.min(...ys) - pad; W = Math.max(...xs) - X0 + pad; H = Math.max(...ys) - Y0 + pad;
    }
    const svg = $('svg'); svg.replaceChildren(); svg.setAttribute('viewBox', `${X0} ${Y0} ${W} ${H}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    const width = MODES[mode].road;
    // 取樣：每 STEP 單位一點
    const probe = el('path', { d: pathD(pts, L.lines) }, svg), len = probe.getTotalLength();
    S.samples = []; for (let s = 0; s <= len; s += STEP) { const p = probe.getPointAtLength(s); S.samples.push([p.x, p.y]); }
    probe.remove();
    const N = S.samples.length;
    if (L.glyph) el('text', { class: 'glyph', x: X0 + W - 90, y: Y0 + 100 }, svg).textContent = L.glyph;
    // 交叉的路：分兩段畫，後半段疊在上面像一座橋，孩子看得出路往哪接
    let cut = N - 1;
    if (L.cross) { const c = portrait ? [L.cross[1], L.cross[0]] : L.cross; cut = S.samples.reduce((b, p, k) => dist(p, c) < dist(S.samples[b], c) ? k : b, 0); }
    S.trails = [{ a: 0, el: drawRoad(svg, S.samples.slice(0, cut + 1), width) }];
    if (L.cross) {
      S.trails.push({ a: cut, el: drawRoad(svg, S.samples.slice(cut), width) });
      el('path', { d: polyD(S.samples.slice(cut - 4, cut + 5)), class: 'road', 'stroke-width': width, 'stroke-linecap': 'butt' }, svg);   // 蓋掉接縫的圓頭
    }
    S.trails.forEach(t => { t.len = t.el.getTotalLength(); });
    S.el.marks = el('g', {}, svg);   // 走出路外的橘色腳印
    // 三分之一、三分之二各一顆星＝存檔點，標 1、2 告訴孩子先去哪
    S.checkpoints = [0, Math.floor(N / 3), Math.floor(N * 2 / 3)].map(idx => {
      // 星星不要放在交叉口：附近若有另一段路就往前挪
      const near = k => S.samples.some((p, j) => Math.abs(j - k) > 40 && dist(p, S.samples[k]) < width * 1.3);
      while (idx > 0 && idx < N - 20 && near(idx)) idx += 4;
      return idx;
    });
    S.el.stars = S.checkpoints.slice(1).map((idx, n) => {
      const [x, y] = S.samples[idx];
      const g = el('g', { class: 'star', transform: `translate(${x} ${y})` }, svg), inner = el('g', { class: 'pulse' }, g);
      const r = Math.max(30, width * .42), pts5 = [];
      for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * .5 : r; pts5.push(`${(Math.cos(a) * rr).toFixed(1)},${(Math.sin(a) * rr).toFixed(1)}`); }
      el('polygon', { points: pts5.join(' ') }, inner);
      el('text', { y: 3 }, inner).textContent = n + 1;
      return g;
    });
    const [ex, ey] = S.samples.at(-1);
    S.friend = S.friend && S.friend !== S.courier[0] ? S.friend : Dino.shuffle(FRIENDS.filter(id => id !== S.courier[0]))[0];
    el('text', { x: ex, y: ey, 'font-size': 60, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, svg).textContent = '📮';
    // 朋友圖放在終點附近、不蓋到路（也不蓋右上角的字形）：繞終點找離路最遠夠用的空位；路太密就縮小再找
    let fx = ex, fy = ey - 70, fs = 1, best = -1e9;
    // 可放的範圍＝實際看得到的舞台（viewBox 置中後上下或左右多出來的空白也算）
    const k0 = Math.min(box.width / W, box.height / H), VX = X0 - (box.width / k0 - W) / 2, VY = Y0 - (box.height / k0 - H) / 2, VW = box.width / k0, VH = box.height / k0;
    for (const sc of [1, .8, .65, .55]) {
      const hw = 70 * sc, hh = 160 * sc;
      const gap = (p, x, y) => Math.hypot(Math.max(x - hw - p[0], 0, p[0] - x - hw), Math.max(y - hh - 10 - p[1], 0, p[1] - y + 10));
      const spot = (x, y) => {
        if (x - hw < VX + 10 || x + hw > VX + VW - 10 || y - hh - 10 < VY + 10 || y > VY + VH - 10) return -1e9;
        let g = Math.min(...S.samples.map(p => gap(p, x, y))) - width / 2;
        if (L.glyph) g = Math.min(g, gap([X0 + W - 90, Y0 + 60], x, y) - 60);
        return g;
      };
      for (const r of [110, 150, 190, 240, 300]) {
        for (let k = 0; k < 16; k++) {
          const t = k * Math.PI / 8, x = ex + Math.cos(t) * r, y = ey + hh / 2 + Math.sin(t) * r, g = spot(x, y);
          if (g > best) { best = g; fx = x; fy = y; fs = sc; }
        }
        if (best >= 12) break;
      }
      if (best >= 12) break;
    }
    el('image', { href: `assets/cast/${S.friend}__hello.webp`, x: fx - 70 * fs, y: fy - 10 - 160 * fs, width: 140 * fs, height: 160 * fs, preserveAspectRatio: 'xMidYMax meet' }, svg);
    const g = el('g', { class: 'courier is-snap' }, svg);
    el('circle', { class: 'courier-ring', r: 70, cx: 0, cy: -10 }, g);
    S.el.img = el('image', { href: `assets/cast/${S.courier[0]}__${S.courier[1]}.webp`, x: -75, y: -150, width: 150, height: 170, preserveAspectRatio: 'xMidYMax meet' }, g);
    S.el.courier = g;
    S.el.hand = el('text', { class: 'hand', 'text-anchor': 'middle', 'dominant-baseline': 'hanging', opacity: 0 }, svg); S.el.hand.textContent = '👆';
    resetWalk();
    renderLevels();
    requestAnimationFrame(() => g.classList.remove('is-snap'));
  }

  function resetWalk() {
    S.i = 0; S.max = 0; S.cp = 0; S.offs = 0; S.done = false; S.status = []; S.offset = [0, 0]; S.offNow = false; S.offTravel = 0;
    S.el.marks.replaceChildren(); place();
  }

  // 郵差＝路上進度點＋手指離路的偏移：走在路上、走出路外都同一條公式，不會跳格
  function place() {
    const [sx, sy] = S.samples[S.i];
    const x = sx + S.offset[0], y = sy + S.offset[1] + 30;
    const ahead = S.samples[Math.min(S.samples.length - 1, S.i + 6)], back = S.samples[Math.max(0, S.i - 6)];
    S.el.courier.style.transform = `translate(${x}px,${y}px)`;
    S.el.img.setAttribute('transform', ahead[0] < back[0] - 2 ? 'scale(-1 1)' : '');
    S.trails.forEach(t => { const v = Math.min(t.len, Math.max(0, (S.max - t.a) * STEP)); t.el.style.strokeDasharray = `${v} ${t.len + 10}`; t.el.style.opacity = v > 0 ? '' : 0; });   // 長度 0 時圓頭會留一顆綠點，藏起來
    S.el.stars.forEach((st, n) => { st.classList.toggle('is-got', n < S.cp); st.classList.toggle('is-next', n === S.cp); });
  }
  const handAt = ([x, y], press = false) => S.el.hand.setAttribute('transform', `translate(${x + 16} ${y - 50}) scale(${press ? .85 : 1})`);
  function dropMark(p) {
    if (S.lastMark && dist(p, S.lastMark) < 24) return;
    S.lastMark = p; el('circle', { class: 'mark', cx: p[0], cy: p[1] + 30, r: 13 }, S.el.marks);
  }

  // ---------- 提示：手指從郵差身上沿著路往前滑，重複到孩子按下去 ----------
  function startHint() {
    stopHint(); S.hinting = true;
    const t0 = performance.now();
    const loop = t => {
      if (!S.hinting) return;
      const dur = MODES[mode].fence ? 2600 : 1600, c = ((t - t0) % (dur + 800)) / dur, k = Math.min(1, c);
      const span = MODES[mode].fence ? Math.max(60, (S.checkpoints[S.cp + 1] ?? S.samples.length - 1) - S.i) : 60;
      handAt(S.samples[Math.min(S.samples.length - 1, S.i + Math.round(span * ease(k)))], k < .12);
      S.el.hand.setAttribute('opacity', c > 1 ? 0 : 1);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
  function stopHint() { S.hinting = false; S.el.hand?.setAttribute('opacity', 0); }

  // ---------- 玩法小框框（像首頁預覽）：小動畫循環播，點哪裡都關 ----------
  function buildHowto(stage) {
    const svg = el('svg', { viewBox: '0 0 240 130', 'aria-hidden': 'true' }, stage), d = 'M22 100 C70 104 64 34 118 34 S170 98 214 52';
    const road = el('path', { d, fill: 'none', stroke: '#f3dca6', 'stroke-width': 26, 'stroke-linecap': 'round' }, svg);
    el('path', { d, fill: 'none', stroke: '#d4b679', 'stroke-width': 2, 'stroke-dasharray': '6 7' }, svg);
    const trail = el('path', { d, fill: 'none', stroke: '#7fd48a', 'stroke-width': 10, 'stroke-linecap': 'round', pathLength: 100, 'stroke-dasharray': '100 101' }, svg);
    el('animate', { attributeName: 'stroke-dashoffset', values: '100;100;0;0', keyTimes: '0;.15;.85;1', dur: '3.2s', repeatCount: 'indefinite' }, trail);
    const L = road.getTotalLength();
    [1 / 3, 2 / 3].forEach((f, n) => {
      const p = road.getPointAtLength(L * f), g = el('g', { transform: `translate(${p.x} ${p.y})` }, svg), pts5 = [];
      for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? 6 : 12; pts5.push(`${(Math.cos(a) * rr).toFixed(1)},${(Math.sin(a) * rr).toFixed(1)}`); }
      el('polygon', { points: pts5.join(' '), fill: '#ffd23f', stroke: '#c98a12', 'stroke-width': 2 }, g);
      el('text', { y: 1, 'font-size': 11, 'font-weight': 900, fill: '#7a4b00', 'text-anchor': 'middle', 'dominant-baseline': 'central' }, g).textContent = n + 1;
    });
    const end = road.getPointAtLength(L);
    el('text', { x: end.x + 4, y: end.y - 4, 'font-size': 24, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, svg).textContent = '📮';
    const mover = el('g', {}, svg);
    el('image', { href: `assets/cast/${S.courier[0]}__${S.courier[1]}.webp`, x: -17, y: -40, width: 34, height: 40, preserveAspectRatio: 'xMidYMax meet' }, mover);
    el('text', { x: 6, y: -18, 'font-size': 26, 'dominant-baseline': 'hanging' }, mover).textContent = '👆';
    el('animateMotion', { path: d, keyPoints: '0;0;1;1', keyTimes: '0;.15;.85;1', calcMode: 'linear', dur: '3.2s', repeatCount: 'indefinite' }, mover);
  }
  let HW;   // 共用玩法框（Dino.howto），在檔尾建立
  function showHowto() { stopHint(); HW.show(); }

  function toSvg(e) {
    const svg = $('svg'), pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse()); return [p.x, p.y];
  }

  function onDown(e) {
    if (S.done || S.back) return;   // 退回動畫中不能抓，否則跟退回互搶會卡住
    clearTimeout(S.idleT);
    const p = toSvg(e), [x, y] = S.samples[S.i];
    if (dist(p, [x, y - 40]) > 130) { say(prompt()); return; }
    S.drag = true; S.lastP = p; S.grab = [p[0] - x, p[1] - y]; S.el.courier.classList.add('is-drag'); $('stage').classList.add('is-dragging'); $('svg').setPointerCapture(e.pointerId);
    stopHint(); Dino.sfx('tap', .4);
  }
  // 手指移動：一個畫面只算一次（手機一次送很多點時不會塞車），跳很遠的一下切成小段逐段走，中間經過路外也算得到
  let rawNext = null, rawRaf = 0;
  function onMove(e) {
    if (!S.drag || S.done) return;
    rawNext = toSvg(e);
    if (!rawRaf) rawRaf = requestAnimationFrame(flushMove);
  }
  function flushMove() {
    rawRaf = 0; const raw = rawNext; rawNext = null;
    if (!raw || !S.drag || S.done) return;
    const p = [raw[0] - S.grab[0], raw[1] - S.grab[1]], from = S.lastP || p, n = Math.max(1, Math.ceil(dist(p, from) / 20));
    for (let k = 1; k <= n && S.drag && !S.done; k++) step([from[0] + (p[0] - from[0]) * k / n, from[1] + (p[1] - from[1]) * k / n]);
    if (S.drag || S.done) place();
  }
  // 沿著路往手指滑：只要下一點離手指更近（容許一點抖動）就繼續走，停在最近的地方
  // 切彎落後時一路追得回來；U 型彎、尖角對面的路要先「離手指更遠」才到得了，所以跳不過去，下一段路不會突然變綠
  function slide(p, dir) {
    const N = S.samples.length; let k = S.i, best = S.i, bd = dist(p, S.samples[S.i]);
    while (k + dir >= 0 && k + dir < N && Math.abs(k - S.i) < 120) {
      k += dir; const dd = dist(p, S.samples[k]);
      if (dd < bd) { bd = dd; best = k; } else if (dd > bd + 10) break;
    }
    return [best, bd];
  }
  function step(p) {
    const M = MODES[mode];
    let [best, bd] = slide(p, 1);
    if (M.fence && best === S.i) [best, bd] = slide(p, -1);   // 新手：往前沒有更近就試著往回走
    if (M.fence && bd > M.road / 2) {   // 新手：郵差被框在路裡，最多走到路邊
      const c = S.samples[best], k = (M.road / 2) / bd; p[0] = c[0] + (p[0] - c[0]) * k; p[1] = c[1] + (p[1] - c[1]) * k; bd = M.road / 2;
    }
    if (bd > onTol() + M.grace) return goOff();
    const on = bd <= onTol();
    if (on) {
      if (S.offNow) { S.offNow = false; S.offTravel = 0; say(prompt()); }
    } else {
      if (!S.offNow) { S.offNow = true; Dino.sfx('wrong', .18); say('回到路上'); }
      S.offTravel += dist(p, S.lastP || p);
      dropMark(p);
      if (S.offTravel > M.travel) return goOff();
    }
    S.lastP = p;
    if (best > S.max) for (let k = S.max + 1; k <= best; k++) S.status[k] = on ? 1 : 0;
    if (best > S.i || M.fence) S.i = best;   // 新手可以沿路往回走（還是框在路裡）；其他難度只往前
    S.max = Math.max(S.max, S.i);
    const [sx, sy] = S.samples[S.i];
    S.offset = [p[0] - sx, p[1] - sy];
    if (M.fence) { const o = Math.hypot(...S.offset), lim = M.road / 2; if (o > lim) S.offset = S.offset.map(v => v * lim / o); }
    const reached = S.checkpoints.findIndex((idx, n) => n > S.cp && S.i >= idx);
    if (reached > 0) { S.cp = reached; Dino.sfx('pop', .7); Dino.burst(S.el.stars[reached - 1]); }
    if (nearEnd() && dist(p, S.samples.at(-1)) < 160) magnet();
  }
  // 終點磁吸（導演 2026-10-22）：走到信箱前一小段（約一個路寬）或在那裡放手，郵差自己滑進信箱
  const MAGNET = 26;   // 取樣點數，×STEP ≈ 130
  const nearEnd = () => S.i >= S.samples.length - 1 - MAGNET;
  function magnet() {
    if (S.done || S.back) return;
    S.drag = false; S.done = true; S.offset = [0, 0]; S.offNow = false;
    S.el.courier.classList.remove('is-drag'); $('stage').classList.remove('is-dragging');
    const N = S.samples.length;
    const tick = () => {
      const next = Math.min(N - 1, S.i + 3);
      for (let k = S.max + 1; k <= next; k++) S.status[k] = 1;
      S.i = S.max = next; place();
      if (S.i < N - 1) setTimeout(tick, 16); else { S.done = false; arrive(); }
    };
    tick();
  }
  function onUp() {
    if (rawRaf) { cancelAnimationFrame(rawRaf); flushMove(); }
    $('stage').classList.remove('is-dragging');
    if (S.drag && !S.done && nearEnd()) return magnet();
    const was = S.drag; S.drag = false; S.el.courier?.classList.remove('is-drag'); S.offset = [0, 0]; S.offNow = false; S.offTravel = 0; if (S.samples.length) place();
    if (was && MODES[mode].fence && !S.done) { clearTimeout(S.idleT); S.idleT = setTimeout(() => { if (inGame() && !S.drag && !S.done) startHint(); }, 3000); }
  }

  function goOff() {
    S.drag = false; S.el.courier.classList.remove('is-drag'); $('stage').classList.remove('is-dragging'); S.offs++;
    S.offset = [0, 0]; S.offNow = false; S.offTravel = 0; S.lastMark = null;
    Dino.sfx('wrong', .35); say('沿著路走喔');
    $('stage').classList.remove('is-off'); void $('stage').offsetWidth; $('stage').classList.add('is-off');
    // 慢慢退回上一顆星，退回的那段重新算
    const target = S.checkpoints[S.cp];
    S.status.length = target + 1;
    setTimeout(() => S.el.marks.replaceChildren(), 500);
    S.back = true; S.lastP = null;
    const tick = () => { S.i = Math.max(target, S.i - 6); S.max = S.i; place(); if (S.i > target) setTimeout(tick, 16); else S.back = false; };
    tick();
  }

  // 完美度＝走在路上的比例，每退回一次扣 10
  function levelScore() {
    const walked = S.status.slice(1), on = walked.filter(v => v === 1).length;
    return Math.max(0, Math.round(on / Math.max(1, walked.length) * 100) - S.offs * 10);
  }
  const starsOf = score => score >= 90 ? 3 : score >= 70 ? 2 : 1;
  const starHtml = n => [0, 1, 2].map(i => `<span class="${i < n ? '' : 'off'}">★</span>`).join('');

  function arrive() {
    S.done = true; S.drag = false; S.offset = [0, 0]; S.cp = 3; place();
    Dino.sfx('stamp', .8); setTimeout(() => Dino.sfx('correct', .8), 250);
    Dino.burst(S.el.courier); say('送到了！');
    S.el.img.setAttribute('href', `assets/cast/${S.courier[0]}__cheer.webp`); S.el.img.removeAttribute('transform');
    const L = LEVELS[S.level];
    if (L.glyph && L.glyph !== 'ㄑ') setTimeout(() => Dino.voice(GLYPH_AUDIO[L.glyph] || `assets/audio/letters/letter-${L.glyph.toLowerCase()}.mp3`), 700);
    else if (L.glyph) fetch('assets/audio/symbols.json').then(r => r.json()).then(m => { const a = new Audio(m.zhuyin[L.glyph]); setTimeout(() => a.play().catch(() => {}), 700); }).catch(() => {});
    const score = levelScore(); S.results.push(score);
    $('score').innerHTML = `<b>${starHtml(starsOf(score))}</b><span>${score}%</span>`; $('score').hidden = false;
    setTimeout(() => { $('score').hidden = true; if (!inGame()) return; S.level++; S.friend = null; S.level < LEVELS.length ? (build(), say(prompt()), startHint()) : finish(); }, 2000);
  }

  function renderLevels() {
    $('levels').replaceChildren(...LEVELS.map((L, n) => { const li = document.createElement('li'); li.textContent = L.glyph || n + 1; li.className = n < S.level ? 'is-done' : n === S.level ? 'is-now' : ''; return li; }));
  }

  function finish() {
    const avg = Math.round(S.results.reduce((a, b) => a + b, 0) / S.results.length);
    $('finishStars').innerHTML = starHtml(starsOf(avg));
    $('finishScore').textContent = `${avg}%`;
    Dino.saveHistory({ game: 'path', mode, score: S.results.filter(r => starsOf(r) === 3).length, total: S.results.length, avg });
    $('finishActor').src = `assets/cast/${S.courier[0]}__cheer.webp`;
    $('finish').hidden = false; Dino.sfx('finish', .8); Dino.bgm.start();
  }

  function newGame() {
    S.level = 0; S.results = []; S.friend = null; clearTimeout(S.idleT);
    LEVELS = makeRound(S.round); S.round = LEVELS.map(L => L.src);
    S.courier = Dino.shuffle(COURIERS.filter(c => c !== S.courier))[0];
    build(); say(prompt());
  }

  function syncPick() { document.querySelectorAll('[data-road]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.road === mode))); }

  setKidText($('title'), '郵差走小路'); setKidText($('startLabel'), '點一下，開始送信！');
  setKidText($('pickNovice'), '新手'); setKidText($('pickEasy'), '簡單'); setKidText($('pickMid'), '普通'); setKidText($('pickHard'), '困難');
  setKidText($('finishTitle'), '信都送到了！'); setKidText($('again'), '再玩一次'); setKidText($('home'), '回首頁');
  document.documentElement.classList.toggle('dino-mode', Dino.dinoMode());
  Dino.bgm.start(); Dino.menuTaps($('ready')); Dino.menuTaps($('finish'));
  // 換難度＝這一輪重來（跟翻翻樂換對數一樣）
  document.querySelectorAll('[data-road]').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.road === mode) return;
    mode = b.dataset.road; try { localStorage.setItem('dinopost-path-mode', mode); } catch { /* ok */ }
    syncPick(); newGame();
  }));
  syncPick();
  // 導演 2026-10-22：房子永遠回首頁；難度另用右上 ⚙ 打開本遊戲的開始選單
  document.querySelector('.dino-home').addEventListener('click', e => { e.preventDefault(); Dino.goTo('index.html'); });
  $('menuBtn').addEventListener('click', () => { if (!inGame()) return; stopHint(); S.drag = false; Dino.sfx('tap', .5); $('ready').hidden = false; Dino.bgm.start(); });
  let howtoSeen = false;
  $('start').addEventListener('click', () => {
    $('ready').hidden = true; Dino.bgm.stop();
    if (S.done) return;
    if (!howtoSeen) { howtoSeen = true; showHowto(); } else startHint();
  });
  $('help').addEventListener('click', () => { Dino.sfx('tap', .5); showHowto(); });
  $('again').addEventListener('click', () => { $('finish').hidden = true; Dino.bgm.stop(); newGame(); startHint(); });
  const svg = $('svg');
  svg.addEventListener('pointerdown', onDown); svg.addEventListener('pointermove', onMove);
  svg.addEventListener('pointerup', onUp); svg.addEventListener('pointercancel', onUp);
  let t; addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => { if (S.done) return; const i = S.i, mx = S.max, cp = S.cp, st = S.status, offs = S.offs; build(); S.i = Math.min(i, S.samples.length - 1); S.max = Math.min(mx, S.samples.length - 1); S.cp = cp; S.status = st; S.offs = offs; place(); if (inGame() && !HW.isOpen()) startHint(); }, 150); });
  newGame();
  HW = Dino.howto({ preview: buildHowto, text: '按住郵差，照星星走到郵筒', kid: setKidText, onClose: () => { if (inGame() && !S.drag && !S.done) startHint(); } });
  window.__path = S;
})();

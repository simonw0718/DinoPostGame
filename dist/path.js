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
    '信都送到了！': ['ㄒㄧㄣˋ', 'ㄉㄡ', 'ㄙㄨㄥˋ', 'ㄉㄠˋ', 'ㄌㄜ˙', ''],
    '簡單': ['ㄐㄧㄢˇ', 'ㄉㄢ'], '普通': ['ㄆㄨˇ', 'ㄊㄨㄥ'], '困難': ['ㄎㄨㄣˋ', 'ㄋㄢˊ'],
    '知道了': ['ㄓ', 'ㄉㄠˋ', 'ㄌㄜ˙'],
    '再玩一次': ['ㄗㄞˋ', 'ㄨㄢˊ', 'ㄧ', 'ㄘˋ'], '回首頁': ['ㄏㄨㄟˊ', 'ㄕㄡˇ', 'ㄧㄝˋ']
  });

  // 關卡：橫式座標 1000×600；直式手機自動轉成上→下（注音關不轉，字形不能歪）。cross＝路會交叉，後半段畫成橋
  const LEVELS = [
    { pts: [[110, 300], [890, 300]], lines: true },
    { pts: [[110, 430], [300, 170], [500, 430], [700, 170], [890, 400]] },
    { pts: [[110, 470], [260, 150], [420, 470], [580, 150], [740, 470], [890, 170]], lines: true },
    { pts: [[100, 500], [380, 470], [620, 300], [680, 130], [520, 70], [400, 150], [430, 330], [560, 470], [760, 520], [900, 400]], cross: [520, 70] },
    { pts: [[640, 70], [380, 300], [650, 530]], lines: true, glyph: 'ㄑ', keep: true }
  ];
  const COURIERS = [['chick_abao', 'walk_r'], ['feifei', 'walk_r'], ['iggy', 'walk_r'], ['pairo', 'walk_r'], ['xiaokong', 'run_r']];
  const FRIENDS = ['chick_abao', 'feifei', 'iggy', 'pairo', 'xiaokong'];
  // 難度（導演 2026-10-22）：路寬＋可走出路外多遠（grace）＋出去後手指最多再走多遠（travel）；困難＝一出去就退回
  const MODES = {
    easy: { road: 110, slack: 10, grace: 90, travel: 360 },
    mid: { road: 84, slack: 8, grace: 60, travel: 240 },
    hard: { road: 66, slack: 14, grace: 0, travel: 0 }
  };
  const STEP = 5;
  let mode = 'easy';
  try { const m = localStorage.getItem('dinopost-path-mode'); if (MODES[m]) mode = m; } catch { /* ok */ }

  const S = { level: 0, offs: 0, samples: [], i: 0, status: [], checkpoints: [], cp: 0, drag: false, done: false, hinting: false,
    offset: [0, 0], offNow: false, offTravel: 0, lastP: null, lastMark: null, courier: null, friend: null, results: [], trails: [], el: {} };

  const say = text => { const b = $('bubble'); setKidText(b, text); b.classList.remove('is-pop'); void b.offsetWidth; b.classList.add('is-pop'); };
  const el = (tag, attrs = {}, parent) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); parent?.append(n); return n; };
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const ease = k => k < .5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
  const onTol = () => MODES[mode].road / 2 + MODES[mode].slack;
  const prompt = () => LEVELS[S.level].glyph ? '寫出注音ㄑ' : '按住郵差，走到朋友家';
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
    const fx = Math.min(X0 + W - 70, ex + (portrait ? 110 : 0)), fy = portrait ? ey - 30 : Math.max(150, ey - 70);
    el('image', { href: `assets/cast/${S.friend}__hello.webp`, x: fx - 70, y: fy - 170, width: 140, height: 160, preserveAspectRatio: 'xMidYMax meet' }, svg);
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
    S.i = 0; S.cp = 0; S.offs = 0; S.done = false; S.status = []; S.offset = [0, 0]; S.offNow = false; S.offTravel = 0;
    S.el.marks.replaceChildren(); place();
  }

  // 郵差＝路上進度點＋手指離路的偏移：走在路上、走出路外都同一條公式，不會跳格
  function place() {
    const [sx, sy] = S.samples[S.i];
    const x = sx + S.offset[0], y = sy + S.offset[1] + 30;
    const ahead = S.samples[Math.min(S.samples.length - 1, S.i + 6)], back = S.samples[Math.max(0, S.i - 6)];
    S.el.courier.style.transform = `translate(${x}px,${y}px)`;
    S.el.img.setAttribute('transform', ahead[0] < back[0] - 2 ? 'scale(-1 1)' : '');
    S.trails.forEach(t => { const v = Math.min(t.len, Math.max(0, (S.i - t.a) * STEP)); t.el.style.strokeDasharray = `${v} ${t.len + 10}`; });
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
      const c = ((t - t0) % 2400) / 1600, k = Math.min(1, c);
      handAt(S.samples[Math.min(S.samples.length - 1, S.i + Math.round(60 * ease(k)))], k < .12);
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
    if (S.done) return;
    const p = toSvg(e), [x, y] = S.samples[S.i];
    if (dist(p, [x, y - 40]) > 130) { say(prompt()); return; }
    S.drag = true; S.lastP = p; S.grab = [p[0] - x, p[1] - y]; S.el.courier.classList.add('is-drag'); $('svg').setPointerCapture(e.pointerId);
    stopHint(); Dino.sfx('tap', .4);
  }
  function onMove(e) {
    if (!S.drag || S.done) return;
    const raw = toSvg(e), M = MODES[mode];
    // 手指按在郵差身上哪裡就以那點拖，不會一按就跳；偏移慢慢歸零，最後以手指為準
    S.grab = S.grab.map(v => v * .85);
    const p = [raw[0] - S.grab[0], raw[1] - S.grab[1]];
    // 只在目前位置附近往前找，跨過彎道直接跳不算
    let best = -1, bd = Infinity;
    for (let k = Math.max(0, S.i - 8); k < Math.min(S.samples.length, S.i + 25); k++) {
      const dd = dist(p, S.samples[k]); if (dd < bd) { bd = dd; best = k; }
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
    if (best > S.i) { for (let k = S.i + 1; k <= best; k++) S.status[k] = on ? 1 : 0; S.i = best; }
    const [sx, sy] = S.samples[S.i];
    S.offset = [p[0] - sx, p[1] - sy];
    const reached = S.checkpoints.findIndex((idx, n) => n > S.cp && S.i >= idx);
    if (reached > 0) { S.cp = reached; Dino.sfx('pop', .7); Dino.burst(S.el.stars[reached - 1]); }
    place();
    if (S.i >= S.samples.length - 3 && on) arrive();
  }
  function onUp() { S.drag = false; S.el.courier?.classList.remove('is-drag'); S.offset = [0, 0]; S.offNow = false; S.offTravel = 0; if (S.samples.length) place(); }

  function goOff() {
    S.drag = false; S.el.courier.classList.remove('is-drag'); S.offs++;
    S.offset = [0, 0]; S.offNow = false; S.offTravel = 0; S.lastMark = null;
    Dino.sfx('wrong', .35); say('沿著路走喔');
    $('stage').classList.remove('is-off'); void $('stage').offsetWidth; $('stage').classList.add('is-off');
    // 慢慢退回上一顆星，退回的那段重新算
    const target = S.checkpoints[S.cp];
    S.status.length = target + 1;
    setTimeout(() => S.el.marks.replaceChildren(), 500);
    const tick = () => { S.i = Math.max(target, S.i - 6); place(); if (S.i > target) requestAnimationFrame(tick); };
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
    if (L.glyph) fetch('assets/audio/symbols.json').then(r => r.json()).then(m => { const a = new Audio(m.zhuyin[L.glyph]); setTimeout(() => a.play().catch(() => {}), 700); }).catch(() => {});
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
    S.level = 0; S.results = []; S.friend = null;
    S.courier = Dino.shuffle(COURIERS.filter(c => c !== S.courier))[0];
    build(); say(prompt());
  }

  function syncPick() { document.querySelectorAll('[data-road]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.road === mode))); }

  setKidText($('title'), '郵差走小路'); setKidText($('startLabel'), '點一下，開始送信！');
  setKidText($('pickEasy'), '簡單'); setKidText($('pickMid'), '普通'); setKidText($('pickHard'), '困難');
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
  let t; addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => { if (S.done) return; const i = S.i, cp = S.cp, st = S.status, offs = S.offs; build(); S.i = Math.min(i, S.samples.length - 1); S.cp = cp; S.status = st; S.offs = offs; place(); if (inGame() && !HW.isOpen()) startHint(); }, 150); });
  newGame();
  HW = Dino.howto({ preview: buildHowto, text: '按住郵差，照星星走到郵筒', kid: setKidText, onClose: () => { if (inGame() && !S.drag && !S.done) startHint(); } });
  window.__path = S;
})();

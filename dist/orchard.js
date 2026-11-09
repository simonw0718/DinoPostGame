/* 小空果果店 v6 sample（2026-11-09 晚：頁首統一＋？／⚙；三級難度 簡單 10 以內／普通 11–20 進位／困難 20 以上疊盒；開場全景＋小空配音推近）
   v5 sample（2026-11-09）
   決定：reference/orchard_shop_design.yaml director_11_09_v4＋next_11_09（導演選做 ①④⑤）
   玩法：客人點「紅果×a、紫果×b」→ 從果籃把果子「拖」進十格盒的任一格（點一下果籃也行，會自動飛進下一格）。
     果子上不貼編號、不逐一唸數（導演 11-09）。
     ① 十格（a＋b≤10）：放完自動填答並唸出。
     ② 二十格進位：紅果放完先問「還差幾顆滿 10？」→ 點空格數（每點一格出現 1、2…），數完紫果自動補滿、啪一聲蓋蓋；
        剩下的紫果拖進第二盒；放完三選一。
   ④ 客人輪換：派洛（平常）→ 小雞阿暴（急：等太久會跳腳、泡泡抖）→ 阿慢（慢：點頭慢，等太久會打瞌睡，放果子就醒）。
   規則：不計時、不扣分、不打叉。點錯籃／太多 → 果子飛回籃子、客人歪頭；選錯 → 陪著從 10 接著數。
   ③ 困難（20 以上）：第二盒也滿了就蓋上，兩盒縮小疊到旁邊，第三盒放剩下的；放完三選一（差 10 的選項：13／23／33）。
   網址 ?lv=1|2|3 直接指定難度、?r=2 從第 3 位客人開始（測試用）。素材 tools/fruit_shop_export.py。 */
(async () => {
  'use strict';
  const $ = id => document.getElementById(id);
  const A = 'assets/fruitshop/';
  const L = await fetch(A + 'layout.json').then(r => r.json());
  const TALK = await fetch('assets/audio/orchard/talk.json').then(r => r.json());   // 小空說話時間表（嘴型輪替＋換表情）
  const R = Dino.reduced;
  const wait = ms => new Promise(r => setTimeout(r, R ? Math.min(ms, 120) : ms));
  const num = n => `assets/audio/num/zh/${n}.mp3`;
  // 物理回饋：阻尼彈簧。frame(v) 把位移 v（1 → 衰減震盪 → 0）換成 transform；減少動態時不做
  function spring(el, frame, ms = 560, bounce = 3) {
    if (R || !el) return;
    const kf = [];
    for (let i = 0; i <= 24; i++) { const t = i / 24; kf.push({ transform: frame(Math.exp(-4.6 * t) * Math.cos(t * Math.PI * bounce)) }); }
    el.animate(kf, { duration: ms, easing: 'linear' });
  }
  const KIND_NAME = { dot: '紅果', star: '紫果', spike: '粉果' };

  // ---------- 客人（④）：size 身高倍率、dx／dy 頭頂右移／下移、face 臉下緣離頭頂多遠（頭高單位；點單泡泡放臉下方不擋臉）、hintMs 閒置多久給手指、moodMs 閒置多久耍個性 ----------
  const CUST = {
    pairo:      { name: '派洛',     size: 1,    dx: 0,   dy: 0,   face: 1.06,   hintMs: 7000, moodMs: 0,    nod: 'is-nod' },
    chick_abao: { name: '小雞阿暴', size: .82,  dx: 0,   dy: .2,  face: 1.33, hintMs: 4500, moodMs: 3000, nod: 'is-nodfast' },
    aman:       { name: '阿慢',     size: 1.04, dx: .28, dy: .06, face: 1.12,   hintMs: 9000, moodMs: 5000, nod: 'is-nodslow' }
  };
  // 三級難度（導演 11-09 照建議）：開始畫面選，⚙ 可以回來換；一局之內不自動升降級
  const SETS = {
    easy:   [{ c: 'pairo', a: 3, b: 2 }, { c: 'chick_abao', a: 4, b: 5 }, { c: 'aman', a: 2, b: 6 }],     // 10 以內：一盒
    normal: [{ c: 'pairo', a: 8, b: 5 }, { c: 'chick_abao', a: 7, b: 6 }, { c: 'aman', a: 6, b: 7 }],     // 11–20：滿 10 蓋盒
    hard:   [{ c: 'pairo', a: 9, b: 12 }, { c: 'chick_abao', a: 7, b: 15 }, { c: 'aman', a: 6, b: 17 }]    // 20 以上：疊盒
  };
  const RULE = { easy: [3, 2, '一盒就夠'], normal: [8, 5, '滿 10 個蓋起來'], hard: [9, 12, '疊好幾盒'] };
  const QS = new URLSearchParams(location.search), lvParam = QS.get('lv');
  const LV_KEY = 'dinopost-orchard-level';
  let level = { 1: 'easy', 2: 'normal', 3: 'hard' }[lvParam] || (() => { try { return localStorage.getItem(LV_KEY); } catch { return null; } })() || 'easy';
  if (!SETS[level]) level = 'easy';
  let ROUNDS = SETS[level];

  // ---------- 注音 ----------
  const table = {
    '小空果果店': ['ㄒㄧㄠˇ', 'ㄎㄨㄥ', 'ㄍㄨㄛˇ', 'ㄍㄨㄛˇ', 'ㄉㄧㄢˋ'],
    '點一下，開始裝果子！': ['ㄉㄧㄢˇ', 'ㄧ', 'ㄒㄧㄚˋ', '', 'ㄎㄞ', 'ㄕˇ', 'ㄓㄨㄤ', 'ㄍㄨㄛˇ', 'ㄗ˙', ''],
    '果子都裝好了！': ['ㄍㄨㄛˇ', 'ㄗ˙', 'ㄉㄡ', 'ㄓㄨㄤ', 'ㄏㄠˇ', 'ㄌㄜ˙', ''],
    '客人都開心了！': ['ㄎㄜˋ', 'ㄖㄣˊ', 'ㄉㄡ', 'ㄎㄞ', 'ㄒㄧㄣ', 'ㄌㄜ˙', ''],
    '還差幾顆滿 10？': ['ㄏㄞˊ', 'ㄔㄚ', 'ㄐㄧˇ', 'ㄎㄜ', 'ㄇㄢˇ', '', '', '', ''],
    '再玩一次': ['ㄗㄞˋ', 'ㄨㄢˊ', 'ㄧ', 'ㄘˋ'], '回首頁': ['ㄏㄨㄟˊ', 'ㄕㄡˇ', 'ㄧㄝˋ'],
    '簡單': ['ㄐㄧㄢˇ', 'ㄉㄢ'], '普通': ['ㄆㄨˇ', 'ㄊㄨㄥ'], '困難': ['ㄎㄨㄣˋ', 'ㄋㄢˊ'],
    '一盒就夠': ['ㄧ', 'ㄏㄜˊ', 'ㄐㄧㄡˋ', 'ㄍㄡˋ'], '滿 10 個蓋起來': ['ㄇㄢˇ', '', '', '', '', 'ㄍㄜˋ', 'ㄍㄞˋ', 'ㄑㄧˇ', 'ㄌㄞˊ'], '疊好幾盒': ['ㄉㄧㄝˊ', 'ㄏㄠˇ', 'ㄐㄧˇ', 'ㄏㄜˊ']
  };
  const kid = Dino.kidText(table);
  ['title', 'startLabel', 'finishTitle', 'again', 'home'].forEach(id => kid($(id), $(id).textContent.trim()));
  document.querySelectorAll('.pick button').forEach(b => kid(b, b.textContent.trim()));

  // ---------- 版面（畫布座標） ----------
  const LAY = {
    phone: {
      cust: [640, 150, 420], bubble: [30, 250, 440, 150, 370], eq: [540, 940, 150], carry: [540, 1110, 66],
      box1: [[110, 1360, 860]], box2: [[110, 1225, 860], [110, 1640, 860]],      // 導演 11-09：盒子稍往上
      baskets: [[500, 2330], [725, 2330], [950, 2330]], bw: 200, choices: [440, 2150, 600, 150], kong: [150, 2460, 400],
      stack: [[110, 1830, 400], [570, 1830, 400]]                                // 困難：蓋好的盒子縮小排在下面
    },
    tablet: {
      cust: [600, 90, 330], bubble: [860, 160, 470, 150, 60], eq: [1024, 590, 120], carry: [1024, 726, 54],
      box1: [[380, 860, 900]], box2: [[150, 890, 830], [1068, 890, 830]],
      baskets: [[1280, 1526], [1550, 1526], [1820, 1526]], bw: 230, choices: [1220, 1330, 760, 140], kong: [190, 1656, 420],
      stack: [[40, 880, 300], [40, 1060, 300]]                                   // 困難：蓋好的盒子縮小疊在左邊
    }
  };
  const stage = $('stage');
  let lay = 'phone', P = LAY.phone;
  const set = (el, o) => { el.classList.add('at'); for (const k in o) el.style.setProperty('--' + k, o[k]); };
  const anchored = (el, off, x, y, s) => set(el, { x: x + off[0] * s, y: y + off[1] * s, w: off[2] * s });

  const G = { round: 0, r: null, cid: 'pairo', count: {}, busy: true, phase: 'idle', boxes: [], dozing: false, stacked: false, playing: false, kongEmo: 'happy', kongMouth: 'open' };

  function layout() {
    lay = innerWidth > innerHeight ? 'tablet' : 'phone'; P = LAY[lay];
    stage.dataset.lay = lay;
    const S = L[lay];
    $('sky').src = `${A}sky_${lay}.webp`; $('counter').src = `${A}counter_${lay}.webp`;
    $('counter').style.top = `calc(${S.counter[1]} * var(--u))`;
    placeCust();
    const [ex, ey, eh] = P.eq, ew = eh * (1.13 * 3 + .6 * 2); set($('eq'), { x: ex - ew / 2, y: ey, w: ew, h: eh });
    const [cx, cy, chh] = P.carry; set($('carry'), { x: cx - chh * 5.2, y: cy, w: chh * 10.4, h: chh });
    const [kx, ky, ks] = P.kong; anchored($('kong'), L.xiaokong.happy, kx, ky, ks);
    [...$('baskets').children].forEach((b, i) => {
      const [x, by2] = P.baskets[i], o = L.basket[b.dataset.kind];
      b.style.setProperty('--x', x + o[0] * P.bw); b.style.setProperty('--y', by2 + o[1] * P.bw); b.style.setProperty('--w', o[2] * P.bw);
    });
    const [qx, qy, qw, qh] = P.choices; set($('choices'), { x: qx, y: qy, w: qw, h: qh });
    placeBoxes();
    if (!$('intro').hidden) setIntro();
  }
  function placeCust() {
    const c = CUST[G.cid], [px, py, ph] = P.cust, h = ph * c.size;
    const off = L.cust[G.cid].happy, x0 = px + ph * c.dx, top = py + ph * c.dy;
    anchored($('cust'), off, x0, top, h);
    // 點單泡泡不擋臉（導演 11-09）：手機放臉下方、尾巴朝上指嘴；平板放頭的右邊、尾巴朝左
    const [bx, by, bw, bh] = P.bubble, bub = $('bubble');
    if (lay === 'phone') set(bub, { x: bx, y: top + c.face * h + 40, w: bw, h: bh });
    else set(bub, { x: Math.max(bx, x0 + (off[0] + off[2]) * h - h * .08), y: by, w: bw, h: bh });
    set($('zzz'), { x: px + ph * (c.dx + .45), y: py + ph * (c.dy + .05), w: ph * .5 });                      // 瞌睡 Zzz 在頭右上
  }
  function placeBoxes() {
    const put = (b, [x, y, w]) => { b.style.setProperty('--x', x); b.style.setProperty('--y', y); b.style.setProperty('--w', w); };
    if (G.stacked) return G.boxes.forEach((b, i) => put(b, i < 2 ? P.stack[i] : P.box1[0]));   // 困難：兩盒疊旁邊，第三盒在中間
    const spots = G.boxes.length > 1 ? P.box2 : P.box1;
    G.boxes.forEach((b, i) => put(b, spots[i]));
  }
  addEventListener('resize', layout);

  // ---------- 角色反應 ----------
  function cust(emo, cls, ms = 1200) {
    const el = $('cust'), roles = L.cust[G.cid];
    if (emo) el.src = `${A}cust_${G.cid}_${roles[emo] ? emo : 'happy'}.webp`;
    if (cls) Dino.replay(el, cls);
    clearTimeout(el._t); if (emo && emo !== 'happy' && ms) el._t = setTimeout(() => { el.src = `${A}cust_${G.cid}_happy.webp`; }, ms);
  }
  const nod = () => cust(null, CUST[G.cid].nod);
  // 角落小空：表情 G.kongEmo × 嘴 G.kongMouth（說話時由 say() 輪替；沒講話＝open 微笑，同 v5 外觀）
  const kongSrc = () => { $('kong').src = `${A}xiaokong_${G.kongEmo}_${G.kongMouth}.webp`; };
  function kong(emo, cls, ms = 1200) {
    const el = $('kong');
    G.kongEmo = emo; kongSrc(); if (cls) Dino.replay(el, cls);
    clearTimeout(el._t); if (emo !== 'happy') el._t = setTimeout(() => { G.kongEmo = 'happy'; kongSrc(); }, ms);
  }
  // 說話（照影片流程 tools/papercut/remotion/src/Stage.tsx：說話區段內嘴 closed→open→wide→open 每秒 12 格輪替，區段外閉嘴）
  // frame(t, mouth) 每換一格呼叫一次；回傳停止函式
  function say(clip, frame) {
    const T = TALK[clip], t0 = performance.now(), end = Math.max(...T.spans.map(s => s[1]));
    let last = '', raf = 0, stopped = false;
    Dino.voice(`assets/audio/orchard/${clip}.mp3`);
    const tick = () => {
      if (stopped) return;
      const t = (performance.now() - t0) / 1000;
      const m = T.spans.some(([a, b]) => t >= a && t < b) ? TALK.cycle[Math.floor(t * TALK.fps) % TALK.cycle.length] : 'closed';
      const key = m + '|' + (T.expr || []).findIndex(([a, b]) => t >= a && t < b);
      if (key !== last) { last = key; frame(t, m); }
      if (t < end + .1) raf = setTimeout(tick, 1000 / (TALK.fps * 2)); else frame(t, null);   // 計時器（分頁在背景 rAF 會停）
    };
    tick();
    return () => { stopped = true; clearTimeout(raf); };
  }
  const exprAt = (clip, t) => ((TALK[clip].expr || []).find(([a, b]) => t >= a && t < b) || [])[2];
  const kongTalk = m => { G.kongMouth = m || 'open'; kongSrc(); };
  // 個性：小雞阿暴等不及會跳腳、泡泡抖；阿慢等太久打瞌睡（放果子就醒）
  let moodT = 0;
  function mood() {
    clearTimeout(moodT);
    const c = CUST[G.cid]; if (!c.moodMs) return;
    moodT = setTimeout(() => {
      if (G.busy || (G.phase !== 'fill' && G.phase !== 'ask')) return mood();
      if (G.cid === 'chick_abao') { cust('surprised', 'is-hurry', 1000); Dino.replay($('bubble'), 'is-shake'); Dino.sfx('tap', .25); mood(); }
      if (G.cid === 'aman' && !G.dozing) { G.dozing = true; cust('idle', 'is-doze', 0); $('zzz').hidden = false; }
    }, c.moodMs);
  }
  function wake() {
    if (G.dozing) { G.dozing = false; $('zzz').hidden = true; cust('happy', 'is-wake'); }
    mood();
  }

  // ---------- 果籃：拖曳進格（⑤），點一下也可以 ----------
  const KINDS = ['dot', 'star', 'spike'];
  $('baskets').replaceChildren(...KINDS.map(k => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'basket'; b.dataset.kind = k; b.dataset.noPress = '';
    b.setAttribute('aria-label', KIND_NAME[k] + '籃'); b.innerHTML = `<img src="${A}basket_${k}.webp" alt="">`;
    b.addEventListener('pointerdown', e => grab(e, k));
    b.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); drop(k, null, null); } });
    return b;
  }));
  const basketEl = k => $('baskets').querySelector(`[data-kind="${k}"]`);
  function refreshBaskets() {
    const r = G.r; if (!r) return;
    basketEl('star').classList.toggle('is-wait', G.count.dot < r.a);      // 先裝紅果，紅果裝滿才換紫果
  }
  const stageXY = e => { const s = stage.getBoundingClientRect(); return [e.clientX - s.left, e.clientY - s.top]; };
  function grab(e, kind) {
    if (G.busy || G.phase !== 'fill') return;
    e.preventDefault();
    const b = basketEl(kind); b.setPointerCapture?.(e.pointerId);
    hideHint(); wake(); clearTimeout(nudgeT);
    spring(b, v => `scale(${1 + .1 * v},${1 - .13 * v})`, 520); Dino.sfx('tap', .4);
    const [sx, sy] = stageXY(e); let img = null;
    const size = center(firstEmpty() || G.boxes[0])[2] * .88 || stage.clientWidth * .1;
    const move = ev => {
      const [x, y] = stageXY(ev);
      if (!img && Math.hypot(x - sx, y - sy) < 12) return;
      if (!img) { img = document.createElement('img'); img.src = `${A}fruit_${kind}.webp`; img.alt = ''; img.className = 'is-held'; img.style.width = size + 'px'; $('fly').append(img); }
      img.style.transform = `translate(${x}px,${y - size * .35}px)`;                 // 果子在手指上方一點，看得到
      markTarget(ev);
    };
    const up = ev => {
      b.removeEventListener('pointermove', move); b.removeEventListener('pointerup', up); b.removeEventListener('pointercancel', up);
      markTarget(null);
      if (!img) return drop(kind, null, null);                                       // 沒拖＝點一下
      const [x, y] = stageXY(ev);
      drop(kind, ev.type === 'pointercancel' ? null : cellUnder(ev), { img, at: [x, y - size * .35], size });
    };
    b.addEventListener('pointermove', move); b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
  }
  function cellUnder(ev) {
    for (const el of document.elementsFromPoint(ev.clientX, ev.clientY)) { const c = el.closest?.('.cell'); if (c && !c.dataset.kind) return c; }
    // 手指稍微偏一點、或放在已有果子的格子上：找最近的空格（約一格內）
    const [x, y] = stageXY(ev); let best = null, bd = Infinity;
    activeBox()?.querySelectorAll('.cell:not([data-kind])').forEach(c => { const [cx, cy, cw] = center(c); const d = Math.hypot(cx - x, cy - y); if (d < cw * .9 && d < bd) { bd = d; best = c; } });
    return best;
  }
  function markTarget(ev) {
    document.querySelectorAll('.cell.is-target').forEach(c => c.classList.remove('is-target'));
    if (!ev) return;
    const c = cellUnder(ev); if (c && !c.dataset.kind && c.closest('.box') === activeBox()) c.classList.add('is-target');
  }

  // ---------- 飛行 ----------
  function center(el) {
    if (!el) return [0, 0, 0];
    const s = stage.getBoundingClientRect(), b = el.getBoundingClientRect();
    return [b.left - s.left + b.width / 2, b.top - s.top + b.height / 2, b.width];
  }
  function fly(kind, from, to, size, { back = false, ms = 400, arc = 1, img = null } = {}) {
    if (!img) { img = document.createElement('img'); img.src = `${A}fruit_${kind}.webp`; img.alt = ''; $('fly').append(img); }
    img.className = ''; img.style.width = size + 'px';
    const [x0, y0] = from, [x1, y1] = to, peak = Math.min(y0, y1) - stage.clientWidth * (lay === 'phone' ? .22 : .1) * arc;
    const mx = (x0 + x1) / 2, kf = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24, u = 1 - t;
      const x = u * u * x0 + 2 * u * t * mx + t * t * x1, y = u * u * y0 + 2 * u * t * peak + t * t * y1;
      kf.push({ transform: `translate(${x}px,${y}px) rotate(${(back ? -1 : 1) * t * 200 * arc}deg) scale(${1 + .2 * arc * Math.sin(t * Math.PI)})` });
    }
    const an = img.animate(kf, { duration: R ? 1 : ms, easing: 'cubic-bezier(.33,.08,.4,1)', fill: 'forwards' });
    return Promise.race([an.finished, new Promise(r => setTimeout(r, ms + 200))]).then(() => img);     // 分頁在背景時動畫會暫停
  }

  // ---------- 盒子 ----------
  function makeBox() {
    const box = document.createElement('div'); box.className = 'box';
    box.innerHTML = `<div class="cells">${'<div class="cell"></div>'.repeat(10)}</div><div class="lid"><b>10</b></div>`;
    box.querySelectorAll('.cell').forEach(c => c.addEventListener('click', () => countEmpty(c)));
    $('boxes').append(box); return box;
  }
  const filledIn = box => box.querySelectorAll('.cell[data-kind]').length;
  const activeBox = () => G.boxes.find(b => filledIn(b) < 10);
  const firstEmpty = () => activeBox()?.querySelector('.cell:not([data-kind])');
  const placedN = () => G.count.dot + G.count.star;

  // 放一顆：cell＝拖到的格子（null＝點籃子，自動放下一格）；held＝手上拖著的果子
  async function drop(kind, cell, held) {
    if (G.busy || G.phase !== 'fill') { held?.img.remove(); return; }
    hideHint(); wake();
    const r = G.r, need = { dot: r.a, star: r.b }[kind];
    const [fx, fy, fw] = center(basketEl(kind)), home = [fx, fy - fw * .25];
    G.busy = true;
    // 不要的果子、紅果還沒裝完就拿紫果、或已經夠了 → 果子飛出去又飛回籃子，客人歪頭（不打叉）
    if (!need || G.count[kind] >= need || (kind === 'star' && G.count.dot < r.a)) {
      let img = held?.img, at = held?.at;
      if (!held) { const t = center(firstEmpty() || G.boxes.at(-1)); img = await fly(kind, home, [t[0], t[1]], t[2] * .8 || fw * .5); at = [t[0], t[1]]; }
      cust('troubled', 'is-tilt', 1100); kong('surprised', 'is-look', 900); Dino.sfx('pop', .5);
      const pulse = $('bubble').querySelector(`.want.is-${G.count.dot < r.a ? 'dot' : 'star'}`);
      if (pulse) Dino.replay(pulse, 'is-pulse');
      await fly(kind, at, home, held?.size || fw * .5, { back: true, img }).then(el => el.remove());
      if (kind === 'star' && G.count.dot < r.a) Dino.replay(basketEl('star'), 'is-no');
      G.busy = false; nudge(); return;
    }
    // 拖到不能放的地方（盒外、已有果子、第一盒還沒滿就放第二盒）→ 安靜飛回籃子
    if (held && (!cell || cell.dataset.kind || cell.closest('.box') !== activeBox())) {
      if (cell && cell.closest('.box') !== activeBox() && !cell.dataset.kind) Dino.replay(activeBox(), 'is-wiggle');
      await fly(kind, held.at, home, held.size, { back: true, img: held.img, ms: 320, arc: .5 }).then(el => el.remove());
      G.busy = false; nudge(); return;
    }
    cell = cell || firstEmpty();
    G.count[kind]++; cell.dataset.kind = kind;
    const [cx, cy, cw] = center(cell);
    const img = held ? await fly(kind, held.at, [cx, cy], cw * .88, { img: held.img, ms: 160, arc: .12 })
      : await fly(kind, home, [cx, cy], cw * .88);
    img.remove();
    fillCell(cell, kind);
    nod();
    const done = G.count[kind] === need;
    if (done) { $('bubble').querySelector(`.want.is-${kind}`).classList.add('is-done'); setTimeout(() => cust('happy', 'is-cheer'), 380); }
    refreshBaskets();
    await wait(160);
    G.busy = false;
    if (kind === 'dot' && done && r.a + r.b > 10) return ask();                 // ① 紅果放完 → 問還差幾顆滿 10
    const box = cell.closest('.box');
    if (filledIn(box) === 10 && !box.classList.contains('is-closed')) { G.busy = true; await boxFull(box); G.busy = false; }   // ③ 第二盒也滿了
    if (placedN() === r.a + r.b) return allIn();
    nudge();
  }
  function fillCell(cell, kind) {
    cell.dataset.kind = kind; cell.classList.remove('is-ask', 'is-counted', 'is-target');
    cell.innerHTML = `<img src="${A}fruit_${kind}.webp" alt="">`;                       // 果子上不貼編號（導演 11-09）
    Dino.sfx('pop', .7);
    spring(cell.firstElementChild, v => `translateY(${-6 * v}%) scale(${1 + .22 * v},${1 - .2 * v})`, 520);   // 果子落進格子：壓扁再彈回
    spring(cell.closest('.box'), v => `scale(${1 + .012 * v},${1 - .022 * v})`, 460);                     // 紙盒被壓一下
  }

  // ---------- ① 還差幾顆滿 10：點空格數，數完紫果補滿、啪地蓋上 ----------
  function ask() {
    G.phase = 'ask'; G.asked = 0; clearTimeout(nudgeT);
    $('baskets').classList.add('is-away');
    const carry = $('carry'); carry.hidden = false; kid(carry, '還差幾顆滿 10？'); Dino.replay(carry, 'is-pop');
    say('ask10', (t, m) => kongTalk(m));                                             // 小空問（導演 11-09 直接配音，嘴巴跟著動）
    G.boxes[0].querySelectorAll('.cell:not([data-kind])').forEach(c => c.classList.add('is-ask'));
    G.boxes[0].classList.add('is-asking');
    kong('surprised', 'is-look', 900);
    nudge();
  }
  async function countEmpty(cell) {
    if (G.busy || G.phase !== 'ask' || !cell.classList.contains('is-ask')) return;
    hideHint(); wake();
    G.asked++; cell.classList.replace('is-ask', 'is-counted');
    cell.innerHTML = `<span class="ghost">${G.asked}</span>`;
    Dino.sfx('tap', .5); nod();
    spring(cell.firstElementChild, v => `scale(${1 + .35 * v})`, 480);
    const need = 10 - G.r.a;
    if (G.asked < need) return nudge();
    G.busy = true; G.boxes[0].classList.remove('is-asking');
    await wait(300);
    $('carry').textContent = `還差 ${need} 顆！`; $('carry').setAttribute('aria-label', `還差 ${need} 顆`);
    Dino.replay($('carry'), 'is-pop'); Dino.voice(num(need)); cust('happy', 'is-cheer');
    await wait(700);
    $('baskets').classList.remove('is-away');
    await wait(350);
    const [fx, fy, fw] = center(basketEl('star')), home = [fx, fy - fw * .25];
    const cells = [...G.boxes[0].querySelectorAll('.cell.is-counted')];
    for (const c of cells) {                                              // 紫果一顆接一顆飛進去補滿
      G.count.star++; c.dataset.kind = 'star';
      const [cx, cy, cw] = center(c);
      fly('star', home, [cx, cy], cw * .88, { ms: 340 }).then(img => { img.remove(); fillCell(c, 'star'); });
      await wait(160);
    }
    await wait(420);
    if (G.count.star === G.r.b) $('bubble').querySelector('.want.is-star').classList.add('is-done');
    await closeLid(G.boxes[0], `${G.r.a}＋${10 - G.r.a}＝10`);
    G.phase = 'fill'; G.busy = false;
    if (placedN() === G.r.a + G.r.b) return allIn();
    nudge();
  }

  async function closeLid(box, text, say = 10) {
    await wait(120);
    box.classList.add('is-closed'); Dino.sfx('swoosh', .6);
    await wait(300);
    spring(box, v => `scale(${1 + .03 * v},${1 - .055 * v})`, 640);                                  // 蓋子壓下來：盒子扁一下再回彈
    await wait(180); Dino.sfx('correct', .5); Dino.voice(num(say));
    kong('happy', 'is-cheer');
    const carry = $('carry'); carry.hidden = false; carry.textContent = text; carry.setAttribute('aria-label', text);
    await wait(700);
  }
  // ③ 困難：第二盒滿了 → 蓋上（10＋10＝20），兩盒縮小疊到旁邊，第三盒滑進中間
  async function boxFull(box) {
    const n = G.boxes.indexOf(box) + 1;
    await closeLid(box, `${Array(n).fill(10).join('＋')}＝${n * 10}`, n * 10);
    if (placedN() === G.r.a + G.r.b) return;
    G.stacked = true; G.boxes.push(makeBox()); placeBoxes(); Dino.sfx('swoosh', .5);
    await wait(560);
  }

  // ---------- 放完 ----------
  async function allIn() {
    const r = G.r, total = r.a + r.b;
    G.phase = 'answer'; hideHint(); clearTimeout(nudgeT); clearTimeout(moodT);
    await wait(500);
    if (total <= 10) return correct();                       // ① 十格：自動填答並唸出
    const tens = Math.floor(total / 10) * 10, rest = total - tens;
    $('carry').textContent = (tens === 10 ? `${r.a}＋${10 - r.a}＝10` : `${Array(tens / 10).fill(10).join('＋')}＝${tens}`) + `，再＋${rest}＝${total}`;
    Dino.replay($('carry'), 'is-pop');
    $('baskets').classList.add('is-away');
    const opts = Dino.shuffle(total > 20 ? [total - 10, total, total + 10] : [total - 1, total, total + 1]);   // 困難：差 10 的選項，看懂「幾盒＋幾顆」
    $('choices').replaceChildren(...opts.map(n => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = n; b.dataset.noPress = '';
      b.addEventListener('pointerdown', e => {                              // 按哪邊就往哪邊沉（立體積木）
        const q = b.getBoundingClientRect();
        b.style.setProperty('--rx', `${((e.clientY - q.top) / q.height - .5) * -16}deg`);
        b.style.setProperty('--ry', `${((e.clientX - q.left) / q.width - .5) * 16}deg`);
      });
      b.addEventListener('click', () => choose(b, n)); return b;
    }));
    $('choices').hidden = false;
  }
  async function choose(btn, n) {
    if (G.busy || G.phase !== 'answer') return;
    const total = G.r.a + G.r.b;
    Dino.voice(num(n));
    if (n === total) { btn.classList.add('is-yes'); return correct(); }
    G.busy = true; btn.classList.add('is-no'); btn.disabled = true;     // 選錯：不打叉，蓋好的盒子 10、20 跳一下，再陪著接著數（不唸）
    cust('troubled', 'is-tilt', 1600);
    await wait(900);
    const last = G.boxes.at(-1);
    for (const b of G.boxes) { if (b === last) break; Dino.replay(b, 'is-pulse'); await wait(800); }
    for (const c of last.querySelectorAll('.cell[data-kind]')) {
      c.classList.add('is-lit'); Dino.sfx('tap', .4);
      spring(c.firstElementChild, v => `translateY(${-14 * v}%)`, 420, 2.4);
      await wait(450);
    }
    last.querySelectorAll('.cell').forEach(c => c.classList.remove('is-lit'));
    G.busy = false;
  }
  async function correct() {
    const total = G.r.a + G.r.b;
    G.busy = true;
    const c = $('eqC'); c.textContent = total; c.classList.add('is-filled');
    spring(c, v => `scale(${1 + .3 * v}) rotate(${-8 * v}deg)`, 620);                                     // 答案像蓋章一樣壓上去
    await wait(150); Dino.voice(num(total));
    Dino.sfx('correct'); cust('happy', 'is-cheer'); kong('happy', 'is-cheer'); Dino.burst(c);
    await wait(1500);
    Dino.sfx('swoosh'); G.boxes.forEach(b => b.classList.add('is-go'));       // 盒子交給客人
    $('cust').classList.add('is-leave');                                     // 客人拿了盒子離開
    await wait(800);
    $('rounds').children[G.round].className = 'is-done';
    G.round++;
    if (G.round >= ROUNDS.length) return finish();
    newRound();
  }

  // ---------- 一位客人 ----------
  function newRound() {
    const r = G.r = ROUNDS[G.round];
    G.cid = r.c; G.dozing = false; $('zzz').hidden = true;
    const el = $('cust'); el.classList.remove('is-leave'); el.src = `${A}cust_${G.cid}_happy.webp`; el.alt = CUST[G.cid].name;
    placeCust(); Dino.replay(el, 'is-enter');
    G.count = { dot: 0, star: 0, spike: 0 }; G.phase = 'fill'; G.stacked = false;
    $('boxes').replaceChildren(); G.boxes = [makeBox()]; if (r.a + r.b > 10) G.boxes.push(makeBox());
    placeBoxes();
    $('eqA').textContent = r.a; $('eqB').textContent = r.b;
    const c = $('eqC'); c.textContent = '?'; c.classList.remove('is-filled');
    $('carry').hidden = true; $('choices').hidden = true; $('baskets').classList.remove('is-away');
    $('bubble').innerHTML = [['dot', r.a], ['star', r.b]].map(([k, n]) => `<span class="want is-${k}"><img src="${A}fruit_${k}.webp" alt="${KIND_NAME[k]}">×${n}</span>`).join('');
    $('bubble').setAttribute('aria-label', `${CUST[G.cid].name}要：紅果 ${r.a} 顆、紫果 ${r.b} 顆`);
    Dino.replay($('bubble'), 'is-pop');
    [...$('rounds').children].forEach((li, i) => { if (i === G.round) li.className = 'is-now'; });
    refreshBaskets();
    G.busy = false; nudge(); mood();
  }
  function finish() {
    clearTimeout(moodT);
    kid($('finishLine'), '客人都開心了！'); G.playing = false;
    Dino.sfx('finish'); $('finish').hidden = false;
    say('thanks', (t, m) => { $('finishActor').src = `${A}xiaokong_happy_${m || 'open'}.webp`; });
  }

  // ---------- 手勢提示：第一位客人 1.5 秒給，之後依客人個性（急的早、慢的晚） ----------
  const hint = $('hint'); let nudgeT = 0;
  function hideHint() { hint.className = 'fs-hint'; document.querySelectorAll('.is-hinted').forEach(b => b.classList.remove('is-hinted')); }
  function nudge() {
    clearTimeout(nudgeT);
    const early = (G.round === 0 && placedN() < 2) || (G.phase === 'ask' && G.asked === 0);
    nudgeT = setTimeout(() => {
      if (G.phase !== 'fill' && G.phase !== 'ask') return;
      if (G.busy) return nudge();
      const t = G.phase === 'ask' ? G.boxes[0].querySelector('.cell.is-ask') : basketEl(G.count.dot < G.r.a ? 'dot' : 'star');
      if (!t) return;
      const s = stage.getBoundingClientRect(), b = t.getBoundingClientRect();
      hint.style.left = `${(b.left - s.left + b.width / 2) / s.width * 100}%`; hint.style.top = `${(b.top - s.top + b.height * .3) / s.height * 100}%`;
      hint.className = 'fs-hint is-on'; t.classList.add('is-hinted');
    }, early ? 1500 : CUST[G.cid].hintMs);
  }

  // ---------- 開場全景（導演 11-09）：小空水果攤 → 小空開場白（配音）→ 推近到櫃台；點一下可跳過。？按鈕重看 ----------
  function setIntro() {
    const I = L[lay].intro, el = $('intro'), [fx, fy] = I.focus;
    el.querySelector('.ib').src = `${A}intro_back_${lay}.webp`; $('introFront').src = `${A}intro_front_${lay}.webp`;
    set($('introKong'), { x: I.kong[0], y: I.kong[1], w: I.kong[2] }); set($('introFront'), { x: I.front[0], y: I.front[1], w: I.front[2] });
    introKong('happy', 'closed');
    el.style.setProperty('--fx', fx * 100 + '%'); el.style.setProperty('--fy', fy * 100 + '%');
  }
  const introKong = (emo, m) => { $('introKong').src = `${A}intro_kong_${emo}_${m}_${lay}.webp`; };
  let introSeen = false, stopTalk = null;
  function playIntro(onZoom) {
    return new Promise(resolve => {
      const el = $('intro'); setIntro(); clearTimeout(nudgeT); hideHint();
      el.classList.remove('is-zoom'); el.hidden = false; Dino.replay(el, 'is-in');
      let zoomed = false;
      stopTalk?.();
      // 全景時：大小空說「歡迎光臨（開心）小空果果店（得意）」；推近後由角落小空接著講完
      stopTalk = say('intro', (t, m) => { if (!zoomed) introKong(exprAt('intro', t) || 'happy', m || 'closed'); else kongTalk(m); });
      let t = 0;
      const go = () => {
        if (zoomed) return;
        clearTimeout(t); el.removeEventListener('click', go); zoomed = true;
        el.classList.add('is-zoom'); onZoom?.();
        setTimeout(() => { el.hidden = true; el.classList.remove('is-zoom', 'is-in'); resolve(); }, R ? 50 : 950);
      };
      t = setTimeout(go, R ? 300 : TALK.intro.zoom * 1000);      // 「歡迎光臨小空果果店！」講完就推近，後半句邊推邊講
      el.addEventListener('click', go);
    });
  }

  // ---------- 開始／難度選單／再玩 ----------
  function showRule() {
    const [a, b, label] = RULE[level], rule = $('rule');
    rule.innerHTML = `<span class="r"><img src="${A}fruit_dot.webp" alt="紅果">${a}</span>＋<span class="p"><img src="${A}fruit_star.webp" alt="紫果">${b}</span><span class="t"></span>`;
    kid(rule.querySelector('.t'), label);
    document.querySelectorAll('.pick button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lv === level)));
  }
  document.querySelectorAll('.pick button').forEach(b => b.addEventListener('click', () => { level = b.dataset.lv; showRule(); }));
  let playingLevel = null;
  function begin() {
    $('ready').hidden = true; $('finish').hidden = true;
    ROUNDS = SETS[level]; playingLevel = level; G.playing = true;
    try { localStorage.setItem(LV_KEY, level); } catch { /* ok */ }
    G.round = Math.min(+QS.get('r') || 0, ROUNDS.length - 1);   // ?r=2 直接從第 3 位客人開始（測試用）
    $('rounds').replaceChildren(...ROUNDS.map(() => document.createElement('li')));
    Dino.preload(Array.from({ length: 30 }, (_, i) => num(i + 1)));
    Object.entries(L.cust).forEach(([cid, roles]) => Object.keys(roles).forEach(e => { new Image().src = `${A}cust_${cid}_${e}.webp`; }));   // 客人圖先載好，換人不閃
    if (introSeen) return newRound();
    introSeen = true; G.busy = true; G.cid = ROUNDS[G.round].c; placeCust(); $('cust').classList.add('is-leave');
    playIntro(() => newRound());
  }
  $('start').addEventListener('click', () => {
    if (G.playing && level === playingLevel) { $('ready').hidden = true; nudge(); mood(); return; }   // 沒換難度：繼續玩
    begin();
  });
  $('again').addEventListener('click', begin);
  $('menuBtn').addEventListener('click', () => { Dino.sfx('tap', .5); clearTimeout(nudgeT); clearTimeout(moodT); hideHint(); showRule(); $('ready').hidden = false; });
  $('help').addEventListener('click', () => { Dino.sfx('tap', .5); if (!$('ready').hidden || !$('intro').hidden) return; playIntro().then(() => { if (G.playing) nudge(); }); });
  Dino.menuTaps($('ready')); Dino.menuTaps($('finish'));
  { const k = innerWidth > innerHeight ? 'tablet' : 'phone';                    // 開場與說話用圖先載好，換嘴不閃
    [`intro_back_${k}`, `intro_front_${k}`, ...['happy', 'smug'].flatMap(e => ['closed', 'open', 'wide'].map(m => `intro_kong_${e}_${m}_${k}`)),
     ...['happy', 'surprised'].flatMap(e => ['closed', 'open', 'wide'].map(m => `xiaokong_${e}_${m}`))].forEach(n => { new Image().src = `${A}${n}.webp`; }); }
  Dino.preload(['assets/audio/orchard/intro.mp3', 'assets/audio/orchard/ask10.mp3', 'assets/audio/orchard/thanks.mp3']);
  showRule();
  G.cid = ROUNDS[Math.min(+QS.get('r') || 0, ROUNDS.length - 1)].c;
  layout();
})();

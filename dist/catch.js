(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const COLORS = [
    { id: 'red', zh: '紅', bpm: 'ㄏㄨㄥˊ', fill: '#e8574a' },
    { id: 'blue', zh: '藍', bpm: 'ㄌㄢˊ', fill: '#3f8fd2' },
    { id: 'yellow', zh: '黃', bpm: 'ㄏㄨㄤˊ', fill: '#f4c63d' },
    { id: 'green', zh: '綠', bpm: 'ㄌㄩˋ', fill: '#4fb46a' }
  ];
  // 形狀＝題庫 shape 主題（星形沿用題庫既有的 star 星星音檔）；path 在 100×100 畫布
  const SHAPES = [
    { id: 'circle', zh: '圓形', bpm: ['ㄩㄢˊ', 'ㄒㄧㄥˊ'], audio: 'shape-circle', d: 'M50 8a42 42 0 1 1 0 84a42 42 0 1 1 0-84z' },
    { id: 'square', zh: '正方形', bpm: ['ㄓㄥˋ', 'ㄈㄤ', 'ㄒㄧㄥˊ'], audio: 'shape-square', d: 'M20 10h60a10 10 0 0 1 10 10v60a10 10 0 0 1-10 10H20a10 10 0 0 1-10-10V20a10 10 0 0 1 10-10z' },
    { id: 'rectangle', zh: '長方形', bpm: ['ㄔㄤˊ', 'ㄈㄤ', 'ㄒㄧㄥˊ'], audio: 'shape-rectangle', d: 'M12 24h76a8 8 0 0 1 8 8v36a8 8 0 0 1-8 8H12a8 8 0 0 1-8-8V32a8 8 0 0 1 8-8z' },
    { id: 'triangle', zh: '三角形', bpm: ['ㄙㄢ', 'ㄐㄧㄠˇ', 'ㄒㄧㄥˊ'], audio: 'shape-triangle', d: 'M50 9L93 86H7z' },
    { id: 'diamond', zh: '菱形', bpm: ['ㄌㄧㄥˊ', 'ㄒㄧㄥˊ'], audio: 'shape-diamond', d: 'M50 4L84 50L50 96L16 50z' },
    { id: 'heart', zh: '愛心', bpm: ['ㄞˋ', 'ㄒㄧㄣ'], audio: 'shape-heart', d: 'M50 88C18 66 5 49 5 32C5 17 16 7 29 7c9 0 16 5 21 13c5-8 12-13 21-13c13 0 24 10 24 25c0 17-13 34-45 56z' },
    { id: 'star', zh: '星形', bpm: ['ㄒㄧㄥ', 'ㄒㄧㄥˊ'], audio: 'kidapp-star', d: 'M50 5l12 31l33 2l-26 21l9 32l-28-18l-28 18l9-32L5 38l33-2z' }
  ];
  // 不能接的奇怪物品：沿用題庫圖（米白底，用 multiply 融進天空）
  const JUNK = ['emoji-6x8-v1/kidapp-sock', 'new100/new-broom', 'new100/new-mop', 'new100/new-bucket', 'emoji-6x8-v1/object-fork', 'emoji-6x8-v1/object-spoon',
    'new100/new-kettle', 'emoji-6x8-v1/kidapp-mushroom', 'emoji-6x8-v1/kidapp-hammer', 'new100/new-comb', 'new100/new-bottle', 'emoji-6x8-v1/kidapp-pumpkin',
    'new100/new-toaster', 'new100/new-lettuce'].map(p => `assets/rebuilt/${p}.png`);
  const table = {
    '接信大郵袋': ['ㄐㄧㄝ', 'ㄒㄧㄣˋ', 'ㄉㄚˋ', 'ㄧㄡˊ', 'ㄉㄞˋ'],
    '點一下，開始接信！': ['ㄉㄧㄢˇ', 'ㄧ', 'ㄒㄧㄚˋ', '', 'ㄎㄞ', 'ㄕˇ', 'ㄐㄧㄝ', 'ㄒㄧㄣˋ', ''],
    '信都接到了！': ['ㄒㄧㄣˋ', 'ㄉㄡ', 'ㄐㄧㄝ', 'ㄉㄠˋ', 'ㄌㄜ˙', ''],
    '慢': ['ㄇㄢˋ'], '中': ['ㄓㄨㄥ'], '快': ['ㄎㄨㄞˋ'],
    '再玩一次': ['ㄗㄞˋ', 'ㄨㄢˊ', 'ㄧ', 'ㄘˋ'], '回首頁': ['ㄏㄨㄟˊ', 'ㄕㄡˇ', 'ㄧㄝˋ'],
    '奇怪東西不要接': ['ㄑㄧˊ', 'ㄍㄨㄞˋ', 'ㄉㄨㄥ', 'ㄒㄧ˙', 'ㄅㄨˊ', 'ㄧㄠˋ', 'ㄐㄧㄝ'],
    '知道了': ['ㄓ', 'ㄉㄠˋ', 'ㄌㄜ˙'], '變快了！': ['ㄅㄧㄢˋ', 'ㄎㄨㄞˋ', 'ㄌㄜ˙', ''],
    '第二關': ['ㄉㄧˋ', 'ㄦˋ', 'ㄍㄨㄢ'], '第三關': ['ㄉㄧˋ', 'ㄙㄢ', 'ㄍㄨㄢ'], '第四關': ['ㄉㄧˋ', 'ㄙˋ', 'ㄍㄨㄢ'], '最後一關': ['ㄗㄨㄟˋ', 'ㄏㄡˋ', 'ㄧ', 'ㄍㄨㄢ']
  };
  COLORS.forEach(c => { table[`接${c.zh}色的信`] = ['ㄐㄧㄝ', c.bpm, 'ㄙㄜˋ', 'ㄉㄜ˙', 'ㄒㄧㄣˋ']; });
  SHAPES.forEach(sh => {
    table[`接${sh.zh}`] = ['ㄐㄧㄝ', ...sh.bpm];
    COLORS.forEach(c => { table[`接${c.zh}色的${sh.zh}`] = ['ㄐㄧㄝ', c.bpm, 'ㄙㄜˋ', 'ㄉㄜ˙', ...sh.bpm]; });
  });
  const setKidText = Dino.kidText(table);
  const NUM = ['one', 'two', 'three', 'four', 'five'];
  const ROUNDS = [3, 3, 4, 4, 5];   // 每回合要接幾個
  const MODES = ['color', 'shape', 'color', 'shape', 'both'];   // 導演 2026-10-22：顏色、形狀輪流，最後一關顏色＋形狀
  const ROUND_NAMES = [null, '第二關', '第三關', '第四關', '最後一關'];
  // 中速約 3 秒落地；每關再乘 RAMP，最後一關約快 1.6 倍
  const SPEED = { slow: .024, mid: .034, fast: .046 };   // 每毫秒下降幾 % 天空高度
  const GAP = { slow: 1220, mid: 910, fast: 710 };        // 幾毫秒掉一個（導演 2026-10-22：密度再降約 10%）
  const RAMP = [1, 1.12, 1.25, 1.4, 1.6];
  const TARGET_RATE = .38;   // 要接的比例
  const JUNK_RATE = [.18, .28, .3, .32, .32];   // 奇怪物品比例（推車變大，靠它們補難度）
  const GOLD_RATE = .07;     // 第二關起，金色星星信：什麼都算，+2
  const WIGGLY_RATE = .3;    // 第三關起，左右大幅飄
  const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#fffbe6" stroke="#b9820f" stroke-width="1.6" stroke-linejoin="round" d="M12 2.8l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 16.8l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>';
  let speed = 'mid';
  try { const s = localStorage.getItem('dinopost-catch-speed'); if (SPEED[s]) speed = s; } catch { /* ok */ }

  const G = { round: 0, got: 0, wrong: 0, wrongs: [], target: null, pool: [], letters: [], bagX: .5, running: false, paused: false, pending: null, started: false, last: 0, spawnIn: 0 };
  const audio = {};
  function clip(name) { return audio[name] || (audio[name] = new Audio(name.startsWith('shape-') ? `assets/audio/${name}.mp3` : `assets/audio/kidapp-${name.replace(/^kidapp-/, '')}.mp3`)); }
  function play(name) { const a = clip(name); a.currentTime = 0; return a.play().catch(() => {}); }
  // 題目念法：顏色 → "red"；形狀 → "circle"；最後一關 → "red" 接著 "circle"
  let sayT;
  function sayOrder() {
    const t = G.target; clearTimeout(sayT);
    if (t.color && t.shape) { play(t.color.id); sayT = setTimeout(() => play(t.shape.audio), 750); }
    else play(t.color ? t.color.id : t.shape.audio);
  }

  let clipN = 0;
  function shapeSvg(sh, fill) {
    const id = `cl${++clipN}`, edge = `color-mix(in srgb,${fill} 58%,#000)`;
    return `<svg viewBox="0 0 100 100" aria-hidden="true"><defs><clipPath id="${id}"><path d="${sh.d}"/></clipPath><linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".38"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></linearGradient></defs>`
      + `<path d="${sh.d}" fill="${fill}" stroke="${edge}" stroke-width="5" stroke-linejoin="round"/><path d="${sh.d}" fill="url(#${id}g)"/>`
      + `<ellipse cx="36" cy="30" rx="15" ry="8" fill="#fff" opacity=".5" clip-path="url(#${id})"/></svg>`;
  }

  const sky = $('sky'), iggy = $('iggy'), cart = $('cart');
  let W = 0, H = 0, LW = 0, BW = 0, CH = 0;
  function measure() {
    W = sky.clientWidth; H = sky.clientHeight;
    LW = Math.round(Math.max(62, Math.min(110, W * .12)));
    BW = Math.round(Math.max(150, Math.min(290, W * .32)));   // v3：推車約畫面 32%（v2 郵袋 24%）
    CH = Math.round(BW * 278 / 420);
    sky.style.setProperty('--lw', LW + 'px'); sky.style.setProperty('--bw', BW + 'px'); sky.style.setProperty('--ch', CH + 'px');
    placeBag();
  }
  function placeBag() { const t = `translateX(${G.bagX * (W - BW)}px)`; iggy.style.transform = t; cart.style.transform = t; }

  // 手指在天空任何地方左右滑，推車就跟著走
  function follow(e) { const r = sky.getBoundingClientRect(); G.bagX = Math.max(0, Math.min(1, (e.clientX - r.left - BW / 2) / (W - BW))); placeBag(); }
  sky.addEventListener('pointerdown', e => { sky.setPointerCapture(e.pointerId); follow(e); });
  sky.addEventListener('pointermove', e => { if (e.buttons || e.pointerType === 'mouse') follow(e); });
  addEventListener('keydown', e => { if (e.key === 'ArrowLeft') G.bagX = Math.max(0, G.bagX - .06); else if (e.key === 'ArrowRight') G.bagX = Math.min(1, G.bagX + .06); else return; placeBag(); });

  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  function orderText(t) { return t.color && t.shape ? `接${t.color.zh}色的${t.shape.zh}` : t.color ? `接${t.color.zh}色的信` : `接${t.shape.zh}`; }

  function setOrder() {
    const t = G.target, chip = $('chip');
    setKidText($('askText'), orderText(t));
    chip.className = 'cs-chip' + (t.shape ? ' is-shape' : '');
    chip.innerHTML = t.shape ? shapeSvg(t.shape, t.color ? t.color.fill : '#cfc6ad') : '';   // 只考形狀時用中性米灰，不暗示顏色
    chip.style.setProperty('--c', t.color ? t.color.fill : '#fffdf2');
    $('count').replaceChildren(...Array.from({ length: ROUNDS[G.round] }, () => document.createElement('li')));
    $('rounds').replaceChildren(...ROUNDS.map((_, i) => { const li = document.createElement('li'); li.className = i < G.round ? 'is-done' : i === G.round ? 'is-now' : ''; return li; }));
    const o = $('order'); o.classList.remove('is-pop'); void o.offsetWidth; o.classList.add('is-pop');
    sayOrder();
  }
  function syncCount() {
    [...$('count').children].forEach((li, i) => { const on = i < G.got; li.classList.toggle('is-filled', on); li.textContent = on ? i + 1 : ''; });
  }

  // 依本關題型產生一個「對的」或「錯的」東西
  function makeThing(good) {
    const mode = MODES[G.round], t = G.target;
    if (mode === 'color') return { color: good ? t.color : pick(COLORS.filter(c => c !== t.color)) };
    if (mode === 'shape') return { shape: good ? t.shape : pick(G.pool), color: pick(COLORS) };
    if (good) return { shape: t.shape, color: t.color };
    // 最後一關的錯：同形狀不同色、同色不同形狀、都不同，各約三分之一
    const r = Math.random();
    return r < .35 ? { shape: t.shape, color: pick(COLORS.filter(c => c !== t.color)) }
      : r < .7 ? { shape: pick(G.pool), color: t.color } : { shape: pick(G.pool), color: pick(COLORS.filter(c => c !== t.color)) };
  }

  function spawn() {
    const r = G.round, n = document.createElement('div');
    const gold = r >= 1 && !G.letters.some(L => L.kind === 'gold') && Math.random() < GOLD_RATE;
    const junk = !gold && Math.random() < JUNK_RATE[r];
    const good = !gold && !junk && Math.random() < TARGET_RATE / (1 - JUNK_RATE[r]);
    const kind = gold ? 'gold' : junk ? 'junk' : good ? 'good' : 'bad';
    const wiggly = !gold && r >= 2 && Math.random() < WIGGLY_RATE;
    let h = LW;
    if (gold) { n.className = 'letter is-gold'; n.innerHTML = STAR; h = LW * .78; }
    else if (junk) { n.className = 'junk'; n.innerHTML = `<img src="${pick(JUNK)}" alt="">`; h = LW * 1.08; }
    else {
      const th = makeThing(good);
      if (th.shape) { n.className = 'item'; n.innerHTML = shapeSvg(th.shape, th.color.fill); h = LW * .92; }
      else { n.className = 'letter' + (wiggly ? ' is-wiggly' : ''); n.style.setProperty('--c', th.color.fill); h = LW * .68; }
    }
    const L = { el: n, kind, h, x: Math.random() * (W - LW), y: -LW * 1.1, tilt: (Math.random() - .5) * (junk ? 60 : 30), spin: junk ? (Math.random() - .5) * .12 : 0, sway: Math.random() * Math.PI * 2,
      amp: wiggly ? Math.min(W * .14, 70) : 14, swaySpeed: wiggly ? 300 : 600, sparkIn: 0, done: false };
    if (wiggly) L.x = LW + Math.random() * Math.max(0, W - LW * 3);
    sky.append(n); G.letters.push(L);
  }

  function sparkle(x, y) {
    const s = document.createElement('span'); s.className = 'spark';
    s.style.left = `${x + (Math.random() - .5) * LW * .8}px`; s.style.top = `${y}px`;
    sky.append(s); setTimeout(() => s.remove(), 650);
  }

  function frame(t) {
    if (!G.running) return;
    const dt = Math.min(50, t - (G.last || t)); G.last = t;
    const ramp = RAMP[G.round];
    G.spawnIn -= dt;
    if (G.spawnIn <= 0) { spawn(); G.spawnIn = GAP[speed] / ramp * (.8 + Math.random() * .4); }
    const fall = SPEED[speed] * ramp / 100 * H * dt;
    const left = G.bagX * (W - BW), rimY = H - CH * .9;   // 推車上緣
    for (const L of G.letters) {
      if (L.done) continue;
      L.y += fall * (L.kind === 'gold' ? .85 : 1); L.sway += dt / L.swaySpeed; L.tilt += L.spin * dt;
      const x = Math.max(0, Math.min(W - LW, L.x + Math.sin(L.sway) * L.amp));
      L.el.style.transform = `translate(${x}px,${L.y}px) rotate(${L.tilt + Math.sin(L.sway) * (L.amp > 14 ? 16 : 8)}deg)`;
      if (L.kind === 'gold' && (L.sparkIn -= dt) <= 0) { L.sparkIn = 110; sparkle(x + LW / 2 - 5, L.y); }
      const cx = x + LW / 2, bottom = L.y + L.h;
      if (bottom >= rimY + CH * .12 && bottom <= rimY + CH * .55 && cx > left + BW * .06 && cx < left + BW * .94) catchIt(L, cx);
      else if (L.y > H) { L.done = true; L.el.remove(); }
    }
    G.letters = G.letters.filter(L => !L.done);
    requestAnimationFrame(frame);
  }

  function floatText(text, x, cls = '') { const f = document.createElement('span'); f.className = `float ${cls}`; f.textContent = text; f.style.left = `${x - 20}px`; f.style.top = `${H - CH * 1.9}px`; sky.append(f); setTimeout(() => f.remove(), 900); }
  function bagAnim(cls) { [cart, iggy].forEach(el => { el.classList.remove('is-yes', 'is-no'); void el.offsetWidth; }); cart.classList.add(cls); if (cls === 'is-yes') iggy.classList.add('is-yes'); }

  let poseT;
  function pose(name, ms) { clearTimeout(poseT); $('courier').src = `assets/cast/iggy__${name}.webp`; if (ms) poseT = setTimeout(() => { $('courier').src = 'assets/cast/iggy__hello.webp'; }, ms); }

  function catchIt(L, cx) {
    L.done = true; L.el.remove();
    const need = ROUNDS[G.round];
    if (L.kind === 'good' || L.kind === 'gold') {
      const add = L.kind === 'gold' ? Math.min(2, need - G.got) : 1;
      G.got += add; syncCount(); bagAnim('is-yes');
      if (L.kind === 'gold') { Dino.sfx('stamp', .7); Dino.burst(cart); floatText('+2', cx, 'is-gold'); pose('cheer', 700); }
      else { Dino.sfx('pop', .6); floatText(G.got, cx); }
      play(NUM[G.got - 1]);
      if (G.got >= need) roundDone();
    } else {
      // 接錯退一格（已經是 0 就只晃一下）；奇怪物品讓伊奇皺眉
      G.wrong++; bagAnim('is-no'); Dino.sfx('wrong', .35); pose('busy_look', 650);
      if (G.got > 0) {
        const li = $('count').children[G.got - 1];
        G.got--; syncCount(); floatText('-1', cx, 'is-minus');
        li.classList.remove('is-lost'); void li.offsetWidth; li.classList.add('is-lost');
      }
    }
  }

  function later(fn, ms) { setTimeout(() => { if (G.paused) G.pending = fn; else fn(); }, ms); }

  function roundDone() {
    G.running = false; G.wrongs.push(G.wrong);
    Dino.sfx('correct', .8); Dino.burst(cart); pose('cheer');
    later(() => {
      G.letters.forEach(L => L.el.remove()); G.letters = [];
      G.round++;
      if (G.round >= ROUNDS.length) return finish();
      nextRound();
    }, 1500);
  }

  function showBanner(name) {
    const b = document.createElement('div'); b.className = 'banner';
    const t = document.createElement('span'), s = document.createElement('small');
    setKidText(t, name); setKidText(s, '變快了！'); b.append(t, s);
    sky.append(b); setTimeout(() => b.remove(), 1350);
  }

  function nextRound() {
    const mode = MODES[G.round], prev = G.target || {};
    const color = mode !== 'shape' ? pick(COLORS.filter(c => c !== prev.color)) : null;
    const shape = mode !== 'color' ? pick(SHAPES.filter(s => s !== prev.shape)) : null;
    G.target = { color, shape };
    G.pool = shape ? Dino.shuffle(SHAPES.filter(s => s !== shape)).slice(0, 3) : [];   // 本關的錯誤形狀只用 3 種，比較好分辨
    G.got = 0; G.wrong = 0; G.last = 0;
    pose('hello');
    setOrder();
    const name = ROUND_NAMES[G.round];
    if (name) { showBanner(name); Dino.sfx('swoosh', .5); }
    G.spawnIn = name ? 1300 : 600;   // 有關卡牌子時，等牌子收掉才開始掉
    G.running = true; requestAnimationFrame(frame);
  }

  function finish() {
    G.started = false;
    const clean = G.wrongs.filter(n => n === 0).length;
    const stars = clean >= 4 ? 3 : clean >= 2 ? 2 : 1;
    Dino.saveHistory({ game: 'catch', mode: speed, score: clean, total: G.wrongs.length });
    $('finishStars').innerHTML = [0, 1, 2].map(i => `<span class="${i < stars ? '' : 'off'}">★</span>`).join('');
    $('finishActor').src = 'assets/cast/iggy__cheer.webp';
    $('finish').hidden = false; Dino.sfx('finish', .8); Dino.bgm.start();
  }

  function newGame() {
    G.round = 0; G.wrongs = []; G.target = null; G.started = true; G.paused = false; G.pending = null;
    G.letters.forEach(L => L.el.remove()); G.letters = [];
    measure(); nextRound();
  }

  // 暫停／繼續：⚙ 開始選單、? 玩法框打開時東西停在空中
  function pause() { if (!G.started || G.paused) return; G.paused = true; G.running = false; }
  function resume() {
    if (!G.paused) return;
    G.paused = false;
    if (G.pending) { const fn = G.pending; G.pending = null; fn(); return; }
    if (G.target && G.got < ROUNDS[G.round]) { G.last = 0; G.running = true; requestAnimationFrame(frame); }
  }

  // 玩法小框框：對的信掉進推車，襪子要閃開
  function buildHowto(stage) {
    const NS = 'http://www.w3.org/2000/svg';
    const el = (tag, attrs, parent) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); parent?.append(n); return n; };
    const svg = el('svg', { viewBox: '0 0 240 130', 'aria-hidden': 'true' }, stage);
    const grad = el('linearGradient', { id: 'hwSky', x1: 0, y1: 0, x2: 0, y2: 1 }, el('defs', {}, svg));
    el('stop', { offset: 0, 'stop-color': '#8fd0f2' }, grad); el('stop', { offset: 1, 'stop-color': '#e3f5fc' }, grad);
    el('rect', { width: 240, height: 130, fill: 'url(#hwSky)' }, svg);
    el('rect', { y: 118, width: 240, height: 12, fill: '#7cc46a' }, svg);
    const drop = (x, begin, draw) => {
      const g = el('g', {}, svg); draw(g);
      el('animateTransform', { attributeName: 'transform', type: 'translate', values: `${x} -14;${x} 92`, dur: '2.4s', begin, repeatCount: 'indefinite' }, g);
    };
    const env = fill => g => { el('rect', { x: -14, y: -10, width: 28, height: 19, rx: 4, fill, stroke: '#0004', 'stroke-width': 2 }, g); el('path', { d: 'M-13-9 0 2 13-9', fill: 'none', stroke: '#fff8', 'stroke-width': 2 }, g); };
    drop(70, '0s', env('#e8574a'));
    drop(170, '.8s', g => el('image', { href: JUNK[0], x: -15, y: -15, width: 30, height: 30, style: 'mix-blend-mode:multiply' }, g));
    drop(120, '1.6s', env('#e8574a'));
    const b = el('g', {}, svg);
    el('image', { href: 'assets/cast/iggy__hello.webp', x: -17, y: -46, width: 34, height: 44, preserveAspectRatio: 'xMidYMax meet' }, b);
    el('image', { href: 'assets/cast/prop_mail_cart_front.webp', x: -27, y: -14, width: 54, height: 36 }, b);
    el('animateTransform', { attributeName: 'transform', type: 'translate', values: '70 100;120 100;120 100;70 100', keyTimes: '0;.55;.72;1', dur: '2.4s', repeatCount: 'indefinite' }, b);
  }

  function syncPick() { document.querySelectorAll('[data-speed]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.speed === speed))); }
  setKidText($('title'), '接信大郵袋'); setKidText($('startLabel'), '點一下，開始接信！');
  setKidText($('pSlow'), '慢'); setKidText($('pMid'), '中'); setKidText($('pFast'), '快');
  setKidText($('finishTitle'), '信都接到了！'); setKidText($('again'), '再玩一次'); setKidText($('home'), '回首頁');
  document.documentElement.classList.toggle('dino-mode', Dino.dinoMode());
  Dino.bgm.start(); Dino.menuTaps($('ready')); Dino.menuTaps($('finish'));
  document.querySelectorAll('[data-speed]').forEach(b => b.addEventListener('click', () => { speed = b.dataset.speed; try { localStorage.setItem('dinopost-catch-speed', speed); } catch { /* ok */ } syncPick(); }));
  syncPick();
  $('ask').addEventListener('click', () => G.target && sayOrder());
  // 導演 2026-10-22：房子永遠回首頁；⚙ 遊戲中打開本遊戲的開始選單（東西先停住）
  document.querySelector('.dino-home').addEventListener('click', e => { e.preventDefault(); Dino.goTo('index.html'); });
  $('menuBtn').addEventListener('click', () => { if (!G.started || !$('ready').hidden) return; pause(); Dino.sfx('tap', .5); $('ready').hidden = false; Dino.bgm.start(); });
  $('help').addEventListener('click', () => { Dino.sfx('tap', .5); pause(); HW.show(); });
  let howtoSeen = false;
  $('start').addEventListener('click', () => {
    $('ready').hidden = true; Dino.bgm.stop();
    if (G.paused) return resume();
    if (!howtoSeen) { howtoSeen = true; G.waitHowto = true; HW.show(); return; }
    newGame();
  });
  $('again').addEventListener('click', () => { $('finish').hidden = true; Dino.bgm.stop(); newGame(); });
  addEventListener('resize', measure);
  measure();
  $('courier').src = 'assets/cast/iggy__hello.webp';
  const HW = Dino.howto({ preview: buildHowto, text: '奇怪東西不要接', kid: setKidText,
    onClose: () => { if (G.waitHowto) { G.waitHowto = false; newGame(); } else if ($('ready').hidden) resume(); } });
  window.__catch = G;
})();

(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  // 每回合 5 關，難度＝題庫 tier（tools/gen_pack_levels.py）
  const PLAN = { easy: [1, 1, 1, 2, 2], mid: [1, 2, 2, 3, 3], hard: [2, 3, 3, 4, 4] };
  const CAST = ['iggy', 'feifei', 'xiaokong', 'pairo', 'chick_abao'];
  // 紙箱顏色：底色 c、外框 e
  const BOXES = [['#eaa75f', '#a8662a'], ['#73b9e6', '#2f78ad'], ['#f0908a', '#b8483f'], ['#a5d77c', '#5b9a3c'], ['#c7a4ee', '#7c55b0'], ['#f5cf55', '#b48a17']];
  const ENV = '<svg class="env" viewBox="0 0 40 28" aria-hidden="true"><rect x="1.5" y="1.5" width="37" height="25" rx="4" fill="#fffdf2" stroke="#c0392b" stroke-width="3"/><path d="M3 4l17 12L37 4" fill="none" stroke="#c0392b" stroke-width="3" stroke-linejoin="round"/><rect x="28" y="16" width="7" height="7" rx="1.5" fill="#e0473a"/></svg>';
  const table = {
    '包裹拼拼樂': ['ㄅㄠ', 'ㄍㄨㄛˇ', 'ㄆㄧㄣ', 'ㄆㄧㄣ', 'ㄌㄜˋ'],
    '點一下，開始拼包裹！': ['ㄉㄧㄢˇ', 'ㄧ', 'ㄒㄧㄚˋ', '', 'ㄎㄞ', 'ㄕˇ', 'ㄆㄧㄣ', 'ㄅㄠ', 'ㄍㄨㄛˇ', ''],
    '信都送到了！': ['ㄒㄧㄣˋ', 'ㄉㄡ', 'ㄙㄨㄥˋ', 'ㄉㄠˋ', 'ㄌㄜ˙', ''],
    '簡單': ['ㄐㄧㄢˇ', 'ㄉㄢ'], '普通': ['ㄆㄨˇ', 'ㄊㄨㄥ'], '困難': ['ㄎㄨㄣˋ', 'ㄋㄢˊ'],
    '再玩一次': ['ㄗㄞˋ', 'ㄨㄢˊ', 'ㄧ', 'ㄘˋ'], '回首頁': ['ㄏㄨㄟˊ', 'ㄕㄡˇ', 'ㄧㄝˋ'], '知道了': ['ㄓ', 'ㄉㄠˋ', 'ㄌㄜ˙'],
    '塞滿空地，恐龍旁邊要有信': ['ㄙㄞ', 'ㄇㄢˇ', 'ㄎㄨㄥ', 'ㄉㄧˋ', '', 'ㄎㄨㄥˇ', 'ㄌㄨㄥˊ', 'ㄆㄤˊ', 'ㄅㄧㄢ', 'ㄧㄠˋ', 'ㄧㄡˇ', 'ㄒㄧㄣˋ'],
    '第二關': ['ㄉㄧˋ', 'ㄦˋ', 'ㄍㄨㄢ'], '第三關': ['ㄉㄧˋ', 'ㄙㄢ', 'ㄍㄨㄢ'], '第四關': ['ㄉㄧˋ', 'ㄙˋ', 'ㄍㄨㄢ'], '最後一關': ['ㄗㄨㄟˋ', 'ㄏㄡˋ', 'ㄧ', 'ㄍㄨㄢ']
  };
  const setKidText = Dino.kidText(table);
  const ROUND_NAMES = [null, '第二關', '第三關', '第四關', '最後一關'];
  const key = (r, c) => `${r},${c}`;

  let level = 'mid';
  try { const s = localStorage.getItem('dinopost-pack-level'); if (PLAN[s]) level = s; } catch { /* ok */ }
  const G = { bank: [], used: new Set(), round: 0, lv: null, pieces: [], dinos: [], board: new Set(), hints: 0, busy: false, started: false };
  const board = $('board'), tray = $('tray'), yard = $('yard'), drag = $('drag');
  let CS = 64;

  // ── 幾何：包裹格子 [[r,c]]、信那格 env；順時針轉 90° 後重新從 (0,0) 起
  const size = cells => [Math.max(...cells.map(p => p[0])) + 1, Math.max(...cells.map(p => p[1])) + 1];
  function turn(p) {
    const [h] = size(p.cells);
    p.cells = p.cells.map(([r, c]) => [c, h - 1 - r]);
    p.env = [p.env[1], h - 1 - p.env[0]];
    p.rot = (p.rot + 1) % 4;
  }
  function drawPiece(p) {
    const [h, w] = size(p.cells), own = new Set(p.cells.map(([r, c]) => key(r, c)));
    p.el.style.setProperty('--h', h); p.el.style.setProperty('--w', w);
    p.el.innerHTML = p.cells.map(([r, c]) => {
      const side = ['t', 'b', 'l', 'r'].filter((s, i) => !own.has(key(r + [-1, 1, 0, 0][i], c + [0, 0, -1, 1][i]))).join(' ');
      const env = r === p.env[0] && c === p.env[1];
      return `<span class="box ${side}" style="left:calc(${c} * var(--pcs));top:calc(${r} * var(--pcs))">${env ? ENV : ''}</span>`;
    }).join('');
  }

  // ── 版面：格子大小跟著院子大小算；包裹架上的包裹用 0.6 倍
  function measure() {
    if (!G.lv) return;
    const w = yard.clientWidth - 24, h = yard.clientHeight - 56;
    CS = Math.max(36, Math.floor(Math.min(w / G.lv.cols, h / G.lv.rows, 132)));
    document.documentElement.style.setProperty('--cs', `${CS}px`);
    document.documentElement.style.setProperty('--tcs', `${Math.round(Math.min(CS * .6, 64))}px`);
  }
  addEventListener('resize', measure);

  function occupied(except) {
    const m = new Map();
    G.pieces.forEach(p => { if (p.at && p !== except) p.cells.forEach(([r, c]) => m.set(key(p.at[0] + r, p.at[1] + c), p)); });
    return m;
  }
  function fits(p, r0, c0) {
    const occ = occupied(p);
    return p.cells.every(([r, c]) => { const k = key(r0 + r, c0 + c); return G.board.has(k) && !G.dinoAt.has(k) && !occ.has(k); });
  }

  // ── 出題
  function pickLevel(tier) {
    const pool = G.bank.map((lv, i) => [lv, i]).filter(([lv, i]) => lv.tier === tier && !G.used.has(i));
    const [lv, i] = pool.length ? pool[Math.floor(Math.random() * pool.length)] : [G.bank.find(lv => lv.tier === tier), -1];
    G.used.add(i); return lv;
  }
  function setup() {
    G.lv = pickLevel(PLAN[level][G.round]);
    const lv = G.lv;
    G.board = new Set(lv.board.map(([r, c]) => key(r, c)));
    G.dinoAt = new Set(lv.dinos.map(([r, c]) => key(r, c)));
    board.style.setProperty('--rows', lv.rows); board.style.setProperty('--cols', lv.cols);
    board.innerHTML = lv.board.filter(([r, c]) => !G.dinoAt.has(key(r, c)))
      .map(([r, c]) => `<span class="tile" data-k="${key(r, c)}" style="left:calc(${c} * var(--cs));top:calc(${r} * var(--cs))"></span>`).join('');
    const who = Dino.shuffle(CAST.slice());
    G.dinos = lv.dinos.map(([r, c], i) => {
      const el = document.createElement('div'); el.className = 'dino';
      el.style.left = `calc(${c} * var(--cs))`; el.style.top = `calc(${r} * var(--cs))`;
      el.innerHTML = `<img alt="" src="assets/cast/${who[i % who.length]}__hello.webp">${ENV.replace('class="env"', 'class="got"')}`;
      board.append(el);
      return { r, c, el, img: el.querySelector('img'), name: who[i % who.length], happy: false };
    });
    tray.innerHTML = '';
    const order = Dino.shuffle(lv.pieces.map((_, i) => i));
    G.pieces = order.map((i, n) => {
      const src = lv.pieces[i], [c, e] = BOXES[n % BOXES.length];
      const p = { cells: src.cells.map(x => x.slice()), env: src.env.slice(), sol: src.solution, rot: 0, at: null, el: document.createElement('div'), n };
      p.el.className = 'piece'; p.el.style.setProperty('--c', c); p.el.style.setProperty('--e', e);
      const spin = Math.floor(Math.random() * 4);   // 一開始方向隨機，要自己轉
      for (let k = 0; k < spin; k++) turn(p);
      drawPiece(p); bindPiece(p); tray.append(p.el);
      return p;
    });
    $('rounds').innerHTML = PLAN[level].map((_, i) => `<li class="${i < G.round ? 'is-done' : i === G.round ? 'is-now' : ''}"></li>`).join('');
    measure(); G.busy = false;
  }

  function toTray(p) {
    p.at = null; p.el.className = 'piece'; p.el.style.left = p.el.style.top = p.el.style.transform = '';
    const next = G.pieces.find(q => q.n > p.n && q.el.parentNode === tray);
    tray.insertBefore(p.el, next ? next.el : null);
  }
  function place(p, r, c) {
    p.at = [r, c]; p.el.className = 'piece on-board'; p.el.style.transform = '';
    p.el.style.left = `calc(${c} * var(--cs))`; p.el.style.top = `calc(${r} * var(--cs))`;
    board.append(p.el);
  }

  // ── 拖曳：超過 8px 才算拖；沒拖就是「點一下轉向」
  function bindPiece(p) {
    p.el.addEventListener('pointerdown', ev => {
      if (G.busy || ev.button > 0) return;
      ev.preventDefault();
      const rect = p.el.getBoundingClientRect(), pcs = rect.width / size(p.cells)[1];
      const gx = (ev.clientX - rect.left) / pcs, gy = (ev.clientY - rect.top) / pcs;
      const x0 = ev.clientX, y0 = ev.clientY, id = ev.pointerId;
      let moving = false, hot = null;
      const pos = e => [e.clientX - gx * CS, e.clientY - gy * CS];
      const target = e => {
        const b = board.getBoundingClientRect(), [x, y] = pos(e);
        const r = Math.round((y - b.top) / CS), c = Math.round((x - b.left) / CS);
        return fits(p, r, c) ? [r, c] : null;
      };
      const mark = t => {
        board.querySelectorAll('.is-hot').forEach(el => el.classList.remove('is-hot'));
        if (t) p.cells.forEach(([r, c]) => board.querySelector(`[data-k="${key(t[0] + r, t[1] + c)}"]`)?.classList.add('is-hot'));
      };
      const move = e => {
        if (e.pointerId !== id) return;
        if (!moving) {
          if (Math.hypot(e.clientX - x0, e.clientY - y0) < 8) return;
          moving = true; p.at = null; p.el.className = 'piece is-drag'; p.el.style.left = p.el.style.top = '';
          drag.append(p.el); Dino.sfx('tap', .4); refresh(false);
        }
        const [x, y] = pos(e); p.el.style.transform = `translate(${x}px,${y}px)`;
        hot = target(e); mark(hot);
      };
      const up = e => {
        if (e.pointerId !== id) return;
        removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up);
        mark(null);
        if (moving) {
          if (hot) { place(p, ...hot); Dino.sfx('stamp', .55); } else { toTray(p); Dino.sfx('swoosh', .4); }
        } else {
          turn(p); drawPiece(p); p.el.classList.remove('is-turn'); void p.el.offsetWidth; p.el.classList.add('is-turn'); Dino.sfx('pop', .45);
          if (p.at && !fits(p, ...p.at)) toTray(p);
        }
        refresh(true);
      };
      addEventListener('pointermove', move); addEventListener('pointerup', up); addEventListener('pointercancel', up);
    });
  }

  // ── 檢查：恐龍旁邊有信就開心；空地全塞滿＋恐龍都開心＝過關
  function refresh(check) {
    const envs = new Set(G.pieces.filter(p => p.at).map(p => key(p.at[0] + p.env[0], p.at[1] + p.env[1])));
    G.dinos.forEach(d => {
      const happy = DIRS.some(([dr, dc]) => envs.has(key(d.r + dr, d.c + dc)));
      if (happy && !d.happy && check) Dino.sfx('dino-chirp', .5);
      d.happy = happy; d.el.classList.toggle('is-happy', happy); d.el.classList.remove('is-sad');
      d.img.src = `assets/cast/${d.name}__${happy ? 'cheer' : 'hello'}.webp`;
    });
    if (!check) return;
    const full = occupied().size === G.board.size - G.dinoAt.size;
    if (!full) return;
    if (G.dinos.every(d => d.happy)) return win();
    G.dinos.filter(d => !d.happy).forEach(d => { void d.el.offsetWidth; d.el.classList.add('is-sad'); });
    Dino.sfx('wrong', .4);
  }

  function hint() {
    if (G.busy || !G.started) return;
    const p = G.pieces.find(q => !(q.at && q.rot === 0 && q.at[0] === q.sol[0] && q.at[1] === q.sol[1]));
    if (!p) return;
    G.hints++;
    while (p.rot) turn(p);
    drawPiece(p); p.at = null;
    const want = new Set(p.cells.map(([r, c]) => key(p.sol[0] + r, p.sol[1] + c)));
    G.pieces.forEach(q => { if (q !== p && q.at && q.cells.some(([r, c]) => want.has(key(q.at[0] + r, q.at[1] + c)))) toTray(q); });
    place(p, ...p.sol); Dino.sfx('stamp', .6); refresh(true);
  }

  function showBanner(text) {
    const b = document.createElement('div'); b.className = 'banner'; setKidText(b, text);
    yard.append(b); setTimeout(() => b.remove(), 1400);
  }
  function win() {
    G.busy = true;
    Dino.sfx('correct', .8); Dino.burst(board);
    setTimeout(() => {
      G.round++;
      if (G.round >= PLAN[level].length) return finish();
      setup(); const name = ROUND_NAMES[G.round];
      if (name) { showBanner(name); Dino.sfx('swoosh', .5); }
    }, 1500);
  }
  function finish() {
    const stars = G.hints === 0 ? 3 : G.hints <= 2 ? 2 : 1;
    $('finishStars').innerHTML = [0, 1, 2].map(i => `<span class="${i < stars ? '' : 'off'}">★</span>`).join('');
    $('finishActor').src = `assets/cast/${Dino.shuffle(CAST.slice())[0]}__cheer.webp`;
    $('finish').hidden = false; Dino.sfx('finish', .8); Dino.bgm.start();
  }
  function newGame() { G.round = 0; G.hints = 0; G.used.clear(); setup(); }

  // ── 開始畫面兼選單
  const picks = [...document.querySelectorAll('[data-level]')];
  const showPick = () => picks.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.level === level)));
  picks.forEach(b => {
    setKidText(b, b.textContent);
    b.addEventListener('click', () => { level = b.dataset.level; try { localStorage.setItem('dinopost-pack-level', level); } catch { /* ok */ } showPick(); });
  });
  showPick();
  setKidText($('title'), '包裹拼拼樂'); setKidText($('startLabel'), '點一下，開始拼包裹！');
  setKidText($('finishTitle'), '信都送到了！'); setKidText($('again'), '再玩一次'); setKidText($('home'), '回首頁');
  Dino.bgm.start(); Dino.menuTaps($('ready')); Dino.menuTaps($('finish'));

  const HW = Dino.howto({
    preview: `<div class="pv pv-pack" aria-hidden="true"><div class="g"><i></i><i></i><i style="visibility:hidden"></i><i></i><i></i><i></i></div><img class="d" src="assets/cast/iggy__hello.webp" alt=""><div class="p">${ENV}</div><span class="seal">OK</span></div>`,
    text: '塞滿空地，恐龍旁邊要有信', kid: setKidText
  });
  let howtoSeen = false;
  $('start').addEventListener('click', () => {
    $('ready').hidden = true; Dino.bgm.stop();
    const fresh = !G.started; G.started = true;
    if (fresh || $('ready').dataset.changed) newGame();
    if (!howtoSeen) { howtoSeen = true; HW.show(); }
  });
  picks.forEach(b => b.addEventListener('click', () => { $('ready').dataset.changed = '1'; }));
  $('menuBtn').addEventListener('click', () => { if (!G.started) return; Dino.sfx('tap', .5); delete $('ready').dataset.changed; $('ready').hidden = false; Dino.bgm.start(); });
  $('help').addEventListener('click', () => { Dino.sfx('tap', .5); HW.show(); });
  $('hint').addEventListener('click', hint);
  $('again').addEventListener('click', () => { $('finish').hidden = true; Dino.bgm.stop(); newGame(); });

  fetch('pack_levels.json').then(r => r.json()).then(d => { G.bank = d.levels; });
})();

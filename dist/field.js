/* 骰子花田 v2 sample（2026-11-12 導演「骰子版作看看」；同日「甲 124」）
   v2：①奶奶先示範一回合，換小孩時手指指著骰子（每局第一次）②擲完先從 3 塊花毯挑出「一條 a 朵、共 b 條」那一塊（挑錯只是那塊收走，不扣分）
     ③花毯長出來時：第一條一朵一朵長（第一顆骰子亮）→ 一條條疊（第二顆骰子亮）④轉方向鈕畫出轉完的形狀，點手上的花毯也能轉，正方形不顯示。
   依據：reference/multiplication_games_survey.yaml X04（youcubed How Close to 100）＋X01（兩顆骰子決定一組幾個、幾組）。
   玩法：和三角龍奶奶輪流。擲兩顆骰子（第一顆＝一條幾朵、第二顆＝幾條）→ 手上出現一塊花毯與算式「3×4=12」
     → 點花田決定擺哪裡（出現虛線預覽，可按藍色鈕轉方向，算式跟著變成 4×3=12）→ 再點一下預覽或綠色勾種下去。
     骰子只會擲出「還放得下」的組合；剩下的空位連 3 朵的花毯都放不下時，剩下的洞一次開滿小白花，結束。
   不計時、不比輸贏、沒有錯誤（放不下只是預覽搖一搖）。不唸數字。
   難度（導演 11-13「1 照作、A＋B」）：簡單 6×6 骰子 1–3；普通 10×10 骰子 1–5；困難 12×12 骰子 1–6，另加長條題（一顆 7–9、另一顆 1–3）。
   v8（導演 11-16「都做」，補遊戲性）：①第一次就答對＝金色花 +1；答錯的題目下一輪再出 ②種滿一整排／列 +2（預覽時先亮金框）
     ③奶奶不再必輸：她擲出的花毯種完不超過小孩（簡單）／最多領先 2 朵（普通），整排加分另計，困難不讓；輸贏靠金色花與整排 ④不出 ×1 的題；骰子偏向小塊（機率∝1／朵數）讓一局題數變多
     ⑤難度台階：簡單 8×8 骰 2–4 連加動畫；普通 10×10 骰 2–5 花毯＋連加算式直接顯示；困難 12×12 骰 2–6＋長條題（7–9 乘 2–3）只有算式。
   v9（導演 11-16「A」）：題目框的花毯輪流亮——一次亮一條（連加裡對應的數字一起亮），不顯示累計；簡單／普通一開始就亮，
     困難先只給算式，4 秒沒作答花毯才浮出來。看了提示再答對照樣給金色花（只看有沒有答錯）。
   v10（導演 11-16）：困難提示改等 3 秒；動畫改彈簧緩動（field.css --spring）；花圃與花做成 2.5D（花比格子高、往上蓋住後一排、
     地上有影子、花床有厚度）；種下去時花一朵朵彈出來、平常輕輕搖；點種好的花會彈一下。
   v7 擲完彈出題目框（取代「挑一樣的花毯」）：簡單＝花毯一條條長出來＋連加 3+3+3 → 3×3=? 選答案；普通＝花毯＋3×3=?，選錯才播連加；
     困難＝只有 3×3=?，選錯才出花毯與連加。選錯：那個答案收走，花毯重長一遍、每條尾巴標累計，再選。
   孩子種過的 (條數-一條幾朵) 記進百花田（與 garden.js 共用 dinopost-garden-field-v2）。測試：?lv=1|2|3 直接開始。 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const R = Dino.reduced;
  const wait = ms => new Promise(r => setTimeout(r, R ? Math.min(ms, 100) : ms));
  const pose = (who, use) => `assets/cast/${who}__${use}.webp`;
  const FIELD_KEY = 'dinopost-garden-field-v2';
  const COL = { 1: ['#ffffff', '#f2b945'], 2: ['#ff7b6b', '#ffd76a'], 3: ['#ffd23f', '#e9722e'], 4: ['#b98cf0', '#ffe27a'], 5: ['#ff9cc0', '#fff3a8'],
                6: ['#6fc3f2', '#fff3a8'], 7: ['#ff9a4d', '#fff3a8'], 8: ['#8fd97a', '#ffe27a'], 9: ['#f06a94', '#ffe27a'] };
  const flower = k => { const [p, c] = COL[k] || COL[1];
    return `<svg viewBox="0 0 40 40" aria-hidden="true"><ellipse cx="20" cy="37.6" rx="9.5" ry="2.4" fill="#2b1a0a" opacity=".28"/><path d="M20 38V22" stroke="#3f9950" stroke-width="3.4" stroke-linecap="round"/><path d="M21 37V23" stroke="#7fd08a" stroke-width="1" stroke-linecap="round" opacity=".7"/><path d="M20 31c-6 1-9-2-10-6 5 0 8 1 10 6Zm0-2c6 1 9-2 10-6-5 0-8 1-10 6Z" fill="#58b866"/>`
      + [0, 72, 144, 216, 288].map(a => `<g transform="rotate(${a} 20 15.5)"><ellipse cx="20" cy="8.6" rx="5.4" ry="6.6" fill="${p}" stroke="#00000026" stroke-width=".8"/><ellipse cx="19" cy="7.4" rx="2.6" ry="3.4" fill="#fff" opacity=".3"/></g>`).join('')
      + `<circle cx="20" cy="15.5" r="4.4" fill="${c}" stroke="#00000026" stroke-width=".8"/><circle cx="18.7" cy="14.2" r="1.5" fill="#fff" opacity=".45"/></svg>`; };
  const PIPS = { 1: [5], 2: [3, 7], 3: [3, 5, 7], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9], 7: [1, 3, 4, 5, 6, 7, 9], 8: [1, 2, 3, 4, 6, 7, 8, 9], 9: [1, 2, 3, 4, 5, 6, 7, 8, 9] };
  const die = (e, n) => { e.innerHTML = Array.from({ length: 9 }, (_, i) => PIPS[n].includes(i + 1) ? '<u></u>' : '<s></s>').join(''); e.dataset.n = n;
    const k = e.nextElementSibling; if (k) k.style.setProperty('--ks', n > 5 ? (5 / n).toFixed(3) : 1); if (k) k.innerHTML = e.id === 'dA' ? `<span>${'<b></b>'.repeat(n)}</span>` : '<s></s>'.repeat(n); };   // 骰子下的小圖跟著變：左＝一條 n 朵、右＝n 條

  const SETS = { easy: { n: 8, max: 4 }, normal: { n: 10, max: 5 }, hard: { n: 12, max: 6, long: 9 } }, LINE = 2;   // LINE＝種滿一整排／列的加分   // long＝長條題：一顆到 9、另一顆最多 3
  const table = {
    '骰子花田': ['ㄊㄡˊ', 'ㄗ˙', 'ㄏㄨㄚ', 'ㄊㄧㄢˊ'],
    '點一下，開始種花！': ['ㄉㄧㄢˇ', 'ㄧ', 'ㄒㄧㄚˋ', '', 'ㄎㄞ', 'ㄕˇ', 'ㄓㄨㄥˋ', 'ㄏㄨㄚ', ''],
    '花田種滿了！': ['ㄏㄨㄚ', 'ㄊㄧㄢˊ', 'ㄓㄨㄥˋ', 'ㄇㄢˇ', 'ㄌㄜ˙', ''],
    '再玩一次': ['ㄗㄞˋ', 'ㄨㄢˊ', 'ㄧ', 'ㄘˋ'], '回首頁': ['ㄏㄨㄟˊ', 'ㄕㄡˇ', 'ㄧㄝˋ'],
    '奶奶先種': ['ㄋㄞˇ', 'ㄋㄞ˙', 'ㄒㄧㄢ', 'ㄓㄨㄥˋ'], '點骰子': ['ㄉㄧㄢˇ', 'ㄊㄡˊ', 'ㄗ˙'],
    '一整排滿了！': ['ㄧ', 'ㄓㄥˇ', 'ㄆㄞˊ', 'ㄇㄢˇ', 'ㄌㄜ˙', ''], '一共幾朵花？': ['ㄧ', 'ㄍㄨㄥˋ', 'ㄐㄧˇ', 'ㄉㄨㄛˇ', 'ㄏㄨㄚ', ''], '再數數看': ['ㄗㄞˋ', 'ㄕㄨˇ', 'ㄕㄨˇ', 'ㄎㄢˋ'],
    '點花田，放哪裡？': ['ㄉㄧㄢˇ', 'ㄏㄨㄚ', 'ㄊㄧㄢˊ', '', 'ㄈㄤˋ', 'ㄋㄚˇ', 'ㄌㄧˇ', ''],
    '按勾勾，種下去': ['ㄢˋ', 'ㄍㄡ', 'ㄍㄡ', '', 'ㄓㄨㄥˋ', 'ㄒㄧㄚˋ', 'ㄑㄩˋ'],
    '放不下，轉一轉': ['ㄈㄤˋ', 'ㄅㄨˋ', 'ㄒㄧㄚˋ', '', 'ㄓㄨㄢˇ', 'ㄧ', 'ㄓㄨㄢˇ'],
    '比比看，誰的花多？': ['ㄅㄧˇ', 'ㄅㄧˇ', 'ㄎㄢˋ', '', 'ㄕㄟˊ', 'ㄉㄜ˙', 'ㄏㄨㄚ', 'ㄉㄨㄛ', ''],
    '你的花最多！': ['ㄋㄧˇ', 'ㄉㄜ˙', 'ㄏㄨㄚ', 'ㄗㄨㄟˋ', 'ㄉㄨㄛ', ''], '奶奶的花多一點': ['ㄋㄞˇ', 'ㄋㄞ˙', 'ㄉㄜ˙', 'ㄏㄨㄚ', 'ㄉㄨㄛ', 'ㄧ', 'ㄉㄧㄢˇ'], '一樣多！': ['ㄧ', 'ㄧㄤˋ', 'ㄉㄨㄛ', ''],
    '簡單': ['ㄐㄧㄢˇ', 'ㄉㄢ'], '普通': ['ㄆㄨˇ', 'ㄊㄨㄥ'], '困難': ['ㄎㄨㄣˋ', 'ㄋㄢˊ']
  };
  const kid = Dino.kidText(table);
  ['title', 'startLabel', 'finishTitle', 'again', 'home'].forEach(id => kid($(id), $(id).textContent.trim()));
  document.querySelectorAll('.pick button').forEach(b => kid(b, b.textContent.trim()));
  kid($('rule'), '比比看，誰的花多？');

  const q = new URLSearchParams(location.search);
  const LVS = ['easy', 'normal', 'hard'];
  let lv = LVS[(+q.get('lv') || 0) - 1] || (() => { try { return localStorage.getItem('dinopost-field-lv'); } catch { return null; } })() || 'easy';
  if (!SETS[lv]) lv = 'easy';
  const grid = $('grid'), tray = $('tray'), pieceEl = $('piece'), chip = $('chip'), dice = $('dice');
  const hand = $('hand'), qz = $('quiz'), qRug = $('quizRug'), qSum = $('quizSum'), qEq = $('quizEq'), qOpts = $('quizOpts');
  let N = 6, MAX = 3, LONG = 0, redo = null, lastKid = '', qWrong = false, rowDone = [], colDone = [], occ = [], turn = 'kid', phase = 'idle', token = 0, P = null, ghost = null, bloomedNow = [], firstKid = true, handAt = null;
  // P＝手上的花毯 { k: 一條幾朵（顏色）, w: 橫的幾朵, h: 幾條, x, y }

  const loadField = () => { try { const o = JSON.parse(localStorage.getItem(FIELD_KEY) || '{}'); return o && typeof o === 'object' && !Array.isArray(o) ? o : {}; } catch { return {}; } };
  const saveField = o => { try { localStorage.setItem(FIELD_KEY, JSON.stringify(o)); } catch { /* ok */ } };
  const grandma = (use, cls) => { $('grandma').src = pose('grandma', use); if (cls) Dino.replay($('grandma'), cls); };

  function fit() {
    const w = $('bedWrap').clientWidth, h = $('bedWrap').clientHeight; if (!w || !h) return;
    grid.style.setProperty('--c', Math.max(24, Math.min((w - 8) / (N + .4), (h - 12) / (N + .5), 110)).toFixed(1) + 'px');
  }
  addEventListener('resize', fit);
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(fit).observe($('bedWrap'));

  // ---------- 放得下嗎 ----------
  const free = (x, y, w, h) => { if (x < 0 || y < 0 || x + w > N || y + h > N) return false; for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (occ[j * N + i]) return false; return true; };
  const spots = (w, h) => { const out = []; for (let y = 0; y <= N - h; y++) for (let x = 0; x <= N - w; x++) if (free(x, y, w, h)) out.push([x, y]); return out; };
  const fitsAny = (a, b) => spots(a, b).length > 0 || spots(b, a).length > 0;
  const inSet = (a, b) => (a <= MAX && b <= MAX) || (LONG && Math.max(a, b) <= LONG && Math.min(a, b) <= 3);
  function rollable() { const out = [], top = Math.max(MAX, LONG); for (let a = 2; a <= top; a++) for (let b = 2; b <= top; b++) if (inSet(a, b) && fitsAny(a, b)) out.push([a, b]); return out; }
  const canGoOn = () => rollable().length > 0;
  // 整排／列：放下 (x,y,w,h) 之後會種滿、還沒算過分的排（[是不是橫排, 第幾排]）
  const fullIf = (row, k, x, y, w, h) => { for (let t = 0; t < N; t++) { const i = row ? t : k, j = row ? k : t; if (!occ[j * N + i] && !(i >= x && i < x + w && j >= y && j < y + h)) return false; } return true; };
  const linesIf = (x, y, w, h) => { const out = []; for (let j = y; j < y + h; j++) if (!rowDone[j] && fullIf(true, j, x, y, w, h)) out.push([true, j]); for (let i = x; i < x + w; i++) if (!colDone[i] && fullIf(false, i, x, y, w, h)) out.push([false, i]); return out; };
  function lineFx(row, k, cls) { const e = document.createElement('div'); e.className = 'ff-line ' + cls; e.style.setProperty('--x', row ? 0 : k); e.style.setProperty('--y', row ? k : 0); e.style.setProperty('--w', row ? N : 1); e.style.setProperty('--h', row ? 1 : N); grid.append(e); return e; }
  const clearPre = () => grid.querySelectorAll('.ff-line.is-pre').forEach(e => e.remove());

  // ---------- 畫面 ----------
  const strips = (k, w, h) => Array.from({ length: h }, (_, j) => `<div class="ff-strip">${Array.from({ length: w }, (_, i) => `<span style="--i:${i + j}">${flower(k)}</span>`).join('')}</div>`).join('');   // --i＝花彈出來的先後
  const eq = (w, h, n = h) => `${w}<i>×</i>${n}<i>=</i><b>${w * n}</b>`;
  function rotIcon() {   // 轉方向鈕：畫出「轉完以後」的形狀，正方形不用轉
    const b = $('rot'); if (!P || P.w === P.h) { b.classList.add('is-off'); return; } b.classList.remove('is-off');
    const w = P.h, h = P.w, u = 9 / Math.max(w, h), x0 = 12 - w * u / 2, y0 = 12 - h * u / 2; let r = '';
    for (let j = 0; j < h; j++) r += `<rect x="${x0.toFixed(2)}" y="${(y0 + j * u + u * .1).toFixed(2)}" width="${(w * u).toFixed(2)}" height="${(u * .8).toFixed(2)}" rx="${(u * .3).toFixed(2)}" fill="currentColor"/>`;
    b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 9.5a9.6 9.6 0 1 0 .6 4.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" opacity=".9"/><path d="M22.6 3.6v6.4h-6.4z" fill="currentColor"/>${r}</svg>`;
  }
  const pieceScale = () => pieceEl.style.setProperty('--ps', P ? Math.min(1, 5 / Math.max(P.w, P.h)).toFixed(3) : 1);   // 超過 5 朵寬的花毯縮小放進托盤
  function drawPiece() { pieceScale(); pieceEl.className = 'ff-piece' + (turn === 'gm' ? ' is-gm' : ''); pieceEl.innerHTML = P ? strips(P.k, P.w, P.h) : ''; chip.innerHTML = P ? eq(P.w, P.h) : ''; rotIcon(); }
  function point(el) {   // 手指提示：指著 el；null＝收起來
    handAt = el; hand.hidden = !el; if (!el) return;
    const s = $('stage').getBoundingClientRect(), r = el.getBoundingClientRect();
    hand.style.left = (r.left - s.left + r.width * .62) + 'px'; hand.style.top = (r.top - s.top + r.height * .62) + 'px';
  }
  addEventListener('resize', () => handAt && point(handAt));
  function block(x, y, cls) { const b = document.createElement('div'); b.className = 'ff-block ' + cls + (turn === 'gm' ? ' is-gm' : ''); b.style.setProperty('--x', x); b.style.setProperty('--y', y); Object.assign(b.dataset, { x, y, w: P.w, h: P.h }); b.innerHTML = strips(P.k, P.w, P.h); grid.append(b); return b; }
  // 比誰的花多（導演 11-13）：一條拔河條，左＝小孩（金）、右＝奶奶（紫），中線＝一半；不唸數字
  let sc = { kid: 0, gm: 0 };
  function drawScore() { for (const e of [$('score'), $('finishScore')]) {
    const tot = Math.max(N * N, sc.kid + sc.gm); e.querySelector('.ff-bk').style.width = (sc.kid / tot * 100) + '%'; e.querySelector('.ff-bg').style.width = (sc.gm / tot * 100) + '%';
    e.querySelector('.ff-nk').textContent = sc.kid; e.querySelector('.ff-ng').textContent = sc.gm; } }
  let tipNow = '';
  function tip(t) { if (t === tipNow) return; tipNow = t; const e = $('tip'); if (!t) { e.textContent = ''; return; } kid(e, t); Dino.replay(e, 'is-pop'); }   // 每一步的指引文字
  function guidePlace() {   // 擺花毯這一步：文字＋（每局第一次）手指
    if (!P) return; const here = spots(P.w, P.h);
    if (!here.length) { tip('放不下，轉一轉'); if (firstKid) point($('rot')); return; }
    if (P.x != null) { tip('按勾勾，種下去'); if (firstKid) point($('ok')); return; }
    tip('點花田，放哪裡？'); if (firstKid) { const [x, y] = here[Math.floor(here.length / 2)]; point(grid.children[(y + Math.floor((P.h - 1) / 2)) * N + x + Math.floor((P.w - 1) / 2)]); }
  }
  function clearGhost() { clearPre(); if (ghost) ghost.remove(); ghost = null; P && (P.x = P.y = null); }
  function hintRot() { $('rot').classList.toggle('is-ask', !!P && turn === 'kid' && !spots(P.w, P.h).length); }

  async function rollDice() {
    const my = token, all = rollable(), demo = turn === 'gm' && firstKid ? all.filter(([x, y]) => x >= 2 && y >= 2) : [], opts = demo.length ? demo : all;   // 示範那一回合擲出看得出「幾朵×幾條」的組合
    // 奶奶放水（11-16 改）：她的花毯種完不超過小孩（簡單）／最多領先 2 朵（普通），整排加分另計，困難不讓；小孩靠金色花與整排加分贏。沒有符合的就擲最小的
    let pool = opts;
    if (turn === 'gm' && lv !== 'hard') { const area = o => o[0] * o[1], cap = sc.kid - sc.gm + (lv === 'easy' ? 0 : 2), okay = opts.filter(o => area(o) <= cap);
      const min = Math.min(...opts.map(area)); pool = demo.length ? demo.filter(o => area(o) === Math.min(...demo.map(area))) : okay.length ? okay : opts.filter(o => area(o) === min); }
    let got = null; if (turn === 'kid' && redo) { if (fitsAny(redo[0], redo[1])) got = redo; redo = null; }   // 上一輪答錯的題再出一次
    if (!got) { if (turn === 'kid' && pool.length > 1) pool = pool.filter(o => o.join() !== lastKid);   // 不連出同一題
      const ws = pool.map(o => 1 / (o[0] * o[1])); let r = Math.random() * ws.reduce((x, y) => x + y, 0); got = pool[pool.length - 1]; for (let i = 0; i < pool.length; i++) { r -= ws[i]; if (r <= 0) { got = pool[i]; break; } } }   // 偏向小塊：機率∝1／朵數
    const [a, b] = got; if (turn === 'kid') lastKid = got.join();
    $('dA').classList.add('is-roll'); $('dB').classList.add('is-roll'); Dino.sfx('swoosh', .4);
    for (let i = 0; i < (R ? 2 : 8); i++) { die($('dA'), 1 + Math.floor(Math.random() * Math.max(MAX, LONG))); die($('dB'), 1 + Math.floor(Math.random() * MAX)); await wait(75); if (my !== token) return null; }
    $('dA').classList.remove('is-roll'); $('dB').classList.remove('is-roll'); die($('dA'), a); die($('dB'), b); Dino.replay($('dA'), 'is-land'); Dino.replay($('dB'), 'is-land'); Dino.sfx('pop', .6);
    return [a, b];
  }
  // 花毯長出來：第一條一朵一朵長（第一顆骰子亮）→ 一條一條疊（第二顆骰子亮），算式跟著跳 3×1=3、3×2=6…
  async function build(a, b) {
    const my = token, slow = turn === 'kid' ? 1 : .75;
    P = { k: a, w: a, h: b, x: null, y: null };
    if (!spots(a, b).length) { P.w = b; P.h = a; }   // 原方向放不下就先幫忙轉好（只影響起手方向）
    pieceScale(); pieceEl.className = 'ff-piece' + (turn === 'gm' ? ' is-gm' : ''); pieceEl.innerHTML = '<div class="ff-strip"></div>'; chip.innerHTML = ''; $('rot').classList.add('is-off');
    const first = pieceEl.firstChild; $('dA').classList.add('is-look');
    for (let i = 1; i <= a; i++) { first.insertAdjacentHTML('beforeend', `<span>${flower(a)}</span>`); Dino.sfx('pop', .35); await wait(200 * slow); if (my !== token) return false; }
    chip.innerHTML = eq(a, b, 1); await wait(260 * slow); if (my !== token) return false;
    $('dA').classList.remove('is-look'); $('dB').classList.add('is-look');
    for (let i = 2; i <= b; i++) { pieceEl.insertAdjacentHTML('beforeend', strips(a, a, 1)); chip.innerHTML = eq(a, b, i); Dino.sfx('pop', .35); await wait(280 * slow); if (my !== token) return false; }
    await wait(200); $('dB').classList.remove('is-look'); if (my !== token) return false;
    if (P.w !== a) { await wait(250); if (my !== token) return false; drawPiece(); Dino.replay(pieceEl, 'is-turn'); } else rotIcon();
    return true;
  }
  // 擲完彈出題目框：連加引導 → a×b=? → 3 個答案選一個（導演 11-13）
  const sumHtml = (a, n) => Array.from({ length: n }, () => `<b>${a}</b>`).join('<i>+</i>');
  async function addUp(a, b, my, count) {   // 花毯一條一條長出來，連加跟著變長；count＝每條尾巴標累計（選錯後帶著數）
    qRug.hidden = false; qSum.hidden = false; qRug.innerHTML = ''; qSum.innerHTML = ''; qRug.classList.toggle('is-count', !!count);
    for (let i = 1; i <= b; i++) {
      qRug.insertAdjacentHTML('beforeend', `<div class="ff-strip">${`<span>${flower(a)}</span>`.repeat(a)}${count ? `<em>${a * i}</em>` : ''}</div>`);
      qSum.innerHTML = sumHtml(a, i); Dino.sfx('pop', .35); await wait(b > 5 ? 380 : 520); if (my !== token) return false;
    }
    return true;
  }
  // 花毯輪流亮：一次亮一條＋連加裡對應的那個數字，亮完一輪停一下再來；不顯示累計（導演 11-16）
  let cueId = 0, quizId = 0;
  const nap = ms => new Promise(r => setTimeout(r, ms));
  function stopCue() { cueId++; qz.querySelectorAll('.is-lit').forEach(e => e.classList.remove('is-lit')); }
  async function startCue() {
    stopCue(); if (R) return; const id = cueId;
    for (let i = 0; id === cueId && !qz.hidden; i++) {
      const rows = [...qRug.children], terms = [...qSum.querySelectorAll('b')], n = rows.length; if (!n) return;
      const k = i % (n + 1);   // k === n＝全部熄掉停一拍
      rows.forEach((r, j) => r.classList.toggle('is-lit', j === k)); terms.forEach((t, j) => t.classList.toggle('is-lit', j === k));
      if (k < n) Dino.sfx('pop', .18);
      await nap(k === n ? 900 : n > 5 ? 480 : 650);
    }
  }
  async function quiz(a, b) {
    const my = token, ans = a * b, qid = ++quizId; phase = 'busy'; qWrong = false; stopCue();
    const cand = Dino.shuffle([...new Set([a * (b + 1), a * (b - 1), (a + 1) * b, (a - 1) * b, a + b, ans + 1, ans - 1, ans + 2])].filter(v => v > 0 && v !== ans)).slice(0, 2);
    const st = $('stage'), short = st.clientHeight < 430 && st.clientWidth > st.clientHeight * 1.15;   // 手機橫放：題目框左右排（花毯在左，用整個高度）
    qz.querySelector('.fq-card').style.setProperty('--q', (short ? Math.max(10, Math.min(46, st.clientWidth * .48 / (a + 3), st.clientHeight * .74 / b)) : Math.max(10, Math.min(54, ((st.clientWidth || innerWidth) * .86 - 70) / (a + 2.6), (st.clientHeight || innerHeight * .8) * .36 / b))).toFixed(1) + 'px');
    qz.dataset.a = a; qz.dataset.b = b; qRug.innerHTML = ''; qSum.innerHTML = ''; qEq.innerHTML = ''; qOpts.innerHTML = ''; qRug.classList.remove('is-count');
    kid($('quizAsk'), '一共幾朵花？'); qz.hidden = false;
    if (lv === 'easy') { if (!await addUp(a, b, my)) return; await wait(350); if (my !== token) return; }
    else if (lv === 'normal') { qRug.hidden = false; qRug.innerHTML = strips(a, a, b); qSum.hidden = false; qSum.innerHTML = sumHtml(a, b); }
    else { qRug.hidden = true; qSum.hidden = true; }
    qEq.innerHTML = `${a}<i>×</i>${b}<i>=</i><b>?</b>`; Dino.replay(qEq, 'is-pop'); await wait(300); if (my !== token) return;
    qOpts.innerHTML = [ans, ...cand].sort((x, y) => x - y).map(v => `<button class="fq-opt" type="button" data-v="${v}">${v}</button>`).join('');
    phase = 'quiz';
    if (lv !== 'hard') startCue();
    else setTimeout(() => {   // 困難：3 秒沒作答，花毯才浮出來
      if (qid !== quizId || my !== token || qz.hidden || phase !== 'quiz' || !qRug.hidden) return;
      qRug.classList.remove('is-count'); qRug.innerHTML = strips(a, a, b); qSum.innerHTML = sumHtml(a, b); qRug.hidden = false; qSum.hidden = false; Dino.sfx('pop', .4); startCue();
    }, 3000);
  }
  async function answered(btn) {
    if (phase !== 'quiz' || btn.disabled) return;
    const my = token, a = +qz.dataset.a, b = +qz.dataset.b;
    if (+btn.dataset.v !== a * b) {   // 選錯：那個答案收走，花毯重長一遍、每條尾巴標累計，再選
      phase = 'busy'; qWrong = true; redo = [a, b]; stopCue(); btn.disabled = true; btn.classList.add('is-out'); Dino.sfx('tap', .4); kid($('quizAsk'), '再數數看');
      if (!await addUp(a, b, my, true)) return; phase = 'quiz'; startCue(); return;
    }
    phase = 'busy'; stopCue(); btn.classList.add('is-right'); qOpts.querySelectorAll('.fq-opt').forEach(o => { if (o !== btn) o.classList.add('is-out'); o.disabled = true; });
    const gold = !qWrong; qEq.innerHTML = eq(a, b) + (gold ? '<u>★</u>' : ''); Dino.replay(qEq, 'is-pop'); Dino.sfx('correct', .4); grandma('wow', 'is-hop'); await wait(900); if (my !== token) return;
    qz.hidden = true; grandma('stand');
    P = { k: a, w: a, h: b, x: null, y: null, gold }; if (!spots(a, b).length) { P.w = b; P.h = a; }   // 原方向放不下就先幫忙轉好；gold＝第一次就答對
    drawPiece(); Dino.replay(pieceEl, 'is-turn'); phase = 'place'; tray.classList.remove('is-idle'); hintRot(); guidePlace();
  }

  function place(cx, cy) {   // 點花田：找「包含這一格」又放得下的位置，最接近以這格為中心的優先
    if (phase !== 'place' || turn !== 'kid') return;
    const { w, h } = P, ix = cx - Math.floor((w - 1) / 2), iy = cy - Math.floor((h - 1) / 2);
    let best = null, bd = 1e9;
    for (let y = cy - h + 1; y <= cy; y++) for (let x = cx - w + 1; x <= cx; x++) if (free(x, y, w, h)) { const d = Math.abs(x - ix) + Math.abs(y - iy); if (d < bd) { bd = d; best = [x, y]; } }
    clearPre(); if (ghost) ghost.remove(); ghost = null;
    if (!best) { P.x = P.y = null; const gx = Math.max(0, Math.min(N - w, ix)), gy = Math.max(0, Math.min(N - h, iy)); if (w <= N && h <= N) { const g = block(gx, gy, 'is-ghost is-bad'); setTimeout(() => g.remove(), 450); } Dino.sfx('tap', .3); hintRot(); guidePlace(); return; }
    [P.x, P.y] = best; ghost = block(P.x, P.y, 'is-ghost'); linesIf(P.x, P.y, w, h).forEach(([r, k]) => lineFx(r, k, 'is-pre')); Dino.sfx('tap', .5); $('ok').classList.add('is-ask'); guidePlace();
  }

  async function plant() {
    const my = token; phase = 'busy'; point(null); tip(''); if (turn === 'kid') firstKid = false; clearPre(); if (ghost) ghost.remove(); ghost = null; $('ok').classList.remove('is-ask'); $('rot').classList.remove('is-ask');
    const { x, y, w, h } = P, gold = turn === 'kid' && P.gold, ln = linesIf(x, y, w, h);
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) { occ[j * N + i] = 1; grid.children[j * N + i].classList.add('is-on'); }
    const b = block(x, y, 'is-in'); b.insertAdjacentHTML('beforeend', `<span class="ff-tag">${eq(w, h)}${gold ? '<u>★+1</u>' : ''}</span>`);
    Dino.replay(grid, 'is-thump');   // 種下去整塊花圃震一下
    if (gold) b.querySelector('.ff-strip span').classList.add('is-gold');   // 第一次就答對：一朵金色花，多 1 分
    ln.forEach(([r, k], i) => { if (r) rowDone[k] = 1; else colDone[k] = 1; const e = lineFx(r, k, 'is-done'); e.innerHTML = `<span class="ff-tag">+${LINE}</span>`; e.style.animationDelay = (i * .15) + 's'; setTimeout(() => e.remove(), 2200); });
    if (ln.length) { tip('一整排滿了！'); Dino.sfx('finish', .35); }
    sc[turn] += w * h + (gold ? 1 : 0) + ln.length * LINE; drawScore(); Dino.replay($('score').querySelector(turn === 'kid' ? '.ff-nk' : '.ff-ng'), 'is-pop');
    Dino.sfx('correct', .45); if (turn === 'kid') { Dino.burst(b); const f = loadField(), key = `${h}-${w}`; f[key] = (f[key] || 0) + 1; saveField(f); bloomedNow.push(key); }
    tray.classList.add('is-idle'); pieceEl.innerHTML = ''; P = null;
    await wait(turn === 'kid' ? 900 : 1100); if (my !== token) return;
    chip.innerHTML = '';
    if (!canGoOn()) return finale();
    turn === 'kid' ? gmTurn() : kidTurn();
  }

  function kidTurn() { turn = 'kid'; phase = 'roll'; dice.classList.remove('is-gm'); dice.classList.add('is-ask'); dice.disabled = false; grandma('stand'); tip('點骰子'); if (firstKid) point(dice); }
  async function kidRoll() {
    if (phase !== 'roll' || turn !== 'kid') return; phase = 'busy'; dice.classList.remove('is-ask'); dice.disabled = true; point(null); tip('');
    const r = await rollDice(); if (!r) return; await wait(250); quiz(r[0], r[1]);
  }
  async function gmTurn() {
    const my = token; turn = 'gm'; phase = 'busy'; dice.classList.add('is-gm'); dice.disabled = true; grandma('talk', 'is-nod'); tip('奶奶先種');
    await wait(500); if (my !== token) return;
    const r = await rollDice(); if (!r) return; await wait(350); if (my !== token) return;
    if (!await build(r[0], r[1])) return;
    await wait(500); if (my !== token) return;
    // 奶奶挑「貼著邊或別的花毯最多」的位置，花田比較容易種滿
    let best = null, bs = -1;
    for (const [w, h] of P.w === P.h ? [[P.w, P.h]] : [[P.w, P.h], [P.h, P.w]]) for (const [x, y] of spots(w, h)) {
      let s = Math.random() * .5; const full = (i, j) => i < 0 || j < 0 || i >= N || j >= N || occ[j * N + i];
      for (let i = x; i < x + w; i++) { if (full(i, y - 1)) s++; if (full(i, y + h)) s++; }
      for (let j = y; j < y + h; j++) { if (full(x - 1, j)) s++; if (full(x + w, j)) s++; }
      if (s > bs) { bs = s; best = [x, y, w, h]; }
    }
    if (best[2] !== P.w) { P.w = best[2]; P.h = best[3]; drawPiece(); Dino.replay(pieceEl, 'is-turn'); await wait(450); if (my !== token) return; }
    P.x = best[0]; P.y = best[1]; ghost = block(P.x, P.y, 'is-ghost'); ghost.style.pointerEvents = 'none';
    await wait(650); if (my !== token) return;
    grandma('wow', 'is-hop'); plant();
  }

  async function finale() {   // 剩下的小洞一次開滿
    const my = token; phase = 'end'; tip(''); point(null); dice.classList.remove('is-ask', 'is-gm'); grandma('wow', 'is-hop'); Dino.sfx('correct', .5);
    for (let i = 0; i < N * N; i++) if (!occ[i]) { const c = grid.children[i]; c.classList.add('is-on', 'is-end'); c.innerHTML = flower(1); Dino.sfx('pop', .3); await wait(90); if (my !== token) return; }
    Dino.burst(grid); await wait(1500); if (my !== token) return;
    const win = sc.kid > sc.gm ? 'kid' : sc.gm > sc.kid ? 'gm' : 'tie';
    kid($('finishTitle'), win === 'kid' ? '你的花最多！' : win === 'gm' ? '奶奶的花多一點' : '一樣多！'); $('finishScore').dataset.win = win; $('finishActor').src = pose('grandma', win === 'gm' ? 'talk' : 'wow');
    // 完成框放這一局種好的花田縮圖
    const m = grid.cloneNode(true); m.removeAttribute('id'); m.querySelectorAll('.ff-tag,.is-ghost,.ff-line').forEach(e => e.remove()); m.querySelectorAll('button').forEach(b => { b.disabled = true; b.tabIndex = -1; });
    m.style.setProperty('--c', (Math.min(300, innerWidth * .62, innerHeight * .34) / (N + .4)).toFixed(1) + 'px'); $('mini').replaceChildren(m);
    $('finish').hidden = false;   // 完成框不再放 9×9 百花田（導演 11-13：沒意義） Dino.sfx('finish', .6); Dino.replay($('finishActor'), 'is-hop'); Dino.bgm.start();
  }

  function start() {
    Dino.bgm.stop(); $('ready').hidden = true; $('finish').hidden = true; ++token;
    try { localStorage.setItem('dinopost-field-lv', lv); } catch { /* ok */ }
    ({ n: N, max: MAX } = SETS[lv]); LONG = SETS[lv].long || 0; redo = null; lastKid = ''; rowDone = []; colDone = []; occ = new Array(N * N).fill(0); P = null; ghost = null; bloomedNow = []; sc = { kid: 0, gm: 0 }; drawScore(); firstKid = true; point(null); tip('');
    qz.hidden = true; quizId++; stopCue(); ['dA', 'dB'].forEach(d => $(d).classList.remove('is-look', 'is-roll'));
    grid.style.setProperty('--n', N);
    let cells = ''; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) cells += `<button class="ff-cell" type="button" data-x="${x}" data-y="${y}" data-no-press aria-label="第 ${y + 1} 排第 ${x + 1} 格"></button>`;
    grid.innerHTML = cells; fit();
    die($('dA'), 1); die($('dB'), 1); drawPiece(); tray.classList.add('is-idle');
    gmTurn();   // 奶奶先示範一回合
  }

  // ---------- 事件 ----------
  dice.addEventListener('click', kidRoll);
  grid.addEventListener('click', e => {
    if (phase !== 'place' || turn !== 'kid') return;
    if (e.target.closest('.ff-block.is-ghost:not(.is-bad)') && P.x != null) return plant();
    const c = e.target.closest('.ff-cell'); if (c) place(+c.dataset.x, +c.dataset.y);
  });
  grid.addEventListener('click', e => {   // 點種好的花：那朵彈一下
    const c = e.target.closest('.ff-cell.is-on'); if (!c) return; const cx = +c.dataset.x, cy = +c.dataset.y; let f = c.querySelector('svg');
    if (!f) for (const b of grid.querySelectorAll('.ff-block.is-in')) { const { x, y, w, h } = b.dataset; if (cx >= +x && cx < +x + +w && cy >= +y && cy < +y + +h) { f = b.querySelectorAll('.ff-strip span')[(cy - y) * w + (cx - x)]; break; } }
    if (f) { Dino.replay(f, 'is-boing'); Dino.sfx('pop', .25); }
  });
  $('ok').addEventListener('click', () => { if (phase === 'place' && turn === 'kid' && P && P.x != null) plant(); else if (phase === 'place') { Dino.replay(grid, 'is-full'); Dino.sfx('tap', .3); } });
  const rotate = () => {
    if (phase !== 'place' || turn !== 'kid' || !P || P.w === P.h) return;
    clearGhost(); $('ok').classList.remove('is-ask'); [P.w, P.h] = [P.h, P.w]; drawPiece(); Dino.replay(pieceEl, 'is-turn'); Dino.replay(chip, 'is-pop'); Dino.sfx('swoosh', .4); hintRot(); guidePlace();
  };
  $('rot').addEventListener('click', rotate); pieceEl.addEventListener('click', rotate);
  qOpts.addEventListener('click', e => { const b = e.target.closest('.fq-opt'); if (b) answered(b); });
  function showLv() { document.querySelectorAll('.pick button').forEach(b => b.setAttribute('aria-pressed', b.dataset.lv === lv)); }
  document.querySelector('.pick').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; lv = b.dataset.lv; Dino.sfx('pop', .6); showLv(); });
  $('start').addEventListener('click', () => { Dino.sfx('tap', .6); start(); });
  $('again').addEventListener('click', () => { Dino.sfx('tap', .6); start(); });
  $('menuBtn').addEventListener('click', () => { Dino.sfx('tap', .5); token++; phase = 'idle'; point(null); qz.hidden = true; quizId++; stopCue(); showLv(); $('finish').hidden = true; $('ready').hidden = false; Dino.bgm.start(); });
  $('home').addEventListener('click', e => { e.preventDefault(); Dino.goTo('index.html'); });

  showLv(); Dino.bgm.start();
  if (q.get('lv')) start();
})();

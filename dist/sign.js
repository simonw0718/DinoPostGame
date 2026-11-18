// 伊奇看路牌（sample v2，2026-11-18，未掛首頁）：把路牌放到地上，伊奇一直往前走、踩到路牌就轉彎，把信送給小恐龍。
// 導演 2026-11-18：不照舊專案「排指令列再執行」；要互動感、非線性彈跳動畫 → 路牌直接放在世界裡，走的時候也能放／換。
// v2（導演 2026-11-18 試玩）：①迴轉鈕拿掉 ②看不懂怎麼控制 → 點草地就放路牌、點路牌轉方向、點伊奇轉方向，白色虛線先畫出會怎麼走，第一關手指示範
//   ③路牌不分方向（只算塊數，自己轉）④伊奇往上走背對、往下走正面
// v3（導演 2026-11-18）：路牌方向固定，只能放上去和拿下來（才有規劃）；點草地＝放架上選中的那塊，點放好的路牌＝拿回架上；伊奇四方向走路圖（Gemini 同一張圖切出）
// v4（導演 2026-11-18「照建議」）：①點伊奇轉方向拿掉 ②小水池（單格）走不過去＝滑一跤停在池前；踩到「跳」路牌才跳過一格（方向不變），大缺口／湖不能跳
//   ③每關一封必拿的信（*）：沒拿就走到小恐龍前＝小恐龍歪頭、伊奇問號，停在前一格，可再走回去拿；星星信（+）第 3 關起，只影響星星數
// 規則（同 tools/check_sign_levels.py）：站的那格有路牌就轉向（跳路牌不轉向）→ 往前一格；石頭＝撞到停在原地；沒有地＝掉進湖回起點；小水池不能放路牌。
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const setKidText = Dino.kidText({
    '伊奇看路牌': ['ㄧ', 'ㄑㄧˊ', 'ㄎㄢˋ', 'ㄌㄨˋ', 'ㄆㄞˊ'],
    '點一下，開始送信！': ['ㄉㄧㄢˇ', 'ㄧ', 'ㄒㄧㄚˋ', '', 'ㄎㄞ', 'ㄕˇ', 'ㄙㄨㄥˋ', 'ㄒㄧㄣˋ', ''],
    '點草地放路牌，再點一下拿回來': ['ㄉㄧㄢˇ', 'ㄘㄠˇ', 'ㄉㄧˋ', 'ㄈㄤˋ', 'ㄌㄨˋ', 'ㄆㄞˊ', '', 'ㄗㄞˋ', 'ㄉㄧㄢˇ', 'ㄧ', 'ㄒㄧㄚˋ', 'ㄋㄚˊ', 'ㄏㄨㄟˊ', 'ㄌㄞˊ'],
    '信都送到了！': ['ㄒㄧㄣˋ', 'ㄉㄡ', 'ㄙㄨㄥˋ', 'ㄉㄠˋ', 'ㄌㄜ˙', ''],
    '再玩一次': ['ㄗㄞˋ', 'ㄨㄢˊ', 'ㄧ', 'ㄘˋ'], '回首頁': ['ㄏㄨㄟˊ', 'ㄕㄡˇ', 'ㄧㄝˋ'], '知道了': ['ㄓ', 'ㄉㄠˋ', 'ㄌㄜ˙'],
    '第二關': ['ㄉㄧˋ', 'ㄦˋ', 'ㄍㄨㄢ'], '第三關': ['ㄉㄧˋ', 'ㄙㄢ', 'ㄍㄨㄢ'], '第四關': ['ㄉㄧˋ', 'ㄙˋ', 'ㄍㄨㄢ'], '第五關': ['ㄉㄧˋ', 'ㄨˇ', 'ㄍㄨㄢ'], '第六關': ['ㄉㄧˋ', 'ㄌㄧㄡˋ', 'ㄍㄨㄢ'], '最後一關': ['ㄗㄨㄟˋ', 'ㄏㄡˋ', 'ㄧ', 'ㄍㄨㄢ'],
    '放路牌': ['ㄈㄤˋ', 'ㄌㄨˋ', 'ㄆㄞˊ'], '排指令': ['ㄆㄞˊ', 'ㄓˇ', 'ㄌㄧㄥˋ'], '困難': ['ㄎㄨㄣˋ', 'ㄋㄢˊ'],
    '排好指令，伊奇照著走': ['ㄆㄞˊ', 'ㄏㄠˇ', 'ㄓˇ', 'ㄌㄧㄥˋ', '', 'ㄧ', 'ㄑㄧˊ', 'ㄓㄠˋ', 'ㄓㄜ˙', 'ㄗㄡˇ'],
    '放路牌，帶伊奇去送信': ['ㄈㄤˋ', 'ㄌㄨˋ', 'ㄆㄞˊ', '', 'ㄉㄞˋ', 'ㄧ', 'ㄑㄧˊ', 'ㄑㄩˋ', 'ㄙㄨㄥˋ', 'ㄒㄧㄣˋ']
  });
  const ROUND_NAMES = [null, '第二關', '最後一關'];
  const DIRS = { U: [-1, 0], D: [1, 0], L: [0, -1], R: [0, 1] }, ROT = { U: -90, D: 90, L: 180, R: 0 };
  const POSE = { U: 'dir_back', D: 'dir_front', L: 'dir_left', R: 'dir_right' };   // 四方向走路圖（導演 2026-11-18；experiments/iggy_dirs_20261118）
  const PALS = ['xiaokong', 'yuanyuan', 'painuo', 'shanshan', 'shuoshuo', 'xiaokai', 'tailuo'];
  const SPRING = 'cubic-bezier(.2,1.6,.4,1)';
  const key = (r, c) => `${r},${c}`;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  // 動畫等待加保險：頁面在背景時動畫不會跑完，時間到就往下走，遊戲不會卡住
  const play = (el, frames, opts) => Promise.race([el.animate(frames, opts).finished.catch(() => {}), wait(opts.duration + 120)]);
  const ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" d="M4 12h15M13 5.5l6.5 6.5-6.5 6.5"/></svg>';
  const ENV = '<svg viewBox="0 0 44 32" aria-hidden="true"><rect x="1" y="2" width="42" height="28" rx="3.5" fill="#fffdf2" stroke="#c9b48a" stroke-width="1.4"/><path d="M2 4l20 14 20-14" fill="#f3e7c8" stroke="#c9b48a" stroke-width="1.4" stroke-linejoin="round"/><rect x="31" y="19" width="8" height="8" rx="1" fill="#e0473a"/></svg>';
  const JUMP = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" d="M3.5 18C5 5 17 4 20 16M20 16l-5.5-2.2M20 16l1.6-5.6"/></svg>';
  const STAR = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 3l5 11.2 12.2 1.3-9.1 8.2 2.6 12L20 29.6 9.3 35.7l2.6-12-9.1-8.2L15 14.2z" fill="#ffd23e" stroke="#c98a12" stroke-width="2.2" stroke-linejoin="round"/><path d="M14 17.5l4-.6 2-4.4" fill="none" stroke="#fff6c9" stroke-width="2" stroke-linecap="round"/></svg>';
  const ROCK = '<svg viewBox="0 0 60 48" aria-hidden="true"><path d="M6 44C1 32 8 14 22 7c12-6 27 0 32 14 4 10 2 18-2 23z" fill="#a9a393"/><path d="M14 40c-3-9 2-21 12-26 8-4 17-1 21 6" fill="none" stroke="#d2cdbf" stroke-width="4" stroke-linecap="round"/><path d="M6 44h46" stroke="#7d7868" stroke-width="4" stroke-linecap="round"/></svg>';

  const board = $('board'), tray = $('tray'), lake = $('lake'), drag = $('drag'), goBtn = $('go');
  const G = { mode: 'sign', prog: [], pc: -1, stages: null, last: [], bank: null, round: 0, lv: null, grid: [], start: null, goal: null, pos: null, dir: 'R', signs: new Map(), walking: false, busy: false, run: 0, got: 0, total: 0, started: false, pal: null, letters: new Map(), tiles: new Map(), route: null, end: '', rev: 0 };
  let CS = 80, ig = null, igImg = null;

  const at = (r, c) => (G.grid[r] && G.grid[r][c]) || '_';
  const canSign = (r, c) => '.*+S'.includes(at(r, c)) && !G.signs.has(key(r, c));
  const put = (el, r, c) => { el.style.setProperty('--r', r); el.style.setProperty('--c', c); };
  const again = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };

  function measure() {
    if (!G.lv) return;
    const rows = G.grid.length, cols = G.grid[0].length;
    CS = Math.max(40, Math.floor(Math.min((lake.clientWidth - 28) / cols, (lake.clientHeight - 70) / (rows + .6), 124)));
    document.documentElement.style.setProperty('--cs', `${CS}px`);
  }
  addEventListener('resize', measure);

  // ── 出題
  function setup() {
    G.run++; G.walking = false; G.busy = false;
    const lv = G.lv = G.bank[G.round];
    G.grid = lv.rows.map(r => [...r]); G.signs.clear(); G.letters.clear(); G.tiles.clear();
    const rows = G.grid.length, cols = G.grid[0].length;
    board.style.setProperty('--rows', rows); board.style.setProperty('--cols', cols);
    board.innerHTML = `<svg class="route" viewBox="0 0 ${cols} ${rows}" aria-hidden="true"><path class="rt"/><circle class="re" r=".2"/></svg>`;
    G.route = board.firstChild; tray.innerHTML = ''; $('mail').innerHTML = '';
    G.grid.forEach((row, r) => row.forEach((ch, c) => {
      if (ch === '_') return;
      const t = document.createElement('span'); t.className = `tile${(r + c) % 2 ? ' alt' : ''}${ch === '~' ? ' puddle' : ''}`; t.dataset.k = key(r, c); put(t, r, c);
      if (ch === '~') t.innerHTML = '<i></i>';
      board.append(t); G.tiles.set(key(r, c), t);
      if (ch === 'S') G.start = [r, c];
      if ('#*+H'.includes(ch)) {
        const th = document.createElement('div'); put(th, r, c);
        if (ch === '#') { th.className = 'thing rock'; th.innerHTML = ROCK; th.firstChild.addEventListener('click', () => bonkRock(th)); }
        if (ch === '*' || ch === '+') {   // * 必拿的信；+ 星星信（可不拿）
          th.className = `thing letter${ch === '+' ? ' bonus' : ''}`; th.innerHTML = ch === '+' ? STAR : ENV; G.letters.set(key(r, c), th);   // 導演 2026-11-18：星星信直接畫成星星（信＝一定要送、星星＝加分）
          $('mail').insertAdjacentHTML(ch === '+' ? 'beforeend' : 'afterbegin', ch === '+' ? STAR : ENV); th._hud = ch === '+' ? $('mail').lastChild : $('mail').firstChild;
          if (ch === '+') { th._hud.classList.add('bonus'); G.total++; }
        }
        if (ch === 'H') {
          const who = PALS[Math.floor(Math.random() * PALS.length)];
          th.className = 'thing pal'; th.innerHTML = `<img alt="" src="assets/cast/${who}__front.webp"><span class="q">${ENV}</span>`;
          th.firstChild.addEventListener('click', () => { again(th, 'is-hop'); Dino.sfx('dino-chirp', .5); });
          G.pal = { el: th, who }; G.goal = [r, c];
        }
        board.append(th);
      }
    }));
    ig = document.createElement('div'); ig.className = 'ig is-idle';
    ig.innerHTML = `<span class="sh"></span><img alt="" src="assets/cast/iggy__dir_right.webp"><span class="aim">${ARROW}</span><span class="ask">?</span><svg class="dizzy" viewBox="0 0 40 16" aria-hidden="true"><path fill="currentColor" d="M6 2l1.6 3.6L11 6 8.4 8.4 9 12 6 10.2 3 12l.6-3.6L1 6l3.4-.4zM30 4l1.6 3.6L35 8l-2.6 2.4.6 3.6-3-1.8-3 1.8.6-3.6L25 8l3.4-.4z"/></svg>`;
    igImg = ig.querySelector('img'); igImg.addEventListener('click', tapIggy);
    board.append(ig); spawn(false);
    G.prog = []; G.pc = -1; tray.classList.toggle('is-code', G.mode !== 'sign'); tray.classList.remove('is-empty'); G.sel = null;
    if (G.mode !== 'sign') {   // 指令模式：上面一排＝排好的指令（點一下拿掉），下面＝可以用的指令（點一下加到最後）
      const cmds = ['U', 'D', 'L', 'R', ...(G.grid.some(r => r.includes('~')) ? ['J'] : [])];
      tray.innerHTML = `<div class="prog" id="prog" aria-label="排好的指令"></div><div class="cmds" aria-label="指令">${cmds.map(d => card(d)).join('')}</div>`;
    } else lv.signs.forEach(d => tray.append(newSign(d)));
    $('rounds').innerHTML = G.bank.map((_, i) => `<li class="${i < G.round ? 'is-done' : i === G.round ? 'is-now' : ''}"></li>`).join('');
    measure(); sync();
  }
  function face(d) { G.dir = d; ig.style.setProperty('--rot', `${ROT[d]}deg`); const src = `assets/cast/iggy__${POSE[d]}.webp`; if (!igImg.src.endsWith(src)) igImg.src = src; }
  function spawn(pop = true) {
    G.pos = G.start.slice(); put(ig, ...G.pos); face(G.lv.dir);
    ig.classList.add('is-idle'); ig.classList.remove('is-dizzy'); ig.style.zIndex = '';
    if (pop) ig.animate([{ transform: 'translateY(-60%) scale(.3)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 480, easing: SPRING });
  }

  // ── 預覽虛線：照現在的路牌，伊奇會怎麼走（走到哪裡停）
  const needKeys = () => [...G.letters].filter(([, l]) => !l.classList.contains('bonus') && !l.classList.contains('is-got')).map(([k]) => k);
  // 下一步會怎樣（預覽與走路共用）：k＝move／goal／rock／fall／slip（水池前滑倒）／need（信還沒拿）；over＝跳過的那格
  function next(r, c, d, hasAll, cmd) {   // cmd＝指令模式這一步的指令（U/D/L/R 往那邊走一格、J 往前跳）；沒給＝看腳下的路牌
    const s = cmd === undefined ? G.signs.get(key(r, c)) : null, sd = cmd !== undefined ? cmd : s && s.dataset.d, jump = sd === 'J'; if (sd && !jump) d = sd;
    const [dr, dc] = DIRS[d]; let nr = r + dr, nc = c + dc, ch = at(nr, nc), over = null;
    if (ch === '~') {
      const lch = at(nr + dr, nc + dc);
      if (!jump || '#~'.includes(lch)) return { k: 'slip', d, r: nr, c: nc };
      over = [nr, nc]; nr += dr; nc += dc; ch = lch;
    }
    if (ch === '#') return { k: 'rock', d, r: nr, c: nc };
    if (ch === '_') return { k: 'fall', d, r: nr, c: nc, over };
    if (ch === 'H' && !hasAll) return { k: 'need', d, r: nr, c: nc };
    return { k: ch === 'H' ? 'goal' : 'move', d, r: nr, c: nc, over };
  }
  function trace() {
    const code = G.mode !== 'sign';   // 指令模式：永遠從起點、照指令一步一步；指令用完還沒到＝more
    let [r, c] = code ? G.start : G.pos, d = code ? G.lv.dir : G.dir; const pts = [[r, c]], seen = new Set(), need = new Set(code ? [...G.letters].filter(([, l]) => !l.classList.contains('bonus')).map(([k]) => k) : needKeys());
    for (let i = 0; i < 60; i++) {
      if (code && i >= G.prog.length) return { pts, end: i ? 'more' : 'idle' };
      const st = next(r, c, d, !need.size, code ? G.prog[i] : undefined); d = st.d;
      const k = `${r},${c},${d},${need.size}`; if (!code && seen.has(k)) return { pts, end: 'loop' }; seen.add(k);
      const [dr, dc] = DIRS[d];
      if (st.k === 'rock') return { pts, end: 'rock' };
      if (st.k === 'slip' || st.k === 'need') { pts.push([r + dr * .45, c + dc * .45]); return { pts, end: st.k }; }
      if (st.k === 'fall') { pts.push([st.r - dr * .38, st.c - dc * .38, !!st.over]); return { pts, end: 'fall' }; }
      r = st.r; c = st.c; pts.push([r, c, !!st.over]); need.delete(key(r, c));
      if (st.k === 'goal') return { pts, end: 'goal' };
    }
    return { pts, end: 'loop' };
  }
  function sync() {
    goBtn.classList.toggle('is-on', G.walking);
    $('back').classList.toggle('is-off', !G.walking && key(...G.pos) === key(...G.start) && G.dir === G.lv.dir);
    const { pts, end } = trace(); G.end = end;
    goBtn.classList.toggle('is-nudge', !G.walking && !G.busy && end === 'goal' && G.mode !== 'hard');
    G.route.querySelector('.rt').setAttribute('d', pts.map(([r, c, arc], i) => {   // 跳的那一段畫成弧線（橫的往上拱、直的往旁邊拱）
      if (!arc) return `${i ? 'L' : 'M'}${c + .5} ${r + .5}`;
      const [pr, pc] = pts[i - 1], flat = pr === r;
      return `Q${(pc + c) / 2 + .5 + (flat ? 0 : .6)} ${(pr + r) / 2 + .5 - (flat ? .9 : 0)} ${c + .5} ${r + .5}`;
    }).join(''));
    const last = pts[pts.length - 1], re = G.route.querySelector('.re');
    re.setAttribute('cx', last[1] + .5); re.setAttribute('cy', last[0] + .5);
    G.route.dataset.end = end; G.route.classList.toggle('is-off', G.busy || G.mode === 'hard');   // 困難＝排指令但沒有預覽虛線（導演 2026-11-18）
    if (G.mode !== 'sign') return;
    tray.classList.toggle('is-empty', !tray.children.length);
    if (!G.sel || G.sel.parentNode !== tray) G.sel = tray.firstElementChild;   // 架上永遠有一塊「選中的」，點草地就放它
    [...tray.children].forEach(x => x.classList.toggle('is-sel', x === G.sel));
  }

  // ── 小互動：點哪裡都有反應
  function bonkRock(el) { again(el, 'is-bonk'); Dino.sfx('stamp', .35); }
  function press(k) { const t = G.tiles.get(k); if (t) again(t, 'is-press'); }
  function splash(r, c) {
    const s = document.createElement('div'); s.className = 'splash'; put(s, r, c);
    s.innerHTML = Array.from({ length: 9 }, (_, i) => { const a = Math.PI * (1.1 + .8 * i / 8), d = CS * (.5 + Math.random() * .4); return `<i style="--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px"></i>`; }).join('');
    board.append(s); setTimeout(() => s.remove(), 700);
  }
  // 點草地＝放一塊路牌（架上還有的話）
  board.addEventListener('click', ev => {
    const t = ev.target.closest('.tile'); if (!t || G.busy) return;
    const [r, c] = t.dataset.k.split(',').map(Number);
    press(t.dataset.k);
    if (at(r, c) === '~') { splash(r, c); Dino.sfx('pop', .25); return; }
    if (G.mode !== 'sign' || !canSign(r, c)) return;
    const s = G.sel && G.sel.parentNode === tray ? G.sel : tray.firstElementChild;
    if (!s) { again(tray, 'is-shake'); Dino.sfx('wrong', .25); return; }
    s.classList.remove('is-sel'); G.sel = null; placeSign(s, r, c); sync();
  });
  // ── 路牌：方向固定。點架上的＝選它；點草地＝放下去；點放好的＝拿回架上；也可以用拖的
  function newSign(d) { const s = document.createElement('div'); s.className = 'sign'; s.dataset.d = d; s.style.setProperty('--rot', `${ROT[d] || 0}deg`); s.innerHTML = `<b>${d === 'J' ? JUMP : ARROW}</b>`; bindSign(s); return s; }
  function placeSign(s, r, c) {
    if (s.dataset.k) G.signs.delete(s.dataset.k);
    G.rev++; s.dataset.k = key(r, c); G.signs.set(key(r, c), s); put(s, r, c); s.style.transform = '';
    board.append(s); press(key(r, c)); Dino.sfx('stamp', .55);
  }
  function toTray(s) {
    if (s.dataset.k) G.signs.delete(s.dataset.k);
    G.rev++; delete s.dataset.k; s.style.removeProperty('--r'); s.style.removeProperty('--c'); s.style.transform = ''; tray.append(s);
  }
  function bindSign(s) {
    s.addEventListener('pointerdown', ev => {
      if (G.busy || ev.button > 0) return;
      ev.preventDefault();
      const x0 = ev.clientX, y0 = ev.clientY, id = ev.pointerId;
      let moving = false, hot = null;
      const target = e => {
        const b = board.getBoundingClientRect(), r = Math.floor((e.clientY - b.top) / CS), c = Math.floor((e.clientX - b.left) / CS);
        return canSign(r, c) ? [r, c] : null;
      };
      const mark = t => { board.querySelectorAll('.is-hot').forEach(el => el.classList.remove('is-hot')); if (t) G.tiles.get(key(...t))?.classList.add('is-hot'); };
      const move = e => {
        if (e.pointerId !== id) return;
        if (!moving) {
          if (Math.hypot(e.clientX - x0, e.clientY - y0) < 8) return;
          moving = true; if (s.dataset.k) { G.signs.delete(s.dataset.k); delete s.dataset.k; G.rev++; }
          drag.append(s); Dino.sfx('tap', .4); sync();
        }
        s.style.transform = `translate(${e.clientX}px,${e.clientY}px)`; hot = target(e); mark(hot);
      };
      const up = e => {
        if (e.pointerId !== id) return;
        removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up);
        mark(null);
        if (moving) { if (hot) { s.classList.remove('is-sel'); if (G.sel === s) G.sel = null; placeSign(s, ...hot); } else { toTray(s); Dino.sfx('swoosh', .4); } }
        else if (s.dataset.k) { toTray(s); G.sel = s; Dino.sfx('swoosh', .4); }   // 點放好的：拿回架上
        else { G.sel = s; again(s, 'is-hit'); Dino.sfx('tap', .5); }               // 點架上的：選它
        sync();
      };
      addEventListener('pointermove', move); addEventListener('pointerup', up); addEventListener('pointercancel', up);
    });
  }
  // 點伊奇：只有走路中有用＝停下來（站著時他的圖不擋點擊，才點得到腳下和頭上那格，見 sign.css .ig.is-idle img）（導演 2026-11-18：點他轉方向拿掉，方向只靠路牌）
  function tapIggy() {
    if (G.busy || !G.started) return;
    if (G.walking) { G.walking = false; sync(); }
  }

  // ── 走路：一格一跳（起跳快、落地壓扁回彈）
  async function hopTo(r, c, big) {
    const [r0, c0] = G.pos, dx = (c - c0) * CS, dy = (r - r0) * CS;
    if (r < r0) ig.style.zIndex = r0 * 4 + 3;   // 往後排走：跳的途中還在前排上面
    put(ig, r, c); G.pos = [r, c];
    Dino.sfx(big ? 'swoosh' : 'step', big ? .5 : .35);
    const lift = CS * (big ? .95 : .42);
    await play(ig, [
      { transform: `translate(${-dx}px,${-dy}px)`, easing: 'cubic-bezier(.3,0,.5,1)' },
      { transform: `translate(${-dx * .45}px,${-dy * .45 - lift}px)`, offset: .5, easing: 'cubic-bezier(.5,0,.8,.6)' },
      { transform: 'none' }], { duration: big ? 640 : 400 });
    ig.style.zIndex = '';
    igImg.animate([{ transform: 'scale(1.18,.8)' }, { transform: 'scale(.94,1.08)', offset: .5 }, { transform: 'none' }], { duration: 240, easing: 'ease-out' });
    press(key(r, c));
  }
  async function walk() {
    const run = ++G.run; G.walking = true; ig.classList.remove('is-idle', 'is-dizzy'); sync();
    let steps = 0; const seen = new Set();   // 繞圈圈：同一格、同方向、路牌沒變又走回來＝轉暈停下（導演 2026-11-18 遇到無限繞圈）
    while (G.walking && run === G.run) {
      const s = G.signs.get(key(...G.pos));
      if (s) { const d = s.dataset.d; if (d !== 'J' && d !== G.dir) { face(d); Dino.sfx('pop', .5); } again(s, 'is-hit'); await wait(160); if (run !== G.run) return; }
      const st = next(...G.pos, G.dir, !needKeys().length), [dr, dc] = DIRS[st.d], { r, c } = st;
      const lap = `${G.pos},${st.d},${needKeys().length},${G.rev}`; if (seen.has(lap)) { if (st.d !== G.dir) face(st.d); return tired(); } seen.add(lap);
      if (st.d !== G.dir) face(st.d);
      if (st.k === 'fall') return fall(r, c, run, st.over ? 2 : 1);
      if (st.k === 'rock') return bonk(r, c, dr, dc);
      if (st.k === 'slip') return slip(r, c, dr, dc);
      if (st.k === 'need') return ask();
      await hopTo(r, c, !!st.over); if (run !== G.run) return;
      sync();
      const letter = G.letters.get(key(r, c));
      if (letter && !letter.classList.contains('is-got')) {
        letter.classList.add('is-got'); letter._hud.classList.add('on'); Dino.sfx('correct', .45);
        if (letter.classList.contains('bonus')) G.got++;
        sync();
      }
      if (st.k === 'goal') return win();
      if (++steps > 60) return tired();
      await wait(90);
    }
    if (run === G.run) rest();
  }
  function rest() { G.walking = false; ig.classList.add('is-idle'); sync(); }
  function tired() { ig.classList.add('is-dizzy'); Dino.sfx('wrong', .3); rest(); setTimeout(() => ig.classList.remove('is-dizzy'), 1600); }
  async function bonk(r, c, dr, dc) {
    G.walking = false; G.busy = true; sync();
    const rock = [...board.querySelectorAll('.rock')].find(el => el.style.getPropertyValue('--r') == r && el.style.getPropertyValue('--c') == c);
    await play(ig, [{ transform: 'none', easing: 'cubic-bezier(.4,0,1,1)' }, { transform: `translate(${dc * CS * .42}px,${dr * CS * .42}px) scale(1.08,.9)`, offset: .3, easing: SPRING }, { transform: 'none' }], { duration: 520 });
    if (rock) bonkRock(rock);
    ig.classList.add('is-dizzy'); G.busy = false; rest();
    setTimeout(() => ig.classList.remove('is-dizzy'), 1100);
  }
  // 小水池前滑一跤：往前滑半步、濺水、退回原地（不回起點）
  async function slip(r, c, dr, dc) {
    G.walking = false; G.busy = true; sync();
    Dino.sfx('swoosh', .4);
    await play(ig, [{ transform: 'none', easing: 'cubic-bezier(.4,0,1,1)' }, { transform: `translate(${dc * CS * .5}px,${dr * CS * .5}px) rotate(${dc ? dc * -22 : 16}deg)`, offset: .35, easing: SPRING }, { transform: 'none' }], { duration: 640 });
    splash(r, c); Dino.sfx('pop', .5);
    ig.classList.add('is-dizzy'); G.busy = false; rest();
    setTimeout(() => ig.classList.remove('is-dizzy'), 1100);
  }
  // 信還沒拿就走到小恐龍前：小恐龍歪頭、伊奇冒問號，那封信跳一下提醒；停在原地可以再走回去拿
  async function ask() {
    G.walking = false; G.busy = true; sync();
    const p = G.pal; again(p.el, 'is-ask'); ig.classList.add('is-ask');
    needKeys().forEach(k => again(G.letters.get(k), 'is-call'));
    Dino.sfx('wrong', .3); Dino.sfx('dino-chirp', .35);
    await play(igImg, [{ transform: 'none' }, { transform: 'rotate(-7deg)', offset: .25 }, { transform: 'rotate(6deg)', offset: .5 }, { transform: 'rotate(-5deg)', offset: .75 }, { transform: 'none' }], { duration: 900 });
    await wait(300);
    ig.classList.remove('is-ask'); G.busy = false; rest();
  }
  async function fall(r, c, run, n = 1) {
    G.walking = false; G.busy = true; sync();
    const [dr, dc] = DIRS[G.dir].map(v => v * n);
    Dino.sfx('swoosh', .5);
    await play(ig, [{ transform: 'none', easing: 'cubic-bezier(.3,0,.5,1)' }, { transform: `translate(${dc * CS * .8}px,${dr * CS * .8 - CS * .4}px) rotate(${dc * 20 || 14}deg)`, offset: .45, easing: 'cubic-bezier(.6,0,1,.7)' }, { transform: `translate(${dc * CS}px,${dr * CS + CS * .5}px) scale(.4)`, opacity: 0 }], { duration: 620, fill: 'forwards' });
    splash(r, c); Dino.sfx('pop', .6);
    await wait(450); if (run !== G.run) return;
    ig.getAnimations().forEach(a => a.cancel()); spawn(); G.busy = false; sync();
  }
  function win() {
    G.walking = false; G.busy = true; G.run++; sync();
    igImg.src = 'assets/cast/iggy__cheer.webp'; ig.classList.add('is-idle');
    const p = G.pal; p.el.classList.add('is-happy'); p.el.firstChild.src = `assets/cast/${p.who}__front_cheer.webp`; again(p.el, 'is-hop');
    Dino.sfx('correct', .8); Dino.sfx('dino-chirp', .5); Dino.burst(board);
    if (G.lv.teach && G.mode === 'sign') { try { localStorage.setItem(`dino-sign-taught-${G.lv.stage}`, '1'); } catch { /* ok */ } }
    setTimeout(() => {
      G.round++;
      if (G.round >= G.bank.length) return finish();
      setup(); const name = ROUND_NAMES[G.round];
      if (name) { const b = document.createElement('div'); b.className = 'banner'; setKidText(b, name); lake.append(b); setTimeout(() => b.remove(), 1000); Dino.sfx('swoosh', .5); }
    }, 1700);
  }
  function finish() {
    const stars = G.got >= G.total ? 3 : G.got ? 2 : 1;   // 星星信全拿＝3、有拿＝2、沒拿＝1
    $('finishStars').innerHTML = [0, 1, 2].map(i => `<span class="${i < stars ? '' : 'off'}">${Dino.icon('star')}</span>`).join('');
    $('finishActor').src = 'assets/cast/iggy__cheer.webp';
    $('finish').hidden = false; Dino.sfx('finish', .8); Dino.bgm.start();
  }
  // ── 指令模式（導演 2026-11-18「機器人 programming 模式」，設定鈕切換）：先把指令排成一排，按 Go 伊奇從起點照著一步一步走。
  //   箭頭＝往那邊走一格；跳＝照現在面對的方向往前（前面是小水池就跳過去）。走到哪一張，那張就亮起來；撞到／掉下去／指令用完還沒到＝回起點再改
  const MAXP = 16;
  const card = (d, i, cls = '') => `<button type="button" class="sign${cls}" data-d="${d}"${i === undefined ? '' : ` data-i="${i}"`} style="--rot:${ROT[d] || 0}deg" aria-label="${{ U: '往上', D: '往下', L: '往左', R: '往右', J: '跳' }[d]}"><b>${d === 'J' ? JUMP : ARROW}</b></button>`;
  function drawProg(fresh) {
    const el = $('prog'); if (!el) return;
    el.innerHTML = G.prog.map((d, i) => card(d, i, i === G.pc ? ' is-now' : G.pc >= 0 && i < G.pc ? ' is-done' : i === fresh ? ' is-new' : '')).join('');
  }
  tray.addEventListener('click', ev => {
    if (G.mode === 'sign' || G.busy || G.walking) return;
    const b = ev.target.closest('.sign'); if (!b) return;
    if (b.dataset.i !== undefined) { G.prog.splice(+b.dataset.i, 1); Dino.sfx('swoosh', .4); G.pc = -1; drawProg(); }
    else if (G.prog.length >= MAXP) { again(tray, 'is-shake'); Dino.sfx('wrong', .25); return; }
    else { G.prog.push(b.dataset.d); Dino.sfx('stamp', .5); G.pc = -1; drawProg(G.prog.length - 1); }
    sync();
  });
  function resetLetters() { G.letters.forEach(l => { if (!l.classList.contains('is-got')) return; l.classList.remove('is-got'); l._hud.classList.remove('on'); if (l.classList.contains('bonus')) G.got--; }); }
  async function codeBack(run, clear = true) { await wait(900); if (run !== G.run) return; G.pc = -1; if (clear) G.prog = []; drawProg(); spawn(); sync(); }   // 失敗＝指令清空重排（導演 2026-11-18）；自己按停不清
  async function runProg() {
    if (!G.prog.length) { again(tray, 'is-shake'); Dino.sfx('wrong', .25); return; }
    const run = ++G.run; resetLetters(); spawn(false); G.walking = true; ig.classList.remove('is-idle', 'is-dizzy'); sync();
    for (let i = 0; i < G.prog.length && G.walking && run === G.run; i++) {
      G.pc = i; drawProg();
      const st = next(...G.pos, G.dir, !needKeys().length, G.prog[i]), [dr, dc] = DIRS[st.d], { r, c } = st;
      if (st.d !== G.dir) { face(st.d); Dino.sfx('pop', .5); }
      await wait(170); if (run !== G.run) return;
      if (st.k === 'fall') { await fall(r, c, run, st.over ? 2 : 1); if (run === G.run) { G.pc = -1; G.prog = []; drawProg(); sync(); } return; }
      if (st.k === 'rock') { await bonk(r, c, dr, dc); return codeBack(run); }
      if (st.k === 'slip') { await slip(r, c, dr, dc); return codeBack(run); }
      if (st.k === 'need') { await ask(); return codeBack(run); }
      await hopTo(r, c, !!st.over); if (run !== G.run) return;
      const letter = G.letters.get(key(r, c));
      if (letter && !letter.classList.contains('is-got')) { letter.classList.add('is-got'); letter._hud.classList.add('on'); Dino.sfx('correct', .45); if (letter.classList.contains('bonus')) G.got++; }
      if (st.k === 'goal') { G.pc = -1; return win(); }
      await wait(110);
    }
    if (run !== G.run) return;
    if (G.walking) { tired(); return codeBack(run); }   // 指令用完還沒到＝轉暈、清空
    rest(); return codeBack(run, false);                // 自己按停＝回起點，指令留著
  }

  // 回起點（導演 2026-11-18）：伊奇停在半路沒路牌可救時，一按就回起點；路牌、拿到的信都留著
  $('back').addEventListener('click', () => {
    if (G.busy || !G.started) return;
    Dino.sfx('swoosh', .5); G.run++; G.walking = false; ig.getAnimations().forEach(a => a.cancel()); spawn(); if (G.mode !== 'sign') { G.pc = -1; drawProg(); } sync();
  });
  goBtn.addEventListener('click', () => {
    if (G.busy || !G.started) return;
    Dino.sfx('tap', .5);
    if (G.walking) { G.walking = false; sync(); } else if (G.mode !== 'sign') runProg(); else walk();
  });

  // ── 手指示範（教學關：關卡有 hint 才有）：hint＝要放的路牌清單 [{at,d}]。放錯＝點它拿回來；架上沒選對＝點架上那塊；選對了＝點那塊草地；路通了＝點出發
  //   第一關馬上示範；後面的教學關先讓孩子自己試，停 4 秒沒動才出現。伊奇不在起點（撞到、滑倒停住）時示範不準，先收起來
  const hand = document.createElement('div'); hand.className = 'sg-hand'; hand.hidden = true; hand.innerHTML = Dino.icon('hand'); document.body.append(hand);
  let touched = Date.now(); addEventListener('pointerdown', () => { touched = Date.now(); }, true);
  function hintTarget() {
    const steps = [].concat(G.lv.hint);
    if (G.end === 'goal') return goBtn;
    if (key(...G.pos) !== key(...G.start) || G.dir !== G.lv.dir) return null;
    const wrong = [...G.signs].find(([k, s]) => !steps.some(st => key(...st.at) === k && st.d === s.dataset.d));
    if (wrong) return wrong[1];
    const todo = steps.find(st => !G.signs.has(key(...st.at))); if (!todo) return null;
    if (G.sel && G.sel.dataset.d === todo.d) return G.tiles.get(key(...todo.at));
    return [...tray.children].find(x => x.dataset.d === todo.d) || null;
  }
  setInterval(() => {
    const h = G.lv && G.mode === 'sign' && G.lv.hint, idle = G.started && !G.walking && !G.busy && $('ready').hidden && $('finish').hidden && !document.querySelector('.howto:not([hidden])');
    const el = h && idle && (G.round === 0 || Date.now() - touched > 4000) ? hintTarget() : null;
    if (!el) { hand.hidden = true; return; }
    const b = el.getBoundingClientRect();
    hand.hidden = false; hand.style.left = `${b.left + b.width / 2}px`; hand.style.top = `${b.top + b.height / 2}px`;
  }, 400);

  // ── 三階段（導演 2026-11-18）：一局三關＝每個階段從自己的題庫隨機抽一題。第一次玩到某階段先給教學關（有手指示範），過關後記在這台裝置；
  //   之後隨機抽＋左右／上下翻轉（方向、路牌跟著翻），同一題不連抽兩次
  const FLIP = { x: { L: 'R', R: 'L' }, y: { U: 'D', D: 'U' } };
  function flip(lv, fx, fy) {
    const m = d => (fx && FLIP.x[d]) || (fy && FLIP.y[d]) || d;
    let rows = lv.rows.map(r => fx ? [...r].reverse().join('') : r); if (fy) rows = rows.reverse();
    return { rows, dir: m(lv.dir), signs: lv.signs.map(m) };
  }
  const taught = i => { try { return localStorage.getItem(`dino-sign-taught-${i}`) === '1'; } catch { return true; } };
  function pick(i) {
    const pool = G.stages[i].levels, t = pool.findIndex(l => l.teach);
    if (G.mode === 'sign' && t >= 0 && !taught(i)) return { ...pool[t], stage: i };
    let n; do { n = Math.floor(Math.random() * pool.length); } while (pool.length > 1 && n === G.last[i]);
    G.last[i] = n; return { ...flip(pool[n], Math.random() < .5, Math.random() < .5), stage: i };
  }
  function newGame() { touched = Date.now(); G.round = 0; G.got = 0; G.total = 0; G.bank = G.stages.map((_, i) => pick(i)); setup(); }
  setKidText($('title'), '伊奇看路牌'); setKidText($('startLabel'), '點一下，開始送信！');
  setKidText($('finishTitle'), '信都送到了！'); setKidText($('again'), '再玩一次'); setKidText($('home'), '回首頁');
  Dino.bgm.start(); Dino.menuTaps($('ready')); Dino.menuTaps($('finish'));
  // 玩法框：一頁講完（導演 2026-11-18）＝手指點草地→路牌落下→伊奇拿信、踩到路牌轉彎→小恐龍開心；伊奇念玩法（assets/audio/howto/sign.mp3）。跳／星星在各階段的教學關用手指教
  const T = (x, y) => `<i class="t" style="left:${x}px;top:${y}px"></i>`;
  const HW = Dino.howto({
    preview: `<div class="pv pv-sign" aria-hidden="true">${T(30, 68)}${T(77, 68)}${T(124, 68)}${T(124, 16)}<span class="e">${ENV}</span><i class="tp"></i><span class="s">${ARROW}</span><img class="pal" src="assets/cast/xiaokong__front.webp" alt=""><img class="who" src="assets/cast/iggy__dir_right.webp" alt=""></div>`,
    text: '放路牌，帶伊奇去送信', kid: setKidText, voice: 'sign'
  });
  const HW2 = Dino.howto({
    preview: `<div class="pv pv-sign pv-code" aria-hidden="true">${T(30, 68)}${T(77, 68)}${T(124, 68)}${T(124, 16)}<span class="e">${ENV}</span><span class="row"><span class="s c1">${ARROW}</span><span class="s c2">${ARROW}</span><span class="s c3 up">${ARROW}</span></span><img class="pal" src="assets/cast/xiaokong__front.webp" alt=""><img class="who" src="assets/cast/iggy__dir_right.webp" alt=""></div>`,
    text: '排好指令，伊奇照著走', kid: setKidText, voice: 'sign-code'
  });
  const howto = () => G.mode !== 'sign' ? HW2 : HW;
  // 開始選單（⚙ 回到這裡，同其他遊戲）：選「放路牌」「排指令」或「困難」（排指令、沒有預覽虛線），記在這台裝置
  let want = 'sign'; try { const m = localStorage.getItem('dino-sign-mode'); if (m === 'code' || m === 'hard') want = m; } catch { /* ok */ }
  const pickMode = m => { want = m; try { localStorage.setItem('dino-sign-mode', m); } catch { /* ok */ } document.querySelectorAll('#pick button').forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === m)); };
  setKidText($('pickSign'), '放路牌'); setKidText($('pickCode'), '排指令'); setKidText($('pickHard'), '困難'); pickMode(want);
  $('pick').addEventListener('click', ev => { const b = ev.target.closest('button'); if (b) { Dino.sfx('tap', .5); pickMode(b.dataset.mode); } });
  $('menuBtn').addEventListener('click', () => {
    if (!$('ready').hidden || !$('finish').hidden || G.busy) return;
    Dino.sfx('tap', .5); G.walking = false; $('ready').hidden = false; Dino.bgm.start();
  });
  $('start').addEventListener('click', () => {
    if (!G.stages) return;
    $('ready').hidden = true; Dino.bgm.stop();
    if (!G.started || G.mode !== want) { G.started = true; G.mode = want; newGame(); }
    if (!howto().seen()) howto().show();
  });
  $('help').addEventListener('click', () => { Dino.sfx('tap', .5); howto().show(); });
  $('again').addEventListener('click', () => { $('finish').hidden = true; Dino.bgm.stop(); newGame(); });
  fetch('sign_levels.json?v=6').then(r => r.json()).then(d => { G.stages = d.stages; });
})();

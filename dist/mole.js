// 單字打地鼠（sample v1，導演 2026-10-26）：只念英文。玩法＝聽音打圖／開頭字母（念字母名，甲案）。
// 節奏：念題 → 0.5–1.5 秒後地鼠錯開探頭（答案固定第 1–2 隻）→ 答案縮回去（打到或沒打到）就念下一題，打到 5 隻結束。
// 沒打到的字過 2–3 題再考；按喇叭再聽一次時地鼠暫停。速度慢／中／快＝探頭 4／3／2 秒。
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const rand = (a, b) => a + Math.random() * (b - a);
  const GOAL = 5;
  const UP = { slow: 4, mid: 3, fast: 2 };
  const CAST = ['iggy', 'feifei', 'xiaokong', 'pairo', 'chick_abao'];
  // 開頭字母：字母名跟開頭音差太多的不出（不發音的 kn／wr／ps／gn、ph、軟 c、hour、x 念 z）
  const ODD_START = /^(kn|wr|ps|gn|ph|c[eiy]|hour|honest|x)/;
  const LOOKALIKE = [['kidapp-quetzalcoatlus', 'kidapp-hatzegopteryx']];
  const table = {
    '單字打地鼠': ['ㄉㄢ', 'ㄗˋ', 'ㄉㄚˇ', 'ㄉㄧˋ', 'ㄕㄨˇ'],
    '點一下，開始打地鼠！': ['ㄉㄧㄢˇ', 'ㄧ', 'ㄒㄧㄚˋ', '', 'ㄎㄞ', 'ㄕˇ', 'ㄉㄚˇ', 'ㄉㄧˋ', 'ㄕㄨˇ', ''],
    '聽音打圖': ['ㄊㄧㄥ', 'ㄧㄣ', 'ㄉㄚˇ', 'ㄊㄨˊ'], '開頭字母': ['ㄎㄞ', 'ㄊㄡˊ', 'ㄗˋ', 'ㄇㄨˇ'],
    '慢': ['ㄇㄢˋ'], '中': ['ㄓㄨㄥ'], '快': ['ㄎㄨㄞˋ'],
    '打到5隻！': ['ㄉㄚˇ', 'ㄉㄠˋ', '', 'ㄓ', ''],
    '聽一聽，打對的地鼠': ['ㄊㄧㄥ', 'ㄧ', 'ㄊㄧㄥ', '', 'ㄉㄚˇ', 'ㄉㄨㄟˋ', 'ㄉㄜ˙', 'ㄉㄧˋ', 'ㄕㄨˇ'],
    '再玩一次': ['ㄗㄞˋ', 'ㄨㄢˊ', 'ㄧ', 'ㄘˋ'], '回首頁': ['ㄏㄨㄟˊ', 'ㄕㄡˇ', 'ㄧㄝˋ'], '知道了': ['ㄓ', 'ㄉㄠˋ', 'ㄌㄜ˙']
  };
  const setKidText = Dino.kidText(table);
  const prefsKey = 'dinopost-mole-v1';
  const prefs = (() => {
    const base = { mode: 'pic', speed: 'mid' };
    try { const s = JSON.parse(localStorage.getItem(prefsKey) || '{}'); return { mode: ['pic', 'abc'].includes(s.mode) ? s.mode : base.mode, speed: UP[s.speed] ? s.speed : base.speed }; } catch { return base; }
  })();
  const savePrefs = () => { try { localStorage.setItem(prefsKey, JSON.stringify(prefs)); } catch { /* 只影響本頁 */ } };

  const board = $('board'), yard = $('yard');
  const G = { words: [], disabled: new Set(), pool: [], queue: [], q: null, hits: 0, misses: 0, missed: new Set(), results: new Map(),
    holes: [], clock: 0, timers: [], paused: false, running: false, started: false, last: 0 };

  // ── 圖（同翻翻樂 makeArt）
  function makeArt(word) {
    let art;
    if (!Dino.isNumber(word) && word.image) {
      art = document.createElement('img'); art.src = word.image; art.alt = '';
      art.addEventListener('error', () => { const f = document.createElement('span'); f.className = 'fs-art'; f.textContent = word.emoji; art.replaceWith(f); }, { once: true });
    } else {
      art = document.createElement('span');
      if (word.sheet && Number.isInteger(word.cell)) {
        art.classList.add('sheet', word.sheet);
        art.style.backgroundImage = `url('assets/${word.sheet}-grid-v1.jpg')`;
        art.style.backgroundPosition = `${(word.cell % 5) * 25}% ${word.cell < 5 ? 0 : 100}%`;
      } else art.textContent = word.emoji;
    }
    art.classList.add('fs-art'); art.setAttribute('aria-hidden', 'true');
    return art;
  }
  const first = w => w.en.toLowerCase()[0];
  const letterAudio = l => `assets/audio/letters/letter-${l}.mp3`;
  const clash = (a, b) => a.en === b.en || a.zh === b.zh || LOOKALIKE.some(g => g.includes(a.id) && g.includes(b.id));

  // ── 出題：同一種畫風；開頭字母只用字母名念得通的字
  function buildPool() {
    let pool = G.words.filter(w => !G.disabled.has(w.id) && (Dino.dinoMode() ? Dino.isDino(w) : !Dino.isDino(w) && !Dino.isNumber(w)) && (w.image || w.sheet));
    if (prefs.mode === 'abc') pool = pool.filter(w => /^[a-z]/.test(w.en.toLowerCase()) && !ODD_START.test(w.en.toLowerCase()));
    const groups = new Map();
    pool.forEach(w => { const g = Dino.visualGroup(w); groups.set(g, [...(groups.get(g) || []), w]); });
    const usable = [...groups.values()].filter(list => list.length >= 12);
    return usable.length ? usable[Math.floor(Math.random() * usable.length)] : pool;
  }
  async function newGame() {
    clearBoard(); G.running = false;
    await loaded;   // 資料還沒下載完就按開始：等好再出題
    G.pool = buildPool();
    G.queue = Dino.selectRound(G.pool, Dino.loadHistory(), 12);
    G.hits = 0; G.misses = 0; G.missed.clear(); G.results.clear();
    Dino.preload([...G.queue.map(Dino.audioPath), ...(prefs.mode === 'abc' ? [...new Set(G.queue.map(first))].map(letterAudio) : [])]);
    drawHits(); $('letter').hidden = prefs.mode !== 'abc';
    G.running = true; G.last = performance.now();
    if (!HW.isOpen()) G.paused = false;   // 從選單回來：選單開著時有暫停
    after(.6, ask);
  }

  // ── 遊戲時鐘：暫停時不走，地鼠停在原地
  function after(sec, fn) { G.timers.push({ at: G.clock + sec, fn }); }
  function tick() {
    const now = performance.now(), dt = Math.min(.1, (now - G.last) / 1000); G.last = now;
    if (G.running && !G.paused) {
      G.clock += dt;
      const due = G.timers.filter(t => t.at <= G.clock);
      G.timers = G.timers.filter(t => t.at > G.clock);
      due.forEach(t => t.fn());
    }
  }
  setInterval(tick, 50);

  // ── 洞：直式 2×3、寬版 3×2；格子大小固定用 6 洞算
  function layout() {
    const wide = yard.clientWidth > yard.clientHeight * 1.1, cols = wide ? 3 : 2, rows = 6 / cols;
    const w = yard.clientWidth - 30, h = yard.clientHeight - 120;
    const cs = Math.max(90, Math.floor(Math.min(w / (cols * 1.08), h / (rows * 1.55), 230)));
    board.style.setProperty('--cols', cols);
    document.documentElement.style.setProperty('--cs', `${cs}px`);
    board.style.rowGap = `${Math.round(cs * .5)}px`;
    board.style.paddingTop = `${Math.round(cs * .55)}px`;
  }
  function buildHoles() {
    board.innerHTML = '';
    G.holes = Array.from({ length: 6 }, (_, i) => {
      const el = document.createElement('div'); el.className = `hole v${(i * 3) % 4}`;
      el.innerHTML = '<span class="pit"></span><div class="clip"><div class="mole"></div></div><span class="lip"></span>';
      board.append(el);
      const mole = el.querySelector('.mole');
      const h = { el, mole, word: null, busy: false, answer: false };
      mole.addEventListener('pointerdown', ev => { ev.preventDefault(); hit(h, ev); });
      return h;
    });
  }
  addEventListener('resize', layout);

  // ── 一題
  function ask() {
    if (!G.running) return;
    const word = G.queue.shift() || Dino.selectRound(G.pool, [], 1)[0];
    const others = Dino.shuffle(G.pool.filter(w => !clash(w, word) && (prefs.mode !== 'abc' || first(w) !== first(word))));
    const decoys = [];
    for (const w of others) { if (decoys.length >= 2) break; if (!decoys.some(d => clash(d, w))) decoys.push(w); }
    G.q = { word, done: false, seen: G.q?.word.id === word.id };
    if (prefs.mode === 'abc') { const l = first(word); $('letter').innerHTML = `${l.toUpperCase()}<small>${l}</small>`; $('letter').classList.remove('is-new'); void $('letter').offsetWidth; $('letter').classList.add('is-new'); }
    say(prompt()).then(() => {
      if (!G.running || G.q.word !== word) return;
      // 答案固定第 1 或 2 隻出來，其他是干擾；彼此錯開 0.4–0.8 秒
      const order = Math.random() < .5 ? [word, ...decoys] : [decoys[0], word, ...decoys.slice(1)];
      const holes = Dino.shuffle(G.holes.filter(h => !h.busy));
      let t = rand(.5, 1.5);
      order.filter(Boolean).forEach((w, i) => { const h = holes[i]; if (!h) return; after(t, () => popUp(h, w, w === word)); t += rand(.4, .8); });
    });
  }
  const prompt = () => prefs.mode === 'abc' ? letterAudio(first(G.q.word)) : Dino.audioPath(G.q.word);
  async function say(src) {
    G.paused = true; $('replay').classList.add('is-on');
    // 音檔最多等 3 秒：聲音被擋（靜音、背景分頁）時遊戲也不會卡住
    await Promise.race([Dino.voice(src), new Promise(r => setTimeout(r, 3000))]);
    $('replay').classList.remove('is-on'); G.last = performance.now();
    if ($('ready').hidden && !HW.isOpen()) G.paused = false;   // 念到一半開了選單／玩法：繼續停著
  }

  function popUp(h, word, answer) {
    if (!G.running || G.q.done) return;
    h.busy = true; h.word = word; h.answer = answer;
    const busy = new Set(G.holes.map(o => o.who)), free = CAST.filter(c => !busy.has(c));   // 同時冒出來的不撞角色
    const who = h.who = Dino.shuffle(free.length ? free : CAST.slice())[0];
    h.mole.innerHTML = `<img class="who" alt="" src="assets/cast/${who}__hello.webp"><div class="sign" style="--tilt:${rand(-5, 5).toFixed(1)}deg"></div>`;
    h.mole.querySelector('.sign').append(makeArt(word));
    h.mole.className = 'mole'; void h.mole.offsetWidth; h.mole.classList.add('is-up');
    Dino.sfx('pop', .35);
    const q = G.q;
    after(UP[prefs.speed], () => { if (h.word === word && h.mole.classList.contains('is-up')) { down(h); if (answer && q === G.q) endQuestion(false); } });
  }
  function down(h, delay = 0) {
    const w = h.word;
    setTimeout(() => {
      if (h.word !== w) return;
      h.mole.className = 'mole is-down';
      setTimeout(() => { if (h.word === w) { h.busy = false; h.word = null; h.who = null; } }, 260);
    }, delay);
  }

  function hit(h, ev) {
    if (!G.running || G.paused || !h.mole.classList.contains('is-up') || G.q.done) return;
    mallet(ev.clientX, ev.clientY);
    if (h.answer) {
      h.mole.className = 'mole is-hit';
      h.mole.insertAdjacentHTML('beforeend', '<span class="dizzy">★ ✦ ★</span>');
      Dino.sfx('correct', .8); Dino.burst(h.mole.querySelector('.sign'));
      endQuestion(true, h);
    } else {
      Dino.sfx('wrong', .5); G.misses++;
      h.mole.classList.remove('is-up'); h.mole.classList.add('is-wrong');
      down(h, 380);
    }
  }
  function endQuestion(got, h) {
    const q = G.q; if (q.done) return; q.done = true;
    // 其他地鼠一起縮回去
    G.holes.forEach(o => { if (o !== h && o.word) down(o); });
    const id = q.word.id;
    if (got) {
      G.hits++; drawHits();
      if (!G.results.has(id)) G.results.set(id, !G.missed.has(id));
      if (window.DinoProgress) DinoProgress.record(id, !G.missed.has(id));
      // 打到再念一次單字（開頭字母也念整個字）
      Promise.race([Dino.voice(Dino.audioPath(q.word)), new Promise(r => setTimeout(r, 3000))]).then(() => {
        down(h, 250);
        if (G.hits >= GOAL) return setTimeout(finish, 700);
        after(.9, ask);
      });
    } else {
      // 沒打到：不扣分，這個字過 2–3 題再考
      G.missed.add(id); G.misses++;
      G.queue.splice(Math.min(G.queue.length, 2 + Math.floor(Math.random() * 2)), 0, q.word);
      after(.9, ask);
    }
  }
  function mallet(x, y) {
    const m = document.createElement('div'); m.className = 'mallet'; m.style.left = `${x}px`; m.style.top = `${y}px`;
    m.innerHTML = '<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="27" y="22" width="8" height="38" rx="4" fill="#b9792b" stroke="#7a4a17" stroke-width="2"/><rect x="8" y="6" width="46" height="22" rx="8" fill="#e0473a" stroke="#8e2620" stroke-width="3"/><rect x="12" y="9" width="38" height="6" rx="3" fill="#ff8a6e"/></svg>';
    document.body.append(m); setTimeout(() => m.remove(), 320);
  }
  function drawHits() { $('hits').innerHTML = Array.from({ length: GOAL }, (_, i) => `<li class="${i < G.hits ? 'is-done' : ''}"></li>`).join(''); }
  function clearBoard() { G.timers = []; G.q = null; G.holes.forEach(h => { h.mole.className = 'mole'; h.busy = false; h.word = null; }); }

  function finish() {
    G.running = false; clearBoard();
    const stars = G.misses === 0 ? 3 : G.misses <= 2 ? 2 : 1;
    const ids = [...G.results.keys()];
    Dino.saveHistory({ ids, results: ids.map(id => G.results.get(id)), score: ids.filter(id => G.results.get(id)).length, total: ids.length, game: 'mole' });
    $('finishStars').innerHTML = [0, 1, 2].map(i => `<span class="${i < stars ? '' : 'off'}">★</span>`).join('');
    $('finishActor').src = `assets/cast/${Dino.shuffle(CAST.slice())[0]}__cheer.webp`;
    $('finish').hidden = false; Dino.sfx('finish', .8); Dino.bgm.start();
  }

  // ── 開始畫面兼選單
  const modeBtns = [...document.querySelectorAll('[data-mode]')], speedBtns = [...document.querySelectorAll('[data-speed]')];
  const showPick = () => {
    modeBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === prefs.mode)));
    speedBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.speed === prefs.speed)));
  };
  modeBtns.forEach(b => { setKidText(b, b.textContent); b.addEventListener('click', () => { prefs.mode = b.dataset.mode; savePrefs(); showPick(); $('ready').dataset.changed = '1'; }); });
  speedBtns.forEach(b => { setKidText(b, b.textContent); b.addEventListener('click', () => { prefs.speed = b.dataset.speed; savePrefs(); showPick(); }); });
  showPick();
  setKidText($('title'), '單字打地鼠'); setKidText($('startLabel'), '點一下，開始打地鼠！');
  setKidText($('finishTitle'), '打到5隻！'); setKidText($('again'), '再玩一次'); setKidText($('home'), '回首頁');
  Dino.bgm.start(); Dino.menuTaps($('ready')); Dino.menuTaps($('finish'));

  const HW = Dino.howto({
    preview: `<div class="pv pv-mole" aria-hidden="true"><i class="h h1"></i><i class="h h2"></i><i class="h h3"></i><div class="m"><img src="assets/rebuilt/emoji-6x8-v1/animal-duck.png" alt=""></div><span class="ham">🔨</span><span class="seal">OK</span></div>`,
    text: '聽一聽，打對的地鼠', kid: setKidText, onClose: () => { G.paused = false; G.last = performance.now(); }
  });
  let howtoSeen = false;
  $('start').addEventListener('click', () => {
    $('ready').hidden = true; Dino.bgm.stop();
    const fresh = !G.started; G.started = true;
    layout();
    if (!howtoSeen) { howtoSeen = true; G.paused = true; HW.show(); }
    if (fresh || $('ready').dataset.changed || !G.running) { delete $('ready').dataset.changed; newGame(); } else G.paused = false;
  });
  $('menuBtn').addEventListener('click', () => { if (!G.started) return; Dino.sfx('tap', .5); G.paused = true; Dino.voice.stop(); $('ready').hidden = false; Dino.bgm.start(); });
  $('help').addEventListener('click', () => { Dino.sfx('tap', .5); G.paused = true; HW.show(); });
  $('replay').addEventListener('click', () => { if (G.running && G.q && !G.q.done && !G.paused) say(prompt()); });
  $('again').addEventListener('click', () => { $('finish').hidden = true; Dino.bgm.stop(); newGame(); });

  buildHoles();
  try { G.disabled = new Set(JSON.parse(localStorage.getItem(Dino.storageKeys.disabled) || '[]')); } catch { /* 全部可出題 */ }
  const loaded = fetch('data.json').then(r => r.json()).then(d => { G.words = d; });
})();

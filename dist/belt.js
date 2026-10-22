// 注音輸送帶（導演 2026-10-21 定版 v8，第四款注音類）：看圖聽中文，從輸送帶依序抓對的注音郵票拼出整個詞。
// 聲調先幫孩子填好，只抓聲母／韻母；抓錯不扣分，郵票會念出自己的音再滑走。
// 開始畫面選速度（預設中）並放選單 BGM；DINO MODE 跟首頁開關。整個詞沒抓錯＝一次答對（寫 DinoProgress 與最近 10 回合紀錄）。
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = ms => new Promise(res => setTimeout(res, reduced ? 0 : ms));
  const settle = (anim, ms) => Promise.race([anim.finished, wait(ms)]);

  const uiReadings = {
    '注音輸送帶': ['ㄓㄨˋ', 'ㄧㄣ', 'ㄕㄨ', 'ㄙㄨㄥˋ', 'ㄉㄞˋ'],
    '點一下，開始拼注音！': ['ㄉㄧㄢˇ', 'ㄧ', 'ㄒㄧㄚˋ', '', 'ㄎㄞ', 'ㄕˇ', 'ㄆㄧㄣ', 'ㄓㄨˋ', 'ㄧㄣ', ''],
    '抓住對的注音': ['ㄓㄨㄚ', 'ㄓㄨˋ', 'ㄉㄨㄟˋ', 'ㄉㄜ˙', 'ㄓㄨˋ', 'ㄧㄣ'],
    '不是這個喔': ['ㄅㄨˊ', 'ㄕˋ', 'ㄓㄜˋ', 'ㄍㄜ˙', 'ㄛ'],
    '抓到了！': ['ㄓㄨㄚ', 'ㄉㄠˋ', 'ㄌㄜ˙', ''],
    '拼好了！': ['ㄆㄧㄣ', 'ㄏㄠˇ', 'ㄌㄜ˙', ''],
    '全部拼好了！': ['ㄑㄩㄢˊ', 'ㄅㄨˋ', 'ㄆㄧㄣ', 'ㄏㄠˇ', 'ㄌㄜ˙', ''],
    '再玩一次': ['ㄗㄞˋ', 'ㄨㄢˊ', 'ㄧ', 'ㄘˋ'],
    '回首頁': ['ㄏㄨㄟˊ', 'ㄕㄡˇ', 'ㄧㄝˋ'],
    '慢': ['ㄇㄢˋ'], '中': ['ㄓㄨㄥ'], '快': ['ㄎㄨㄞˋ'],
    '知道了': ['ㄓ', 'ㄉㄠˋ', 'ㄌㄜ˙']
  };
  const setKidText = Dino.kidText(uiReadings);

  // 長得像或聽起來像的注音，當干擾郵票
  const confusables = {
    'ㄅ': 'ㄆㄇㄉ', 'ㄆ': 'ㄅㄊ', 'ㄇ': 'ㄋㄈ', 'ㄈ': 'ㄏㄇ', 'ㄉ': 'ㄊㄅ', 'ㄊ': 'ㄉㄆ', 'ㄋ': 'ㄌㄇ', 'ㄌ': 'ㄋㄖ',
    'ㄍ': 'ㄎㄏ', 'ㄎ': 'ㄍㄏ', 'ㄏ': 'ㄈㄎ', 'ㄐ': 'ㄑㄓ', 'ㄑ': 'ㄐㄒ', 'ㄒ': 'ㄑㄙ', 'ㄓ': 'ㄗㄐ', 'ㄔ': 'ㄘㄑ',
    'ㄕ': 'ㄙㄒ', 'ㄖ': 'ㄌ', 'ㄗ': 'ㄓ', 'ㄘ': 'ㄔ', 'ㄙ': 'ㄕ', 'ㄧ': 'ㄩ', 'ㄨ': 'ㄩㄛ', 'ㄩ': 'ㄧㄨ',
    'ㄚ': 'ㄛ', 'ㄛ': 'ㄚㄜ', 'ㄜ': 'ㄛㄝ', 'ㄝ': 'ㄜ', 'ㄞ': 'ㄟ', 'ㄟ': 'ㄞ', 'ㄠ': 'ㄡ', 'ㄡ': 'ㄠ',
    'ㄢ': 'ㄤㄣ', 'ㄣ': 'ㄥㄢ', 'ㄤ': 'ㄢ', 'ㄥ': 'ㄣ', 'ㄦ': 'ㄜ'
  };
  const consonants = new Set([...'ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙ']);
  const speeds = [{ name: '慢', k: .55 }, { name: '中', k: .9 }, { name: '快', k: 1.3 }];   // 每秒走幾張郵票寬
  const couriers = ['chick_abao', 'feifei', 'iggy', 'xiaokong', 'pairo'];
  const poseSrc = (id, pose) => `assets/cast/${id}__${pose}.webp`;
  const ROUND = 5;

  const prefsKey = 'dinopost-belt-v1';   // 導演 2026-10-21：預設速度「中」
  const prefs = (() => {
    const base = { speed: 1 };
    try { const saved = JSON.parse(localStorage.getItem(prefsKey) || '{}'); return [0, 1, 2].includes(saved.speed) ? { speed: saved.speed } : base; } catch { return base; }
  })();
  prefs.dino = Dino.dinoMode();
  const savePrefs = () => { try { localStorage.setItem(prefsKey, JSON.stringify({ speed: prefs.speed })); } catch { /* 只影響本頁 */ } };

  const state = { words: [], symbolAudio: {}, round: [], index: 0, slots: [], target: 0, tiles: [], since: 0, misses: 0,
    playing: false, started: false, courier: null, audio: null, T: 100,
    disabledIds: new Set(), wordMisses: 0, results: [] };

  // ---------- 小工具 ----------
  function makeArt(word) {
    let art;
    if (!Dino.isNumber(word) && word.image) {
      art = document.createElement('img'); art.src = word.image; art.alt = '';
    } else {
      art = document.createElement('span');
      if (word.sheet && Number.isInteger(word.cell)) {
        art.classList.add('sheet', word.sheet);
        art.style.backgroundImage = `url('assets/${word.sheet}-grid-v1.jpg')`;
        art.style.backgroundPosition = `${(word.cell % 5) * 25}% ${word.cell < 5 ? 0 : 100}%`;
      } else art.textContent = word.emoji;
    }
    art.classList.add('zb-art'); art.setAttribute('aria-hidden', 'true');
    return art;
  }
  function play(src, volume = 1) {
    if (!src) return Promise.resolve();
    Dino.voice.stop();   // Web Audio：計時器自動念下一個字，iPhone 也念得出來
    return Dino.voice(src, volume);
  }
  function say(text) {
    const b = $('bubble'); setKidText(b, text);
    b.classList.remove('is-pop'); void b.offsetWidth; b.classList.add('is-pop');
  }
  function cheer() {
    const actor = $('actor'); $('actorImg').src = poseSrc(state.courier, 'cheer');
    actor.classList.remove('is-cheer'); void actor.offsetWidth; actor.classList.add('is-cheer');
    setTimeout(() => { $('actorImg').src = poseSrc(state.courier, 'hello'); }, 900);
  }
  const currentSlot = () => state.slots[state.target];

  // ---------- 出題 ----------
  function pickRound() {
    const pool = state.words.filter(w => !state.disabledIds.has(w.id) && [...w.zh].length === w.zhuyin.length && (w.image || w.sheet || Dino.isNumber(w))
      && (prefs.dino ? Dino.isDino(w) && w.zhuyin.length <= 3 : !Dino.isDino(w) && w.zhuyin.length <= 2 && w.level.zhuyin <= 2));
    return Dino.selectRound(pool, Dino.loadHistory(), ROUND);
  }

  function renderWord() {
    const word = state.round[state.index];
    const pic = $('picture'); pic.replaceChildren(makeArt(word));
    pic.parentElement.classList.remove('is-new'); void pic.offsetWidth; pic.parentElement.classList.add('is-new');
    $('doneMark').hidden = true; $('slots').classList.remove('is-complete');
    state.slots = []; state.target = 0; state.wordMisses = 0;
    const chars = [...word.zh].map((ch, i) => {
      const { onset, rime, tone } = Dino.parseZhuyin(word.zhuyin[i]);
      const wrap = document.createElement('div'); wrap.className = 'zb-char';
      const hanzi = document.createElement('span'); hanzi.className = 'zb-hanzi'; hanzi.textContent = ch;
      const col = document.createElement('div'); col.className = 'zb-col';
      const stack = document.createElement('div'); stack.className = 'zb-stack'; col.append(stack);
      [onset, ...rime].filter(Boolean).forEach(sym => {
        const box = document.createElement('button'); box.type = 'button'; box.className = 'zb-box';
        box.setAttribute('aria-label', '聽這一格的注音');
        box.addEventListener('click', () => { if (state.slots[state.target]?.el === box) play(state.symbolAudio[sym]); });
        stack.append(box);
        state.slots.push({ sym, el: box, char: wrap });
      });
      if (tone) {
        const mark = document.createElement('span'); mark.className = `zb-tone${tone === '˙' ? ' dot' : ''}`; mark.innerHTML = `<i>${tone}</i>`;
        col.append(mark); if (tone === '˙') wrap.classList.add('has-dot');
      }
      wrap.append(hanzi, col);
      return wrap;
    });
    $('slots').replaceChildren(...chars);
    markTarget();
    renderProgress();
    say('抓住對的注音');
    setTimeout(() => { if (state.started) play(word.zhAudio); }, 250);
  }
  function markTarget() {
    state.slots.forEach((s, i) => s.el.classList.toggle('is-now', i === state.target));
    state.since = 9;   // 換新目標：下一張馬上送出它
  }
  function renderProgress() {
    $('progress').replaceChildren(...state.round.map((_, i) => {
      const li = document.createElement('li');
      li.className = i < state.index ? 'is-done' : i === state.index ? 'is-now' : '';
      return li;
    }));
  }

  // ---------- 輸送帶 ----------
  function nextSymbol() {
    const slot = currentSlot(); if (!slot) return Dino.shuffle(Object.keys(confusables))[0];
    const onBelt = state.tiles.filter(t => t.sym === slot.sym && !t.taken).length;
    if (state.since >= 3 || (onBelt < 2 && Math.random() < .3)) { state.since = 0; return slot.sym; }
    state.since++;
    const near = [...(confusables[slot.sym] || '')];
    const pool = Math.random() < .55 && near.length ? near : Object.keys(confusables).filter(s => s !== slot.sym);
    return Dino.shuffle(pool)[0];
  }
  function spawn(x) {
    const sym = nextSymbol();
    const el = document.createElement('button'); el.type = 'button';
    el.className = `zb-tile${consonants.has(sym) ? '' : ' vowel'}`;
    el.setAttribute('aria-label', `注音 ${sym}`);
    const stamp = document.createElement('span'); stamp.className = 'zb-stamp'; stamp.textContent = sym;
    el.append(stamp);
    const tile = { el, sym, x, taken: false };
    el.addEventListener('pointerdown', event => { event.preventDefault(); grab(tile); });
    $('beltTrack').append(el); state.tiles.push(tile);
    el.style.transform = `translateX(${x}px)`;
  }
  function measure() {
    const belt = $('belt');
    state.T = Math.round(Math.min((belt.clientHeight - 22) * .74, 120));
    belt.style.setProperty('--tile', `${state.T}px`);
  }
  function fillBelt() {
    $('beltTrack').replaceChildren(); state.tiles = [];
    const W = $('belt').clientWidth, step = state.T * 1.5;
    for (let x = W * .25; x < W; x += step) spawn(x);
  }
  let last = performance.now(), roll = 0;
  function frame(now) {
    step(Math.min(.05, (now - last) / 1000)); last = now;
    requestAnimationFrame(frame);
  }
  function step(dt) {
    if (state.playing) {
      const v = state.T * speeds[prefs.speed].k, W = $('belt').clientWidth, step = state.T * 1.5;
      state.tiles.forEach(t => { t.x -= v * dt; t.el.style.transform = `translateX(${t.x}px)`; });
      state.tiles = state.tiles.filter(t => { if (t.x < -state.T) { t.el.remove(); return false; } return true; });
      const tail = state.tiles.at(-1);
      if (!tail || tail.x < W - step) spawn(tail ? tail.x + step : W);
      roll = (roll - v * dt) % 36; $('belt').style.setProperty('--roll', `${roll}px`);
    }
  }
  window.__beltStep = step;   // 截圖驗收用：背景分頁沒有動畫影格時手動推進

  async function grab(tile) {
    const slot = currentSlot();
    if (!state.playing || tile.taken || !slot) return;
    if (tile.sym !== slot.sym) {   // 抓錯：郵票念出自己的音，抖一下繼續走
      state.misses++; state.wordMisses++;
      tile.el.classList.remove('is-wrong'); void tile.el.offsetWidth; tile.el.classList.add('is-wrong');
      Dino.sfx('wrong', .25); play(state.symbolAudio[tile.sym], .9); say('不是這個喔');
      return;
    }
    tile.taken = true;
    Dino.sfx('pop', .6); play(state.symbolAudio[tile.sym]);
    // 郵票飛進格子
    const from = tile.el.getBoundingClientRect(), to = slot.el.getBoundingClientRect();
    tile.el.classList.add('is-taken');
    const flyer = document.createElement('span'); flyer.className = 'zb-flyer'; flyer.textContent = tile.sym;
    Object.assign(flyer.style, { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px`, fontSize: `${from.height * .58}px` });
    document.body.append(flyer);
    const advance = state.target + 1 < state.slots.length;
    state.target++; if (advance) markTarget(); else state.slots.forEach(s => s.el.classList.remove('is-now'));
    if (advance) say('抓到了！');
    await settle(flyer.animate([
      { transform: 'translate(0,0) scale(1) rotate(0)' },
      { transform: `translate(${to.left - from.left}px,${to.top - from.top - 40}px) scale(${to.width / from.width * 1.1}) rotate(-10deg)`, offset: .7 },
      { transform: `translate(${to.left - from.left}px,${to.top - from.top}px) scale(${to.width / from.width})` }
    ], { duration: 420, easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'forwards' }), 600);
    flyer.remove();
    slot.el.textContent = slot.sym; slot.el.classList.add('is-filled');
    const charDone = state.slots.filter(s => s.char === slot.char).every(s => s.el.classList.contains('is-filled'));
    if (charDone) { slot.char.classList.add('is-done'); shakeScreen(); }   // 拼好一個字（如ㄉㄤ）：變綠＋畫面震一下（導演 2026-10-22）
    if (!advance) await wordDone();
  }

  function shakeScreen() {
    document.querySelector('.zb-shell').animate([{ transform: 'none' }, { transform: 'translate(3px, 6px)' }, { transform: 'translate(-4px, -3px)' }, { transform: 'translate(2px, 2px)' }, { transform: 'none' }], { duration: 300, easing: 'ease-out' });
  }

  async function wordDone() {
    state.playing = false;
    const word = state.round[state.index];
    state.results[state.index] = state.wordMisses === 0;
    DinoProgress.record(word.id, state.wordMisses === 0);
    $('slots').classList.add('is-complete');   // 拼好：格子變綠，表示定案
    $('doneMark').hidden = false; Dino.sfx('stamp', .8); Dino.burst($('picture')); cheer(); say('拼好了！');
    await wait(400);
    await Promise.race([play(word.zhAudio), wait(2400)]);
    await wait(500);
    state.index++;
    if (state.index >= state.round.length) return finish();
    renderWord(); state.playing = true;
  }

  function saveRound() {
    try {
      const results = state.round.map((_, i) => state.results[i] === true);
      const record = { date: new Date().toISOString(), game: 'belt', mode: prefs.dino ? 'dinosaur' : 'all', speed: speeds[prefs.speed].name,
        score: results.filter(Boolean).length, total: state.round.length, ids: state.round.map(w => w.id), results };
      localStorage.setItem(Dino.storageKeys.history, JSON.stringify([record, ...Dino.loadHistory()].slice(0, 10)));
    } catch { /* 沒有儲存空間也照樣能玩 */ }
  }

  function finish() {
    renderProgress(); saveRound();
    Dino.sfx('finish', .8); Dino.bgm.start();
    const stars = state.misses <= 2 ? 3 : state.misses <= 6 ? 2 : 1;
    $('finishStars').innerHTML = [0, 1, 2].map(i => `<span class="${i < stars ? '' : 'off'}">★</span>`).join('');
    $('finishWords').replaceChildren(...state.round.map(w => { const li = document.createElement('li'); setKidText(li, w.zh, w.zhuyin); return li; }));
    $('finishActor').src = poseSrc(state.courier, 'cheer');
    $('finishOverlay').hidden = false;
  }

  function startRound() {
    $('finishOverlay').hidden = true;
    document.documentElement.classList.toggle('dino-mode', prefs.dino);
    state.round = pickRound(); state.index = 0; state.misses = 0; state.results = [];
    state.courier = Dino.shuffle(couriers.filter(id => id !== state.courier))[0];
    $('actorImg').src = poseSrc(state.courier, 'hello');
    measure(); renderWord(); fillBelt();
    state.playing = state.started;
    window.__belt = state;   // 截圖驗收用
  }

  async function init() {
    setKidText($('title'), '注音輸送帶'); setKidText($('readyTitle'), '點一下，開始拼注音！');
    setKidText($('finishTitle'), '全部拼好了！'); setKidText($('playAgain'), '再玩一次'); setKidText($('finishHome'), '回首頁');
    const picks = [...document.querySelectorAll('[data-pick]')];
    const syncPick = () => picks.forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.pick) === prefs.speed)));
    picks.forEach(b => { setKidText(b, b.textContent); b.addEventListener('click', () => { prefs.speed = Number(b.dataset.pick); savePrefs(); syncPick(); }); });
    syncPick();
    Dino.bgm.start(); Dino.menuTaps($('readyOverlay')); Dino.menuTaps($('finishOverlay'));
    try { state.disabledIds = new Set(JSON.parse(localStorage.getItem(Dino.storageKeys.disabled) || '[]')); } catch { /* 全部可出題 */ }
    $('replay').addEventListener('click', () => play(state.round[state.index]?.zhAudio));
    $('playAgain').addEventListener('click', () => { Dino.bgm.stop(); startRound(); });
    const [words, symbols] = await Promise.all(['data.json', 'assets/audio/symbols.json'].map(u => fetch(u).then(r => r.json())));
    state.words = words; state.symbolAudio = symbols.zhuyin;
    startRound();
    // 標題列（2026-10-22 統一）：房子回選遊戲首頁；⚙ 回開始畫面（暫停，可改速度）；? 玩法框
    document.querySelector('.gh .dino-home').addEventListener('click', e => { e.preventDefault(); Dino.goTo('index.html'); });
    $('menuBtn').addEventListener('click', () => { if (!$('readyOverlay').hidden) return; Dino.sfx('tap', .5); state.started = false; state.playing = false; $('readyOverlay').hidden = false; Dino.bgm.start(); });
    const howto = Dino.howto({ preview: 'belt.html', text: '抓住對的注音', kid: setKidText });
    $('helpButton').addEventListener('click', () => { Dino.sfx('tap', .5); howto.show(); });
    $('readyStart').addEventListener('click', () => {
      $('readyOverlay').hidden = true; state.started = true; state.playing = true; Dino.bgm.stop();
      play(state.round[state.index].zhAudio);
    });
    let t; addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => { measure(); fillBelt(); }, 150); });
    requestAnimationFrame(frame);
  }
  init();
})();

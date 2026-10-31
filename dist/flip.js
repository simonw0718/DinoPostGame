// 郵差翻翻樂（導演 2026-10-21 定版 M2 v7）：聲音信（翻開播英文）配圖片信，配對後跳出中文＋注音、寄進郵袋。
// 開始畫面選 6／8／10 對（預設 8）並放選單 BGM；DINO MODE 跟首頁開關。
// 作答紀錄：聲音信第一次就配對＝一次答對（寫 DinoProgress 與最近 10 回合紀錄）。
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const animate = window.Motion?.animate;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = ms => new Promise(res => setTimeout(res, reduced ? 0 : ms));
  // 動畫在背景分頁可能停住：最多等 ms 就繼續，遊戲不卡住
  const settle = (anim, ms) => Promise.race([anim.finished, wait(ms)]);

  const uiReadings = {
    '郵差翻翻樂': ['ㄧㄡˊ', 'ㄔㄞ', 'ㄈㄢ', 'ㄈㄢ', 'ㄌㄜˋ'],
    '點一下，開始翻信！': ['ㄉㄧㄢˇ', 'ㄧ', 'ㄒㄧㄚˋ', '', 'ㄎㄞ', 'ㄕˇ', 'ㄈㄢ', 'ㄒㄧㄣˋ', ''],
    '先聽聲音，再找圖片': ['ㄒㄧㄢ', 'ㄊㄧㄥ', 'ㄕㄥ', 'ㄧㄣ', '', 'ㄗㄞˋ', 'ㄓㄠˇ', 'ㄊㄨˊ', 'ㄆㄧㄢˋ'],
    '找圖片': ['ㄓㄠˇ', 'ㄊㄨˊ', 'ㄆㄧㄢˋ'],
    '找到了！': ['ㄓㄠˇ', 'ㄉㄠˋ', 'ㄌㄜ˙', ''],
    '再找找看': ['ㄗㄞˋ', 'ㄓㄠˇ', 'ㄓㄠˇ', 'ㄎㄢˋ'],
    '信都配好了！': ['ㄒㄧㄣˋ', 'ㄉㄡ', 'ㄆㄟˋ', 'ㄏㄠˇ', 'ㄌㄜ˙', ''],
    '翻了': ['ㄈㄢ', 'ㄌㄜ˙'],
    '次': ['ㄘˋ'],
    '對': ['ㄉㄨㄟˋ'],
    '再玩一次': ['ㄗㄞˋ', 'ㄨㄢˊ', 'ㄧ', 'ㄘˋ'],
    '回首頁': ['ㄏㄨㄟˊ', 'ㄕㄡˇ', 'ㄧㄝˋ'],
    '知道了': ['ㄓ', 'ㄉㄠˋ', 'ㄌㄜ˙']
  };
  const setKidText = Dino.kidText(uiReadings);

  const couriers = ['chick_abao', 'feifei', 'iggy', 'xiaokong', 'pairo'];
  const poseSrc = (id, pose) => `assets/cast/${id}__${pose}.webp`;
  const prefsKey = 'dinopost-flip-v1';   // 導演 2026-10-21：預設 8 對（可選 6／10）、只混在一起、角色每回合隨機
  const prefs = (() => {
    const base = { pairs: 8 };
    try { const saved = JSON.parse(localStorage.getItem(prefsKey) || '{}'); return [6, 8, 10].includes(saved.pairs) ? { pairs: saved.pairs } : base; } catch { return base; }
  })();
  prefs.dino = Dino.dinoMode();
  const savePrefs = () => { try { localStorage.setItem(prefsKey, JSON.stringify({ pairs: prefs.pairs })); } catch { /* 只影響本頁 */ } };

  const state = { words: [], round: [], cards: [], open: { sound: null, picture: null }, busy: false, flips: 0, matched: 0, audio: null, started: false,
    disabledIds: new Set(), missed: new Set(), progressResults: [] };

  // ---------- 圖 ----------
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

  // 圖幾乎一樣、孩子分不出來的字，不放同一回合（導演 2026-10-23）
  const LOOKALIKE = [['kidapp-quetzalcoatlus', 'kidapp-hatzegopteryx']];

  // ---------- 出題：同一種畫風，避免一回合混雜 ----------
  function pickRound() {
    const pool = state.words.filter(w => !state.disabledIds.has(w.id) && (prefs.dino ? Dino.isDino(w) : !Dino.isDino(w) && !Dino.isNumber(w)) && (w.image || w.sheet));
    const groups = new Map();
    pool.forEach(w => { const g = Dino.visualGroup(w); groups.set(g, [...(groups.get(g) || []), w]); });
    const usable = [...groups.values()].filter(list => list.length >= prefs.pairs);
    const chosen = usable.length ? usable.sort((a, b) => b.length - a.length)[Math.random() < .75 ? 0 : Math.floor(Math.random() * usable.length)] : pool;
    // 中文同字、英文同字或圖太像的不放同一回合，免得孩子以為兩張都對
    const picked = [];
    for (const w of Dino.selectRound(chosen, Dino.loadHistory(), chosen.length)) {
      if (picked.some(p => p.en === w.en || p.zh === w.zh || LOOKALIKE.some(g => g.includes(p.id) && g.includes(w.id)))) continue;
      picked.push(w);
      if (picked.length === prefs.pairs) break;
    }
    return picked;
  }

  // ---------- 版面：挑最接近 0.9 寬高比的格子 ----------
  function layout() {
    const board = $('board');
    const n = state.round.length; if (!n) return;
    const W = board.clientWidth, H = board.clientHeight, gap = 12;
    const options = [];   // 導演 2026-10-21：只要混在一起
    for (let c = 2; c <= 2 * n; c++) if ((2 * n) % c === 0) options.push({ cols: c, rows: 2 * n / c });
    const score = o => {
      const cw = (W - gap * (o.cols - 1)) / o.cols, ch = (H - gap * (o.rows - 1)) / o.rows;
      return Math.abs(Math.log((cw / ch) / .9)) - Math.min(cw, ch) / 2000;
    };
    const best = options.sort((a, b) => score(a) - score(b))[0];
    board.style.setProperty('--cols', best.cols); board.style.setProperty('--rows', best.rows);
    state.cards.forEach(card => {
      const col = card.order % best.cols, row = Math.floor(card.order / best.cols);
      card.el.style.gridColumn = String(col + 1); card.el.style.gridRow = String(row + 1);
    });
  }

  // ---------- 卡片 ----------
  function makeCard(word, type) {
    const el = document.createElement('button');
    el.type = 'button'; el.className = `fs-card ${type}`;
    el.setAttribute('aria-label', type === 'sound' ? '聲音信' : '圖片信');
    const inner = document.createElement('span'); inner.className = 'fs-inner';
    const back = document.createElement('span'); back.className = 'fs-face fs-back';
    const badge = document.createElement('span'); badge.className = 'fs-badge'; badge.textContent = type === 'sound' ? '🔊' : '🖼';
    back.append(badge);
    const front = document.createElement('span'); front.className = 'fs-face fs-front';
    if (type === 'sound') { const s = document.createElement('span'); s.className = 'fs-speaker'; s.textContent = '♫'; front.append(s); }
    else front.append(makeArt(word));
    inner.append(back, front); el.append(inner);
    const card = { el, word, type, matched: false };
    el.addEventListener('click', () => onTap(card));
    return card;
  }

  function say(text) {
    const b = $('bubble'); setKidText(b, text);
    b.classList.remove('is-pop'); void b.offsetWidth; b.classList.add('is-pop');
  }
  function setActor(pose) {
    $('actorImg').src = poseSrc(state.courier, pose);
  }
  function playWord(src) {
    Dino.voice.stop();   // Web Audio：iPhone 計時器觸發也念得出來
    return Dino.voice(src);
  }
  function flip(card, on) { card.el.classList.toggle('is-open', on); }

  async function onTap(card) {
    if (!state.started || state.busy || card.matched) return;
    if (state.open[card.type] === card) {   // 已翻開的聲音信：再點一次再聽
      if (card.type === 'sound') { card.el.classList.remove('is-playing'); void card.el.offsetWidth; card.el.classList.add('is-playing'); playWord(Dino.audioPath(card.word)); }
      return;
    }
    if (state.open[card.type]) flip(state.open[card.type], false);   // 同一種只能開一封：換一封
    state.open[card.type] = card; flip(card, true); Dino.sfx('pop', .5);
    if (card.type === 'sound') { card.el.classList.remove('is-playing'); void card.el.offsetWidth; card.el.classList.add('is-playing'); playWord(Dino.audioPath(card.word)); }
    else if (!state.open.sound) say('先聽聲音，再找圖片');
    const { sound, picture } = state.open;
    if (!sound || !picture) return;
    state.flips++; state.busy = true;
    if (sound.word.id === picture.word.id) await matched(sound, picture);
    else await missed(sound, picture);
    state.open = { sound: null, picture: null }; state.busy = false;
  }

  async function missed(sound, picture) {
    await wait(750);
    [sound, picture].forEach(c => { c.el.classList.remove('is-wrong'); void c.el.offsetWidth; c.el.classList.add('is-wrong'); });
    state.missed.add(sound.word.id);   // 聽了這封聲音信卻配錯：這個字不算一次答對
    Dino.sfx('wrong', .35); say('再找找看');
    await wait(900);
    [sound, picture].forEach(c => { c.el.classList.remove('is-wrong'); flip(c, false); });
  }

  async function matched(sound, picture) {
    const word = sound.word;
    await wait(350);
    sound.matched = picture.matched = true;
    state.progressResults.push(DinoProgress.record(word.id, !state.missed.has(word.id)));
    [sound, picture].forEach(c => { c.el.classList.add('is-matched'); c.el.disabled = true; });
    Dino.sfx('correct', .8); Dino.burst(picture.el); say('找到了！');
    const actor = $('actorImg').parentElement; setActor('cheer'); actor.classList.remove('is-cheer'); void actor.offsetWidth; actor.classList.add('is-cheer');
    // 收件卡：圖＋中文注音＋英文，念中文
    $('revealArt').replaceChildren(makeArt(word));
    setKidText($('revealZh'), word.zh, word.zhuyin);
    $('revealEn').textContent = word.en;
    const reveal = $('reveal'); reveal.hidden = false;
    if (animate) animate(reveal.firstElementChild, { scale: [.4, 1], rotate: [-8, 0], opacity: [0, 1] }, { type: 'spring', stiffness: 260, damping: 16 });
    await wait(450);
    await Promise.race([playWord(word.zhAudio), wait(2600)]);
    await wait(500);
    if (animate) await settle(animate(reveal.firstElementChild, { scale: .3, opacity: 0, y: 180 }, { duration: .35, ease: 'easeIn' }), 500);
    reveal.hidden = true; reveal.firstElementChild.style.transform = ''; reveal.firstElementChild.style.opacity = '';
    // 兩封信飛進郵袋
    const slot = $('slots').children[state.matched];
    const to = slot.getBoundingClientRect();
    await Promise.all([sound, picture].map(c => {
      const r = c.el.getBoundingClientRect();
      const dx = to.left + to.width / 2 - (r.left + r.width / 2), dy = to.top + to.height / 2 - (r.top + r.height / 2);
      return animate ? settle(animate(c.el, { x: dx, y: dy, scale: .15, opacity: .2 }, { duration: .5, ease: [.5, 0, .7, 1] }), 700) : Promise.resolve();
    }));
    [sound, picture].forEach(c => c.el.classList.add('is-gone'));
    slot.replaceChildren(makeArt(word)); slot.classList.add('is-filled'); Dino.sfx('stamp', .8);
    state.matched++;
    setActor('hello');
    if (state.matched === state.round.length) { await wait(500); finish(); }
    else say('找圖片');
  }

  function saveRound() {
    try {
      const results = state.round.map(w => !state.missed.has(w.id));
      const record = { date: new Date().toISOString(), game: 'flip', mode: prefs.dino ? 'dinosaur' : 'all', pairs: state.round.length, flips: state.flips,
        score: results.filter(Boolean).length, total: state.round.length, ids: state.round.map(w => w.id), results };
      localStorage.setItem(Dino.storageKeys.history, JSON.stringify([record, ...Dino.loadHistory()].slice(0, 10)));
    } catch { /* 沒有儲存空間也照樣能玩 */ }
  }

  function finish() {
    saveRound();
    Dino.sfx('finish', .8); Dino.bgm.start();
    const n = state.round.length, f = state.flips;
    const stars = f <= Math.round(n * 1.6) ? 3 : f <= Math.round(n * 2.4) ? 2 : 1;
    $('finishStars').innerHTML = '★★★'.split('').map((s, i) => `<span class="${i < stars ? '' : 'off'}">★</span>`).join('');
    $('finishStars').setAttribute('aria-label', `${stars} 顆星`);
    $('finishFlips').textContent = f;
    $('finishActor').src = poseSrc(state.courier, 'cheer');
    $('finishOverlay').hidden = false;
  }

  function startRound() {
    $('finishOverlay').hidden = true;
    document.documentElement.classList.toggle('dino-mode', prefs.dino);
    state.round = pickRound();
    Dino.preload(state.round.map(Dino.audioPath));
    // 角色每回合隨機，盡量不連續同一位
    state.courier = Dino.shuffle(couriers.filter(id => id !== state.courier))[0];
    state.open = { sound: null, picture: null }; state.busy = false; state.flips = 0; state.matched = 0;
    state.missed = new Set(); state.progressResults = [];
    const sounds = Dino.shuffle(state.round).map(w => makeCard(w, 'sound'));
    const pictures = Dino.shuffle(state.round).map(w => makeCard(w, 'picture'));
    state.cards = Dino.shuffle([...sounds, ...pictures]);
    state.cards.forEach((c, i) => { c.order = i; });
    $('board').replaceChildren(...state.cards.map(c => c.el));
    $('slots').replaceChildren(...state.round.map(() => document.createElement('li')));
    layout();
    state.cards.forEach((c, i) => { c.el.style.setProperty('--deal', `${i * 60}ms`); c.el.style.setProperty('--tilt', `${i % 2 ? 6 : -6}deg`); c.el.classList.add('is-dealt'); });
    setActor('hello'); say('先聽聲音，再找圖片');
  }

  // ---------- 開始畫面：選對數 ----------
  function syncPick() {
    document.querySelectorAll('[data-pick]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.pick) === prefs.pairs)));
  }
  function bindPick() {
    document.querySelectorAll('[data-pick]').forEach(b => b.addEventListener('click', () => {
      const n = Number(b.dataset.pick); if (n === prefs.pairs) return;
      prefs.pairs = n; savePrefs(); syncPick(); startRound();
    }));
    syncPick();
  }

  async function init() {
    setKidText($('title'), '郵差翻翻樂'); setKidText($('readyTitle'), '點一下，開始翻信！');
    setKidText($('finishTitle'), '信都配好了！'); setKidText($('finishFlipsLabel'), '翻了'); setKidText($('finishTimes'), '次');
    setKidText($('playAgain'), '再玩一次'); setKidText($('finishHome'), '回首頁'); setKidText($('pickUnit'), '對');
    Dino.bgm.start(); Dino.menuTaps($('readyOverlay')); Dino.menuTaps($('finishOverlay'));
    bindPick();
    try { state.disabledIds = new Set(JSON.parse(localStorage.getItem(Dino.storageKeys.disabled) || '[]')); } catch { /* 全部可出題 */ }
    state.words = await fetch('data.json').then(r => r.json());
    startRound();
    // 標題列（2026-10-22 統一）：房子回選遊戲首頁；⚙ 回開始畫面（可改對數）；? 玩法框
    document.querySelector('.gh .dino-home').addEventListener('click', e => { e.preventDefault(); Dino.goTo('index.html'); });
    $('menuBtn').addEventListener('click', () => { if (!$('readyOverlay').hidden) return; Dino.sfx('tap', .5); $('readyOverlay').hidden = false; Dino.bgm.start(); });
    const howto = Dino.howto({ preview: 'flip.html', text: '先聽聲音，再找圖片', kid: setKidText, voice: 'flip' });
    $('helpButton').addEventListener('click', () => { Dino.sfx('tap', .5); howto.show(); });
    $('readyStart').addEventListener('click', () => { $('readyOverlay').hidden = true; Dino.bgm.stop(); howto.first().then(() => { state.started = true; }); });
    $('playAgain').addEventListener('click', () => { Dino.bgm.stop(); startRound(); });
    let t; addEventListener('resize', () => { clearTimeout(t); t = setTimeout(layout, 120); });
    window.__flip = state;   // 截圖驗收用
  }
  init();
})();

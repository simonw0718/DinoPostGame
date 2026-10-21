// Shared by index/mail (game-homes.js), match (app.js) and zhuyin-sort (zhuyin-sort.js).
window.Dino = (() => {
  'use strict';
  // Candidate AI pose sheets; not registered as visual masters yet.
  const characters = [
    { id: 'xiaokong', name: '小空', asset: 'xiaokong-poses-v1.png', frames: 2, ratio: 1 },
    { id: 'yuanyuan', name: '圓圓', asset: 'yuanyuan-poses-v1.png', frames: 2, ratio: .75 },
    { id: 'paino', name: '派諾', asset: 'paino-poses-v1.png', frames: 2, ratio: 1 },
    { id: 'shuoshuo', name: '碩碩', asset: 'shuoshuo-poses-v1.png', frames: 2, ratio: .75 },
    { id: 'iggy', name: '伊奇', asset: 'iggy-poses-v1.png', frames: 3, ratio: .5 },
    { id: 'feifei', name: '飛飛', asset: 'feifei-poses-v1.png', frames: 2, ratio: 1 },
    { id: 'chick-abao', name: '小雞阿暴', asset: 'chick-abao-poses-v1.png', frames: 2, ratio: 1 },
    { id: 'shanshan', name: '閃閃', asset: 'shanshan-poses-v1.png', frames: 2, ratio: 1 }
  ];
  // Kid lock for phones: no pinch/double-tap zoom, text selection, long-press menus, image dragging or page bounce.
  // Vertical scrolling stays available as the small-screen fallback; text inputs (word-bank search) stay selectable.
  (function lockTouch() {
    const style = document.createElement('style');
    style.textContent = `html,body{overscroll-behavior:none;overflow-x:hidden;-webkit-text-size-adjust:100%}
body{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}
*{touch-action:manipulation}
img{-webkit-user-drag:none;user-drag:none}
input,textarea{-webkit-user-select:text;user-select:text}`;
    document.head.append(style);
    const block = event => event.preventDefault();
    ['gesturestart', 'gesturechange', 'gestureend'].forEach(type => document.addEventListener(type, block, { passive: false }));
    document.addEventListener('touchmove', event => { if (event.touches.length > 1) event.preventDefault(); }, { passive: false });
    document.addEventListener('contextmenu', event => { if (!event.target.closest('input,textarea')) event.preventDefault(); });
    document.addEventListener('dragstart', event => { if (event.target.tagName === 'IMG') event.preventDefault(); });
  })();
  const storageKeys = { disabled: 'dinopost-disabled-words-v1', history: 'dinopost-round-history-v1' };
  // DINO MODE (director 2026-10-21): one switch on the home page turns every game into dinosaur-only.
  // Off: dinosaurs never enter the normal bank. On: games use the dinosaur bank and the page gets html.dino-mode.
  const dinoModeKey = 'dinopost-dino-mode-v1';
  function dinoMode() { try { return localStorage.getItem(dinoModeKey) === '1'; } catch { return false; } }
  function setDinoMode(on) {
    try { localStorage.setItem(dinoModeKey, on ? '1' : '0'); } catch { /* Stays on for this page only. */ }
    document.documentElement.classList.toggle('dino-mode', Boolean(on));
    bgm.refresh();   // 選單 BGM 跟著換恐龍版
  }
  // A game's task mode ('all' | 'level' | 'dinosaur') resolved against the switch.
  const taskMode = mode => (dinoMode() ? 'dinosaur' : mode === 'dinosaur' ? 'all' : mode);
  document.documentElement.classList.toggle('dino-mode', dinoMode());
  // Back/forward cache can show a page from before the switch changed.
  window.addEventListener('pageshow', event => {
    if (event.persisted && document.documentElement.classList.contains('dino-mode') !== dinoMode()) location.reload();
  });

  function shuffle(source) {
    const items = [...source];
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }
  function loadQueue(key) {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || 'null');
      const valid = new Set(characters.map(character => character.id));
      if (Array.isArray(saved) && saved.length && new Set(saved).size === saved.length && saved.every(id => valid.has(id))) return saved;
    } catch { /* Use a fresh queue when storage is unavailable. */ }
    return shuffle(characters.map(character => character.id));
  }
  function fitActor(actor, ratio) {
    const frame = actor.parentElement;
    if (!frame || !frame.clientWidth || !frame.clientHeight) return;
    const style = getComputedStyle(frame);
    const width = frame.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const height = frame.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    const fittedHeight = Math.max(1, Math.min(height, width / ratio));
    actor.style.width = `${fittedHeight * ratio}px`;
    actor.style.height = `${fittedHeight}px`;
  }

  const onsets = new Set([...'ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙ']);
  const tones = new Set([...'ˊˇˋ˙']);
  function parseZhuyin(reading) {
    const symbols = [...reading];
    let tone = '';
    if (symbols[0] === '˙') tone = symbols.shift();
    else if (tones.has(symbols.at(-1))) tone = symbols.pop();
    const onset = onsets.has(symbols[0]) ? symbols.shift() : '';
    return { onset, rime: symbols, tone };
  }
  function makeBpmUnit(char, reading) {
    const { onset, rime, tone } = parseZhuyin(reading);
    const unit = document.createElement('span'); unit.className = 'bpm-word';
    const character = document.createElement('span'); character.className = 'bpm-main-char'; character.textContent = char;
    const column = document.createElement('span'); column.className = 'bpm-column'; column.lang = 'zh-Bopo'; column.setAttribute('aria-hidden', 'true');
    if (onset) { const symbol = document.createElement('span'); symbol.className = 'bpm-onset'; symbol.textContent = onset; column.append(symbol); }
    rime.forEach(value => { const symbol = document.createElement('span'); symbol.className = 'bpm-rime'; symbol.textContent = value; column.append(symbol); });
    if (tone) { const mark = document.createElement('span'); mark.className = tone === '˙' ? 'bpm-tone-dot' : 'bpm-tone'; mark.textContent = tone; column.append(mark); }
    unit.append(character, column);
    return unit;
  }
  // Returns setKidText bound to one page's reading table.
  function kidText(table) {
    return function setKidText(element, value, readings = table[value]) {
      if (!element) return;
      element.setAttribute('aria-label', value);
      if (!readings || readings.length !== [...value].length) { element.textContent = value; return; }
      element.classList.add('kid-text');
      element.replaceChildren(...[...value].map((char, i) => readings[i] ? makeBpmUnit(char, readings[i]) : document.createTextNode(char)));
    };
  }

  // Word bank plan B (director 2026-10-21): topic = 'group.sub' stable ID, pack 'dino' is the DINO MODE block
  // (no levels), level = { en, zhuyin, hanzi } each 1–3. Rules: reference/topics.json; tool: tools/word_bank.py.
  const isDino = word => word.pack === 'dino';
  const isNumber = word => word.topic === 'number';
  const topicGroup = word => word.topic.split('.')[0];
  function visualGroup(word) {
    if (isNumber(word)) return 'number-emoji';
    if (word.sheet) return `sheet:${word.sheet}`;
    if (word.image) return isDino(word) ? 'dinosaur-image' : 'regular-image';
    return 'emoji';
  }
  // skill: 'en' (找圖片) or 'zhuyin' (注音送信) picks which level the slider filters on.
  function eligibleWords(words, disabledIds, mode, level, skill) {
    return words.filter(word => !disabledIds.has(word.id) && (mode === 'dinosaur'
      ? isDino(word)
      : !isDino(word) && (mode !== 'level' || word.level[skill] === level)));
  }
  function loadHistory() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKeys.history) || '[]');
      return Array.isArray(saved) ? saved.filter(item => item && Array.isArray(item.ids) && Array.isArray(item.results)
        && Number.isFinite(item.score) && Number.isFinite(item.total) && !Number.isNaN(Date.parse(item.date))).slice(0, 10) : [];
    } catch { return []; }
  }
  // Weighted pick: missed words come back more often, the last two rounds less often.
  // Restored 2026-10-21 (director): the stamp-based DinoProgress.selectRound repeated the same words too much.
  function selectRound(pool, history, count) {
    const missed = new Map();
    history.forEach(record => record.ids.forEach((id, index) => {
      if (record.results[index] === false) missed.set(id, (missed.get(id) || 0) + 1);
    }));
    const recent = new Set(history.slice(0, 2).flatMap(record => record.ids));
    return pool.map(word => {
      const weight = 1 + Math.min(3, missed.get(word.id) || 0);
      return { word, priority: Math.pow(Math.random(), 1 / weight) - (recent.has(word.id) ? .3 : 0) };
    }).sort((a, b) => b.priority - a.priority).slice(0, count).map(item => item.word);
  }
  const audioPath = word => `assets/audio/${word.id}.mp3`;

  // Small stamp-and-star burst around an element; skipped when reduced motion is on.
  const burstShapes = ['★', '✦', '✉', '★', '✦', '●'];
  const burstColors = ['#f2b945', '#e76855', '#4fb577', '#5aa7d6', '#f6ac34'];
  function burst(element) {
    if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const box = element.getBoundingClientRect();
    const x = box.left + box.width / 2, y = box.top + box.height / 2;
    for (let i = 0; i < 14; i++) {
      const piece = document.createElement('span');
      piece.className = 'dino-burst';
      piece.setAttribute('aria-hidden', 'true');
      piece.textContent = burstShapes[i % burstShapes.length];
      piece.style.cssText = `position:fixed;left:${x}px;top:${y}px;z-index:60;pointer-events:none;font-size:${14 + Math.random() * 12}px;font-weight:900;color:${burstColors[i % burstColors.length]};line-height:1`;
      document.body.append(piece);
      const angle = (i / 14) * Math.PI * 2 + Math.random() * .4;
      const distance = Math.max(box.width, box.height) * (.55 + Math.random() * .45);
      const dx = Math.cos(angle) * distance, dy = Math.sin(angle) * distance;
      piece.animate([
        { transform: 'translate(-50%,-50%) scale(.3) rotate(0deg)', opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1) rotate(${(Math.random() - .5) * 220}deg)`, opacity: 1, offset: .7 },
        { transform: `translate(calc(-50% + ${dx * 1.1}px), calc(-50% + ${dy * 1.1 + 24}px)) scale(.8)`, opacity: 0 }
      ], { duration: 820 + Math.random() * 260, easing: 'cubic-bezier(.2,.8,.3,1)' }).finished.finally(() => piece.remove());
    }
  }
  // First-try answers in a row that earn the streak message.
  const streakThreshold = 3;

  // 音效與選單 BGM（導演 2026-10-21）：素材出自 media_library（bgm:HAPPY_KIDS、bgm:HAPPY_B、sfx:SFX_點擊／泡泡-單／轉場-咻／恐龍吼叫／恐龍-小恐龍）。
  // BGM 只在首頁與各遊戲選單播；換頁從同一秒接著播。手機每頁都要先有一次點擊才會出聲，所以第一下觸控時才開始。
  // iPhone 上兩個 <audio> 同時播會互搶（點擊音把 BGM 擠掉），所以 BGM 與音效都走同一個 Web Audio 混音器。
  // audioSession=playback：靜音鍵開著也照常出聲（Safari 16.4+）。
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { /* ok */ }
  let ctx = null;
  const buffers = {};
  function audioCtx() {
    if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; ctx = new AC(); }
    return ctx;
  }
  function loadBuffer(url) {
    if (!buffers[url]) buffers[url] = fetch(url).then(r => r.arrayBuffer())
      .then(data => new Promise((res, rej) => audioCtx().decodeAudioData(data, res, rej)))
      .catch(error => { delete buffers[url]; throw error; });
    return buffers[url];
  }
  function sfx(name, volume = .8) {
    const c = audioCtx(); if (!c) return;
    if (c.state !== 'running') c.resume().catch(() => {});
    loadBuffer(`assets/audio/effects/${name}.mp3`).then(buffer => {
      const src = c.createBufferSource(), gain = c.createGain();
      src.buffer = buffer; gain.gain.value = volume;
      src.connect(gain).connect(c.destination); src.start();
    }).catch(() => {});
  }
  const musicKey = 'dinopost-music-v1', bgmPosKey = 'dinopost-bgm-pos';
  const musicOn = () => { try { return localStorage.getItem(musicKey) !== '0'; } catch { return true; } };
  const bgm = (() => {
    let wanted = false, button = null, playing = null;   // playing = { track, src, gain, startedAt, offset, duration }
    const track = () => (dinoMode() ? 'menu-dino' : 'menu');
    const position = () => playing ? (playing.offset + ctx.currentTime - playing.startedAt) % playing.duration : 0;
    function save() {
      if (!playing) return;
      try { sessionStorage.setItem(bgmPosKey, JSON.stringify({ track: playing.track, t: position() })); } catch { /* ok */ }
    }
    function halt() {
      if (!playing) return;
      save();
      const p = playing; playing = null;
      try { p.gain.gain.setTargetAtTime(0, ctx.currentTime, .08); p.src.stop(ctx.currentTime + .4); } catch { /* ok */ }
    }
    let starting = false;
    async function tryPlay() {
      const c = audioCtx(); if (!c) return;
      if (c.state !== 'running') c.resume().catch(() => {});   // 必須在點擊當下呼叫，iPhone 才放行
      if (!wanted || !musicOn() || document.hidden || starting) return;
      const name = track();
      if (playing?.track === name) return;
      halt(); starting = true;
      try {
        const buffer = await loadBuffer(`assets/audio/bgm/${name}.mp3`);
        if (!wanted || !musicOn() || track() !== name || playing) return;
        let offset = 0;
        try { const pos = JSON.parse(sessionStorage.getItem(bgmPosKey) || 'null'); if (pos?.track === name) offset = pos.t % buffer.duration; } catch { /* ok */ }
        const src = c.createBufferSource(), gain = c.createGain();
        src.buffer = buffer; src.loop = true;
        gain.gain.setValueAtTime(0, c.currentTime); gain.gain.linearRampToValueAtTime(.32, c.currentTime + .6);
        src.connect(gain).connect(c.destination); src.start(0, offset);
        playing = { track: name, src, gain, startedAt: c.currentTime, offset, duration: buffer.duration };
      } catch { /* 載入失敗就安靜 */ } finally { starting = false; }
    }
    const sync = () => { if (!button) return; const on = musicOn(); button.setAttribute('aria-pressed', String(on)); button.textContent = on ? '♫' : '♫̸'; button.classList.toggle('off', !on); };
    function ensureButton() {
      if (button) return;
      const style = document.createElement('style');
      style.textContent = `.dino-music{position:fixed;left:max(12px,env(safe-area-inset-left));bottom:max(12px,env(safe-area-inset-bottom));z-index:40;width:44px;height:44px;border:3px solid #fffdf2;border-radius:50%;background:#1f6b4b;color:#fff;font:900 20px/1 system-ui;box-shadow:0 4px 0 #0f3b2a;cursor:pointer}
.dino-music.off{background:#9aa79f;box-shadow:0 4px 0 #6d7a72}.dino-music:active{transform:translateY(3px);box-shadow:0 1px 0 #0f3b2a}`;
      document.head.append(style);
      button = document.createElement('button'); button.type = 'button'; button.className = 'dino-music'; button.setAttribute('aria-label', '背景音樂開關');
      button.addEventListener('click', event => {
        event.stopPropagation();
        try { localStorage.setItem(musicKey, musicOn() ? '0' : '1'); } catch { /* ok */ }
        sync(); musicOn() ? tryPlay() : halt();
      });
      document.body.append(button); sync();
    }
    // 第一下觸控／點擊才能開聲音（iOS）；每次點擊都補一次，被系統暫停也會接回來
    ['touchend', 'click', 'keydown'].forEach(type => document.addEventListener(type, tryPlay, { capture: true, passive: true }));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { save(); ctx?.suspend().catch(() => {}); } else if (wanted) tryPlay();
    });
    addEventListener('pagehide', save);
    // 從上一頁「返回」時（bfcache）頁面不重載，要重新接上
    addEventListener('pageshow', event => { if (event.persisted && wanted) tryPlay(); });
    return {
      start() { wanted = true; ensureButton(); button.hidden = false; loadBuffer(`assets/audio/bgm/${track()}.mp3`).catch(() => {}); tryPlay(); },
      stop() { wanted = false; halt(); if (button) button.hidden = true; },
      refresh() { if (playing && playing.track !== track()) halt(); tryPlay(); }
    };
  })();
  // 選單頁的按鈕點擊音（開關、選項、連結）；遊戲中的按鈕由各遊戲自己決定
  function menuTaps(root = document) {
    root.addEventListener('click', event => {
      const target = event.target.closest('button, a');
      if (!target || target.matches('.dino-music, #dinoModeSwitch')) return;   // DINO MODE 有自己的吼聲
      sfx(target.matches('[aria-pressed], .mode-option, .answer-option') ? 'pop' : 'tap', .6);
    }, true);
  }
  // 點連結先播「咻」再換頁，避免聲音被換頁切掉
  function goTo(href, delay = 180) { sfx('swoosh', .7); setTimeout(() => { location.href = href; }, delay); }

  return { characters, storageKeys, shuffle, loadQueue, fitActor, parseZhuyin, makeBpmUnit, kidText,
    isDino, isNumber, topicGroup, visualGroup, eligibleWords, loadHistory, selectRound, audioPath, burst, streakThreshold, dinoMode, setDinoMode, taskMode,
    sfx, bgm, menuTaps, goTo };
})();

// Shared by index/mail (game-homes.js), match (app.js) and zhuyin-sort (zhuyin-sort.js).
window.Dino = (() => {
  'use strict';
  // 測試用靜音：網址加 ?mute=1 後，同一分頁之後的頁面都不出聲（?mute=0 解除）。
  const muteQ = new URLSearchParams(location.search).get('mute');
  try { if (muteQ !== null) sessionStorage.setItem('dinoMute', muteQ); } catch { /* ok */ }
  let muted = false; try { muted = sessionStorage.getItem('dinoMute') === '1'; } catch { /* ok */ }
  if (muted) { const play = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { this.muted = true; return play.call(this); }; }
  // 鎖住 iOS 整頁上下滑動／彈動：只放行真的捲得動的框（題庫清單、設定框）與滑桿。
  document.documentElement.style.overscrollBehavior = 'none';
  const scrollable = el => {
    for (; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
      const y = getComputedStyle(el).overflowY;
      if ((y === 'auto' || y === 'scroll') && el.scrollHeight > el.clientHeight + 1) return true;
    }
    return false;
  };
  addEventListener('touchmove', e => {
    if (e.touches.length > 1 || e.target.closest?.('input,textarea,select') || scrollable(e.target)) return;
    e.preventDefault();
  }, { passive: false });
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
  // 沒有單字的遊戲（走小路、接信）也寫最近 10 回合紀錄：ids／results 留空，不影響選字
  function saveHistory(record) {
    try {
      localStorage.setItem(storageKeys.history, JSON.stringify([{ date: new Date().toISOString(), ids: [], results: [], ...record }, ...loadHistory()].slice(0, 10)));
    } catch { /* 沒有儲存空間也照樣能玩 */ }
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
    if (muted) return null;   // 測試靜音：音效、BGM 都不啟動
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
  // 念字：跟音效同一個 Web Audio 混音器。iPhone 只要第一次點擊解鎖過，之後計時器觸發也念得出來（<audio> 不行）。
  // 回傳的 Promise 在念完時 resolve，可以串接（例：顏色念完再念形狀）。
  // voice.stop() 也取消「還在下載」的字：下載完不念（2026-10-25 修：第一輪沒快取時，慢到的舊字接在新字後面念，聽起來配錯）
  let voiceEpoch = 0, stopPlaying = () => {};
  function voice(url, volume = 1) {
    const c = audioCtx(); if (!c) return Promise.resolve();
    if (c.state !== 'running') c.resume().catch(() => {});
    const epoch = voiceEpoch;
    return loadBuffer(url).then(buffer => new Promise(done => {
      if (epoch !== voiceEpoch) return done();
      const src = c.createBufferSource(), gain = c.createGain();
      src.buffer = buffer; gain.gain.value = volume; src.onended = done;
      src.connect(gain).connect(c.destination); src.start();
      stopPlaying = () => { src.onended = null; try { src.stop(); } catch { /* ok */ } done(); };
    })).catch(() => {});
  }
  voice.stop = () => { voiceEpoch++; stopPlaying(); stopPlaying = () => {}; };
  // 開局先在背景把這回合的音檔下載解碼好，第一次點也馬上出聲（2026-10-25）
  function preload(urls) { if (!audioCtx()) return; urls.forEach(u => { if (u) loadBuffer(u).catch(() => {}); }); }
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
        gain.gain.setValueAtTime(0, c.currentTime); gain.gain.linearRampToValueAtTime(.1, c.currentTime + .6);
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

  // 玩法預覽小動畫 markup（首頁入口卡＋各遊戲 ? 玩法框共用；樣式 preview.css）。之後新增遊戲只要多一筆
  const pvImg = n => `assets/rebuilt/emoji-6x8-v1/${n}.png`;
  const previews = {
    'match.html': `<div class="pv pv-match" aria-hidden="true"><span class="say"><i>▶</i>duck</span><div class="grid"><b class="ok"><img src="${pvImg('animal-duck')}" alt=""></b><b><img src="${pvImg('animal-fish')}" alt=""></b><b><img src="${pvImg('animal-panda')}" alt=""></b><b><img src="${pvImg('animal-bee')}" alt=""></b></div><span class="tap"></span><span class="seal">OK</span></div>`,
    'mail.html': `<div class="pv pv-mail" aria-hidden="true"><div class="letter"><span>ㄩˊ</span></div><div class="boxes"><b class="ok"><img src="${pvImg('animal-fish')}" alt=""></b><b><img src="${pvImg('animal-duck')}" alt=""></b><b><img src="${pvImg('animal-bee')}" alt=""></b></div><span class="tap"></span><span class="seal">OK</span></div>`,
    'flip.html': `<div class="pv pv-flip" aria-hidden="true"><div class="cards"><b class="snd ok"><i>♫</i></b><b class="pic"></b><b class="snd"></b><b class="pic ok"><i><img src="${pvImg('animal-duck')}" alt=""></i></b></div><span class="tap"></span><span class="seal">OK</span></div>`,
    'belt.html': `<div class="pv pv-belt" aria-hidden="true"><div class="word"><img src="${pvImg('animal-fish')}" alt=""><span class="slot">ㄩ</span><em>ˊ</em></div><div class="belt"><div class="run"><b>ㄧ</b><b class="ok">ㄩ</b><b>ㄨ</b><b>ㄧ</b><b>ㄩ</b><b>ㄨ</b></div></div><span class="tap"></span><span class="seal">OK</span></div>`,
    'path.html': `<div class="pv pv-path" aria-hidden="true"><svg viewBox="0 0 124 96"><path class="road" d="M14 76C42 80 36 28 64 28S90 72 108 42"/><path class="trail" pathLength="100" d="M14 76C42 80 36 28 64 28S90 72 108 42"/><path class="star" d="M48 41l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z"/><g class="box" transform="translate(108 42)"><rect x="-8" y="-18" width="16" height="14" rx="4"/><rect class="post" x="-2" y="-4" width="4" height="12"/></g><image href="assets/cast/iggy__walk_r.webp" x="-9" y="-24" width="18" height="24"><animateMotion dur="3.2s" repeatCount="indefinite" keyPoints="0;0;1;1" keyTimes="0;.15;.85;1" calcMode="linear" path="M14 76C42 80 36 28 64 28S90 72 108 42"/></image></svg><span class="seal">OK</span></div>`,
    'catch.html': `<div class="pv pv-catch" aria-hidden="true"><i class="env e1"></i><i class="env e2"></i><img class="junk" src="assets/rebuilt/emoji-6x8-v1/kidapp-sock.png" alt=""><div class="cart"><img class="who" src="assets/cast/iggy__hello.webp" alt=""><img class="car" src="assets/cast/prop_mail_cart_front.webp" alt=""></div><span class="seal">OK</span></div>`,
    'mole.html': `<div class="pv pv-egg" aria-hidden="true"><i class="nest n1"></i><i class="nest n2"></i><div class="card c1"><img src="assets/rebuilt/emoji-6x8-v1/food-broccoli.png" alt=""></div><div class="card c2"><img src="assets/rebuilt/emoji-6x8-v1/kidapp-sock.png" alt=""></div><i class="egg g1"></i><i class="egg g2"></i><i class="rim n1"></i><i class="rim n2"></i><b class="x">✕</b><i class="tap"></i><span class="seal">OK</span></div>`,
    'pack.html': `<div class="pv pv-pack" aria-hidden="true"><div class="lawn"><i></i><i></i><i></i><i></i><i></i><i></i></div><img class="dino" src="assets/cast/iggy__hello.webp" alt=""><i class="pbox b1"><i class="env"></i></i><i class="pbox b2"></i><span class="seal">OK</span></div>`,
    'dig.html': `<div class="pv pv-dig" aria-hidden="true"><svg viewBox="0 0 124 96"><rect class="soil" x="6" y="30" width="80" height="62" rx="10"/><rect class="grass" x="6" y="28" width="80" height="8" rx="4"/><g class="groove"><path d="M30 44L30 80"/><path d="M30 44H66V78L60 82"/></g><g class="groove-in"><path d="M30 44L30 80"/><path d="M30 44H66V78L60 82"/></g><path class="dug d1" pathLength="100" d="M30 44L30 80"/><path class="dug d2" pathLength="100" d="M30 44H66V78L60 82"/><g class="bone"><path class="bo" d="M30 44L30 80"/><path class="bo" d="M30 44H66V78L60 82"/><path class="bi" d="M30 44L30 80"/><path class="bi" d="M30 44H66V78L60 82"/></g><g class="flag"><path d="M30 44V34"/><path class="cloth" d="M30 34l8 3-8 3z"/></g><circle class="tap" r="7"/><image class="kong" href="assets/cast/xiaokong__cheer.webp" x="86" y="50" width="36" height="44"/><g class="fcard"><rect x="-13" y="-14" width="26" height="28" rx="6"/><text y="7">ㄇ</text></g></svg></div>`,
  };

  // 玩法小框框（樣式 howto.css）：preview＝previews 的 key／html 字串／(stage)=>void 自畫；text 用 kid（頁面的 setKidText）加注音。點哪裡都關
  function howto({ preview, text, kid, onClose } = {}) {
    const root = document.createElement('div'); root.className = 'howto'; root.hidden = true;
    root.innerHTML = '<div class="howto-card" role="dialog" aria-label="玩法"><button class="howto-x" type="button" aria-label="關掉">✕</button><div class="howto-stage"></div><p class="howto-text"></p><button class="howto-ok" type="button">知道了</button></div>';
    document.body.append(root);
    const stage = root.querySelector('.howto-stage'), say = (el, t) => kid ? kid(el, t) : (el.textContent = t);
    say(root.querySelector('.howto-text'), text); say(root.querySelector('.howto-ok'), '知道了');
    if (typeof preview === 'function') { stage.classList.add('is-free'); preview(stage); }
    else { stage.innerHTML = previews[preview] || preview || ''; }
    const fit = () => { const pv = stage.querySelector('.pv'); if (pv && stage.clientWidth) pv.style.transform = `scale(${stage.clientWidth / pv.offsetWidth})`; };
    const hide = () => { if (root.hidden) return; root.hidden = true; sfx('tap', .4); onClose?.(); };
    root.addEventListener('click', hide);
    addEventListener('resize', fit);
    return { el: root, isOpen: () => !root.hidden, hide, show() { root.hidden = false; fit(); } };
  }

  return { voice, characters, storageKeys, shuffle, loadQueue, fitActor, parseZhuyin, makeBpmUnit, kidText,
    isDino, isNumber, topicGroup, visualGroup, eligibleWords, loadHistory, saveHistory, selectRound, audioPath, burst, streakThreshold, dinoMode, setDinoMode, taskMode,
    sfx, bgm, menuTaps, goTo, previews, howto, preload };
})();

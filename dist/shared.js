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

  function visualGroup(word) {
    if (word.category === 'number') return 'number-emoji';
    if (word.sheet) return `sheet:${word.sheet}`;
    if (word.image) return word.category === 'dinosaur' ? 'dinosaur-image' : 'regular-image';
    return 'emoji';
  }
  function eligibleWords(words, disabledIds, mode, level) {
    return words.filter(word => !disabledIds.has(word.id) && (mode === 'dinosaur'
      ? word.category === 'dinosaur'
      : word.category !== 'dinosaur' && (mode !== 'level' || word.difficulty === level)));
  }
  function loadHistory() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKeys.history) || '[]');
      return Array.isArray(saved) ? saved.filter(item => item && Array.isArray(item.ids) && Array.isArray(item.results)
        && Number.isFinite(item.score) && Number.isFinite(item.total) && !Number.isNaN(Date.parse(item.date))).slice(0, 10) : [];
    } catch { return []; }
  }
  // Weighted pick: missed words come back more often, the last two rounds less often.
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

  return { characters, storageKeys, shuffle, loadQueue, fitActor, parseZhuyin, makeBpmUnit, kidText,
    visualGroup, eligibleWords, loadHistory, selectRound, audioPath, burst, streakThreshold };
})();

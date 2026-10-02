(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const state = {
    words: [], round: [], choices: [], index: 0, firstTry: 0, attempts: 0,
    phase: 'loading', armed: false, audio: null, dragX: 0, dragY: 0,
    dragging: false, routeProgress: 0, mode: 'all', level: 1, count: 5, format: 'zhuyin', autoAudio: true,
    nextMode: 'all', nextLevel: 1, nextCount: 5, nextFormat: 'zhuyin', nextAutoAudio: true, activePool: []
  };
  const disabledStorageKey = 'dinopost-disabled-words-v1';
  const historyStorageKey = 'dinopost-round-history-v1';
  const courierStorageKey = 'dinopost-mail-courier-queue-v1';
  const selectionStorageKey = 'dinopost-mail-selection-v1';
  const couriers = [
    { id: 'xiaokong', name: '小空', asset: 'xiaokong-poses-v1.png', frames: 2, ratio: 1 },
    { id: 'yuanyuan', name: '圓圓', asset: 'yuanyuan-poses-v1.png', frames: 2, ratio: .75 },
    { id: 'paino', name: '派諾', asset: 'paino-poses-v1.png', frames: 2, ratio: 1 },
    { id: 'shuoshuo', name: '碩碩', asset: 'shuoshuo-poses-v1.png', frames: 2, ratio: .75 },
    { id: 'iggy', name: '伊奇', asset: 'iggy-poses-v1.png', frames: 3, ratio: .5 },
    { id: 'feifei', name: '飛飛', asset: 'feifei-poses-v1.png', frames: 2, ratio: 1 },
    { id: 'abao', name: '小雞阿暴', asset: 'chick-abao-poses-v1.png', frames: 2, ratio: 1 },
    { id: 'shanshan', name: '閃閃', asset: 'shanshan-poses-v1.png', frames: 2, ratio: 1 }
  ];
  let courierQueue;
  let courierRequest = 0;
  const routePath = $('routePath');
  const routeDone = $('routeDone');
  const routeLength = routePath.getTotalLength();
  routeDone.style.strokeDasharray = String(routeLength);
  routeDone.style.strokeDashoffset = String(routeLength);
  const animate = Motion.animate;
  const sounds = {
    stamp: new Audio('assets/audio/effects/mail-stamp.mp3'),
    finish: new Audio('assets/audio/effects/mail-finish.mp3')
  };
  Object.values(sounds).forEach(sound => { sound.preload = 'auto'; sound.volume = .9; });
  function playSound(kind, startAt = 0) {
    const sound = sounds[kind];
    if (!sound) return;
    if (kind === 'finish') sounds.stamp.pause();
    sound.pause();
    try { sound.currentTime = startAt; } catch { /* Playback still starts from the beginning. */ }
    sound.play().catch(error => console.warn(`${kind} 音效無法播放`, error));
  }
  const bopomofoOnsets = new Set([...'ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙ']);
  const uiReadings = {
    '首頁': ['ㄕㄡˇ', 'ㄧㄝˋ'],
    '第一封信準備好了！': ['ㄉㄧˋ', 'ㄧ', 'ㄈㄥ', 'ㄒㄧㄣˋ', 'ㄓㄨㄣˇ', 'ㄅㄟˋ', 'ㄏㄠˇ', 'ㄌㄜ˙', ''],
    '按開始，聽題目發音。': ['ㄢˋ', 'ㄎㄞ', 'ㄕˇ', '', 'ㄊㄧㄥ', 'ㄊㄧˊ', 'ㄇㄨˋ', 'ㄈㄚ', 'ㄧㄣ', ''],
    '開始送信': ['ㄎㄞ', 'ㄕˇ', 'ㄙㄨㄥˋ', 'ㄒㄧㄣˋ'],
    '再聽音效': ['ㄗㄞˋ', 'ㄊㄧㄥ', 'ㄧㄣ', 'ㄒㄧㄠˋ'],
    '注音送信': ['ㄓㄨˋ', 'ㄧㄣ', 'ㄙㄨㄥˋ', 'ㄒㄧㄣˋ'],
    '英文送信': ['ㄧㄥ', 'ㄨㄣˊ', 'ㄙㄨㄥˋ', 'ㄒㄧㄣˋ'],
    '看單字，送到郵箱': ['ㄎㄢˋ', 'ㄉㄢ', 'ㄗˋ', '', 'ㄙㄨㄥˋ', 'ㄉㄠˋ', 'ㄧㄡˊ', 'ㄒㄧㄤ'],
    '設定': ['ㄕㄜˋ', 'ㄉㄧㄥˋ'],
    '第一次答對': ['ㄉㄧˋ', 'ㄧ', 'ㄘˋ', 'ㄉㄚˊ', 'ㄉㄨㄟˋ'],
    '答對': ['ㄉㄚˊ', 'ㄉㄨㄟˋ'],
    '試玩': ['ㄕˋ', 'ㄨㄢˊ'],
    '郵局': ['ㄧㄡˊ', 'ㄐㄩˊ'],
    '收件地': ['ㄕㄡ', 'ㄐㄧㄢˋ', 'ㄉㄧˋ'],
    '第': ['ㄉㄧˋ'], '封': ['ㄈㄥ'],
    '讀注音，送到郵箱': ['ㄉㄨˊ', 'ㄓㄨˋ', 'ㄧㄣ', '', 'ㄙㄨㄥˋ', 'ㄉㄠˋ', 'ㄧㄡˊ', 'ㄒㄧㄤ'],
    '找圖片郵箱': ['ㄓㄠˇ', 'ㄊㄨˊ', 'ㄆㄧㄢˋ', 'ㄧㄡˊ', 'ㄒㄧㄤ'],
    '拖曳或點選': ['ㄊㄨㄛ', 'ㄧㄝˋ', 'ㄏㄨㄛˋ', 'ㄉㄧㄢˇ', 'ㄒㄩㄢˇ'],
    '恐龍郵局': ['ㄎㄨㄥˇ', 'ㄌㄨㄥˊ', 'ㄧㄡˊ', 'ㄐㄩˊ'],
    '收件確認': ['ㄕㄡ', 'ㄐㄧㄢˋ', 'ㄑㄩㄝˋ', 'ㄖㄣˋ'],
    '重聽': ['ㄔㄨㄥˊ', 'ㄊㄧㄥ'],
    '聽中文': ['ㄊㄧㄥ', 'ㄓㄨㄥ', 'ㄨㄣˊ'],
    '下一封': ['ㄒㄧㄚˋ', 'ㄧ', 'ㄈㄥ'],
    '看成果': ['ㄎㄢˋ', 'ㄔㄥˊ', 'ㄍㄨㄛˇ'],
    '信件準備中': ['ㄒㄧㄣˋ', 'ㄐㄧㄢˋ', 'ㄓㄨㄣˇ', 'ㄅㄟˋ', 'ㄓㄨㄥ'],
    '先點信，再選郵箱': ['ㄒㄧㄢ', 'ㄉㄧㄢˇ', 'ㄒㄧㄣˋ', '', 'ㄗㄞˋ', 'ㄒㄩㄢˇ', 'ㄧㄡˊ', 'ㄒㄧㄤ'],
    '再試一次': ['ㄗㄞˋ', 'ㄕˋ', 'ㄧ', 'ㄘˋ'],
    '配對成功！': ['ㄆㄟˋ', 'ㄉㄨㄟˋ', 'ㄔㄥˊ', 'ㄍㄨㄥ', ''],
    '送達啦！': ['ㄙㄨㄥˋ', 'ㄉㄚˊ', 'ㄌㄚ˙', ''],
    '按下一封，投入郵箱': ['ㄢˋ', 'ㄒㄧㄚˋ', 'ㄧ', 'ㄈㄥ', '', 'ㄊㄡˊ', 'ㄖㄨˋ', 'ㄧㄡˊ', 'ㄒㄧㄤ'],
    '點信，再選郵箱': ['ㄉㄧㄢˇ', 'ㄒㄧㄣˋ', '', 'ㄗㄞˋ', 'ㄒㄩㄢˇ', 'ㄧㄡˊ', 'ㄒㄧㄤ'],
    '選一個郵箱': ['ㄒㄩㄢˇ', 'ㄧ', 'ㄍㄜ˙', 'ㄧㄡˊ', 'ㄒㄧㄤ'],
    '按重聽播放英文': ['ㄢˋ', 'ㄔㄨㄥˊ', 'ㄊㄧㄥ', 'ㄅㄛˋ', 'ㄈㄤˋ', 'ㄧㄥ', 'ㄨㄣˊ'],
    '信件投入郵箱！': ['ㄒㄧㄣˋ', 'ㄐㄧㄢˋ', 'ㄊㄡˊ', 'ㄖㄨˋ', 'ㄧㄡˊ', 'ㄒㄧㄤ', ''],
    '信都送到了！': ['ㄒㄧㄣˋ', 'ㄉㄡ', 'ㄙㄨㄥˋ', 'ㄉㄠˋ', 'ㄌㄜ˙', ''],
    '送信任務完成': ['ㄙㄨㄥˋ', 'ㄒㄧㄣˋ', 'ㄖㄣˋ', 'ㄨˋ', 'ㄨㄢˊ', 'ㄔㄥˊ'],
    '第一次就送對': ['ㄉㄧˋ', 'ㄧ', 'ㄘˋ', 'ㄐㄧㄡˋ', 'ㄙㄨㄥˋ', 'ㄉㄨㄟˋ'],
    '再送一次': ['ㄗㄞˋ', 'ㄙㄨㄥˋ', 'ㄧ', 'ㄘˋ'],
    '回首頁': ['ㄏㄨㄟˊ', 'ㄕㄡˇ', 'ㄧㄝˋ'],
    '第一級單字不足': ['ㄉㄧˋ', 'ㄧ', 'ㄐㄧˊ', 'ㄉㄢ', 'ㄗˋ', 'ㄅㄨˋ', 'ㄗㄨˊ'],
    '題庫載入失敗': ['ㄊㄧˊ', 'ㄎㄨˋ', 'ㄗㄞˋ', 'ㄖㄨˋ', 'ㄕ', 'ㄅㄞˋ'],
    '全部': ['ㄑㄩㄢˊ', 'ㄅㄨˋ'],
    '第一級': ['ㄉㄧˋ', 'ㄧ', 'ㄐㄧˊ'],
    '第二級': ['ㄉㄧˋ', 'ㄦˋ', 'ㄐㄧˊ'],
    '第三級': ['ㄉㄧˋ', 'ㄙㄢ', 'ㄐㄧˊ'],
    '恐龍挑戰': ['ㄎㄨㄥˇ', 'ㄌㄨㄥˊ', 'ㄊㄧㄠˇ', 'ㄓㄢˋ'],
    '可用單字不足': ['ㄎㄜˇ', 'ㄩㄥˋ', 'ㄉㄢ', 'ㄗˋ', 'ㄅㄨˋ', 'ㄗㄨˊ']
  };
  function makeBpmUnit(char, reading) {
    const symbols = [...reading];
    const tone = symbols[0] === '˙' ? symbols.shift() : /[ˊˇˋ˙]$/.test(reading) ? symbols.pop() : '';
    const onset = bopomofoOnsets.has(symbols[0]) ? symbols.shift() : '';
    const unit = document.createElement('span'); unit.className = 'bpm-word';
    const character = document.createElement('span'); character.className = 'bpm-main-char'; character.textContent = char;
    const column = document.createElement('span'); column.className = 'bpm-column'; column.lang = 'zh-Bopo'; column.setAttribute('aria-hidden', 'true');
    if (onset) { const symbol = document.createElement('span'); symbol.className = 'bpm-onset'; symbol.textContent = onset; column.append(symbol); }
    symbols.forEach(value => { const symbol = document.createElement('span'); symbol.className = 'bpm-rime'; symbol.textContent = value; column.append(symbol); });
    if (tone) { const mark = document.createElement('span'); mark.className = tone === '˙' ? 'bpm-tone-dot' : 'bpm-tone'; mark.textContent = tone; column.append(mark); }
    unit.append(character, column);
    return unit;
  }
  function setKidText(element, value, readings = uiReadings[value]) {
    if (!element) return;
    element.setAttribute('aria-label', value);
    if (!readings || readings.length !== [...value].length) { element.textContent = value; return; }
    element.classList.add('kid-text');
    element.replaceChildren(...[...value].map((char, index) => readings[index] ? makeBpmUnit(char, readings[index]) : document.createTextNode(char)));
  }
  function makeKidSpan(value) { const span = document.createElement('span'); setKidText(span, value); return span; }
  function annotateStaticUI() {
    const pairs = [
      ['homeLabel', '回首頁'], ['brandTitle', '恐龍郵局'], ['modeTitle', '注音送信'], ['settingsLabel', '設定'],
      ['routeStart', '郵局'], ['routeEnd', '收件地'], ['instructionText', '讀注音，送到郵箱'],
      ['letterTo', '找圖片郵箱'], ['letterHint', '拖曳或點選'],
      ['backBrand', '恐龍郵局'], ['backConfirm', '收件確認'], ['replayLabel', '重聽'],
      ['nextLabel', '下一封'], ['finishCopy', '信都送到了！'],
      ['finishTitle', '送信任務完成'], ['playAgainButton', '再送一次'], ['finishHome', '回首頁'],
      ['finishSoundLabel', '再聽音效'],
      ['readyTitle', '第一封信準備好了！'], ['readyHint', '按開始，聽題目發音。'],
      ['readyButtonLabel', '開始送信'], ['readyHome', '回首頁']
    ];
    pairs.forEach(([id, value]) => setKidText($(id), value));
    setStatus('信件準備中');
    updateScore();
  }
  function updateScore() {
    $('scoreText').setAttribute('aria-label', `第一次答對 ${state.firstTry} 封`);
    $('scoreText').replaceChildren(makeKidSpan('答對'), document.createTextNode(` ${state.firstTry}／${state.count} `), makeKidSpan('封'));
  }

  function shuffle(source) {
    const items = [...source];
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }
  function loadCourierQueue() {
    try {
      const saved = JSON.parse(localStorage.getItem(courierStorageKey) || 'null');
      const valid = new Set(couriers.map(courier => courier.id));
      if (Array.isArray(saved) && saved.length && new Set(saved).size === saved.length && saved.every(id => valid.has(id))) return saved;
    } catch { /* Use a fresh queue when storage is unavailable. */ }
    return shuffle(couriers.map(courier => courier.id));
  }
  function pickCourier() {
    if (!courierQueue?.length) courierQueue = loadCourierQueue();
    const id = courierQueue.shift();
    try { localStorage.setItem(courierStorageKey, JSON.stringify(courierQueue)); } catch { /* Rotation still works for this visit. */ }
    const courier = couriers.find(item => item.id === id);
    const actor = $('routeCourier');
    const art = actor.querySelector('.courier-art');
    const request = ++courierRequest;
    const image = new Image();
    image.onload = () => {
      if (request !== courierRequest) return;
      actor.dataset.character = courier.id;
      actor.title = `${courier.name}正在送信`;
      actor.style.aspectRatio = String(courier.ratio);
      art.style.backgroundImage = `url('${image.src}')`;
      art.style.backgroundSize = `${courier.frames * 100}% 100%`;
    };
    image.onerror = () => {
      if (request !== courierRequest) return;
      actor.dataset.character = 'feifei';
      actor.title = '飛飛正在送信';
      actor.style.aspectRatio = '1';
      art.style.backgroundImage = "url('assets/feifei-poses-v1.png')";
      art.style.backgroundSize = '200% 100%';
    };
    image.src = `assets/${courier.asset}`;
  }
  function visualGroup(word) {
    if (word.category === 'number') return 'number-emoji';
    if (word.sheet) return `sheet:${word.sheet}`;
    if (word.image) return word.category === 'dinosaur' ? 'dinosaur-image' : 'regular-image';
    return 'emoji';
  }
  function eligibleWords(mode = state.mode, level = state.level) {
    return state.words.filter(word => !state.disabledIds.has(word.id) && (mode === 'dinosaur'
      ? word.category === 'dinosaur'
      : word.category !== 'dinosaur' && (mode !== 'level' || word.difficulty === level)));
  }
  function modeLabel(mode = state.nextMode, level = state.nextLevel) {
    return mode === 'dinosaur' ? '恐龍挑戰' : mode === 'level' ? ['第一級', '第二級', '第三級'][level - 1] : '全部';
  }
  function saveSelection() {
    try { localStorage.setItem(selectionStorageKey, JSON.stringify({ mode: state.nextMode, level: state.nextLevel, count: state.nextCount, format: state.nextFormat, autoAudio: state.nextAutoAudio })); } catch { /* Selection still works for this visit. */ }
  }
  function renderSelectionControls() {
    document.querySelectorAll('.mail-mode-option').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mailMode === state.nextMode)));
    $('mailLevelControl').hidden = state.nextMode !== 'level';
    $('mailLevelSlider').value = String(state.nextLevel);
    $('mailLevelText').textContent = ['第一級', '第二級', '第三級'][state.nextLevel - 1];
    document.querySelectorAll('.mail-format-option').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mailFormat === state.nextFormat)));
    $('mailAutoAudio').checked = state.nextAutoAudio; $('mailCount').value = String(state.nextCount); $('mailCountValue').value = String(state.nextCount);
    $('mailSelectionSummary').textContent = `下一回合：${modeLabel()} · ${state.nextFormat === 'english' ? '看英文單字' : '看注音'} · ${state.nextCount} 封`;
  }
  function setMode(mode) {
    if (!['all', 'level', 'dinosaur'].includes(mode)) return;
    state.nextMode = mode;
    saveSelection();
    renderSelectionControls();
  }
  function setLevel(value) {
    state.nextLevel = Math.max(1, Math.min(3, Number(value) || 1));
    saveSelection();
    renderSelectionControls();
  }
  function setFormat(format) {
    if (!['zhuyin', 'english'].includes(format)) return;
    state.nextFormat = format; saveSelection(); renderSelectionControls();
  }
  function setCount(value) {
    state.nextCount = Math.max(3, Math.min(10, Number(value) || 5));
    saveSelection(); renderSelectionControls();
  }
  function setAutoAudio(value) {
    state.nextAutoAudio = Boolean(value); saveSelection(); renderSelectionControls();
  }
  function selectRound(pool) {
    let history = [];
    try { history = JSON.parse(localStorage.getItem(historyStorageKey) || '[]'); } catch { /* Use unweighted order. */ }
    if (!Array.isArray(history)) history = [];
    const missed = new Map();
    history.forEach(record => {
      if (!Array.isArray(record?.ids)) return;
      record.ids.forEach((id, index) => { if (record.results?.[index] === false) missed.set(id, (missed.get(id) || 0) + 1); });
    });
    const recent = new Set(history.slice(0, 2).flatMap(record => Array.isArray(record?.ids) ? record.ids : []));
    return pool.map(word => ({ word, priority: Math.pow(Math.random(), 1 / (1 + Math.min(3, missed.get(word.id) || 0))) - (recent.has(word.id) ? .3 : 0) }))
      .sort((a, b) => b.priority - a.priority).slice(0, state.count).map(item => item.word);
  }
  function setStatus(message) { setKidText($('status'), message); }
  function duration(seconds) { return reducedMotion.matches ? .01 : seconds; }
  function setRoute(progress) {
    state.routeProgress = progress;
    const point = routePath.getPointAtLength(routeLength * progress);
    $('routeCourier').style.left = `${point.x / 10}%`;
    $('routeCourier').style.top = `${point.y / 140 * 100}%`;
    routeDone.style.strokeDashoffset = String(routeLength * (1 - progress));
    [...$('routeStops').children].forEach((stop, index) => stop.classList.toggle('done', index / state.count <= progress + .001));
  }
  function buildRouteStops() {
    const ns = 'http://www.w3.org/2000/svg';
    $('routeStops').replaceChildren();
    for (let i = 0; i <= state.count; i++) {
      const point = routePath.getPointAtLength(routeLength * i / state.count);
      const circle = document.createElementNS(ns, 'circle');
      circle.classList.add('route-stop');
      circle.setAttribute('cx', point.x);
      circle.setAttribute('cy', point.y);
      circle.setAttribute('r', i === state.count ? '15' : '12');
      $('routeStops').append(circle);
    }
    setRoute(0);
  }
  function renderReading(word) {
    const container = $('letterReading');
    container.replaceChildren();
    container.classList.toggle('is-english', state.format === 'english');
    container.classList.toggle('is-long', word.zhuyin.length > 3);
    if (state.format === 'english') { container.textContent = word.en; $('letterDrag').setAttribute('aria-label', `拿起英文信件：${word.en}`); return; }
    for (const raw of word.zhuyin) {
      const chars = [...raw];
      const neutral = chars[0] === '˙' || chars.at(-1) === '˙';
      const tone = chars[0] === '˙' ? chars.shift() : /[ˊˇˋ˙]$/.test(raw) ? chars.pop() : '';
      const syllable = document.createElement('span');
      syllable.className = 'zy-syllable';
      const main = document.createElement('span');
      main.className = 'zy-main';
      main.setAttribute('lang', 'zh-Bopo');
      chars.forEach(char => {
        const symbol = document.createElement('span');
        symbol.className = 'zy-symbol';
        symbol.textContent = char;
        main.append(symbol);
      });
      syllable.append(main);
      if (tone) {
        const mark = document.createElement('span');
        mark.className = 'zy-tone' + (neutral ? ' neutral' : '');
        mark.textContent = tone;
        syllable.append(mark);
      }
      container.append(syllable);
    }
    $('letterDrag').setAttribute('aria-label', `拿起注音信件：${word.zhuyin.join('，')}`);
  }
  function makeArt(word) {
    let art;
    if (word.category !== 'number' && word.image) {
      art = document.createElement('img');
      art.src = word.image;
      art.alt = '';
      art.addEventListener('error', () => { const fallback = document.createElement('span'); fallback.className = 'mailbox-art'; fallback.textContent = word.emoji; art.replaceWith(fallback); }, { once: true });
    } else {
      art = document.createElement('span');
      if (word.sheet && Number.isInteger(word.cell)) {
        art.className = `mailbox-art sheet ${word.sheet}`;
        art.style.backgroundImage = `url('assets/${word.sheet}-grid-v1.png')`;
        art.style.backgroundPosition = `${(word.cell % 5) * 25}% ${word.cell < 5 ? 0 : 100}%`;
      } else art.textContent = word.emoji;
    }
    art.classList.add('mailbox-art');
    art.setAttribute('aria-hidden', 'true');
    return art;
  }
  function choicesFor(word, pool) {
    const sameVisual = pool.filter(item => item.id !== word.id && visualGroup(item) === visualGroup(word) && item.zh !== word.zh);
    const candidates = shuffle(sameVisual.filter(item => item.category === word.category))
      .concat(shuffle(sameVisual.filter(item => item.category !== word.category)));
    const seen = new Set([word.zh]);
    const other = [];
    for (const item of candidates) {
      if (seen.has(item.zh)) continue;
      seen.add(item.zh);
      other.push(item);
      if (other.length === 2) break;
    }
    if (other.length !== 2) throw Error(`這個單字找不到三個同風格郵箱：${word.id}`);
    return shuffle([word, ...other]);
  }
  function renderMailboxes(options) {
    $('mailboxes').replaceChildren(...options.map((word, index) => {
      const button = document.createElement('button');
      button.className = 'mailbox';
      button.type = 'button';
      button.dataset.wordId = word.id;
      button.setAttribute('aria-label', `郵箱 ${index + 1}：${word.zh}`);
      const roof = document.createElement('span'); roof.className = 'mailbox-roof';
      const emblem = document.createElement('span'); emblem.className = 'mailbox-emblem'; emblem.textContent = 'P';
      const slot = document.createElement('span'); slot.className = 'mailbox-slot';
      roof.append(emblem, slot);
      const body = document.createElement('span'); body.className = 'mailbox-body';
      const windowEl = document.createElement('span'); windowEl.className = 'mailbox-window';
      windowEl.append(makeArt(word));
      body.append(windowEl);
      const base = document.createElement('span'); base.className = 'mailbox-base';
      button.append(roof, body, base);
      button.addEventListener('click', () => {
        if (state.phase !== 'question') return;
        if (!state.armed) {
          setStatus('先點信，再選郵箱');
          animate($('letterVisual'), { rotate: [0, -2, 2, 0], scale: [1, 1.035, 1] }, { duration: duration(.38) });
          return;
        }
        answer(word, button);
      });
      return button;
    }));
  }
  function resetLetter() {
    const letter = $('letterDrag');
    if (state.phase !== 'question') return;
    animate(letter, { transform: [`translate3d(${state.dragX}px, ${state.dragY}px, 0)`, 'translate3d(0px, 0px, 0)'] },
      { type: 'spring', stiffness: 270, damping: 21, duration: duration(.5) }).finished.then(() => {
        if (state.phase === 'question' && !state.dragging) letter.style.transform = 'translate3d(0px, 0px, 0)';
      });
    state.dragX = 0; state.dragY = 0;
    letter.classList.remove('is-dragging');
  }
  function playEnglish(word) {
    if (state.audio) { state.audio.pause(); state.audio.currentTime = 0; }
    state.audio = new Audio(`assets/audio/${word.id}.mp3`);
    state.audio.play().catch(() => setStatus('按重聽播放英文'));
  }
  function playChinese(word) {
    if (!word?.zhAudio) return;
    if (state.audio) { state.audio.pause(); state.audio.currentTime = 0; }
    state.audio = new Audio(word.zhAudio);
    state.audio.play().catch(() => setStatus('按重聽播放中文'));
  }
  function playPrompt(word) {
    if (state.format === 'zhuyin') playChinese(word);
    else playEnglish(word);
  }
  function flyLetterTo(mailbox) {
    const letter = $('letterDrag');
    const start = letter.getBoundingClientRect();
    const end = mailbox.querySelector('.mailbox-slot').getBoundingClientRect();
    const copy = $('letterVisual').cloneNode(true);
    copy.removeAttribute('id');
    copy.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
    copy.classList.add('flying-letter');
    Object.assign(copy.style, { position: 'fixed', zIndex: '40', left: `${start.left}px`, top: `${start.top}px`,
      width: `${start.width}px`, height: `${start.height}px`, pointerEvents: 'none', margin: '0' });
    document.body.append(copy);
    letter.style.visibility = 'hidden';
    const dx = end.left + end.width / 2 - start.left - start.width / 2;
    const dy = end.top + end.height / 2 - start.top - start.height / 2;
    return animate(copy, {
      transform: ['translate3d(0px,0px,0) scale(1) rotate(0deg)', `translate3d(${dx}px,${dy}px,0) scale(.14) rotate(-4deg)`],
      opacity: [1, 1, 0]
    }, { duration: duration(.72), ease: [0.22, 0.8, 0.25, 1] }).finished.then(() => copy.remove());
  }
  function answer(word, mailbox) {
    if (state.phase !== 'question') return;
    state.attempts++;
    const correct = word.id === state.round[state.index].id;
    if (!correct) {
      mailbox.classList.remove('is-target');
      mailbox.classList.add('is-wrong');
      setTimeout(() => mailbox.classList.remove('is-wrong'), 380);
      setStatus('再試一次');
      if (!state.dragging) resetLetter();
      return;
    }
    state.phase = 'flipping';
    if (state.audio) { state.audio.pause(); state.audio.currentTime = 0; }
    playSound('stamp');
    state.firstTry += Number(state.attempts === 1);
    updateScore();
    state.armed = false;
    $('letterDrag').classList.remove('is-armed', 'is-dragging');
    document.querySelectorAll('.mailbox').forEach(button => { button.disabled = true; button.classList.remove('is-target'); });
    mailbox.classList.add('accepted');
    state.selectedMailbox = mailbox;
    state.dragX = 0; state.dragY = 0;
    $('letterDrag').style.transform = 'translate3d(0px, 0px, 0)';
    setKidText($('revealChinese'), state.round[state.index].zh, state.round[state.index].zhuyin);
    $('revealChinese').classList.toggle('is-long', state.round[state.index].zh.length > 3);
    $('revealEnglish').textContent = state.round[state.index].en;
    setStatus('配對成功！');
    // Prompt audio belongs to the question and follows the auto-play switch.
    $('letterDrag').classList.add('is-flipped');
    $('letterDrag').setAttribute('aria-label', `答案：${state.round[state.index].zh}，${state.round[state.index].en}`);
    window.setTimeout(() => {
      if (state.phase !== 'flipping') return;
      $('backPostmark').classList.add('is-stamping');
      $('replayButton').hidden = false;
      $('replayButton').setAttribute('aria-label', state.format === 'zhuyin' ? '重聽中文發音' : '重聽英文發音');
      setKidText($('replayLabel'), '重聽');
      state.phase = 'reveal';
      $('nextButton').hidden = false;
      setKidText($('nextLabel'), state.index === state.count - 1 ? '看成果' : '下一封');
      setStatus('送達啦！');
    }, reducedMotion.matches ? 20 : 620);
  }
  function renderQuestion() {
    const word = state.round[state.index];
    state.phase = 'question'; state.attempts = 0; state.armed = false;
    state.dragX = 0; state.dragY = 0; state.dragging = false;
    $('progressLabel').setAttribute('aria-label', `第 ${state.index + 1}／${state.count} 封`);
    $('progressLabel').replaceChildren(makeKidSpan('第'), document.createTextNode(` ${state.index + 1}／${state.count} `), makeKidSpan('封'));
    $('nextButton').hidden = true;
    $('replayButton').hidden = false;
    $('replayButton').setAttribute('aria-label', state.format === 'zhuyin' ? '播放中文發音' : '播放英文發音');
    $('backPostmark').classList.remove('is-stamping');
    const letter = $('letterDrag');
    letter.hidden = false; letter.style.visibility = '';
    letter.style.transform = 'translate3d(0px,0px,0)';
    letter.classList.remove('is-armed', 'is-dragging', 'is-flipped');
    renderReading(word);
    setKidText($('instructionText'), state.format === 'english' ? '看單字，送到郵箱' : '讀注音，送到郵箱');
    state.choices = choicesFor(word, state.activePool);
    renderMailboxes(state.choices);
    setStatus('點信，再選郵箱');
    if (state.audio) { state.audio.pause(); state.audio.currentTime = 0; }
    if (state.autoAudio) playPrompt(word);
    const bag = document.querySelector('.mail-sack').getBoundingClientRect();
    const destination = letter.getBoundingClientRect();
    const dx = bag.left + bag.width * .55 - (destination.left + destination.width / 2);
    const dy = bag.top + bag.height * .38 - (destination.top + destination.height / 2);
    document.querySelector('.mail-conveyor').classList.add('is-running');
    animate(letter, { transform: [`translate3d(${dx}px,${dy}px,0) rotate(-13deg) scale(.42)`, 'translate3d(0px,0px,0) rotate(0deg) scale(1)'], opacity: [.75, 1] },
      { type: 'spring', stiffness: 245, damping: 20, duration: duration(.72) }).finished.then(() => {
        if (state.phase === 'question' && !state.dragging) letter.style.transform = 'translate3d(0px,0px,0)';
        document.querySelector('.mail-conveyor').classList.remove('is-running');
      });
  }
  function saveRound() {
    try {
      const history = JSON.parse(localStorage.getItem(historyStorageKey) || '[]');
      const record = { date: new Date().toISOString(), game: 'zhuyin-sort', mode: state.mode, level: state.level,
        score: state.firstTry, total: state.count, ids: state.round.map(word => word.id),
        results: [...state.answerResults] };
      localStorage.setItem(historyStorageKey, JSON.stringify([record, ...(Array.isArray(history) ? history : [])].slice(0, 10)));
    } catch { /* The prototype works even when local storage is unavailable. */ }
  }
  function finishRound() {
    state.phase = 'finish';
    $('finishScore').setAttribute('aria-label', `第一次就送對 ${state.firstTry}／${state.count} 封`);
    $('finishScore').replaceChildren(makeKidSpan('第一次就送對'), document.createTextNode(` ${state.firstTry}／${state.count} `), makeKidSpan('封'));
    $('finishOverlay').hidden = false;
    animate(document.querySelector('.finish-card'), { opacity: [0, 1], scale: [.8, 1] }, { type: 'spring', stiffness: 190, damping: 16, duration: duration(.6) });
    saveRound();
  }
  async function nextQuestion() {
    if (state.phase !== 'reveal') return;
    if (state.index === state.count - 1) playSound('finish');
    state.phase = 'mailing';
    $('nextButton').hidden = true;
    $('replayButton').hidden = true;
    setStatus('信件投入郵箱！');
    document.querySelector('.mail-conveyor').classList.add('is-running');
    await flyLetterTo(state.selectedMailbox);
    document.querySelector('.mail-conveyor').classList.remove('is-running');
    const start = state.index / state.count;
    const end = (state.index + 1) / state.count;
    await animate(start, end, { duration: duration(.64), ease: 'easeInOut', onUpdate: setRoute }).finished;
    setRoute(end);
    state.answerResults[state.index] = state.attempts === 1;
    state.index++;
    if (state.index >= state.count) finishRound();
    else renderQuestion();
  }
  function startRound() {
    if (!state.words.length) return false;
    try {
      const saved = JSON.parse(localStorage.getItem(disabledStorageKey) || '[]');
      if (Array.isArray(saved)) state.disabledIds = new Set(saved);
    } catch { /* Keep current word bank. */ }
    const pool = eligibleWords(state.nextMode, state.nextLevel);
    const usable = pool.filter(word => {
      const meanings = new Set(pool.filter(other => visualGroup(other) === visualGroup(word) && other.id !== word.id).map(other => other.zh));
      meanings.delete(word.zh);
      return meanings.size >= 2;
    });
    if (usable.length < state.nextCount) { setStatus('可用單字不足'); return false; }
    state.mode = state.nextMode; state.level = state.nextLevel; state.count = state.nextCount; state.format = state.nextFormat; state.autoAudio = state.nextAutoAudio;
    buildRouteStops();
    state.activePool = pool;
    setKidText($('mailModeBadge'), modeLabel(state.mode, state.level));
    state.round = selectRound(usable);
    state.index = 0; state.firstTry = 0; state.answerResults = [];
    updateScore();
    $('finishOverlay').hidden = true;
    setKidText($('modeTitle'), state.format === 'english' ? '英文送信' : '注音送信');
    pickCourier();
    setRoute(0);
    renderQuestion();
    return true;
  }
  function initDrag() {
    interact('#letterDrag').draggable({
      inertia: false,
      autoScroll: false,
      listeners: {
        start() {
          if (state.phase !== 'question') return;
          state.dragging = true; state.armed = true;
          $('letterDrag').classList.add('is-dragging', 'is-armed');
          animate($('letterVisual'), { scale: 1.055, rotate: -2 },
            { type: 'spring', stiffness: 360, damping: 21, duration: duration(.25) });
        },
        move(event) {
          if (state.phase !== 'question' || !state.dragging) return;
          state.dragX += event.dx; state.dragY += event.dy;
          $('letterDrag').style.transform = `translate3d(${state.dragX}px, ${state.dragY}px, 0)`;
          $('letterVisual').style.rotate = `${Math.max(-7, Math.min(7, event.dx * .7))}deg`;
        },
        end() {
          state.dragging = false;
          $('letterVisual').style.rotate = '';
          animate($('letterVisual'), { scale: 1, rotate: 0 },
            { type: 'spring', stiffness: 280, damping: 18, duration: duration(.3) });
          if (state.phase === 'question') resetLetter();
        }
      }
    });
    interact('.mailbox').dropzone({
      overlap: 'pointer',
      ondragenter(event) { if (state.phase === 'question') event.target.classList.add('is-target'); },
      ondragleave(event) { event.target.classList.remove('is-target'); },
      ondrop(event) {
        if (state.phase !== 'question') return;
        const mailbox = event.target;
        const word = state.choices.find(item => item.id === mailbox.dataset.wordId);
        if (word) answer(word, mailbox);
      },
      ondropdeactivate(event) { event.target.classList.remove('is-target'); }
    });
    $('letterDrag').addEventListener('click', () => {
      if (state.phase !== 'question' || state.dragging) return;
      state.armed = true;
      $('letterDrag').classList.add('is-armed');
      setStatus('選一個郵箱');
      animate($('letterVisual'), { scale: [1, 1.05, 1], rotate: [0, -2, 0] }, { duration: duration(.32) });
    });
    $('letterDrag').addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); $('letterDrag').click(); }
    });
  }
  async function init() {
    annotateStaticUI();
    buildRouteStops();
    initDrag();
    $('settingsButton').addEventListener('click', () => $('settingsDialog').showModal());
    if (new URLSearchParams(location.search).has('settings')) $('settingsDialog').showModal();
    $('closeSettings').addEventListener('click', () => $('settingsDialog').close());
    $('restartFromSettings').addEventListener('click', () => { $('settingsDialog').close(); startRound(); });
    document.querySelectorAll('.mail-mode-option').forEach(button => button.addEventListener('click', () => setMode(button.dataset.mailMode)));
    document.querySelectorAll('.mail-format-option').forEach(button => button.addEventListener('click', () => setFormat(button.dataset.mailFormat)));
    $('mailAutoAudio').addEventListener('change', event => setAutoAudio(event.target.checked));
    $('mailCount').addEventListener('input', event => setCount(event.target.value));
    $('mailLevelSlider').addEventListener('input', event => setLevel(event.target.value));
    $('playAgainButton').addEventListener('click', startRound);
    $('finishSoundButton').addEventListener('click', () => playSound('finish', .68));
    $('readyButton').addEventListener('click', () => {
      if (startRound()) $('readyOverlay').hidden = true;
    });
    $('nextButton').addEventListener('click', nextQuestion);
    $('replayButton').addEventListener('click', () => { const word = state.round[state.index]; if (word) playPrompt(word); });
    try {
      const response = await fetch('data.json?v=20261001');
      if (!response.ok) throw Error(`HTTP ${response.status}`);
      state.words = await response.json();
      try {
        const savedSelection = JSON.parse(localStorage.getItem(selectionStorageKey) || 'null');
        if (['all', 'level', 'dinosaur'].includes(savedSelection?.mode)) state.nextMode = savedSelection.mode;
        if (Number.isInteger(savedSelection?.level) && savedSelection.level >= 1 && savedSelection.level <= 3) state.nextLevel = savedSelection.level;
        if (['zhuyin', 'english'].includes(savedSelection?.format)) state.nextFormat = savedSelection.format;
        if (typeof savedSelection?.autoAudio === 'boolean') state.nextAutoAudio = savedSelection.autoAudio;
        if (Number.isInteger(savedSelection?.count) && savedSelection.count >= 3 && savedSelection.count <= 10) state.nextCount = savedSelection.count;
      } catch { /* Keep default selection. */ }
      renderSelectionControls();
      const allIds = new Set(state.words.map(word => word.id));
      state.disabledIds = new Set();
      try {
        const disabled = JSON.parse(localStorage.getItem(disabledStorageKey) || '[]');
        if (Array.isArray(disabled)) state.disabledIds = new Set(disabled.filter(id => allIds.has(id)));
      } catch { /* Ignore invalid saved settings. */ }
      if (state.nextAutoAudio) {
        $('readyOverlay').hidden = false;
        $('readyButton').focus();
      } else startRound();
    } catch (error) {
      console.error(error);
      setStatus('題庫載入失敗');
    }
  }
  init();
})();

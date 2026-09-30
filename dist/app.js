const $ = (id) => document.getElementById(id);
const screens = ['startScreen', 'playScreen', 'resultScreen'];
const state = { words: [], disabledIds: new Set(), roundChoices: [], count: 5, mode: 'all', level: 1, round: [], index: 0, firstTryScore: 0, attempts: 0, results: [], phase: 'start', audio: null, completedRounds: 0, screenCasts: { start: [], play: [], result: [] }, characterQueue: [] };
const bankStorageKey = 'dinopost-disabled-words-v1';
const characterStorageKey = 'dinopost-character-queue-v2';
const characters = [
  { id: 'xiaokong', name: '小空', asset: 'xiaokong-poses-v1.png', frames: 2, ratio: 1 },
  { id: 'yuanyuan', name: '圓圓', asset: 'yuanyuan-poses-v1.png', frames: 2, ratio: .75 },
  { id: 'paino', name: '派諾', asset: 'paino-poses-v1.png', frames: 2, ratio: 1 },
  { id: 'shuoshuo', name: '碩碩', asset: 'shuoshuo-poses-v1.png', frames: 2, ratio: .75 },
  { id: 'iggy', name: '伊奇', asset: 'iggy-poses-v1.png', frames: 3, ratio: .5 },
  { id: 'feifei', name: '飛飛', asset: 'feifei-poses-v1.png', frames: 2, ratio: 1 },
  { id: 'abao', name: '小雞阿暴', asset: 'chick-abao-poses-v1.png', frames: 2, ratio: 1 }
];
function saveCharacterQueue() {
  try { localStorage.setItem(characterStorageKey, JSON.stringify(state.characterQueue)); } catch {}
}
function loadCharacterQueue() {
  try {
    const saved = JSON.parse(localStorage.getItem(characterStorageKey) || 'null');
    const valid = new Set(characters.map(character => character.id));
    if (Array.isArray(saved) && saved.length && new Set(saved).size === saved.length && saved.every(id => valid.has(id))) return saved;
  } catch {}
  return shuffle(characters.map(character => character.id));
}
function setActorPose(actor, pose) {
  const character = characters.find(item => item.id === actor.dataset.character);
  if (!character) return;
  actor.style.backgroundPosition = pose === 'celebrate' ? '100% 0' : pose === 'listen' && character.frames === 3 ? '50% 0' : '0 0';
}
function fitActor(actor) {
  const character = characters.find(item => item.id === actor.dataset.character);
  const frame = actor.parentElement;
  if (!character || !frame.clientWidth || !frame.clientHeight) return;
  const style = getComputedStyle(frame);
  const width = frame.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  const height = frame.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
  const fittedHeight = Math.max(1, Math.min(height, width / character.ratio));
  actor.style.width = `${fittedHeight * character.ratio}px`;
  actor.style.height = `${fittedHeight}px`;
}
function fitVisibleActors() {
  document.querySelectorAll('.spotlight-actor').forEach(fitActor);
}
function renderScreenCast(screen) {
  state.screenCasts[screen].forEach((characterId, index) => {
    const character = characters.find(item => item.id === characterId);
    const slot = ['A', 'B', 'C'][index];
    const actor = $(`${screen}Actor${slot}`);
    actor.style.backgroundImage = `url('assets/${character.asset}')`;
    actor.style.backgroundSize = `${character.frames * 100}% 100%`;
    actor.dataset.character = character.id;
    actor.title = character.name;
    setActorPose(actor, screen === 'result' ? 'celebrate' : screen === 'play' && slot === 'A' ? 'listen' : 'idle');
    fitActor(actor);
  });
}
function advanceCast(screen) {
  const next = [];
  while (next.length < 3) {
    if (!state.characterQueue.length) state.characterQueue = shuffle(characters.map(character => character.id).filter(id => !next.includes(id)));
    const id = state.characterQueue.shift();
    if (!next.includes(id)) next.push(id);
  }
  state.screenCasts[screen] = next;
  saveCharacterQueue();
  renderScreenCast(screen);
}

function showScreen(id) {
  screens.forEach(name => $(name).classList.toggle('hidden', name !== id));
  requestAnimationFrame(fitVisibleActors);
}
function shuffle(items) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function currentWord() { return state.round[state.index]; }
function audioPath(word) { return `assets/audio/${word.id}.mp3`; }
function eligibleWords() {
  return state.words.filter(word => !state.disabledIds.has(word.id) && (state.mode === 'dinosaur'
    ? word.category === 'dinosaur'
    : word.category !== 'dinosaur' && (state.mode !== 'level' || word.difficulty === state.level)));
}
function visualGroup(word) {
  if (word.sheet) return `sheet:${word.sheet}`;
  if (word.image) return word.category === 'dinosaur' ? 'dinosaur-image' : 'regular-image';
  return 'emoji';
}
const wordBreaks = {
  watermelon: ['water', 'melon'], toothbrush: ['tooth', 'brush'], pineapple: ['pine', 'apple'],
  strawberry: ['straw', 'berry'], hamburger: ['ham', 'burger'], butterfly: ['butter', 'fly'],
  allosaurus: ['allo', 'saurus'], ankylosaurus: ['ankylo', 'saurus'],
  archaeopteryx: ['archaeo', 'pteryx'], brachiosaurus: ['brachio', 'saurus'],
  carnotaurus: ['carno', 'taurus'], compsognathus: ['compso', 'gnathus'],
  corythosaurus: ['corytho', 'saurus'], dilophosaurus: ['dilo', 'phosaurus'],
  diplodocus: ['diplo', 'docus'], giganotosaurus: ['giganto', 'saurus'],
  ichthyosaurus: ['ichthyo', 'saurus'], iguanodon: ['iguano', 'don'],
  mamenchisaurus: ['mamenchi', 'saurus'], microraptor: ['micro', 'raptor'],
  mosasaurus: ['mosa', 'saurus'], oviraptor: ['ovi', 'raptor'],
  pachycephalosaurus: ['pachy', 'cephalo', 'saurus'],
  parasaurolophus: ['para', 'sauro', 'lophus'], plesiosaurus: ['plesio', 'saurus'],
  protoceratops: ['proto', 'ceratops'], pteranodon: ['ptera', 'nodon'],
  spinosaurus: ['spino', 'saurus'], stegosaurus: ['stego', 'saurus'],
  therizinosaurus: ['therizino', 'saurus'], triceratops: ['tri', 'ceratops'],
  tyrannosaurus: ['tyranno', 'saurus'], velociraptor: ['veloci', 'raptor'],
  quetzalcoatlus: ['quetzal', 'coatlus'], hatzegopteryx: ['hatzego', 'pteryx'],
  deinonychus: ['deino', 'nychus'], edmontosaurus: ['edmonton', 'saurus'],
  maiasaura: ['maia', 'saura']
};
function showEnglishWord(word) {
  const element = $('englishWord');
  const parts = wordBreaks[word.en] || (word.en.length > 12
    ? [word.en.slice(0, Math.ceil(word.en.length / 2)), word.en.slice(Math.ceil(word.en.length / 2))]
    : [word.en]);
  element.replaceChildren();
  parts.forEach((part, index) => {
    if (index) element.append(document.createElement('wbr'));
    element.append(document.createTextNode(part));
  });
  element.setAttribute('aria-label', word.en);
  element.classList.toggle('long-word', word.en.length > 7);
  element.classList.toggle('very-long-word', word.en.length > 15);
  element.classList.toggle('dinosaur-word', word.category === 'dinosaur');
}
const effects = { context: null, playing: new Set() };
const effectNotes = {
  wrong: [[392, 0, .11, .035], [330, .12, .16, .03]],
  correct: [[523.25, 0, .16, .035], [659.25, .1, .18, .04], [783.99, .2, .26, .045]],
  finish: [[392, 0, .2, .035], [523.25, .13, .2, .04], [659.25, .26, .21, .04], [783.99, .39, .23, .045], [1046.5, .54, .44, .05]]
};
function stopEffect() {
  effects.playing.forEach(oscillator => { try { oscillator.stop(); } catch {} });
  effects.playing.clear();
}
function playEffect(kind) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  try {
    if (!effects.context) effects.context = new AudioContextClass();
    const context = effects.context;
    if (context.state === 'suspended') context.resume().catch(() => {});
    stopEffect();
    const start = context.currentTime + .01;
    for (const [frequency, delay, duration, volume] of effectNotes[kind]) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = kind === 'wrong' ? 'sine' : 'triangle';
      oscillator.frequency.setValueAtTime(frequency, start + delay);
      gain.gain.setValueAtTime(.0001, start + delay);
      gain.gain.exponentialRampToValueAtTime(volume, start + delay + .018);
      gain.gain.exponentialRampToValueAtTime(.0001, start + delay + duration);
      oscillator.connect(gain).connect(context.destination);
      oscillator.onended = () => { effects.playing.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
      effects.playing.add(oscillator);
      oscillator.start(start + delay);
      oscillator.stop(start + delay + duration + .01);
    }
  } catch (error) { console.warn('音效無法播放', error); }
}
const bopomofoOnsets = new Set([...'ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙ']);
const bopomofoTones = new Set([...'ˊˇˋ˙']);
function parseZhuyin(reading) {
  let symbols = [...reading];
  let tone = '';
  if (symbols[0] === '˙') tone = symbols.shift();
  else if (bopomofoTones.has(symbols.at(-1))) tone = symbols.pop();
  const onset = bopomofoOnsets.has(symbols[0]) ? symbols.shift() : '';
  return { onset, rime: symbols, tone };
}
const uiReadings = {
  '聽單字，': ['ㄊㄧㄥ', 'ㄉㄢ', 'ㄗˋ', ''],
  '找圖片！': ['ㄓㄠˇ', 'ㄊㄨˊ', 'ㄆㄧㄢˋ', ''],
  '聽英文，選圖片。': ['ㄊㄧㄥ', 'ㄧㄥ', 'ㄨㄣˊ', '', 'ㄒㄩㄢˇ', 'ㄊㄨˊ', 'ㄆㄧㄢˋ', ''],
  '選任務': ['ㄒㄩㄢˇ', 'ㄖㄣˋ', 'ㄨˋ'],
  '全部': ['ㄑㄩㄢˊ', 'ㄅㄨˋ'],
  '分難度': ['ㄈㄣ', 'ㄋㄢˊ', 'ㄉㄨˋ'],
  '恐龍挑戰': ['ㄎㄨㄥˇ', 'ㄌㄨㄥˊ', 'ㄊㄧㄠˇ', 'ㄓㄢˋ'],
  '第一級': ['ㄉㄧˋ', 'ㄧ', 'ㄐㄧˊ'],
  '第二級': ['ㄉㄧˋ', 'ㄦˋ', 'ㄐㄧˊ'],
  '第三級': ['ㄉㄧˋ', 'ㄙㄢ', 'ㄐㄧˊ'],
  '第': ['ㄉㄧˋ'],
  '共': ['ㄍㄨㄥˋ'],
  '一次答對': ['ㄧˊ', 'ㄘˋ', 'ㄉㄚˊ', 'ㄉㄨㄟˋ'],
  '今日任務': ['ㄐㄧㄣ', 'ㄖˋ', 'ㄖㄣˋ', 'ㄨˋ'],
  '第一級任務': ['ㄉㄧˋ', 'ㄧ', 'ㄐㄧˊ', 'ㄖㄣˋ', 'ㄨˋ'],
  '第二級任務': ['ㄉㄧˋ', 'ㄦˋ', 'ㄐㄧˊ', 'ㄖㄣˋ', 'ㄨˋ'],
  '第三級任務': ['ㄉㄧˋ', 'ㄙㄢ', 'ㄐㄧˊ', 'ㄖㄣˋ', 'ㄨˋ'],
  '開始任務': ['ㄎㄞ', 'ㄕˇ', 'ㄖㄣˋ', 'ㄨˋ'],
  '回首頁': ['ㄏㄨㄟˊ', 'ㄕㄡˇ', 'ㄧㄝˋ'],
  '聽單字': ['ㄊㄧㄥ', 'ㄉㄢ', 'ㄗˋ'],
  '再聽一次': ['ㄗㄞˋ', 'ㄊㄧㄥ', 'ㄧˊ', 'ㄘˋ'],
  '再聽': ['ㄗㄞˋ', 'ㄊㄧㄥ'],
  '選圖片': ['ㄒㄩㄢˇ', 'ㄊㄨˊ', 'ㄆㄧㄢˋ'],
  '再試一次！': ['ㄗㄞˋ', 'ㄕˋ', 'ㄧˊ', 'ㄘˋ', ''],
  '答對了！': ['ㄉㄚˊ', 'ㄉㄨㄟˋ', 'ㄌㄜ˙', ''],
  '下一題': ['ㄒㄧㄚˋ', 'ㄧˋ', 'ㄊㄧˊ'],
  '看成績': ['ㄎㄢˋ', 'ㄔㄥˊ', 'ㄐㄧˋ'],
  '今天的郵件': ['ㄐㄧㄣ', 'ㄊㄧㄢ', 'ㄉㄜ˙', 'ㄧㄡˊ', 'ㄐㄧㄢˋ'],
  '送達啦！': ['ㄙㄨㄥˋ', 'ㄉㄚˊ', 'ㄌㄚ˙', ''],
  '星星郵件': ['ㄒㄧㄥ', 'ㄒㄧㄥ', 'ㄧㄡˊ', 'ㄐㄧㄢˋ'],
  '也送達啦！': ['ㄧㄝˇ', 'ㄙㄨㄥˋ', 'ㄉㄚˊ', 'ㄌㄚ˙', ''],
  '第一次就答對': ['ㄉㄧˋ', 'ㄧ', 'ㄘˋ', 'ㄐㄧㄡˋ', 'ㄉㄚˊ', 'ㄉㄨㄟˋ'],
  '題': ['ㄊㄧˊ'],
  '你完成任務了！': ['ㄋㄧˇ', 'ㄨㄢˊ', 'ㄔㄥˊ', 'ㄖㄣˋ', 'ㄨˋ', 'ㄌㄜ˙', ''],
  '星星郵票送給你！': ['ㄒㄧㄥ', 'ㄒㄧㄥ', 'ㄧㄡˊ', 'ㄆㄧㄠˋ', 'ㄙㄨㄥˋ', 'ㄍㄟˇ', 'ㄋㄧˇ', ''],
  '再玩一次': ['ㄗㄞˋ', 'ㄨㄢˊ', 'ㄧˊ', 'ㄘˋ']
};
function makeBpmUnit(char, reading) {
  const { onset, rime, tone } = parseZhuyin(reading);
  const unit = document.createElement('span'); unit.className = 'bpm-word';
  const character = document.createElement('span'); character.className = 'bpm-main-char'; character.textContent = char;
  const column = document.createElement('span'); column.className = 'bpm-column'; column.lang = 'zh-Bopo';
  if (onset) { const symbol = document.createElement('span'); symbol.className = 'bpm-onset'; symbol.textContent = onset; column.append(symbol); }
  rime.forEach(value => { const symbol = document.createElement('span'); symbol.className = 'bpm-rime'; symbol.textContent = value; column.append(symbol); });
  if (tone) { const mark = document.createElement('span'); mark.className = tone === '˙' ? 'bpm-tone-dot' : 'bpm-tone'; mark.textContent = tone; column.append(mark); }
  unit.append(character, column);
  return unit;
}
function setKidText(element, text) {
  const readings = uiReadings[text];
  element.setAttribute('aria-label', text);
  if (!readings || readings.length !== [...text].length) { element.textContent = text; return; }
  element.classList.add('kid-text');
  element.replaceChildren(...[...text].map((char, i) => readings[i] ? makeBpmUnit(char, readings[i]) : document.createTextNode(char)));
}
function annotateStaticUI() {
  const pairs = [
    ['startTitleLine1', '聽單字，'], ['startTitleLine2', '找圖片！'],
    ['startDescription', '聽英文，選圖片。'], ['modeLegend', '選任務'],
    ['questionTag', '聽單字'], ['resultScoreLabel', '第一次就答對'],
    ['resultCountUnit', '題'],
  ];
  pairs.forEach(([id, label]) => setKidText($(id), label));
  document.querySelectorAll('.mode-option').forEach(button => {
    const label = button.querySelector('.mode-label');
    setKidText(label, label.textContent.trim());
  });
  document.querySelectorAll('.home-label').forEach(label => setKidText(label, '回首頁'));
  setKidText(document.querySelector('.start-label'), '開始任務');
  setKidText(document.querySelector('.replay-label'), '再聽');
  setKidText(document.querySelector('.again-label'), '再玩一次');
  setKidText($('instruction'), '選圖片');
  setKidText($('resultTitleLine1'), '今天的郵件');
  setKidText($('resultTitleLine2'), '送達啦！');
  setKidText($('resultCopy'), '你完成任務了！');
  setKidText($('levelText'), '第一級');
}
function playWord() {
  const word = currentWord();
  if (!word) return;
  if (state.audio) { state.audio.pause(); state.audio.currentTime = 0; }
  state.audio = new Audio(audioPath(word));
  state.audio.play().then(() => { $('audioStatus').textContent = ''; }).catch(() => {
    $('audioStatus').textContent = '點「再聽一次」播放發音';
  });
}
function updateScoreText() {
  const label = document.createElement('span');
  setKidText(label, '一次答對');
  const count = document.createElement('strong'); count.textContent = String(state.firstTryScore);
  $('scoreText').replaceChildren(label, count);
  $('scoreText').setAttribute('aria-label', `第一次答對 ${state.firstTryScore} 題`);
}
function updateProgressText() {
  const prefix = document.createElement('span'); setKidText(prefix, '第');
  const unit = document.createElement('span'); setKidText(unit, '題');
  const total = document.createElement('span'); total.className = 'progress-total';
  total.textContent = `／${state.round.length}`;
  $('progressText').replaceChildren(prefix, document.createTextNode(String(state.index + 1)), unit, total);
  $('progressText').setAttribute('aria-label', `第 ${state.index + 1} 題，共 ${state.round.length} 題`);
}
function updateProgress() {
  updateProgressText();
  updateScoreText();
  $('progressDots').replaceChildren(...state.round.map((_, i) => {
    const dot = document.createElement('span'); dot.className = 'dot';
    if (i < state.index) dot.classList.add(state.results[i] ? 'correct' : 'wrong');
    if (i === state.index) dot.classList.add('current');
    return dot;
  }));
}
function drawChoices(word) {
  let pool = state.roundChoices.filter(item => (state.mode !== 'level' || item.difficulty === state.level) && visualGroup(item) === visualGroup(word) && item.id !== word.id);
  if (pool.length < 3) pool = state.roundChoices.filter(item => visualGroup(item) === visualGroup(word)
    && (item.category === 'dinosaur') === (word.category === 'dinosaur') && item.id !== word.id);
  const distractors = shuffle(pool).slice(0, 3);
  const options = shuffle([word, ...distractors]);
  $('choices').replaceChildren(...options.map(option => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'choice is-entering';
    button.setAttribute('aria-label', `${option.zh}的圖片`);
    button.dataset.wordId = option.id;
    const inner = document.createElement('span'); inner.className = 'choice-inner';
    const front = document.createElement('span'); front.className = 'choice-face choice-front';
    const art = document.createElement(option.image ? 'img' : 'span');
    art.className = 'choice-art'; art.setAttribute('aria-hidden', 'true');
    if (option.image) {
      art.classList.add('choice-image'); art.src = option.image; art.alt = '';
    } else if (option.sheet && Number.isInteger(option.cell)) {
      art.classList.add('choice-illustrated', `sheet-${option.sheet}`);
      art.style.backgroundPosition = `${(option.cell % 5) * 25}% ${option.cell < 5 ? 0 : 100}%`;
    } else {
      art.textContent = option.emoji;
    }
    front.append(art);
    const back = document.createElement('span'); back.className = 'choice-face choice-back'; back.setAttribute('aria-hidden', 'true');
    const meaning = document.createElement('strong'); meaning.className = 'choice-meaning';
    if ([...option.zh].length > 2) meaning.classList.add('long-meaning');
    [...option.zh].forEach((hanzi, i) => {
      meaning.append(makeBpmUnit(hanzi, option.zhuyin[i]));
    });
    back.append(meaning);
    inner.append(front, back); button.append(inner);
    button.addEventListener('click', () => choose(button, option.id));
    return button;
  }));
}
function renderQuestion() {
  state.phase = 'question'; state.attempts = 0;
  stopEffect();
  $('mailFlight').classList.remove('flying');
  const word = currentWord();
  showEnglishWord(word);
  $('feedback').textContent = '';
  setKidText($('instruction'), '選圖片');
  $('nextButton').classList.add('hidden');
  $('trayBottom').classList.remove('has-next');
  setKidText($('nextButton').querySelector('.next-label'), state.index === state.round.length - 1 ? '看成績' : '下一題');
  $('choices').classList.remove('hidden');
  for (const slot of ['A', 'B', 'C']) {
    setActorPose($(`playActor${slot}`), slot === 'A' ? 'listen' : 'idle');
    $(`playActorFrame${slot}`).classList.remove('is-reacting', 'is-celebrating', 'is-delivering');
  }
  $('questionCard').classList.remove('is-arriving');
  void $('questionCard').offsetWidth;
  $('questionCard').classList.add('is-arriving');
  updateProgress(); drawChoices(word); playWord();
}
function choose(button, id) {
  if (state.phase !== 'question') return;
  const correct = id === currentWord().id;
  state.attempts++;
  if (state.audio) { state.audio.pause(); state.audio.currentTime = 0; }
  if (!correct) {
    playEffect('wrong');
    button.classList.add('wrong'); button.disabled = true;
    setKidText($('feedback'), '再試一次！');
    $('playActorFrameA').classList.remove('is-reacting');
    void $('playActorFrameA').offsetWidth;
    $('playActorFrameA').classList.add('is-reacting');
    return;
  }
  playEffect('correct');
  button.classList.add('correct');
  state.phase = 'reveal';
  const firstTry = state.attempts === 1;
  state.results[state.index] = firstTry;
  if (firstTry) state.firstTryScore++;
  updateScoreText();
  if (firstTry) {
    $('scoreText').classList.remove('is-stamped');
    void $('scoreText').offsetWidth;
    $('scoreText').classList.add('is-stamped');
  }
  setKidText($('feedback'), '答對了！');
  $('instruction').textContent = '';
  for (const slot of ['A', 'B', 'C']) {
    setActorPose($(`playActor${slot}`), 'celebrate');
    $(`playActorFrame${slot}`).classList.remove('is-reacting');
    $(`playActorFrame${slot}`).classList.add('is-celebrating');
  }
  $('mailFlight').classList.remove('flying');
  void $('mailFlight').offsetWidth;
  $('mailFlight').classList.add('flying');
  $('choices').querySelectorAll('button').forEach(choice => {
    choice.disabled = true;
    choice.classList.remove('wrong');
    const option = state.words.find(item => item.id === choice.dataset.wordId);
    choice.classList.add('revealed');
    choice.querySelector('.choice-back').removeAttribute('aria-hidden');
    choice.setAttribute('aria-label', option.zh);
  });
  $('nextButton').classList.remove('hidden');
  $('trayBottom').classList.add('has-next');
}
function startRound() {
  advanceCast('play');
  const pool = eligibleWords();
  state.roundChoices = state.words.filter(word => !state.disabledIds.has(word.id));
  state.round = shuffle(pool).slice(0, state.count);
  state.index = 0; state.firstTryScore = 0; state.results = [];
  const title = state.mode === 'dinosaur' ? '恐龍挑戰' : state.mode === 'level'
    ? ['第一級', '第二級', '第三級'][state.level - 1] : '今日任務';
  setKidText($('taskTitle'), title);
  showScreen('playScreen'); renderQuestion();
}
function nextQuestion() {
  state.index++;
  if (state.index >= state.round.length) {
    state.phase = 'result';
    $('finalScore').textContent = `${state.firstTryScore}／${state.round.length}`;
    state.completedRounds++;
    const alternate = state.completedRounds % 2 === 0;
    $('resultScreen').classList.toggle('variant-b', alternate);
    $('resultSymbol').textContent = alternate ? '✉' : '★';
    setKidText($('resultTitleLine1'), alternate ? '星星郵件' : '今天的郵件');
    setKidText($('resultTitleLine2'), alternate ? '也送達啦！' : '送達啦！');
    setKidText($('resultCopy'), alternate ? '星星郵票送給你！' : '你完成任務了！');
    advanceCast('result');
    showScreen('resultScreen');
    playEffect('finish');
    return;
  }
  renderQuestion();
}
function goHome() {
  if (state.phase !== 'start') advanceCast('start');
  if (state.audio) { state.audio.pause(); state.audio.currentTime = 0; }
  stopEffect();
  state.phase = 'start';
  showScreen('startScreen');
}
function setCount(value) {
  state.count = Math.max(3, Math.min(10, Number(value)));
  $('questionCount').value = String(state.count);
  $('countOutput').value = String(state.count);
  $('startCount').textContent = String(state.count);
}
function bankIssue(disabledIds) {
  const active = state.words.filter(word => !disabledIds.has(word.id));
  for (const [name, pool] of [
    ['第一級', active.filter(word => word.category !== 'dinosaur' && word.difficulty === 1)],
    ['第二級', active.filter(word => word.category !== 'dinosaur' && word.difficulty === 2)],
    ['第三級', active.filter(word => word.category !== 'dinosaur' && word.difficulty === 3)],
    ['恐龍挑戰', active.filter(word => word.category === 'dinosaur')]
  ]) {
    if (pool.length < 10) return `${name}至少需要保留 10 個單字，才能支援每回合最多 10 題。`;
  }
  const groups = new Map();
  active.forEach(word => {
    const key = `${word.category === 'dinosaur' ? 'dino' : 'regular'}:${visualGroup(word)}`;
    groups.set(key, (groups.get(key) || 0) + 1);
  });
  if ([...groups.values()].some(count => count < 4)) return '同一種圖片樣式至少要保留 4 個單字，才能組成四張選項。';
  return '';
}
function saveBankSelection() {
  try { localStorage.setItem(bankStorageKey, JSON.stringify([...state.disabledIds])); return true; }
  catch { $('bankMessage').textContent = '這個瀏覽器無法儲存設定；重新開啟網頁後可能恢復原狀。'; return false; }
}
function bankFilterWords() {
  const query = $('bankSearch').value.trim().toLocaleLowerCase();
  const filter = $('bankFilter').value;
  return state.words.filter(word => {
    const inPool = filter === 'all' || (filter === 'dinosaur' ? word.category === 'dinosaur' : word.category !== 'dinosaur' && word.difficulty === Number(filter));
    return inPool && (!query || word.en.toLocaleLowerCase().includes(query) || word.zh.includes(query));
  });
}
function makeBankArt(word) {
  const art = document.createElement(word.image ? 'img' : 'span');
  art.className = 'bank-art'; art.setAttribute('aria-hidden', 'true');
  if (word.image) { art.src = word.image; art.alt = ''; }
  else if (word.sheet && Number.isInteger(word.cell)) {
    art.classList.add('bank-sheet', `sheet-${word.sheet}`);
    art.style.backgroundPosition = `${(word.cell % 5) * 25}% ${word.cell < 5 ? 0 : 100}%`;
  } else art.textContent = word.emoji;
  return art;
}
function previewBankAudio(word) {
  if (state.audio) { state.audio.pause(); state.audio.currentTime = 0; }
  state.audio = new Audio(audioPath(word));
  state.audio.play().catch(() => { $('bankMessage').textContent = `${word.en} 的發音暫時無法播放。`; });
}
function renderBank() {
  if (!state.words.length) return;
  const active = state.words.filter(word => !state.disabledIds.has(word.id));
  const count = predicate => active.filter(predicate).length;
  $('settingsBankSummary').textContent = `已啟用 ${active.length}／${state.words.length} 個單字`;
  $('bankStats').replaceChildren(...[
    ['題庫總數', active.length, state.words.length],
    ...[1, 2, 3].map(level => [`第${['一', '二', '三'][level - 1]}級`, count(word => word.category !== 'dinosaur' && word.difficulty === level), state.words.filter(word => word.category !== 'dinosaur' && word.difficulty === level).length]),
    ['恐龍', count(word => word.category === 'dinosaur'), state.words.filter(word => word.category === 'dinosaur').length]
  ].map(([label, enabled, total]) => {
    const item = document.createElement('div'); item.className = 'bank-stat';
    const title = document.createElement('small'); title.textContent = label;
    const value = document.createElement('strong'); value.textContent = `${enabled}／${total}`;
    item.append(title, value); return item;
  }));
  const words = bankFilterWords();
  $('bankListCount').textContent = `顯示 ${words.length} 個單字`;
  const fragment = document.createDocumentFragment();
  words.forEach(word => {
    const row = document.createElement('div'); row.className = 'bank-row';
    row.append(makeBankArt(word));
    const copy = document.createElement('div'); copy.className = 'bank-word';
    const english = document.createElement('strong'); english.textContent = word.en;
    const chinese = document.createElement('small'); chinese.textContent = `${word.zh} · ${word.zhuyin.join(' ')}`;
    copy.append(english, chinese); row.append(copy);
    const sound = document.createElement('button'); sound.type = 'button'; sound.className = 'bank-sound'; sound.textContent = '♫'; sound.setAttribute('aria-label', `播放 ${word.en} 發音`); sound.addEventListener('click', () => previewBankAudio(word)); row.append(sound);
    const toggle = document.createElement('input'); toggle.type = 'checkbox'; toggle.className = 'bank-toggle'; toggle.checked = !state.disabledIds.has(word.id); toggle.setAttribute('aria-label', `${word.en} ${word.zh} 出題`);
    toggle.addEventListener('change', () => {
      const next = new Set(state.disabledIds);
      if (toggle.checked) next.delete(word.id); else next.add(word.id);
      const issue = bankIssue(next);
      if (issue) { toggle.checked = !toggle.checked; $('bankMessage').textContent = issue; return; }
      state.disabledIds = next; $('bankMessage').textContent = `${word.en} 已${toggle.checked ? '啟用' : '停用'}，下回合生效。`;
      saveBankSelection(); renderBank();
      $('bankList').querySelector(`.bank-toggle[data-id="${word.id}"]`)?.focus({ preventScroll: true });
    });
    toggle.dataset.id = word.id;
    row.append(toggle); fragment.append(row);
  });
  const scrollTop = $('bankList').scrollTop;
  $('bankList').replaceChildren(fragment);
  $('bankList').scrollTop = scrollTop;
}
function showSettingsPage(name) {
  $('settingsMain').classList.toggle('hidden', name !== 'main');
  $('wordBankPage').classList.toggle('hidden', name !== 'bank');
  $('settingsDialog').classList.toggle('bank-open', name === 'bank');
  if (name === 'bank') { renderBank(); $('backToSettings').focus(); }
  else $('openWordBank').focus();
}
function setMode(mode) {
  if (!['all', 'level', 'dinosaur'].includes(mode)) return;
  state.mode = mode;
  document.querySelectorAll('.mode-option').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
  });
  $('levelControl').classList.toggle('hidden', mode !== 'level');
}
function setLevel(value) {
  state.level = Math.max(1, Math.min(3, Number(value)));
  $('levelSlider').value = String(state.level);
  setKidText($('levelText'), ['第一級', '第二級', '第三級'][state.level - 1]);
}
function validateWords(words) {
  if (!Array.isArray(words) || words.length < 80) throw Error('題庫不足');
  const ids = new Set();
  const english = new Set();
  for (const word of words) {
    if (!word.id || !word.category || !word.en || !word.zh || !word.emoji || ids.has(word.id) || english.has(word.en.toLowerCase())) throw Error('題庫資料不完整或單字重複');
    if (!Array.isArray(word.zhuyin) || word.zhuyin.length !== [...word.zh].length || word.zhuyin.some(reading => !reading)) throw Error(`注音資料不完整：${word.id}`);
    if (![1, 2, 3].includes(word.difficulty)) throw Error(`難度資料錯誤：${word.id}`);
    ids.add(word.id); english.add(word.en.toLowerCase());
  }
  for (const mode of ['all', 'level', 'dinosaur']) {
    const levels = mode === 'level' ? [1, 2, 3] : [1];
    for (const level of levels) {
      const eligible = words.filter(word => mode === 'dinosaur' ? word.category === 'dinosaur'
        : word.category !== 'dinosaur' && (mode !== 'level' || word.difficulty === level));
      if (eligible.length < 10) throw Error(`題庫不足：${mode} ${level}`);
    }
  }
}
async function init() {
  state.characterQueue = loadCharacterQueue();
  advanceCast('start');
  annotateStaticUI();
  $('startButton').disabled = true; document.querySelector('.start-label').textContent = '準備題目中…';
  try {
    const response = await fetch('data.json?v=20260930r');
    if (!response.ok) throw Error(`HTTP ${response.status}`);
    const words = await response.json(); validateWords(words); state.words = words;
    try {
      const saved = JSON.parse(localStorage.getItem(bankStorageKey) || '[]');
      if (Array.isArray(saved)) {
        const ids = new Set(words.map(word => word.id));
        const disabled = new Set(saved.filter(id => ids.has(id)));
        if (!bankIssue(disabled)) state.disabledIds = disabled;
      }
    } catch { /* Browser storage can be unavailable; the default bank remains usable. */ }
    renderBank();
    $('startButton').disabled = false; setKidText(document.querySelector('.start-label'), '開始任務');
  } catch (error) {
    document.querySelector('.start-label').textContent = '題目載入失敗';
    console.error(error);
  }
}
$('startButton').addEventListener('click', startRound);
$('againButton').addEventListener('click', startRound);
$('audioButton').addEventListener('click', playWord);
$('nextButton').addEventListener('click', nextQuestion);
$('homeButton').addEventListener('click', goHome);
$('resultHomeButton').addEventListener('click', goHome);
$('settingsButton').addEventListener('click', () => { showSettingsPage('main'); $('settingsDialog').showModal(); });
$('openWordBank').addEventListener('click', () => showSettingsPage('bank'));
$('backToSettings').addEventListener('click', () => showSettingsPage('main'));
document.querySelectorAll('[data-close-settings]').forEach(button => button.addEventListener('click', () => $('settingsDialog').close()));
$('settingsDialog').addEventListener('close', () => { $('settingsDialog').classList.remove('bank-open'); });
$('bankSearch').addEventListener('input', renderBank);
$('bankFilter').addEventListener('change', renderBank);
$('resetWordBank').addEventListener('click', () => {
  state.disabledIds.clear(); saveBankSelection(); renderBank(); $('bankMessage').textContent = '所有單字已恢復啟用。';
});
$('minusButton').addEventListener('click', () => setCount(state.count - 1));
$('plusButton').addEventListener('click', () => setCount(state.count + 1));
$('questionCount').addEventListener('input', event => setCount(event.target.value));
document.querySelectorAll('.mode-option').forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));
$('levelSlider').addEventListener('input', event => setLevel(event.target.value));
window.addEventListener('resize', fitVisibleActors);
init();

const $ = (id) => document.getElementById(id);
const screens = ['startScreen', 'playScreen', 'resultScreen'];
const state = { words: [], count: 5, mode: 'all', level: 1, round: [], index: 0, firstTryScore: 0, attempts: 0, results: [], phase: 'start', audio: null, completedRounds: 0 };

function showScreen(id) {
  screens.forEach(name => $(name).classList.toggle('hidden', name !== id));
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
  return state.words.filter(word => state.mode === 'dinosaur'
    ? word.category === 'dinosaur'
    : word.category !== 'dinosaur' && (state.mode !== 'level' || word.difficulty === state.level));
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
  let pool = eligibleWords().filter(item => visualGroup(item) === visualGroup(word) && item.id !== word.id);
  if (pool.length < 3) pool = state.words.filter(item => visualGroup(item) === visualGroup(word)
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
  const word = currentWord();
  showEnglishWord(word);
  $('feedback').textContent = '';
  setKidText($('instruction'), '選圖片');
  $('nextButton').classList.add('hidden');
  $('trayBottom').classList.remove('has-next');
  setKidText($('nextButton').querySelector('.next-label'), state.index === state.round.length - 1 ? '看成績' : '下一題');
  $('choices').classList.remove('hidden');
  $('iggyActor').querySelector('.iggy-actor').className = 'iggy-actor pose-listen';
  $('iggyActor').classList.remove('is-reacting', 'is-celebrating');
  $('feifeiPlay').classList.remove('is-delivering');
  $('abaoPlay').classList.remove('is-celebrating', 'is-reacting');
  $('abaoPlay').querySelector('.abao-actor').className = 'abao-actor abao-sort';
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
    $('iggyActor').classList.remove('is-reacting');
    void $('iggyActor').offsetWidth;
    $('iggyActor').classList.add('is-reacting');
    $('abaoPlay').classList.remove('is-reacting');
    void $('abaoPlay').offsetWidth;
    $('abaoPlay').classList.add('is-reacting');
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
  $('iggyActor').querySelector('.iggy-actor').className = 'iggy-actor pose-celebrate';
  $('iggyActor').classList.remove('is-reacting');
  $('iggyActor').classList.add('is-celebrating');
  $('feifeiPlay').classList.add('is-delivering');
  $('abaoPlay').querySelector('.abao-actor').className = 'abao-actor abao-cheer';
  $('abaoPlay').classList.add('is-celebrating');
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
  const pool = eligibleWords();
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
    showScreen('resultScreen');
    playEffect('finish');
    return;
  }
  renderQuestion();
}
function goHome() {
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
  annotateStaticUI();
  $('startButton').disabled = true; document.querySelector('.start-label').textContent = '準備題目中…';
  try {
    const response = await fetch('data.json?v=20260930m');
    if (!response.ok) throw Error(`HTTP ${response.status}`);
    const words = await response.json(); validateWords(words); state.words = words;
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
$('settingsButton').addEventListener('click', () => $('settingsDialog').showModal());
$('minusButton').addEventListener('click', () => setCount(state.count - 1));
$('plusButton').addEventListener('click', () => setCount(state.count + 1));
$('questionCount').addEventListener('input', event => setCount(event.target.value));
document.querySelectorAll('.mode-option').forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));
$('levelSlider').addEventListener('input', event => setLevel(event.target.value));
init();

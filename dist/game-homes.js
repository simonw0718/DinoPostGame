(() => {
  const page = document.body.dataset.page;
  const $ = id => document.getElementById(id);
  const chars = [
    ['xiaokong','xiaokong-poses-v1.png',2,1],['yuanyuan','yuanyuan-poses-v1.png',2,.75],
    ['paino','paino-poses-v1.png',2,1],['shuoshuo','shuoshuo-poses-v1.png',2,.75],
    ['iggy','iggy-poses-v1.png',3,.5],['feifei','feifei-poses-v1.png',2,1],
    ['abao','chick-abao-poses-v1.png',2,1],['shanshan','shanshan-poses-v1.png',2,1]
  ];
  const shuffle = list => [...list].sort(() => Math.random() - .5);
  const chosen = shuffle(chars).slice(0,3);
  function fitActor(actor, ratio) {
    const frame = actor.parentElement;
    const style = getComputedStyle(frame);
    const w = frame.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const h = frame.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    if (w <= 0 || h <= 0) return;
    const height = Math.min(h,w/ratio);
    actor.style.width = `${height*ratio}px`;
    actor.style.height = `${height}px`;
  }
  chosen.forEach(([id,file,frames,ratio],i) => {
    const actor = $(`startActor${'ABC'[i]}`);
    if (!actor) return;
    actor.dataset.character = id;
    actor.style.backgroundImage = `url('assets/${file}')`;
    actor.style.backgroundSize = `${frames*100}% 100%`;
    let retried = false;
    const image = new Image();
    image.onload = () => { actor.style.backgroundImage = `url('${image.src}')`; fitActor(actor,ratio); };
    image.onerror = () => { if (!retried) { retried = true; image.src = `assets/${file}?retry=1`; } };
    image.src = `assets/${file}`;
    new ResizeObserver(() => fitActor(actor,ratio)).observe(actor.parentElement);
    requestAnimationFrame(() => fitActor(actor,ratio));
  });
  const readings = {
    '選遊戲！':['ㄒㄩㄢˇ','ㄧㄡˊ','ㄒㄧˋ',''],
    '找圖片':['ㄓㄠˇ','ㄊㄨˊ','ㄆㄧㄢˋ'],
    '注音送信':['ㄓㄨˋ','ㄧㄣ','ㄙㄨㄥˋ','ㄒㄧㄣˋ'],
    '聽單字，找圖片':['ㄊㄧㄥ','ㄉㄢ','ㄗˋ','','ㄓㄠˇ','ㄊㄨˊ','ㄆㄧㄢˋ'],
    '讀注音，送信去':['ㄉㄨˊ','ㄓㄨˋ','ㄧㄣ','','ㄙㄨㄥˋ','ㄒㄧㄣˋ','ㄑㄩˋ'],
    '讀注音，':['ㄉㄨˊ','ㄓㄨˋ','ㄧㄣ',''],
    '送信去！':['ㄙㄨㄥˋ','ㄒㄧㄣˋ','ㄑㄩˋ',''],
    '讀注音，選郵箱。':['ㄉㄨˊ','ㄓㄨˋ','ㄧㄣ','','ㄒㄩㄢˇ','ㄧㄡˊ','ㄒㄧㄤ',''],
    '選任務':['ㄒㄩㄢˇ','ㄖㄣˋ','ㄨˋ'],'全部':['ㄑㄩㄢˊ','ㄅㄨˋ'],
    '分難度':['ㄈㄣ','ㄋㄢˊ','ㄉㄨˋ'],'恐龍挑戰':['ㄎㄨㄥˇ','ㄌㄨㄥˊ','ㄊㄧㄠˇ','ㄓㄢˋ'],
    '第一級':['ㄉㄧˋ','ㄧ','ㄐㄧˊ'],'第二級':['ㄉㄧˋ','ㄦˋ','ㄐㄧˊ'],'第三級':['ㄉㄧˋ','ㄙㄢ','ㄐㄧˊ'],
    '開始任務':['ㄎㄞ','ㄕˇ','ㄖㄣˋ','ㄨˋ']
  };
  const onsets = new Set([...'ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙ']);
  const tones = new Set([...'ˊˇˋ˙']);
  function annotate(el,text) {
    if (!el || !readings[text] || readings[text].length !== [...text].length) return;
    el.setAttribute('aria-label',text);
    el.classList.add('kid-text');
    el.replaceChildren(...[...text].map((char,i) => {
      const reading = readings[text][i];
      if (!reading) return document.createTextNode(char);
      const symbols = [...reading];
      const tone = symbols[0] === '˙' ? symbols.shift() : tones.has(symbols.at(-1)) ? symbols.pop() : '';
      const onset = onsets.has(symbols[0]) ? symbols.shift() : '';
      const unit = document.createElement('span'); unit.className = 'bpm-word';
      const main = document.createElement('span'); main.className = 'bpm-main-char'; main.textContent = char;
      const column = document.createElement('span'); column.className = 'bpm-column'; column.lang = 'zh-Bopo';
      if (onset) { const part = document.createElement('span'); part.className = 'bpm-onset'; part.textContent = onset; column.append(part); }
      symbols.forEach(symbol => { const part = document.createElement('span'); part.className = 'bpm-rime'; part.textContent = symbol; column.append(part); });
      if (tone) { const part = document.createElement('span'); part.className = tone === '˙' ? 'bpm-tone-dot' : 'bpm-tone'; part.textContent = tone; column.append(part); }
      unit.append(main,column); return unit;
    }));
  }
  if (page === 'select') {
    if (new URLSearchParams(location.search).has('settings')) location.replace(`match.html${location.search}`);
    annotate($('selectTitle'),'選遊戲！');
    document.querySelectorAll('[data-reading]').forEach(el => annotate(el,el.dataset.reading));
    return;
  }
  if (page !== 'mail') return;
  const key = 'dinopost-mail-selection-v1';
  const selection = {mode:'all',level:1};
  try { const saved = JSON.parse(localStorage.getItem(key) || 'null'); if (['all','level','dinosaur'].includes(saved?.mode)) selection.mode=saved.mode; if ([1,2,3].includes(saved?.level)) selection.level=saved.level; } catch {}
  function render() {
    document.querySelectorAll('.mode-option').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.mode===selection.mode)));
    $('levelControl').classList.toggle('hidden',selection.mode!=='level');
    $('levelSlider').value=String(selection.level);
    annotate($('levelText'),['第一級','第二級','第三級'][selection.level-1]);
    try { localStorage.setItem(key,JSON.stringify(selection)); } catch {}
  }
  annotate($('startTitleLine1'),'讀注音，'); annotate($('startTitleLine2'),'送信去！');
  annotate($('startDescription'),'讀注音，選郵箱。');
  annotate($('modeLegend'),'選任務'); annotate(document.querySelector('.start-label'),'開始任務');
  document.querySelectorAll('.mode-label').forEach(el => annotate(el,el.textContent.trim()));
  document.querySelectorAll('.mode-option').forEach(button => button.addEventListener('click',() => {selection.mode=button.dataset.mode;render();}));
  $('levelSlider').addEventListener('input',event => {selection.level=Number(event.target.value);render();});
  $('startButton').addEventListener('click',() => {render(); location.href='zhuyin-sort.html';});
  $('mailSettingsButton').addEventListener('click',() => $('mailSettingsDialog').showModal());
  $('mailSettingsClose').addEventListener('click',() => $('mailSettingsDialog').close());
  render();
})();

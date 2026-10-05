(() => {
  const page = document.body.dataset.page;
  const $ = id => document.getElementById(id);
  const chosen = Dino.shuffle(Dino.characters).slice(0,3);
  chosen.forEach(({id,asset,frames,ratio},i) => {
    const actor = $(`startActor${'ABC'[i]}`);
    if (!actor) return;
    actor.dataset.character = id;
    actor.style.backgroundImage = `url('assets/${asset}')`;
    actor.style.backgroundSize = `${frames*100}% 100%`;
    let retried = false;
    const image = new Image();
    image.onload = () => { actor.style.backgroundImage = `url('${image.src}')`; Dino.fitActor(actor,ratio); };
    image.onerror = () => { if (!retried) { retried = true; image.src = `assets/${asset}?retry=1`; } };
    image.src = `assets/${asset}`;
    new ResizeObserver(() => Dino.fitActor(actor,ratio)).observe(actor.parentElement);
    requestAnimationFrame(() => Dino.fitActor(actor,ratio));
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
    '開始任務':['ㄎㄞ','ㄕˇ','ㄖㄣˋ','ㄨˋ'],
    '信件內容':['ㄒㄧㄣˋ','ㄐㄧㄢˋ','ㄋㄟˋ','ㄖㄨㄥˊ'],
    '看注音':['ㄎㄢˋ','ㄓㄨˋ','ㄧㄣ'],
    '看英文單字':['ㄎㄢˋ','ㄧㄥ','ㄨㄣˊ','ㄉㄢ','ㄗˋ'],
    '自動發音':['ㄗˋ','ㄉㄨㄥˋ','ㄈㄚ','ㄧㄣ'],
    '看單字，':['ㄎㄢˋ','ㄉㄢ','ㄗˋ',''],
    '看英文單字，選圖片郵箱。':['ㄎㄢˋ','ㄧㄥ','ㄨㄣˊ','ㄉㄢ','ㄗˋ','','ㄒㄩㄢˇ','ㄊㄨˊ','ㄆㄧㄢˋ','ㄧㄡˊ','ㄒㄧㄤ',''],
    '讀注音，選圖片郵箱。':['ㄉㄨˊ','ㄓㄨˋ','ㄧㄣ','','ㄒㄩㄢˇ','ㄊㄨˊ','ㄆㄧㄢˋ','ㄧㄡˊ','ㄒㄧㄤ','']
  };
  const setKidText = Dino.kidText(readings);
  // Only annotate text that has a reading; leave other labels untouched.
  const annotate = (el,text) => { if (readings[text]) setKidText(el,text); };
  if (page === 'select') {
    if (new URLSearchParams(location.search).has('settings')) location.replace(`match.html${location.search}`);
    annotate($('selectTitle'),'選遊戲！');
    document.querySelectorAll('[data-reading]').forEach(el => annotate(el,el.dataset.reading));
    return;
  }
  if (page !== 'mail') return;
  const key = 'dinopost-mail-selection-v1';
  const selection = {mode:'all',level:1,format:'zhuyin',autoAudio:true,count:5};
  try { const saved = JSON.parse(localStorage.getItem(key) || 'null'); if (['all','level','dinosaur'].includes(saved?.mode)) selection.mode=saved.mode; if ([1,2,3].includes(saved?.level)) selection.level=saved.level; if (['zhuyin','english'].includes(saved?.format)) selection.format=saved.format; if (typeof saved?.autoAudio==='boolean') selection.autoAudio=saved.autoAudio; if (Number.isInteger(saved?.count) && saved.count>=3 && saved.count<=10) selection.count=saved.count; } catch {}
  function render() {
    document.querySelectorAll('.mode-option').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.mode===selection.mode)));
    $('levelControl').classList.toggle('hidden',selection.mode!=='level');
    $('levelSlider').value=String(selection.level);
    document.querySelectorAll('[data-mail-format]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mailFormat===selection.format)));
    $('mailHomeAutoAudio').checked=selection.autoAudio; $('mailHomeCount').value=String(selection.count); $('mailHomeCountValue').value=String(selection.count); $('startCount').textContent=String(selection.count);
    annotate($('startTitleLine1'),selection.format==='english'?'看單字，':'讀注音，'); annotate($('startDescription'),selection.format==='english'?'看英文單字，選圖片郵箱。':'讀注音，選圖片郵箱。');
    annotate($('levelText'),['第一級','第二級','第三級'][selection.level-1]);
    try { localStorage.setItem(key,JSON.stringify(selection)); } catch {}
  }
  annotate($('startTitleLine2'),'送信去！');
  document.querySelectorAll('.mail-format-picker legend, [data-mail-format], .mail-auto-control .switch-label').forEach(el => annotate(el,el.textContent.trim()));
  annotate($('modeLegend'),'選任務'); annotate(document.querySelector('.start-label'),'開始任務');
  document.querySelectorAll('.mode-label').forEach(el => annotate(el,el.textContent.trim()));
  document.querySelectorAll('.mode-option').forEach(button => button.addEventListener('click',() => {selection.mode=button.dataset.mode;render();}));
  $('levelSlider').addEventListener('input',event => {selection.level=Number(event.target.value);render();});
  document.querySelectorAll('[data-mail-format]').forEach(button=>button.addEventListener('click',()=>{selection.format=button.dataset.mailFormat;render();}));
  $('mailHomeAutoAudio').addEventListener('change',event=>{selection.autoAudio=event.target.checked;render();});
  $('mailHomeCount').addEventListener('input',event=>{selection.count=Number(event.target.value);render();});
  $('startButton').addEventListener('click',() => {render(); location.href='zhuyin-sort.html';});
  $('mailSettingsButton').addEventListener('click',() => $('mailSettingsDialog').showModal());
  $('mailSettingsClose').addEventListener('click',() => $('mailSettingsDialog').close());
  render();
})();

/* 首頁扭蛋機：隨機選一個遊戲（導演 2026-11-10「維持現狀，但嘗試加上隨機遊戲（扭蛋設計）」）。樣式 gacha.css。
   遊戲清單直接讀首頁的 .game-choice（之後新增遊戲自動進扭蛋）；扭蛋顏色＝分類色；不會連續抽到同一款。
   流程：轉把手 → 扭蛋機搖、扭蛋掉出來滾到中間 → 點扭蛋打開 → 預覽＋遊戲名 →「去玩！」或「再轉一次」。 */
(() => {
  'use strict';
  const letter = document.querySelector('.selector-letter');
  if (!letter || !window.Dino) return;
  const COLOR = { en: '#3d7fd6', zy: '#3a9a5c', brain: '#e8892b', math: '#d4483a' };
  const LAST = 'dinopost-gacha-last';
  const kid = Dino.kidText({
    '今天玩什麼？': ['ㄐㄧㄣ', 'ㄊㄧㄢ', 'ㄨㄢˊ', 'ㄕㄣˊ', 'ㄇㄜ˙', ''],
    '轉一下！': ['ㄓㄨㄢˋ', 'ㄧ', 'ㄒㄧㄚˋ', ''],
    '打開看看！': ['ㄉㄚˇ', 'ㄎㄞ', 'ㄎㄢˋ', 'ㄎㄢ˙', ''],
    '去玩！': ['ㄑㄩˋ', 'ㄨㄢˊ', ''],
    '再轉一次': ['ㄗㄞˋ', 'ㄓㄨㄢˋ', 'ㄧ', 'ㄘˋ']
  });
  const games = () => [...document.querySelectorAll('.game-choice[href]')].map(a => ({
    href: a.getAttribute('href'), g: a.dataset.group, name: a.querySelector('strong'), desc: a.querySelector('small')?.textContent || ''
  }));

  // 入口：信紙右上角郵戳旁的小扭蛋機
  const caps = (n, r) => Array.from({ length: n }, (_, i) => {
    const c = Object.values(COLOR)[i % 4], a = i * 2.39, d = r * (.25 + .6 * ((i * 37) % 10) / 10);
    return `<circle cx="${32 + Math.cos(a) * d}" cy="${28 + Math.sin(a) * d * .8}" r="5.5" fill="${c}"/>`;
  }).join('');
  const open = document.createElement('button');
  open.type = 'button'; open.className = 'g-open'; open.setAttribute('aria-label', '轉扭蛋，隨機選一個遊戲');
  open.innerHTML = `<svg viewBox="0 0 64 78" aria-hidden="true"><g class="dome-b"><circle cx="32" cy="28" r="24" fill="#d9f1ff" stroke="#fff" stroke-width="3"/>${caps(9, 15)}<circle cx="24" cy="18" r="5" fill="#fff" opacity=".8"/></g><rect x="8" y="46" width="48" height="31" rx="8" fill="#d6402e"/><circle cx="21" cy="58" r="7" fill="#f6e8c6"/><rect x="16" y="56.5" width="10" height="3" rx="1.5" fill="#b88a3e"/><rect x="34" y="52" width="14" height="12" rx="3" fill="#5b1f17"/><text class="tag" x="32" y="74.5" text-anchor="middle">扭蛋</text></svg>`;
  // 掛在信紙外層（信紙本身會捲動、會裁切），依信紙右上角擺：底部壓在信紙上緣
  const host = letter.parentElement;
  host.append(open);
  const place = () => {
    const h = host.getBoundingClientRect(), r = letter.getBoundingClientRect();
    const room = r.top - h.top >= open.offsetHeight - 8;          // 信紙上方放得下 → 坐在上緣；放不下（平板橫式信紙貼頂）→ 放進信紙、郵戳左邊
    open.classList.toggle('is-inside', !room);
    open.style.left = `${r.right - h.left - open.offsetWidth - (room ? (innerWidth > 680 ? 14 : 6) : 128)}px`;
    open.style.top = `${room ? r.top - h.top - open.offsetHeight + 8 : r.top - h.top + 14}px`;
  };
  place(); addEventListener('resize', place); new ResizeObserver(place).observe(letter); setTimeout(place, 600);

  // 扭蛋畫面
  const root = document.createElement('div'); root.className = 'gacha'; root.hidden = true;
  root.innerHTML = `<div class="g-card" role="dialog" aria-label="扭蛋機">
    <button class="g-x" type="button" aria-label="關掉">×</button>
    <h2 class="g-title"></h2>
    <div class="g-stage" style="position:relative;display:grid;place-items:center;width:100%">
      <div class="g-machine"><div class="g-dome"></div><div class="g-body"><button class="g-knob" type="button" aria-label="轉把手"></button><div class="g-chute"></div></div></div>
      <div class="g-ball" hidden><i class="top"></i><i class="bot"></i></div>
      <div class="g-result" hidden><div class="g-pv"></div><p class="g-name"></p><p class="g-desc"></p>
        <div class="g-actions"><button class="g-go" type="button"></button><button class="g-again" type="button"></button></div></div>
    </div>
    <p class="g-hint" aria-live="polite"></p></div>`;
  document.body.append(root);
  const $ = s => root.querySelector(s);
  kid($('.g-title'), '今天玩什麼？'); kid($('.g-go'), '去玩！'); kid($('.g-again'), '再轉一次');
  const dome = $('.g-dome'), machine = $('.g-machine'), knob = $('.g-knob'), ball = $('.g-ball'), result = $('.g-result'), hint = $('.g-hint');
  dome.innerHTML = Array.from({ length: 14 }, (_, i) => {
    const c = Object.values(COLOR)[i % 4], row = Math.floor(i / 5), x = 8 + (i % 5) * 16 + (row % 2) * 8, y = 70 - row * 17;   // 由下往上堆三層
    return `<i class="g-cap" style="--cc:${c};--r:${(i * 47) % 360}deg;left:${x}%;top:${y}%"></i>`;
  }).join('');

  let pick = null, state = 'idle', turns = 0;
  const wait = ms => new Promise(r => setTimeout(r, Dino.reduced ? Math.min(ms, 80) : ms));
  function reset() {
    state = 'idle'; ball.hidden = true; ball.className = 'g-ball'; result.hidden = true;
    machine.hidden = false; machine.classList.add('is-ready'); kid(hint, '轉一下！');
  }
  function show() { reset(); root.hidden = false; Dino.sfx('pop', .6); }
  function hide() { root.hidden = true; state = 'idle'; }
  function choose() {
    const list = games(); let last = null;
    try { last = localStorage.getItem(LAST); } catch { /* ok */ }
    const pool = list.length > 1 ? list.filter(x => x.href !== last) : list;
    const p = pool[Math.floor(Math.random() * pool.length)];
    try { localStorage.setItem(LAST, p.href); } catch { /* ok */ }
    return p;
  }
  async function spin() {
    if (state !== 'idle') return;
    state = 'spin'; machine.classList.remove('is-ready'); hint.textContent = '';
    pick = choose();
    turns += 1; knob.style.transform = `rotate(${turns * 360}deg)`;               // 把手轉一圈（喀喀喀）
    for (let i = 0; i < 3; i++) setTimeout(() => Dino.sfx('step', .7), i * 300);
    Dino.replay(dome, 'is-shake');
    await wait(1100);
    // 扭蛋從出口掉出來，彈兩下滾到中間放大
    const st = $('.g-stage').getBoundingClientRect(), ch = $('.g-chute').getBoundingClientRect();
    const dx = ch.left + ch.width / 2 - (st.left + st.width / 2), dy = ch.top + ch.height / 2 - (st.top + st.height / 2);
    ball.style.setProperty('--cc', COLOR[pick.g] || '#999'); ball.hidden = false; Dino.sfx('swoosh', .6);
    const an = ball.animate([
      { transform: `translate(${dx}px,${dy}px) scale(.25)` },
      { transform: `translate(${dx * .6}px,${dy + 60}px) scale(.5) rotate(120deg)`, offset: .35 },
      { transform: `translate(${dx * .3}px,${dy - 10}px) scale(.7) rotate(240deg)`, offset: .6 },
      { transform: 'translate(0,0) scale(1.08) rotate(340deg)', offset: .85 },
      { transform: 'translate(0,0) scale(1) rotate(360deg)' }
    ], { duration: Dino.reduced ? 1 : 900, easing: 'cubic-bezier(.3,.7,.4,1)' });
    machine.style.opacity = '.25';
    await Promise.race([an.finished, wait(1000)]);
    Dino.sfx('pop', .7); ball.classList.add('is-wait'); state = 'ball'; kid(hint, '打開看看！');
  }
  async function crack() {
    if (state !== 'ball') return;
    state = 'open'; ball.classList.remove('is-wait'); ball.classList.add('is-open'); hint.textContent = '';
    Dino.sfx('pop', .9);
    await wait(380);
    machine.hidden = true; machine.style.opacity = '';
    const pv = $('.g-pv'); pv.style.setProperty('--cc', COLOR[pick.g]); pv.innerHTML = Dino.previews[pick.href] || '';
    result.style.setProperty('--cc', COLOR[pick.g]);
    $('.g-name').innerHTML = pick.name ? pick.name.innerHTML : ''; $('.g-desc').textContent = pick.desc;
    result.hidden = false;
    requestAnimationFrame(() => pv.style.setProperty('--s', pv.clientWidth / 124));
    Dino.sfx('correct', .6); Dino.burst?.($('.g-name'));
    await wait(450); ball.hidden = true; state = 'result';
  }
  open.addEventListener('click', show);
  machine.addEventListener('click', spin);
  ball.addEventListener('click', crack);
  $('.g-again').addEventListener('click', () => { Dino.sfx('tap', .5); reset(); spin(); });
  $('.g-go').addEventListener('click', () => { if (!pick) return; Dino.sfx('tap', .6); location.href = pick.href; });
  $('.g-x').addEventListener('click', () => { Dino.sfx('tap', .5); hide(); });
  root.addEventListener('click', e => { if (e.target === root) hide(); });
  addEventListener('keydown', e => { if (!root.hidden && e.key === 'Escape') hide(); });
})();

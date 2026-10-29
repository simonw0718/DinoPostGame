// 恐龍蛋快打（mole.html）：分類名單 whack_categories.json、出題語音 assets/audio/whack/（tools/gemini_tts_batch.py whack）
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const stage = $('stage');
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const rand = (a, b) => a + Math.random() * (b - a);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const done = (a, ms) => Promise.race([a.finished, wait(ms + 80)]);
  const ease = { out: 'cubic-bezier(.16,1,.3,1)', back: 'cubic-bezier(.34,1.56,.64,1)' };
  const GOAL = 5, PENALTY = 2, REC_KEY = 'dinopost-egg-category-records-v1', OPEN_MS = 2600, N_EG = 3;
  const MAX_OPEN = 2, HIT_RATE = .5;
  // 巢分布（導演 2026-10-27 選 egg-layout-sample B 微笑弧線）：[x, y]＝巢底位置比例；越下面越近越大
  const LAYOUT = {
    land: [[.12, .58], [.3, .75], [.5, .88], [.7, .75], [.88, .58]],
    port: [[.27, .5], [.73, .5], [.24, .7], [.76, .7], [.5, .9]],
  };
  // 分類名單唯一來源：whack_categories.json（yes＝答案、group＝干擾題排除的大類、avoid＝也不拿來當干擾題）
  let CATS = [];
  const setKidText = Dino.kidText({ '請打': ['ㄑㄧㄥˇ', 'ㄉㄚˇ'], '恐龍蛋快打': ['ㄎㄨㄥˇ', 'ㄌㄨㄥˊ', 'ㄉㄢˋ', 'ㄎㄨㄞˋ', 'ㄉㄚˇ'],
    '聽題目，打對的蛋': ['ㄊㄧㄥ', 'ㄊㄧˊ', 'ㄇㄨˋ', '', 'ㄉㄚˇ', 'ㄉㄨㄟˋ', 'ㄉㄜ˙', 'ㄉㄢˋ'], '知道了': ['ㄓ', 'ㄉㄠˋ', 'ㄌㄜ˙'] });
  const group = t => t.split('.')[0];

  let lastTime = 0, t0 = 0, penalty = 0, timing = false, all = [], cat = null, lastCat = null, yes = [], no = [], spots = [], found = [], gen = 0, hatching = false, nextHatch = 0, sinceHit = 0;
  const inCat = w => cat.yes.includes(w.id);
  const shown = () => spots.filter(s => s.w && (s.state === 'opening' || s.state === 'open')).map(s => s.w);
  // 單張圖或拼圖表（5×2 格）的常見字都能用
  const art = w => (w.image ? `<img alt="" src="${w.image}">` : `<i class="sheet" style="background-image:url('assets/${w.sheet}-grid-v1.jpg');background-position:${(w.cell % 5) * 25}% ${w.cell < 5 ? 0 : 100}%"></i>`);
  const card = w => { const c = document.createElement('div'); c.className = 'card'; c.innerHTML = art(w); return c; };
  const en = w => Dino.audioPath(w);   // 導演 2026-10-26：打到念英文

  const EGG_ZIG = '0,62 12,54 24,64 36,52 48,63 60,51 72,62 84,52 100,60';
  let eggN = 0;
  function eggSvg(part) {
    const i = ++eggN, clip = part === 'top' ? `0,0 100,0 ${EGG_ZIG.split(' ').reverse().join(' ')}` : `${EGG_ZIG} 100,130 0,130`;
    return `<svg class="${part}" viewBox="0 0 100 130" aria-hidden="true"><defs><clipPath id="ec${i}"><polygon points="${clip}"/></clipPath></defs>`
      + `<image href="assets/egg/egg.webp" x="0" y="0" width="100" height="130" preserveAspectRatio="xMidYMax meet" clip-path="url(#ec${i})"/>`
      + (part === 'top' ? `<polyline points="${EGG_ZIG}" fill="none" stroke="#c98a3e" stroke-width="1.6" stroke-linejoin="round" opacity=".55"/>` : '') + '</svg>';
  }

  function buildField() {
    stage.querySelectorAll('.spot').forEach(n => n.remove());
    const W = stage.clientWidth, H = stage.clientHeight;
    const pts = LAYOUT[W > H ? 'land' : 'port'], base = Math.min(W * (W > H ? .19 : .27), H * .36, 240);
    const ys = pts.map(p => p[1]), y0 = Math.min(...ys), y1 = Math.max(...ys);
    spots = [];
    pts.forEach(([x, y]) => {
      const z = 10 + Math.round(y * 100), k = .68 + .42 * (y - y0) / (y1 - y0);
      const el = document.createElement('div'); el.className = 'spot';
      el.style.cssText = `left:${x * 100}%;top:${y * 100}%;--s:${base * k}px;z-index:${z}`;
      el.innerHTML = `<span class="nest"></span><div class="egg">${eggSvg('bot')}${eggSvg('top')}</div><span class="rim"></span>`;
      stage.append(el);
      const egg = el.querySelector('.egg');
      const o = { el, egg, top: egg.querySelector('.top'), z, state: 'closed', w: null, until: 0 };
      egg.animate([{ rotate: '0deg' }, { rotate: '1.4deg' }, { rotate: '-1.2deg' }, { rotate: '0deg' }], { duration: rand(2300, 3200), iterations: Infinity, easing: 'ease-in-out' });
      el.addEventListener('pointerdown', ev => { ev.preventDefault(); tap(o); });
      spots.push(o);
    });
  }

  async function open(o, w, my) {
    o.state = 'opening'; o.w = w; o.el.style.zIndex = 100;
    o.egg.querySelector('.card')?.remove();
    const c = card(w); o.egg.append(c);
    await done(o.egg.animate([{ rotate: '0deg' }, { rotate: '-7deg' }, { rotate: '7deg' }, { rotate: '-9deg' }, { rotate: '9deg' }, { rotate: '0deg' }], { duration: 520, easing: 'ease-in-out' }), 520);
    if (my !== gen || o.state !== 'opening') return;
    Dino.sfx('pop', .35);
    o.state = 'open'; o.until = performance.now() + OPEN_MS;
    o.topAnim = o.top.animate([{ transform: 'none' }, { transform: 'translate(-34%,-22%) rotate(-48deg)' }], { duration: 360, easing: ease.back, fill: 'forwards' });
    o.cardAnim = c.animate([{ transform: 'translateY(40%) scale(.5)', opacity: 0 }, { transform: 'translateY(-92%) scale(1)', opacity: 1 }], { duration: 440, easing: ease.back, fill: 'forwards' });
    o.egg.animate([{ scale: '1 1' }, { scale: '1.06 .92' }, { scale: '1 1' }], { duration: 260 });
  }
  function close(o, fast) {
    if (o.state !== 'open') return;
    o.state = 'closing';
    if (fast) { o.topAnim.playbackRate = 2; o.cardAnim.playbackRate = 2; }
    o.topAnim.reverse(); o.cardAnim.reverse();
    done(o.cardAnim, 440).then(() => { if (o.state === 'closing') { o.state = 'closed'; o.w = null; o.el.style.zIndex = o.z; o.until = performance.now() + 600; } });
  }

  // 約一半是對的；連續 2 顆干擾題後下一顆一定是對的
  function chooseWord() {
    const now = shown(), notNow = w => !now.some(x => x.id === w.id);
    const hit = sinceHit >= 2 || Math.random() < HIT_RATE;
    const list = (hit ? yes : no).filter(notNow);
    sinceHit = hit ? 0 : sinceHit + 1;
    return pick(list.length ? list : yes.filter(notNow));
  }
  function tick() {
    const t = performance.now();
    spots.forEach(o => { if (o.state === 'open' && t > o.until) close(o); });
    if (!hatching || t < nextHatch) return;
    const free = spots.filter(o => o.state === 'closed' && t > o.until);
    if (free.length && shown().length < MAX_OPEN) {
      open(pick(free), chooseWord(), gen);
      nextHatch = t + rand(700, 1100);
    }
  }
  setInterval(tick, 50);

  function renderBar() {
    setKidText($('askQ'), '請打');
    setKidText($('askCat'), cat.zh, cat.r);
    $('eg').innerHTML = Dino.shuffle(yes.slice()).slice(0, N_EG).map(w => `<span class="mini">${art(w)}</span>`).join('');
    showTime();
    $('dots').innerHTML = Array.from({ length: GOAL }, (_, i) => `<i class="${i < found.length ? 'on' : ''}"></i>`).join('');
  }
  // 出題動畫（導演 2026-10-26）：彈出 Let's hit… → 分類名（英文＋中文注音）→ 示意圖一張張跳出；英文語音 Gemini 生成；點一下才開始
  // 出題語音：Gemini 生成 assets/audio/whack/<分類 id>.mp3（tools/gemini_tts_batch.py whack）
  const sayCat = () => Dino.voice(`assets/audio/whack/${cat.id}.mp3`);
  async function announce(my) {
    hatching = false;
    const L = $('intro'); L.hidden = false;
    $('introEn').textContent = cat.en[0].toUpperCase() + cat.en.slice(1);
    setKidText($('introZh'), cat.zh, cat.r);
    $('introPics').innerHTML = '';
    const pics = Dino.shuffle(yes.slice()).slice(0, 4).map(w => { const c = card(w); c.style.opacity = 0; $('introPics').append(c); return c; });
    sayCat();
    $('lets').animate([{ transform: 'translateY(-40px) scale(.6)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: ease.back });
    L.querySelector('.name').animate([{ transform: 'scale(.3) rotate(-8deg)', opacity: 0 }, { transform: 'scale(.3)', opacity: 0, offset: .45 }, { transform: 'none', opacity: 1 }], { duration: 900, easing: ease.back });
    pics.forEach((c, i) => c.animate([{ transform: 'translateY(60px) scale(.4)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 460, delay: 1100 + i * 220, easing: ease.back, fill: 'forwards' }));
    $('introGo').animate([{ opacity: 0 }, { opacity: 0, offset: .7 }, { opacity: 1 }], { duration: 2400 });
    await new Promise(r => { L.onclick = () => { L.onclick = null; r(); }; });
    if (my !== gen) return;
    Dino.sfx('tap', .5);
    Dino.voice.stop();
    L.hidden = true;
    const a = $('ask'); a.classList.add('is-on');
    $('buddy').animate([{ transform: 'none' }, { transform: 'translateY(-14px)' }, { transform: 'none' }], { duration: 420, easing: ease.back });
    await wait(900);
    a.classList.remove('is-on');
    if (my !== gen) return;
    t0 = performance.now(); penalty = 0; timing = true;
    hatching = true;
  }

  async function tap(o) {
    if (o.state !== 'open') return;
    const w = o.w;
    if (!inCat(w)) {
      Dino.sfx('wrong', .45);
      if (timing) { penalty += PENALTY; plus(o); }
      Promise.race([Dino.voice(en(w)), wait(2000)]);
      o.egg.animate([{ rotate: '0deg' }, { rotate: '-9deg' }, { rotate: '8deg' }, { rotate: '-5deg' }, { rotate: '0deg' }], { duration: 360, easing: 'ease-in-out' });
      return close(o, true);
    }
    const my = gen, c = o.egg.querySelector('.card');
    found.push(w); o.state = 'hatched';
    Dino.sfx('correct', .8);
    await done(c.animate([{ scale: '1' }, { scale: '1.16', offset: .35 }, { scale: '1.16', offset: .7 }, { scale: '1' }], { duration: 220 }), 220);
    const tb = o.top.getBoundingClientRect();
    burst(tb.left + tb.width / 2, tb.top + tb.height / 2, { n: 14, colors: ['#fffef4', '#f6ebcf', '#d9c39a', '#7fbf6a'], size: 18, shape: 'shard' });
    o.top.animate([{ transform: 'translate(-34%,-22%) rotate(-48deg)' }, { transform: 'translate(-60%,-160%) rotate(-140deg)', opacity: 0 }], { duration: 600, easing: ease.out, fill: 'forwards' });
    // 圖卡飛向進度點
    const dot = document.querySelectorAll('#dots i')[found.length - 1];
    const from = c.getBoundingClientRect(), to = dot.getBoundingClientRect();
    const f = card(w); f.classList.add('fly'); f.style.cssText = `--s:${from.width / .74}px;left:${from.left}px;top:${from.top}px`;
    document.body.append(f); c.style.visibility = 'hidden';
    const dx = to.left + to.width / 2 - (from.left + from.width / 2), dy = to.top + to.height / 2 - (from.top + from.height / 2), k = to.width / from.width;
    done(f.animate([{ transform: 'none' }, { transform: `translate(${dx * .5}px,${dy * .5 - 80}px) scale(.9) rotate(-10deg)`, offset: .5 }, { transform: `translate(${dx}px,${dy}px) scale(${k})`, opacity: .3 }], { duration: 650, easing: 'ease-in-out' }), 650).then(() => {
      f.remove(); dot.classList.add('on');
      dot.animate([{ scale: '1.6' }, { scale: '1' }], { duration: 380, easing: ease.back });
      const r = dot.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, { n: 8, size: 12 });
    });
    cheer();
    Promise.race([Dino.voice(en(w)), wait(2500)]);
    setTimeout(() => {
      if (my !== gen) return;
      c.remove(); o.top.getAnimations().forEach(a => a.cancel()); o.topAnim = o.cardAnim = null;
      o.egg.animate([{ transform: 'scale(.3)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 420, easing: ease.back });
      o.state = 'closed'; o.w = null; o.el.style.zIndex = o.z; o.until = performance.now() + 900;
    }, 1300);
    if (found.length >= GOAL) {
      hatching = false; timing = false; lastTime = elapsed();
      await wait(900); if (my !== gen) return;
      spots.forEach(s => close(s));
      await wait(700); if (my !== gen) return;
      finish();
    }
  }
  function cheer() {
    const b = $('buddy'); b.src = 'assets/cast/iggy__cheer.webp';
    b.animate([{ transform: 'none' }, { transform: 'translateY(-16px) scale(1.06,.96)' }, { transform: 'none' }], { duration: 420, easing: ease.back });
    clearTimeout(cheer.t); cheer.t = setTimeout(() => { b.src = 'assets/cast/iggy__hello.webp'; }, 1400);
  }
  function burst(x, y, { n = 12, colors = ['#ffd34d', '#ff8a6e', '#8fe6b5', '#8fc8ff'], size = 14, shape = 'star' } = {}) {
    for (let i = 0; i < n; i++) {
      const p = document.createElement('div'); p.className = 'fx';
      const s = size * rand(.6, 1.3), a = (i / n) * Math.PI * 2 + rand(-.3, .3), v = rand(90, 190);
      p.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:${s}px;height:${s}px;background:${pick(colors)};` +
        (shape === 'star' ? 'clip-path:polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)' : 'clip-path:polygon(0 0,100% 30%,40% 100%)');
      document.body.append(p);
      const dx = Math.cos(a) * v, dy = Math.sin(a) * v - 80;
      p.animate([{ transform: 'translate(-50%,-50%) rotate(0)', opacity: 1 }, { transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy + 160}px)) rotate(${rand(-300, 300)}deg)`, opacity: 0 }],
        { duration: rand(600, 900), easing: 'cubic-bezier(.2,.6,.4,1)' }).finished.then(() => p.remove());
    }
  }
  function finish() {
    Dino.sfx('finish', .8);
    let rec = {}; try { rec = JSON.parse(localStorage.getItem(REC_KEY)) || {}; } catch { /* ok */ }
    const list = (rec[cat.id] || []), best = list.length ? list[0] : Infinity, now = Math.round(lastTime * 10) / 10;
    const top = [...list, now].sort((x, y) => x - y).slice(0, 5); rec[cat.id] = top;
    try { localStorage.setItem(REC_KEY, JSON.stringify(rec)); } catch { /* ok */ }
    // 結束畫面：打到的圖卡縮圖＋英文（不重複），點一下再念
    $('got').innerHTML = '';
    found.filter((w, i) => found.findIndex(x => x.id === w.id) === i).forEach(w => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'word';
      b.append(card(w)); b.insertAdjacentHTML('beforeend', `<span>${w.en}</span>`);
      b.addEventListener('click', () => Dino.voice(en(w)));
      $('got').append(b);
    });
    $('doneTime').textContent = `${now.toFixed(1)} 秒` + (penalty ? `（含打錯 +${penalty}）` : '');
    let marked = false;
    $('doneRec').innerHTML = top.map((t, i) => { const me = !marked && t === now; if (me) marked = true; return `<li class="${me ? 'me' : ''}"><b>${i + 1}</b>${t.toFixed(1)} 秒</li>`; }).join('');
    $('doneNew').hidden = !(now < best);
    $('done').hidden = false; Dino.bgm.start();
    if (now < best) { const r = $('doneTime').getBoundingClientRect(); for (let i = 0; i < 4; i++) setTimeout(() => burst(r.left + rand(0, r.width), r.top + rand(-20, 20), { n: 16, size: 16 }), i * 260); }
  }
  const elapsed = () => (performance.now() - t0) / 1000 + penalty;
  function showTime() { $('time').textContent = (timing ? elapsed() : 0).toFixed(1); }
  setInterval(() => { if (timing) showTime(); }, 100);
  function plus(o) {
    const r = o.el.getBoundingClientRect(), p = document.createElement('div');
    p.className = 'fx plus'; p.textContent = `+${PENALTY}`; p.style.cssText = `position:fixed;left:${r.left + r.width / 2}px;top:${r.top}px`;
    document.body.append(p);
    p.animate([{ transform: 'translate(-50%,0) scale(.6)', opacity: 0 }, { transform: 'translate(-50%,-30px) scale(1.2)', opacity: 1, offset: .3 }, { transform: 'translate(-50%,-70px)', opacity: 0 }], { duration: 1000, easing: 'ease-out' }).finished.then(() => p.remove());
    $('time').animate([{ color: '#d32f2f', scale: '1.3' }, { color: '', scale: '1' }], { duration: 600 });
  }

  // 每回合隨機換分類（不連續同一個）
  function pickCat() {
    cat = pick(CATS.filter(c => c !== lastCat)); lastCat = cat;
    yes = all.filter(inCat);
    no = all.filter(w => group(w.topic) !== cat.group && !cat.avoid.includes(w.id) && !Dino.isDino(w) && !/^(number|color|shape)$/.test(w.topic));
  }
  function start(newCat) {
    gen++; hatching = false; timing = false; penalty = 0; found = []; sinceHit = 0; Dino.voice.stop();
    document.querySelectorAll('.fly').forEach(n => n.remove());
    if (newCat || !cat) pickCat();
    buildField(); renderBar();
    if (!$('start').hidden) return;
    announce(gen);
  }
  $('ask').addEventListener('click', sayCat);
  $('start').addEventListener('click', () => { $('start').hidden = true; Dino.bgm.stop(); Dino.sfx('tap', .5); start(false); });
  $('done').querySelector('button').addEventListener('click', () => { $('done').hidden = true; Dino.bgm.stop(); Dino.sfx('tap', .5); start(true); });
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => start(false), 300); });

  setKidText($('title'), '恐龍蛋快打');
  // 標題列統一（導演 2026-10-29）：? 玩法框、⚙ 回開始畫面（停掉這回合，按開始重來同一分類）
  const HW = Dino.howto({ preview: 'mole.html', text: '聽題目，打對的蛋', kid: setKidText });
  $('help').addEventListener('click', () => { Dino.sfx('tap', .5); HW.show(); });
  $('menuBtn').addEventListener('click', () => {
    if (!$('start').hidden) return;
    gen++; timing = false; Dino.voice.stop(); $('intro').hidden = true; $('done').hidden = true;
    Dino.sfx('tap', .5); $('start').hidden = false; Dino.bgm.start();
  });
  Dino.bgm.start();
  fetch('data.json').then(r => r.json()).then(d => {
    all = d.filter(w => w.image || (w.sheet && Number.isInteger(w.cell)));
    return fetch('whack_categories.json').then(r => r.json());
  }).then(c => { CATS = c.categories; start(true); });
})();

// 首頁信紙舞台：開場結束才從兩側上台 → 中間碰面打招呼 → 各自巡邏；碰到遊戲選項就停下歡呼
(() => {
  const screen = document.querySelector('.game-selector'), letter = document.querySelector('.selector-letter');
  if (!screen || !letter || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const kidText = Dino.kidText({});   // 對白注音一律用 shared.js 的現成排版（字右側直排）
  const src = n => n.includes('/') ? n : `assets/stage-sample/${n}.webp`;
  // 身高 = u × character_scale × pose_factor（cast.json）
  const cast = {
    feifei: { scale: 1.0, speed: .09, bob: 7, step: 380, poses: { r: ['feifei_walk_r', 1], l: ['feifei_walk_l', 1], qr: ['feifei_3q_r', 1], ql: ['feifei_3q_l', 1], f: ['feifei_front', 1], hello: ['assets/cast/feifei__hello.webp', 1], cheer: ['assets/cast/feifei__cheer.webp', 1] }, hi: ['嗨！', ['ㄏㄞ', '']], tap: [['選一個！', ['ㄒㄩㄢˇ', 'ㄧ', 'ㄍㄜˋ', '']]] },
    xiaokong: { scale: .72, speed: .22, bob: 10, step: 220, poses: { r: ['xiaokong_run_r', .73], l: ['xiaokong_run_l', .73], qr: ['xiaokong_3q_r', 1], ql: ['xiaokong_3q_l', 1], f: ['xiaokong_front', 1], hello: ['assets/cast/xiaokong__hello.webp', 1], cheer: ['assets/cast/xiaokong__cheer.webp', 1] }, hi: ['嗨～', ['ㄏㄞ', '']], tap: [['衝！', ['ㄔㄨㄥ', '']]] },
  };
  Object.values(cast).forEach(c => Object.values(c.poses).forEach(([n]) => { new Image().src = src(n); }));

  const registry = [], actors = () => stage.hidden ? [] : registry.filter(a => a.on && fits[a.key]);
  const stage = document.createElement('div'); stage.className = 'letter-stage'; stage.setAttribute('aria-hidden', 'true');
  screen.appendChild(stage);
  let narrow = false;
  // 角色大小以信紙郵戳直徑為尺：u＝郵戳×REF_K，再受信紙上方空白與信紙寬度限制；角色走路時實際身高低於郵戳的 3/4 就不上台
  const SIZE = { REF_K: 1.8, TOP_FIT: .85, W_FIT: .36, U_MAX: 150, MIN_K: .75 };
  const postmark = letter.querySelector('.letter-postmark');
  const walkH = key => cast[key].scale * Math.min(cast[key].poses.r[1], cast[key].poses.l[1]);
  const fits = {};
  const place = () => {
    const left = letter.offsetLeft, top = letter.offsetTop, w = letter.offsetWidth, ref = postmark?.offsetWidth || 64;
    const u = Math.round(Math.min(ref * SIZE.REF_K, top * SIZE.TOP_FIT, w * SIZE.W_FIT, SIZE.U_MAX));
    narrow = w < 400;
    Object.assign(stage.style, { left: `${left}px`, top: `${top}px`, width: `${w}px`, height: '0px', transform: 'rotate(1deg)' });
    stage.style.setProperty('--u', `${u}px`); stage.dataset.u = u; stage.dataset.ref = ref;
    Object.keys(cast).forEach(k => { fits[k] = u * walkH(k) >= ref * SIZE.MIN_K; });
    registry.forEach(a => { a.el.style.visibility = fits[a.key] ? '' : 'hidden'; });
    stage.hidden = !Object.values(fits).some(Boolean);   // 全部太小（含上方沒空間）就整個舞台不出現
  };
  addEventListener('resize', place);
  const wait = ms => new Promise(res => setTimeout(res, ms));
    const bounce = 'cubic-bezier(.34,1.56,.64,1)';

  const make = key => {
    const c = cast[key], el = document.createElement('div'); el.className = 'stage-actor';
    el.innerHTML = '<span class="shadow"></span><div class="bob"><img alt=""></div>';
    el.style.opacity = 0; stage.appendChild(el);
    const img = el.querySelector('img'), bob = el.querySelector('.bob');
    const bobPx = () => Math.round(c.bob * (+stage.dataset.u || 80) / 80);
    let cur = 'f', hold = 0, walkAnim;
    const a = { key, c, el, x: .5, dir: 'r', on: false };
    const pose = p => { cur = p; const [n, f] = c.poses[p]; img.src = src(n); img.style.setProperty('--h', c.scale * f); };
    const flip = p => { pose(p); bob.animate([{ transform: 'scaleX(.82) translateY(2px)' }, { transform: 'none' }], { duration: 160, easing: 'ease-out' }); };
    a.setX = () => { el.style.transform = `translateX(calc(${a.x * stage.offsetWidth}px - 50%))`; };
    a.walk = to => new Promise(res => {
      a.dir = to > a.x ? 'r' : 'l'; pose(a.dir);
      walkAnim = bob.animate([{ transform: 'translateY(0) rotate(-3deg)' }, { transform: `translateY(-${bobPx()}px) rotate(0)` }, { transform: 'translateY(0) rotate(3deg)' }, { transform: `translateY(-${bobPx()}px) rotate(0)` }, { transform: 'translateY(0) rotate(-3deg)' }], { duration: c.step * 2, iterations: Infinity });
      let last = performance.now();
      const tick = now => {
        const dt = (now - last) / 1000; last = now;
        if (!hold) {
          const d = Math.sign(to - a.x) * c.speed * dt;
          a.x = Math.abs(to - a.x) <= Math.abs(d) ? to : a.x + d; a.setX();
          if (a.x === to) { walkAnim.cancel(); res(); return; }
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    // 轉身：側 → 3/4 → 正面（停）→ 3/4 → 另一側
    a.toFront = async () => { flip(a.dir === 'r' ? 'qr' : 'ql'); await wait(170); flip('f'); };
    a.fromFront = async next => { flip(next === 'r' ? 'qr' : 'ql'); await wait(170); a.dir = next; };
    a.hop = (h = 12, ms = 360) => bob.animate([{ transform: 'translateY(0)' }, { transform: `translateY(-${h}px)` }, { transform: 'translateY(0)' }], { duration: ms, easing: bounce });
    a.say = async ([text, zy], ms = 1300) => {
      const b = document.createElement('span'); b.className = 'stage-say'; kidText(b, text, zy);
      el.appendChild(b); await wait(ms); b.remove();
    };
    a.show = on => {
      a.on = on; el.style.opacity = '';
      return el.animate(on
        ? [{ opacity: 0, transform: `${el.style.transform} translateY(45%)` }, { opacity: 1, transform: `${el.style.transform} translateY(-18%)`, offset: .6 }, { opacity: 1, transform: el.style.transform }]
        : [{ opacity: 1, transform: el.style.transform }, { opacity: 1, transform: `${el.style.transform} translateY(-14%)`, offset: .35 }, { opacity: 0, transform: `${el.style.transform} translateY(45%)` }],
        { duration: 480, easing: 'cubic-bezier(.34,1.3,.64,1)' }).finished.then(() => { if (!on) el.style.opacity = 0; });
    };
    // 插播：說話／歡呼時暫停走路，結束換回原本姿勢
    const interrupt = async fn => {
      if (hold || !a.on) return; hold++; walkAnim?.pause(); const prev = cur;
      try { await fn(); } finally { pose(prev); walkAnim?.play(); hold--; }
    };
    // 看向選項：側走 → 3/4 → 正面，停在原地；離開選項才繼續走
    let looking = false, lookPrev = 'f';
    a.look = async on => {
      if (!a.on || on === looking) return;
      looking = on;
      if (on) {
        hold++; walkAnim?.pause(); lookPrev = cur;
        if (cur === 'r' || cur === 'l') { flip(cur === 'r' ? 'qr' : 'ql'); await wait(170); }
        if (looking) { flip('f'); a.hop(8, 300); }
      } else { flip(lookPrev); walkAnim?.play(); hold--; }
    };
    // 歡呼：點下遊戲選項時（走路中或正在看選項都可以）
    a.cheer = async () => {
      if (!a.on) return; hold++; walkAnim?.pause(); const prev = cur;
      pose('cheer'); burst(el); a.hop(Math.round(bobPx() * 2.4), 420);
      await wait(450); a.hop(Math.round(bobPx() * 1.4), 320); await wait(450);
      pose(looking ? 'f' : prev); hold--; if (!hold) walkAnim?.play();
    };
    el.addEventListener('click', () => interrupt(async () => { pose('f'); a.hop(); await a.say(c.tap[0]); }));
    a.pose = pose; registry.push(a); el.style.visibility = fits[key] ? '' : 'hidden';
    return a;
  };

  // 歡呼星星：純 CSS 星形，從角色身上往外噴
  const burst = el => {
    const box = document.createElement('span'); box.className = 'stage-burst'; el.appendChild(box);
    for (let i = 0; i < 7; i++) {
      const s = document.createElement('i'), ang = -Math.PI * (.1 + .8 * i / 6), dist = 40 + Math.random() * 30;
      s.style.setProperty('--c', ['#f6c146', '#e76855', '#5aa77c'][i % 3]);
      box.appendChild(s);
      s.animate([{ transform: 'translate(-50%,0) scale(.2) rotate(0)', opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(ang) * dist}px), ${Math.sin(ang) * dist}px) scale(1) rotate(160deg)`, opacity: 1, offset: .6 }, { transform: `translate(calc(-50% + ${Math.cos(ang) * dist * 1.15}px), ${Math.sin(ang) * dist * 1.15 + 12}px) scale(.6) rotate(220deg)`, opacity: 0 }], { duration: 760, easing: 'cubic-bezier(.16,1,.3,1)', delay: i * 25, fill: 'both' });
    }
    setTimeout(() => box.remove(), 1000);
  };

  const lap = async (a, lo, hi) => {
    await a.walk(a.dir === 'r' ? hi - Math.random() * .12 : lo + Math.random() * .12);
    const next = a.dir === 'r' ? 'l' : 'r';
    await a.toFront(); a.hop(); await wait(900 + Math.random() * 1400); await a.fromFront(next);
  };

  const start = async () => {
    place();
    const fei = make('feifei'), kong = make('xiaokong');
    // 1) 從兩側各跳上一隻
    fei.x = .06; fei.dir = 'r'; fei.setX(); fei.pose('r');
    kong.x = .94; kong.dir = 'l'; kong.setX(); kong.pose('l');
    // 只有一隻夠大：那隻自己上台、到中間打招呼，然後巡整張信紙
    const solo = fits.feifei !== fits.xiaokong && (fits.feifei ? fei : kong);
    if (solo) {
      await solo.show(true); await solo.walk(.5); await solo.toFront();
      solo.pose('hello'); solo.hop(); await solo.say(solo.c.hi, 1100);
      solo.pose('cheer'); solo.hop(18, 420); burst(solo.el); await wait(700); solo.pose('f');
      await solo.fromFront(solo === fei ? 'l' : 'r');
      for (;;) await lap(solo, .08, .92);
    }
    fei.show(true); await wait(250); await kong.show(true);
    // 2) 走到中間碰面
    const meetL = narrow ? .3 : .38, meetR = narrow ? .7 : .62;
    await Promise.all([fei.walk(meetL), kong.walk(meetR)]);
    // 3) 打招呼：轉正面、揮手、輪流說嗨，一起跳一下
    await Promise.all([fei.toFront(), kong.toFront()]);
    fei.pose('hello'); fei.hop(); const s1 = fei.say(fei.c.hi, 1100);
    await wait(450); kong.pose('hello'); kong.hop(); const s2 = kong.say(kong.c.hi, 1100);
    await Promise.all([s1, s2]);
    fei.pose('cheer'); kong.pose('cheer'); fei.hop(18, 420); kong.hop(18, 420); burst(fei.el); burst(kong.el);
    await wait(700); fei.pose('f'); kong.pose('f');
    await Promise.all([fei.fromFront('l'), kong.fromFront('r')]);
    // 4) 各自回去巡邏；窄信紙只留一隻，輪流登台
    if (!narrow) { (async () => { for (;;) await lap(fei, .08, .5); })(); (async () => { for (;;) await lap(kong, .5, .92); })(); return; }
    await kong.walk(.92); await kong.show(false);
    const actors = [fei, kong];
    for (let i = 0; ; i = (i + 1) % 2) {
      const a = actors[i];
      if (!fits[a.key]) { await wait(500); continue; }
      if (!a.on) { a.dir = i ? 'l' : 'r'; a.x = i ? .82 : .18; a.setX(); a.pose(a.dir); await a.show(true); }
      for (let k = 0; k < 2; k++) await lap(a, .12, .88);
      await a.show(false); await wait(500);
    }
  };
  const go = () => setTimeout(start, 150);
  screen.dataset.intro === 'done' ? go() : document.addEventListener('intro:done', go, { once: true });

  // 碰到遊戲選項：台上角色轉正面看著；點下去才歡呼，0.65 秒後進遊戲
  const lookAll = on => actors().forEach(a => a.look(on));
  document.querySelectorAll('.game-choice').forEach(ch => {
    ch.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') lookAll(true); });
    ch.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') lookAll(false); });
    ch.addEventListener('focus', () => lookAll(true));
    ch.addEventListener('blur', () => lookAll(false));
    ch.addEventListener('click', e => {
      if (!actors().length || e.metaKey || e.ctrlKey) return;
      e.preventDefault(); actors().forEach(a => a.cheer());
      setTimeout(() => { location.href = ch.href; }, 650);
    });
  });
})();

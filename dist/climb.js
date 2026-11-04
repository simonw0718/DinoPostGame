(() => {
  'use strict';
  // 上山送信（sample v2，導演 2026-11-04）：伊奇（孩子）vs 1 隻對手，擲骰子沿剪紙山路走到山頂大樹下漢默爺爺的樹洞屋。
  // 旁白＝伊奇語音（assets/audio/climb/<id>.mp3，台詞 data/iggy_lines.json 的 climb）＋彈出泡泡；缺音檔時靠計時照常往下，不會卡住。
  // 測試用：網址加 ?fast=6 把所有等待縮短（只給自動測試）。
  const $ = id => document.getElementById(id);
  const FAST = (() => { const v = new URLSearchParams(location.search).get('fast'); return v ? (+v || 6) : 1; })();   // 導演 11-04 晚：快 30% 實玩太快，回正常速度
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  class Abort extends Error {}
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = a => a[Math.floor(Math.random() * a.length)];

  // ───────── 注音（唯一排版＝Dino.kidText；表格用 Z(原文, 逐字注音) 登錄，標點與數字自動留空）─────────
  // 標題集中在這裡（導演 11-04 暫定；備選：樹洞大賽跑、看誰先到樹洞屋）。換標題只改 TITLE 與下表注音
  const TITLES = { '恐龍賽跑上山頂': 'ㄎㄨㄥˇ ㄌㄨㄥˊ ㄙㄞˋ ㄆㄠˇ ㄕㄤˋ ㄕㄢ ㄉㄧㄥˇ', '樹洞大賽跑': 'ㄕㄨˋ ㄉㄨㄥˋ ㄉㄚˋ ㄙㄞˋ ㄆㄠˇ', '看誰先到樹洞屋': 'ㄎㄢˋ ㄕㄟˊ ㄒㄧㄢ ㄉㄠˋ ㄕㄨˋ ㄉㄨㄥˋ ㄨ' };
  const TITLE = '樹洞大賽跑';
  const TABLE = {};
  const kid = Dino.kidText(TABLE);
  function Z(text, syl) {
    const s = syl.split(/\s+/).filter(Boolean); let k = 0;
    TABLE[text] = [...text].map(c => /[㐀-鿿]/.test(c) ? (s[k++] || '') : '');
    if (k !== s.length) console.warn('注音數量不符', text, k, s.length);
  }
  Object.entries(TITLES).forEach(([t, z]) => Z(t, z));
  [['點一下，開始比賽！', 'ㄉㄧㄢˇ ㄧ ㄒㄧㄚˋ ㄎㄞ ㄕˇ ㄅㄧˇ ㄙㄞˋ'],
   ['新手', 'ㄒㄧㄣ ㄕㄡˇ'], ['簡單', 'ㄐㄧㄢˇ ㄉㄢ'], ['普通', 'ㄆㄨˇ ㄊㄨㄥ'], ['困難', 'ㄎㄨㄣˋ ㄋㄢˊ'],
   ['小雞阿暴', 'ㄒㄧㄠˇ ㄐㄧ ㄚ ㄅㄠˋ'], ['小空', 'ㄒㄧㄠˇ ㄎㄨㄥ'], ['飛飛', 'ㄈㄟ ㄈㄟ'],
   ['知道了', 'ㄓ ㄉㄠˋ ㄌㄜ˙'], ['再玩一次', 'ㄗㄞˋ ㄨㄢˊ ㄧ ㄘˋ'], ['回首頁', 'ㄏㄨㄟˊ ㄕㄡˇ ㄧㄝˋ'],
   ['擲骰子，走到山頂！', 'ㄓˋ ㄕㄞˇ ㄗ˙ ㄗㄡˇ ㄉㄠˋ ㄕㄢ ㄉㄧㄥˇ'],
   ['我們來比賽！看誰先把信送到山頂大樹下！', 'ㄨㄛˇ ㄇㄣ˙ ㄌㄞˊ ㄅㄧˇ ㄙㄞˋ ㄎㄢˋ ㄕㄟˊ ㄒㄧㄢ ㄅㄚˇ ㄒㄧㄣˋ ㄙㄨㄥˋ ㄉㄠˋ ㄕㄢ ㄉㄧㄥˇ ㄉㄚˋ ㄕㄨˋ ㄒㄧㄚˋ'],
   ['輪到你了！點骰子！', 'ㄌㄨㄣˊ ㄉㄠˋ ㄋㄧˇ ㄌㄜ˙ ㄉㄧㄢˇ ㄕㄞˇ ㄗ˙'],
   ['輪到小雞阿暴！', 'ㄌㄨㄣˊ ㄉㄠˋ ㄒㄧㄠˇ ㄐㄧ ㄚ ㄅㄠˋ'], ['輪到小空！', 'ㄌㄨㄣˊ ㄉㄠˋ ㄒㄧㄠˇ ㄎㄨㄥ'], ['飛飛帶路，前進兩格！', 'ㄈㄟ ㄈㄟ ㄉㄞˋ ㄌㄨˋ ㄑㄧㄢˊ ㄐㄧㄣˋ ㄌㄧㄤˇ ㄍㄜˊ'], ['輪到飛飛！', 'ㄌㄨㄣˊ ㄉㄠˋ ㄈㄟ ㄈㄟ'],
   ['一格一格點！', 'ㄧ ㄍㄜˊ ㄧ ㄍㄜˊ ㄉㄧㄢˇ'], ['點要停的石頭！', 'ㄉㄧㄢˇ ㄧㄠˋ ㄊㄧㄥˊ ㄉㄜ˙ ㄕˊ ㄊㄡ˙'],
   ['整十石！郵差小挑戰！', 'ㄓㄥˇ ㄕˊ ㄕˊ ㄧㄡˊ ㄔㄞ ㄒㄧㄠˇ ㄊㄧㄠˇ ㄓㄢˋ'], ['郵差小挑戰', 'ㄧㄡˊ ㄔㄞ ㄒㄧㄠˇ ㄊㄧㄠˇ ㄓㄢˋ'],
   ['有幾個包裹？', 'ㄧㄡˇ ㄐㄧˇ ㄍㄜ˙ ㄅㄠ ㄍㄨㄛˇ'], ['還差幾個湊成十？', 'ㄏㄞˊ ㄔㄚ ㄐㄧˇ ㄍㄜ˙ ㄘㄡˋ ㄔㄥˊ ㄕˊ'],
   ['哪一堆比較多？', 'ㄋㄚˇ ㄧ ㄉㄨㄟ ㄅㄧˇ ㄐㄧㄠˋ ㄉㄨㄛ'],
   ['答對了！給你郵票！', 'ㄉㄚˊ ㄉㄨㄟˋ ㄌㄜ˙ ㄍㄟˇ ㄋㄧˇ ㄧㄡˊ ㄆㄧㄠˋ'], ['沒關係，一起數！', 'ㄇㄟˊ ㄍㄨㄢ ㄒㄧˋ ㄧ ㄑㄧˇ ㄕㄨˇ'],
   ['翼龍載我們，前進三格！', 'ㄧˋ ㄌㄨㄥˊ ㄗㄞˋ ㄨㄛˇ ㄇㄣ˙ ㄑㄧㄢˊ ㄐㄧㄣˋ ㄙㄢ ㄍㄜˊ'], ['藤蔓纏住腳，停一回合！', 'ㄊㄥˊ ㄨㄢˋ ㄔㄢˊ ㄓㄨˋ ㄐㄧㄠˇ ㄊㄧㄥˊ ㄧ ㄏㄨㄟˊ ㄏㄜˊ'],
   ['泥巴坑！滑回兩格！', 'ㄋㄧˊ ㄅㄚ ㄎㄥ ㄏㄨㄚˊ ㄏㄨㄟˊ ㄌㄧㄤˇ ㄍㄜˊ'], ['哈啾！大家退一格！', 'ㄏㄚ ㄐㄧㄡ ㄉㄚˋ ㄐㄧㄚ ㄊㄨㄟˋ ㄧ ㄍㄜˊ'],
   ['小空帶路，前進兩格！', 'ㄒㄧㄠˇ ㄎㄨㄥ ㄉㄞˋ ㄌㄨˋ ㄑㄧㄢˊ ㄐㄧㄣˋ ㄌㄧㄤˇ ㄍㄜˊ'],
   ['阿暴數對了嗎？', 'ㄚ ㄅㄠˋ ㄕㄨˇ ㄉㄨㄟˋ ㄌㄜ˙ ㄇㄚ˙'], ['不對！', 'ㄅㄨˊ ㄉㄨㄟˋ'], ['抓到了！阿暴多走一格！', 'ㄓㄨㄚ ㄉㄠˋ ㄌㄜ˙ ㄚ ㄅㄠˋ ㄉㄨㄛ ㄗㄡˇ ㄧ ㄍㄜˊ'],
   ['太棒了！我們先到山頂！', 'ㄊㄞˋ ㄅㄤˋ ㄌㄜ˙ ㄨㄛˇ ㄇㄣ˙ ㄒㄧㄢ ㄉㄠˋ ㄕㄢ ㄉㄧㄥˇ'], ['對手先到了，我們也到了！', 'ㄉㄨㄟˋ ㄕㄡˇ ㄒㄧㄢ ㄉㄠˋ ㄌㄜ˙ ㄨㄛˇ ㄇㄣ˙ ㄧㄝˇ ㄉㄠˋ ㄌㄜ˙'],
   ['信送到了！', 'ㄒㄧㄣˋ ㄙㄨㄥˋ ㄉㄠˋ ㄌㄜ˙'], ['漢默爺爺的樹洞家', 'ㄏㄢˋ ㄇㄛˋ ㄧㄝˊ ㄧㄝˊ ㄉㄜ˙ ㄕㄨˋ ㄉㄨㄥˋ ㄐㄧㄚ']
  ].forEach(([t, s]) => Z(t, s));
  const CN = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'], CNZ = ['', 'ㄧ', 'ㄦˋ', 'ㄙㄢ', 'ㄙˋ', 'ㄨˇ', 'ㄌㄧㄡˋ', 'ㄑㄧ', 'ㄅㄚ', 'ㄐㄧㄡˇ', 'ㄕˊ'];
  for (let v = 1; v <= 10; v++) { Z(`擲到${CN[v]}！`, `ㄓˋ ㄉㄠˋ ${CNZ[v]}`); Z(`退${CN[v]}格！`, `ㄊㄨㄟˋ ${CNZ[v]} ㄍㄜˊ`); }
  [['算一算，走到幾號？', 'ㄙㄨㄢˋ ㄧ ㄙㄨㄢˋ ㄗㄡˇ ㄉㄠˋ ㄐㄧˇ ㄏㄠˋ'], ['超過山頂了，走到山頂！', 'ㄔㄠ ㄍㄨㄛˋ ㄕㄢ ㄉㄧㄥˇ ㄌㄜ˙ ㄗㄡˇ ㄉㄠˋ ㄕㄢ ㄉㄧㄥˇ'], ['算對了！好棒！', 'ㄙㄨㄢˋ ㄉㄨㄟˋ ㄌㄜ˙ ㄏㄠˇ ㄅㄤˋ'],
   ['走幾格？點石頭！', 'ㄗㄡˇ ㄐㄧˇ ㄍㄜˊ ㄉㄧㄢˇ ㄕˊ ㄊㄡ˙'], ['數一數，走幾格？', 'ㄕㄨˇ ㄧ ㄕㄨˇ ㄗㄡˇ ㄐㄧˇ ㄍㄜˊ'], ['數對了！好棒！', 'ㄕㄨˇ ㄉㄨㄟˋ ㄌㄜ˙ ㄏㄠˇ ㄅㄤˋ'],
   ['我們一起一格一格數！', 'ㄨㄛˇ ㄇㄣ˙ ㄧ ㄑㄧˇ ㄧ ㄍㄜˊ ㄧ ㄍㄜˊ ㄕㄨˇ'], ['數好了，走！', 'ㄕㄨˇ ㄏㄠˇ ㄌㄜ˙ ㄗㄡˇ'], ['往回走幾格？點石頭！', 'ㄨㄤˇ ㄏㄨㄟˊ ㄗㄡˇ ㄐㄧˇ ㄍㄜˊ ㄉㄧㄢˇ ㄕˊ ㄊㄡ˙']].forEach(([t, z]) => Z(t, z));

  // ───────── 資料 ─────────
  const LEVELS = {
    // 導演 11-04 晚改機制：①簡單＝一顆六面骰（1–6 點，數點點）②普通＝一顆骰子直接寫數字，排算式「自己的號碼＋骰子＝？」
    // ③困難＝兩顆寫數字的骰子，算式「自己的號碼＋骰子1＋骰子2＝？」。②③孩子算出答案直接點那顆石頭
    one: { N: 40, dice: 1, dmax: 6, catchOn: false, events: { 6: 'wing', 13: 'mud', 17: 'guide', 23: 'vine', 27: 'sneeze', 34: 'wing' } },
    two: { N: 60, dice: 1, dmax: 10, eq: true, catchOn: true, events: { 6: 'wing', 13: 'mud', 17: 'guide', 23: 'vine', 27: 'sneeze', 34: 'wing', 43: 'guide', 47: 'mud', 54: 'wing' } },
    hard: { N: 60, dice: 2, dmax: 10, eq: true, catchOn: false, events: { 6: 'wing', 13: 'mud', 17: 'guide', 23: 'vine', 27: 'sneeze', 34: 'wing', 43: 'guide', 47: 'mud', 54: 'wing' } }
  };
  const EV = {
    wing:   { text: '翼龍載我們，前進三格！', d: +3, icon: 'i-wing' }, guide: { text: '小空帶路，前進兩格！', d: +2, icon: 'i-guide' },
    mud:    { text: '泥巴坑！滑回兩格！', d: -2, icon: 'i-mud' }, vine: { text: '藤蔓纏住腳，停一回合！', d: 0, icon: 'i-vine' },
    sneeze: { text: '哈啾！大家退一格！', d: -1, icon: 'i-sneeze' }
  };
  const NPCS = {
    abao:   { name: '小雞阿暴', img: 'chick_abao', pose: 'walk_r', cheer: 'cheer', h: 150, dur: .38, hop: .5, turn: 'turn_abao', turnText: '輪到小雞阿暴！', hasty: true },
    xiaokong: { name: '小空', img: 'xiaokong', pose: 'run_r', cheer: 'cheer', h: 150, dur: .42, hop: .8, turn: 'turn_xiaokong', turnText: '輪到小空！' },
    feifei: { name: '飛飛', img: 'feifei', pose: 'fly_r', cheer: 'cheer', h: 150, dur: .5, hop: 1.1, turn: 'turn_feifei', turnText: '輪到飛飛！', fly: true }
  };
  const VOICES = ['intro', 'turn_you', 'turn_abao', 'turn_xiaokong', 'turn_feifei', 'roll_1', 'roll_2', 'roll_3', 'roll_4', 'roll_5', 'roll_6', 'step_pick', 'tap_target', 'count_dice', 'move_ok', 'move_fix', 'tap_back', 'arrive_ten',
    'quiz_count', 'quiz_ten', 'quiz_more', 'quiz_ok', 'quiz_no', 'event_wing', 'event_vine', 'event_mud', 'event_sneeze', 'event_guide', 'event_guide_feifei', 'catch_prompt', 'catch_ok', 'win_you', 'win_npc', 'goal'];

  // ───────── 狀態 ─────────
  const view = $('view'), world = $('world');
  let board = null, P = [], stones = [], L = LEVELS.one, N = 40;
  let levelKey = 'one', npcKey = 'abao';
  try { levelKey = localStorage.getItem('dinopost-climb-level') || levelKey; npcKey = localStorage.getItem('dinopost-climb-npc') || npcKey; } catch { /* ok */ }
  if (!LEVELS[levelKey]) levelKey = 'one'; if (!NPCS[npcKey]) npcKey = 'abao';
  let G = 0, running = false, dirty = true, paused = false, stamps = 0, winner = null, lastCam = null;
  let you, npc, tapHandler = null, wrongClick = null;
  const aborters = new Set();
  const S = { get at() { return [you?.at, npc?.at]; }, get level() { return levelKey; }, get N() { return N; }, get stamps() { return stamps; }, get done() { return !!winner; }, get running() { return running; } };
  window.__climb = S; S.runQuiz = () => runQuiz(); S.runEvent = (k, who) => runEvent(who === 'npc' ? npc : you, k); S.warp = (a, b) => { you.at = a; npc.at = b; place(you); place(npc); camera([posOf(you)]); }; S.stones = () => stones; S.target = () => S._target;

  // ───────── 幾何：近大遠小 ─────────
  const kat = y => {
    const t = board.scale_y; if (y <= t[0][0]) return t[0][1];
    for (let i = 1; i < t.length; i++) if (y <= t[i][0]) { const [y0, k0] = t[i - 1], [y1, k1] = t[i]; return k0 + (k1 - k0) * (y - y0) / (y1 - y0); }
    return 1;
  };
  const kk = y => Math.pow(kat(y), .75);   // 石頭與角色用的縮放（遠處放寬，數字才看得清）
  function layout() {
    const sp = board.road_spine, cum = [0];
    for (let i = 1; i < sp.length; i++) cum.push(cum[i - 1] + Math.hypot(sp[i][0] - sp[i - 1][0], sp[i][1] - sp[i - 1][1]) / kat((sp[i][1] + sp[i - 1][1]) / 2));
    const total = cum[cum.length - 1]; P = [];
    for (let i = 0; i <= N; i++) {
      const d = total * i / N; let j = 1; while (j < cum.length - 1 && cum[j] < d) j++;
      const r = (d - cum[j - 1]) / ((cum[j] - cum[j - 1]) || 1), a = sp[j - 1], b = sp[j];
      let x = a[0] + (b[0] - a[0]) * r, y = a[1] + (b[1] - a[1]) * r;
      if (i > 0 && i < N) { const tx = b[0] - a[0], ty = b[1] - a[1], n = Math.hypot(tx, ty) || 1, off = (((i * 37) % 7) - 3) * 5 * kat(y); x += -ty / n * off; y += tx / n * off; }
      P.push([x, y]);
    }
  }
  function buildStones() {
    stones.forEach(s => s && s.remove()); stones = [];
    for (let n = 1; n <= N; n++) {
      const [x, y] = P[n], nb = P[Math.min(N, n + 1)], pb = P[n - 1];
      const gap = Math.min(Math.hypot(nb[0] - x, nb[1] - y) || 999, Math.hypot(pb[0] - x, pb[1] - y) || 999);
      const d = Math.min(128 * kk(y), gap * .72), ev = L.events[n], ten = n % 10 === 0 && n < N, goal = n === N;
      const el = document.createElement('button'); el.type = 'button'; el.className = 'stone' + (ten ? ' ten' : '') + (ev ? ' event' : '') + (goal ? ' goal' : ''); el.dataset.n = n;
      el.setAttribute('aria-label', String(n));
      Object.assign(el.style, { left: x + 'px', top: y + 'px', width: d + 'px', height: d * .84 + 'px', fontSize: d + 'px', zIndex: Math.round(y) });
      el.innerHTML = `<span class="rock"></span><span class="num">${n}</span>` +
        (ten ? '<span class="flag"><svg viewBox="0 0 40 64"><use href="#i-flag"/></svg></span>' : '') +
        (ev ? `<span class="badge"><svg viewBox="0 0 64 64"><use href="#${EV[ev].icon}"/></svg></span>` : '') +
        (goal ? '<span class="badge"><svg viewBox="0 0 64 64"><use href="#i-hut"/></svg></span>' : '');
      el.addEventListener('click', () => tapHandler && tapHandler(n, el));
      world.appendChild(el); stones[n] = el;
    }
  }

  // ───────── 時間／聲音／旁白 ─────────
  function sleepRaw(ms) { return new Promise(r => setTimeout(r, ms / FAST)); }
  async function sleep(ms) {
    const g = G; await sleepRaw(ms);
    while (paused) await new Promise(r => setTimeout(r, 120));
    if (g !== G) throw new Abort();
  }
  function userWait(setup) {
    return new Promise((res, rej) => { const fail = () => rej(new Abort()); aborters.add(fail); setup(v => { aborters.delete(fail); res(v); }); });
  }
  const voiceUrl = id => `assets/audio/climb/${id}.mp3`;
  const numVoice = n => { Dino.voice.stop(); Dino.voice(`assets/audio/num/zh/${n}.mp3`); };
  async function say(id, text, { min = 900, who = 'iggy', hold = false } = {}) {
    showBubble(text, who);
    Dino.voice.stop();
    const lim = Math.min(9000, 2200 + [...text].length * 230);
    const v = Promise.race([id ? Dino.voice(voiceUrl(id)) : Promise.resolve(), sleepRaw(lim)]);
    await Promise.all([v, sleep(min)]);
    if (!hold) await sleep(250);
  }
  function showBubble(text, who = 'iggy') {
    const b = $('bubble'); $('bubbleWho').src = `assets/cast/${who}__hello.webp`;
    kid($('bubbleText'), text); b.hidden = false; b.classList.remove('in'); void b.offsetWidth; b.classList.add('in');
  }
  const hideBubble = () => { $('bubble').hidden = true; };

  // ───────── 鏡頭 ─────────
  function camera(pts, { instant = false, overview = false, bias = .48 } = {}) {
    lastCam = [pts, { overview, bias }];
    const vw = view.clientWidth, vh = view.clientHeight; let z, tx, ty;
    if (overview) { z = Math.min(vw / 1536, vh / 2048); tx = (vw - 1536 * z) / 2; ty = (vh - 2048 * z) / 2; }
    else {
      const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
      z = vw / (1000 * Math.pow(kat(cy), .45));
      z = Math.min(z, vw / (Math.max(...xs) - Math.min(...xs) + 300), vh / (Math.max(...ys) - Math.min(...ys) + 320));
      z = Math.min(z, vh / 760);   // 橫式／電腦寬版：至少看到 760 世界像素高
      z = Math.max(z, vw / 1536, vh / 2048);
      tx = Math.min(0, Math.max(vw - 1536 * z, vw / 2 - cx * z)); ty = Math.min(0, Math.max(vh - 2048 * z, vh * bias - cy * z));
    }
    world.classList.toggle('jump', instant || RM);
    world.style.transform = `translate(${tx}px,${ty}px) scale(${z})`;
    if (instant) { void world.offsetWidth; world.classList.remove('jump'); }
  }
  addEventListener('resize', () => { if (lastCam) camera(lastCam[0], { instant: true, ...lastCam[1] }); fitRest(); });

  // ───────── 角色 ─────────
  function makeTok(def, human) {
    const t = { def, human, at: 0, skip: false, x: 0, y: 0, el: document.createElement('div') };
    t.el.className = 'tok'; t.img = document.createElement('img'); t.img.alt = ''; t.img.src = `assets/cast/${def.img}__${def.pose}.webp`;
    t.el.appendChild(t.img);
    if (human) { t.mark = document.createElement('span'); t.mark.className = 'you'; t.mark.innerHTML = '<svg viewBox="0 0 40 36"><use href="#i-arrow"/></svg>'; t.mark.hidden = true; t.el.appendChild(t.mark); }
    world.appendChild(t.el); return t;
  }
  function place(t, dur = 0, idx = t.at) {
    const [sx, sy] = P[Math.max(0, Math.min(N, idx))], k = kk(sy), h = t.def.h * k, sw = 128 * k;
    const x = sx + (t.human ? -.3 : .3) * sw, y = sy + 20 * k - (t.def.fly ? 26 * k : 0);
    if (t.x && Math.abs(x - t.x) > 2) t.el.classList.toggle('flip', x < t.x);
    t.x = x; t.y = y;
    t.el.style.setProperty('--mv', dur / FAST + 's');
    Object.assign(t.el.style, { left: x + 'px', top: y + 'px', height: h + 'px', fontSize: h + 'px', zIndex: Math.round(sy) + 5 });
  }
  const posOf = t => [t.x, t.y - 60];
  function hop(t, mag = 1, dur = .5) {
    if (RM) return; const h = -46 * kk(t.y) * mag;
    t.img.animate([{ transform: 'translateY(0)' }, { transform: `translateY(${h}px)`, offset: .45 }, { transform: 'translateY(0)' }], { duration: dur * 1000 / FAST, easing: 'ease-out' });
  }
  async function stepTo(t, idx, { count = true, dur = t.def.dur, follow = true } = {}) {
    t.at = idx; place(t, dur); hop(t, t.def.hop, dur);
    if (follow) camera([posOf(t)]);
    Dino.sfx('tap', .5); if (count && idx > 0) numVoice(idx);
    await sleep(dur * 1000 + 90);
  }
  const setPose = (t, pose) => { t.img.src = `assets/cast/${t.def.img}__${pose}.webp`; };

  // ───────── 骰子 ─────────
  // 導演 11-04：骰子外觀一律六面骰，但點數是 1–10；7–10 點用固定排法（一列一列數得清）
  // 左下角骰子鈕同樣是六面骰；困難多一顆「加減骰」（六面：5 面＋、1 面－）
  const G3 = [22, 50, 78], at3 = (r, c) => [G3[c], G3[r]];
  const LAYOUT = {
    1: [at3(1, 1)], 2: [at3(0, 0), at3(2, 2)], 3: [at3(0, 0), at3(1, 1), at3(2, 2)], 4: [at3(0, 0), at3(0, 2), at3(2, 0), at3(2, 2)],
    5: [at3(0, 0), at3(0, 2), at3(1, 1), at3(2, 0), at3(2, 2)], 6: [at3(0, 0), at3(0, 2), at3(1, 0), at3(1, 2), at3(2, 0), at3(2, 2)],
    7: [at3(0, 0), at3(0, 2), at3(1, 0), at3(1, 1), at3(1, 2), at3(2, 0), at3(2, 2)],
    8: [at3(0, 0), at3(0, 1), at3(0, 2), at3(1, 0), at3(1, 2), at3(2, 0), at3(2, 1), at3(2, 2)],
    9: [0, 1, 2].flatMap(r => [0, 1, 2].map(c => at3(r, c))),
    10: [[24, 20], [50, 20], [76, 20], [14, 50], [38, 50], [62, 50], [86, 50], [24, 80], [50, 80], [76, 80]]
  };
  const DOT = v => v <= 6 ? 21 : v <= 9 ? 18 : 15;   // 點的大小（面寬 %）
  function paintFace(f, v) {
    f.innerHTML = ''; f.classList.add('pts');
    return LAYOUT[v].map(([x, y]) => { const i = document.createElement('i'); Object.assign(i.style, { left: x + '%', top: y + '%', width: DOT(v) + '%', height: DOT(v) + '%' }); if (v === 1) i.className = 'one'; f.appendChild(i); return i; });
  }
  const FACE_OF = { 1: 'f1', 2: 'f2', 3: 'f3', 4: 'f4', 5: 'f5', 6: 'f6' };
  const ROTV = { 1: [0, 0], 2: [0, -90], 3: [-90, 0], 4: [90, 0], 5: [0, 90], 6: [0, 180] };
  const rotStr = (v, ex = 0, ey = 0) => `rotateX(${ROTV[v][0] + ex}deg) rotateY(${ROTV[v][1] + ey}deg)`;
  const SIGN_SVG = { '+': '<svg viewBox="0 0 40 40"><path d="M20 6V34M6 20H34" stroke="#2c7a3e" stroke-width="8" stroke-linecap="round"/></svg>', '-': '<svg viewBox="0 0 40 40"><path d="M6 20H34" stroke="#d93d2f" stroke-width="8" stroke-linecap="round"/></svg>' };
  function makeCube(d, sign = false, faces = [1, 2, 3, 4, 5, 6]) {   // sign＝加減骰：面 6 是「－」，其餘是「＋」；faces＝各面點數（f1 是落地朝前那面）
    const root = document.createElement('div'); root.className = 'd3' + (sign ? ' signcube' : ''); if (d) root.style.setProperty('--d', d + 'px');
    const cube = document.createElement('div'); cube.className = 'cube'; const fs = [];
    for (let v = 1; v <= 6; v++) {
      const f = document.createElement('div'); f.className = 'face ' + FACE_OF[v]; fs.push(f);
      if (sign) { f.classList.add('sign'); f.innerHTML = SIGN_SVG[v === 6 ? '-' : '+']; } else paintFace(f, faces[v - 1]);
      cube.appendChild(f);
    }
    root.appendChild(cube); root._cube = cube;
    root._set = v => { root._v = v; if (root._num) { fs[0].classList.remove('pts'); fs[0].classList.add('num'); fs[0].innerHTML = `<b>${v}</b>`; root._dots = []; } else root._dots = paintFace(fs[0], v); };
    root._label = v => { let b = root.querySelector('.dnum'); if (!b) { b = document.createElement('b'); b.className = 'dnum'; root.appendChild(b); } b.textContent = v; };   // 導演 11-04：骰子上方直接寫數字
    return root;
  }
  const makeD10 = w => { const c = makeCube(w, false, [1, ...shuf([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).slice(0, 5)]); return c; };
  function makeDie(w) {   // 依難度：簡單＝真六面骰；普通／困難＝每面直接寫數字（導演 11-04 晚）
    if (!L.eq) return L.dmax <= 6 ? makeCube(w) : makeD10(w);
    const c = makeCube(w); c._num = true;
    c._cube.querySelectorAll('.face').forEach((f, i) => { f.classList.remove('pts'); f.classList.add('num'); f.innerHTML = `<b>${[1, ...shuf([2, 3, 4, 5, 6, 7, 8, 9, 10]).slice(0, 5)][i]}</b>`; });
    return c;
  }
  const eqSay = (parts, ans) => {   // 「23加5，等於28！」：登錄注音再念（數字自動留空）
    const t = parts.join('加') + `，等於${ans}！`; Z(t, [...Array(parts.length - 1)].map(() => 'ㄐㄧㄚ').concat('ㄉㄥˇ ㄩˊ').join(' ')); return t;
  };
  const dieW = () => Math.max(190, Math.min(300, Math.min(view.clientWidth, view.clientHeight) * .4));
  let tiles = [];
  async function throwDice(count, fromNpc, sign, who) {   // who＝擲骰的角色：數骰子時顯示他現在站的號碼（導演 11-04：才能用加法決定位置）   // 回傳點數陣列；sign 給 '+'／'-' 就多丟一顆加減骰
    const vw = view.clientWidth, vh = view.clientHeight, w = dieW(), wrap = $('diceWrap');
    wrap.innerHTML = ''; wrap.classList.remove('parked', 'eqmode'); view.classList.remove('parked');
    const th = document.createElement('div'); th.className = 'thrower'; th.style.setProperty('--w', w + 'px');
    tiles = Array.from({ length: count }, () => makeDie(w * .62)); tiles.forEach(t => { t._cube.style.transform = rotStr(1); th.appendChild(t); });
    let sc = null; if (sign) { sc = makeCube(w * .45, true); if (tiles[1]) th.insertBefore(sc, tiles[1]); else th.appendChild(sc); }   // 困難：骰子 ± 骰子
    if (who) { const h = document.createElement('div'); h.className = 'here'; h.innerHTML = `<img src="assets/cast/${who.def.img}__hello.webp" alt=""><span class="rock"></span><b>${who.at}</b>`; wrap.appendChild(h); }
    wrap.appendChild(th);
    const vals = Array.from({ length: count }, () => rnd(1, L.dmax));
    const sx = fromNpc ? -vw * .42 : vw * .4, sy = fromNpc ? -vh * .42 : vh * .4;
    Dino.sfx('swoosh', .7);
    const T = 900 / FAST, signFace = sign === '-' ? 6 : rnd(1, 5);   // 導演 11-04：動畫快一點
    if (sc) sc._cube.style.transform = rotStr(signFace);
    if (RM) { th.style.transform = 'none'; tiles.forEach((t, i) => t._set(vals[i])); }
    else {
      th.animate([
        { transform: `translate(${sx}px,${sy}px) scale(.35) rotate(0deg)`, offset: 0, easing: 'cubic-bezier(.3,.6,.4,1)' },
        { transform: `translate(${sx * .35}px,${-vh * .2}px) scale(1.15) rotate(200deg)`, offset: .4, easing: 'cubic-bezier(.5,0,.8,.5)' },
        { transform: 'translate(0,0) scale(1) rotate(340deg)', offset: .66, easing: 'cubic-bezier(.3,.6,.4,1)' },
        { transform: `translate(0,${-vh * .06}px) scale(1.04) rotate(355deg)`, offset: .8, easing: 'cubic-bezier(.5,0,.8,.5)' },
        { transform: 'translate(0,0) scale(1) rotate(360deg)', offset: 1 }
      ], { duration: T, fill: 'forwards' });
      tiles.forEach((t, i) => t._cube.animate([{ transform: `rotateX(${rnd(0, 3) * 90}deg) rotateY(${rnd(0, 3) * 90}deg)` }, { transform: rotStr(1, 720 + i * 360, 720) }], { duration: T * .9, easing: 'cubic-bezier(.2,.6,.3,1)' }));
      if (sc) sc._cube.animate([{ transform: `rotateX(${rnd(0, 3) * 90}deg) rotateY(${rnd(0, 3) * 90}deg)` }, { transform: rotStr(signFace, 720, 720) }], { duration: T * .9, easing: 'cubic-bezier(.2,.6,.3,1)' });
      tiles.forEach((t, i) => t._set(vals[i]));
      [.66, .8].forEach(o => setTimeout(() => Dino.sfx('tap', .5 - o * .3), T * o));
    }
    await sleep(RM ? 300 : 900);
    tiles.forEach((t, i) => { t._set(vals[i]); if (!L.eq) t._label(vals[i]); });
    if (L.eq && who) {   // 算式：自己的號碼＋骰子（＋骰子）＝？，不顯示答案
      const q = document.createElement('div'); q.className = 'eq'; wrap.classList.add('eqmode');
      q.innerHTML = [who.at, ...vals].map(v => `<b>${v}</b>`).join('<i>＋</i>') + '<i>＝</i><b class="q">?</b>'; th.after(q);
    }
    th.getAnimations().forEach(a => a.cancel()); th.style.transform = 'none';
    return vals;
  }
  async function countTile(t, from = 0, down = false) {   // 一顆骰子：圓點一顆顆亮起來並念數字（from＝接著數的起點；down＝倒著數）
    const dots = t._dots.slice(0, t._v);
    for (const [i, d] of dots.entries()) { const n = down ? from - i - 1 : from + i + 1; d.classList.add('lit'); d.textContent = n; numVoice(n); await sleep(420); }   // 導演 11-04：數的時候點上顯示數字
  }
  async function countOn(vals) {   // 示範接著數：第一顆整顆亮、念出它的數，第二顆從下一個數接著數
    tiles[0]._dots.slice(0, vals[0]).forEach((d, i) => { d.classList.add('lit'); d.textContent = i + 1; });
    numVoice(vals[0]); await sleep(800);
    await countTile(tiles[1], vals[0]);
  }
  const clearDice = () => { $('diceWrap').innerHTML = ''; $('diceWrap').classList.remove('parked', 'eqmode'); view.classList.remove('parked'); tiles = []; };
  // 數完後把骰子縮小停到左上角，不擋住要點的石頭（導演 11-04）；孩子點骰子會幫數那一顆
  function parkDice(tappable) {
    const wrap = $('diceWrap'), th = wrap.querySelector('.thrower'); if (!th) return;
    wrap.classList.add('parked'); view.classList.add('parked');
    const k = Math.min(.8, 210 / dieW());
    th.style.setProperty('--k', k);
    if (!RM) th.animate([{ transform: `translate(${view.clientWidth * .3}px,${view.clientHeight * .3}px) scale(${1 / k})` }, { transform: 'none' }], { duration: 320 / FAST, easing: 'cubic-bezier(.3,.7,.3,1)' });
    tiles.forEach(t => t.classList.toggle('tappable', !!tappable));
    const ref = wrap.classList.contains('eqmode') ? wrap.querySelector('.eq') : th;
    view.style.setProperty('--parkw', (ref ? ref.getBoundingClientRect().right - view.getBoundingClientRect().left + 16 : th.getBoundingClientRect().width + 30) + 'px');   // 泡泡讓開骰子
  }
  $('diceWrap').addEventListener('click', async e => {
    const t = e.target.closest('.d3.tappable'); if (!t || t._busy) return;
    t._busy = true; t._dots.forEach(d => { d.classList.remove('lit'); d.textContent = ''; });
    try { await countTile(t); } catch { /* 換局 */ } t._busy = false;
  });

  // 骰子鈕（左下角，孩子點它丟骰子）：一般六面骰的樣子
  const rest = $('rollBtn');
  function fitRest() { rest.style.setProperty('--rd', Math.max(72, Math.min(100, Math.min(view.clientWidth, view.clientHeight) * .15)) + 'px'); }
  function setRest(ready) {
    rest.innerHTML = ''; rest.hidden = false; rest.classList.toggle('ready', !!ready); rest.classList.toggle('waiting', !ready);
    fitRest(); const n = L.sign ? L.dice + 1 : L.dice; rest.classList.toggle('two', n > 1); rest.classList.toggle('three', n > 2);
    for (let i = 0; i < n; i++) { const c = makeCube(0, L.sign && i === 1); c._cube.style.transform = `rotateX(-26deg) rotateY(${i ? 30 : -32}deg)`; rest.appendChild(c); }
    if (ready) { const h = document.createElement('span'); h.className = 'tap'; h.innerHTML = '<svg viewBox="0 0 64 72"><use href="#i-hand"/></svg>'; rest.appendChild(h); }
  }

  // ───────── 輸入：點石頭 ─────────
  function waitTap(valid, { idle = 11000, auto = 26000, onIdle } = {}) {
    return userWait(done => {
      let t1, t2;
      const fin = v => { clearTimeout(t1); clearTimeout(t2); tapHandler = null; done(v); };
      tapHandler = (n, el) => { if (valid(n)) fin(n); else { el.classList.remove('nope'); void el.offsetWidth; el.classList.add('nope'); } };
      t1 = setTimeout(() => onIdle && onIdle(), idle / FAST); t2 = setTimeout(() => fin(null), auto / FAST);
    });
  }
  const mark = (n, c) => stones[n] && stones[n].classList.add(c);
  const clearMarks = () => stones.forEach(s => s && s.classList.remove('next', 'hint'));

  // ───────── 事件／特效 ─────────
  function fx(sym, x, y, w, h, extra = '') {
    const e = document.createElement('div'); e.className = 'fx'; Object.assign(e.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
    e.innerHTML = `<svg viewBox="${sym === 'i-wing' ? '0 0 200 100' : sym === 'i-brachio' ? '0 0 240 160' : '0 0 64 64'}"><use href="#${sym}"/></svg>${extra}`; world.appendChild(e); return e;
  }
  const moveFx = (e, x, y, dur, ease = 'ease-in-out') => { e.style.transition = `left ${dur}s ${ease},top ${dur}s ${ease},opacity .4s`; e.style.left = x + 'px'; e.style.top = y + 'px'; };
  function splash(x, y, color, n = 8) {
    if (RM) return;
    for (let i = 0; i < n; i++) {
      const d = document.createElement('i'); const s = rnd(14, 28);
      Object.assign(d.style, { position: 'absolute', left: x + 'px', top: y + 'px', width: s + 'px', height: s + 'px', borderRadius: '50%', background: color, border: '3px solid #fffaf0', zIndex: 8600 });
      world.appendChild(d);
      const a = Math.random() * Math.PI * 2, r = rnd(50, 130);
      d.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${Math.cos(a) * r}px,${Math.sin(a) * r - 60}px) scale(.4)`, opacity: 0 }], { duration: 800 / FAST, easing: 'ease-out' }).onfinish = () => d.remove();
    }
  }
  async function runEvent(t, kind) {
    const e = EV[kind], swap = kind === 'guide' && npcKey === 'xiaokong';   // 對手是小空時改由飛飛帶路
    const line = say(swap ? 'event_guide_feifei' : 'event_' + kind, swap ? '飛飛帶路，前進兩格！' : e.text, { min: 1600 });
    const k = kk(t.y); camera([posOf(t)]);
    if (kind === 'wing') {
      const to = Math.min(N, t.at + 3), [tx, ty] = P[to];
      camera([posOf(t), [tx, ty]]); await sleep(500);
      const w = fx('i-wing', t.x - 600, t.y - 520, 320 * k, 160 * k); Dino.sfx('swoosh', .8);
      moveFx(w, t.x, t.y - t.def.h * k - 40 * k, .9); await sleep(950);
      t.img.animate([{ transform: 'translateY(0)' }, { transform: `translateY(${-70 * k}px)` }], { duration: 400 / FAST, fill: 'forwards' });
      t.at = to; place(t, 1.8); const [px, py] = [P[to][0], P[to][1] + 20 * kk(P[to][1]) - t.def.h * kk(P[to][1]) - 90 * kk(P[to][1])];
      camera([posOf(t), [tx, ty]]); moveFx(w, px, py, 1.8); await sleep(1900);
      t.img.getAnimations().forEach(a => a.cancel()); hop(t, 1.2, .5); Dino.sfx('pop', .7);
      moveFx(w, tx + 900, ty - 700, 1.2, 'ease-in'); setTimeout(() => w.remove(), 1300 / FAST); await sleep(500);
    } else if (kind === 'guide') {
      const to = Math.min(N, t.at + 2), g = document.createElement('img'); g.src = swap ? 'assets/cast/feifei__fly_r.webp' : 'assets/cast/xiaokong__leap_r.webp'; g.className = 'fx';
      const gh = (swap ? 110 : 130) * k; Object.assign(g.style, { left: t.x + 90 * k + 'px', top: t.y + 'px', height: gh + 'px', width: 'auto', transform: 'translate(-50%,-100%)', transition: 'left 1.1s ease-in-out, top 1.1s ease-in-out' });
      world.appendChild(g); Dino.sfx('dino-chirp', .8); hop(t, 1, .4);
      g.animate([{ transform: 'translate(-50%,-100%) scale(0)' }, { transform: 'translate(-50%,-100%) scale(1.2)' }, { transform: 'translate(-50%,-100%) scale(1)' }], { duration: 450 / FAST });
      await sleep(550);
      const [lx, ly] = P[to]; g.style.left = lx + 70 * kk(ly) + 'px'; g.style.top = ly + 20 * kk(ly) + 'px';
      for (let i = t.at + 1; i <= to; i++) await stepTo(t, i, { count: false, dur: .55 });
      await sleep(300); g.style.opacity = 0; setTimeout(() => g.remove(), 500);
    } else if (kind === 'mud') {
      const to = Math.max(0, t.at - 2), m = fx('i-mud', t.x, t.y - 4 * k, 150 * k, 150 * k); m.style.zIndex = Math.round(P[t.at][1]) + 3;
      m.animate([{ transform: 'translate(-50%,-50%) scale(0)' }, { transform: 'translate(-50%,-50%) scale(1)' }], { duration: 300 / FAST });
      Dino.sfx('pop', .8); splash(t.x, t.y, '#7a4e2a', 10); t.img.classList.add('ev-shake'); await sleep(600); t.img.classList.remove('ev-shake');
      for (let i = t.at - 1; i >= to; i--) { splash(t.x, t.y, '#7a4e2a', 4); await stepTo(t, i, { count: false, dur: .35 }); }
      m.style.opacity = 0; setTimeout(() => m.remove(), 500); await sleep(200);
    } else if (kind === 'vine') {
      const v = fx('i-vine', t.x, t.y - t.def.h * k * .3, 150 * k, 150 * k); v.animate([{ transform: 'translate(-50%,-50%) scale(0) rotate(-40deg)' }, { transform: 'translate(-50%,-50%) scale(1) rotate(0)' }], { duration: 500 / FAST });
      t.img.classList.add('ev-shake'); Dino.sfx('pop', .8); await sleep(700); t.img.classList.remove('ev-shake');
      t.skip = true; t.vine = v;
    } else if (kind === 'sneeze') {
      const mid = [(you.x + npc.x) / 2, (you.y + npc.y) / 2], kb = kk(mid[1]), bx = mid[0] - 520 * kb, by = mid[1] - 140 * kb;
      camera([posOf(you), posOf(npc), [bx - 150, by]]); await sleep(450);
      const b = fx('i-brachio', bx, by, 380 * kb, 253 * kb); b.animate([{ transform: 'translate(-50%,-50%) scale(.2)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }], { duration: 500 / FAST });
      await sleep(600); Dino.sfx('dino-roar', .6);
      b.animate([{ transform: 'translate(-50%,-50%) rotate(0)' }, { transform: 'translate(-50%,-50%) rotate(-8deg) translateX(-20px)' }, { transform: 'translate(-50%,-50%) rotate(5deg) translateX(30px)' }], { duration: 500 / FAST, fill: 'forwards' });
      await sleep(450);
      for (let i = 0; i < 7 && !RM; i++) { const c = document.createElement('i'); c.className = 'puff'; const s = rnd(40, 90) * kb;
        Object.assign(c.style, { left: bx + 150 * kb + 'px', top: by - 30 * kb + rnd(-30, 30) + 'px', width: s + 'px', height: s + 'px', zIndex: 8600 }); world.appendChild(c);
        c.animate([{ transform: 'translateX(0) scale(.4)', opacity: .95 }, { transform: `translateX(${520 * kb}px) scale(1.3)`, opacity: 0 }], { duration: 1000 / FAST, delay: i * 60 / FAST, easing: 'ease-out' }).onfinish = () => c.remove(); }
      [you, npc].forEach(q => { if (q.at > 0) { q.at--; place(q, .9); hop(q, .4, .6); } });
      camera([posOf(you), posOf(npc)]); await sleep(1100);
      b.style.opacity = 0; setTimeout(() => b.remove(), 500);
    }
    await line;
    if (e.d > 0 || e.d < 0 && kind !== 'mud' && kind !== 'sneeze') { /* 位置已在動畫中處理 */ }
  }

  // ───────── 小關卡：郵差小挑戰 ─────────
  const boxHTML = '<svg viewBox="0 0 64 64"><use href="#box"/></svg>';
  function pileEl(n, { total = n, cls = '' } = {}) {
    const el = document.createElement('div'); el.className = 'pile ' + cls; el.style.setProperty('--bx', quizBox() + 'px');
    for (let i = 0; i < total; i++) { const s = document.createElement('div'); s.className = 'slot' + (i < n ? '' : ' empty'); s.innerHTML = (i < n ? boxHTML : '') + '<b></b>'; el.appendChild(s); }
    return el;
  }
  const quizBox = () => Math.max(40, Math.min(76, view.clientWidth / 9.5, view.clientHeight / 13));
  const QZ = {
    one: [{ t: 'count', lo: 5, hi: 10 }, { t: 'ten', lo: 5, hi: 9 }, { t: 'count', lo: 6, hi: 12 }],
    hard: [{ t: 'ten', lo: 1, hi: 9 }, { t: 'more', lo: 10, hi: 20, gap: 3 }, { t: 'count', lo: 12, hi: 20 }],
    two: [{ t: 'ten', lo: 2, hi: 8 }, { t: 'more', lo: 5, hi: 12, gap: 5 }, { t: 'count', lo: 8, hi: 14 }, { t: 'ten', lo: 1, hi: 9 }, { t: 'more', lo: 10, hi: 20, gap: 3 }]
  };
  const shuf = a => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(x => x[1]);
  function choices(correct, lo = 1) { const s = new Set([correct]); for (const d of shuf([-2, -1, 1, 2, 3])) { if (s.size >= 3) break; if (correct + d >= lo) s.add(correct + d); } return shuf([...s]); }
  let quizIdx = 0;
  async function runQuiz() {
    const spec = QZ[levelKey][quizIdx++ % QZ[levelKey].length], card = $('qcard'), ov = $('quiz'); card.innerHTML = ''; hideBubble();
    const h = document.createElement('h3'); h.innerHTML = '<svg width="44" height="44" viewBox="0 0 64 64"><use href="#box"/></svg><span></span>'; kid(h.querySelector('span'), '郵差小挑戰');
    const q = document.createElement('p'); q.className = 'q'; card.append(h, q);
    let correct, demo, answersEl = document.createElement('div'); answersEl.className = 'answers'; let qId, qText;
    const bind = (buttons, cor) => buttons;
    if (spec.t === 'count') {
      const n = rnd(spec.lo, spec.hi), pile = pileEl(n); correct = n; qId = 'quiz_count'; qText = '有幾個包裹？'; card.append(pile);
      choices(n).forEach(c => { const b = document.createElement('button'); b.type = 'button'; b.textContent = c; b.dataset.v = c; answersEl.appendChild(b); });
      demo = async () => { for (const [i, s] of [...pile.children].entries()) { s.classList.add('cnt'); s.querySelector('b').textContent = i + 1; numVoice(i + 1); await sleep(360); } };
    } else if (spec.t === 'ten') {
      const have = rnd(spec.lo, spec.hi), need = 10 - have, pile = pileEl(have, { total: 10, cls: 'tf' }); correct = need; qId = 'quiz_ten'; qText = '還差幾個湊成十？'; card.append(pile);
      choices(need).forEach(c => { const b = document.createElement('button'); b.type = 'button'; b.textContent = c; b.dataset.v = c; answersEl.appendChild(b); });
      demo = async () => { let c = 0; for (const s of [...pile.children]) { if (s.classList.contains('empty')) { s.classList.add('fill'); s.innerHTML = boxHTML + '<b>' + (++c) + '</b>'; numVoice(c); await sleep(420); } } };
    } else {
      let a = rnd(spec.lo, spec.hi), b = a; while (b === a) b = Math.max(spec.lo - 2, a + rnd(1, spec.gap) * (Math.random() < .5 ? -1 : 1)); b = Math.max(1, b);
      if (a === b) b = a + 1; correct = a > b ? 'a' : 'b'; qId = 'quiz_more'; qText = '哪一堆比較多？';
      const two = document.createElement('div'); two.className = 'two'; const pa = pileEl(a), pb = pileEl(b);
      [pa, pb].forEach((p, i) => { p.dataset.v = i ? 'b' : 'a'; p.style.setProperty('--bx', Math.max(32, quizBox() * .78) + 'px'); p.style.gridTemplateColumns = `repeat(${a + b > 22 ? 4 : 3},var(--bx))`; two.appendChild(p); });
      card.append(two); answersEl = null;
      demo = async () => { for (const p of [pa, pb]) { for (const [i, s] of [...p.children].entries()) { s.classList.add('cnt'); s.querySelector('b').textContent = i + 1; await sleep(150); } numVoice(p.children.length); await sleep(500); } (a > b ? pa : pb).classList.add('win'); };
    }
    if (answersEl) card.append(answersEl);
    kid(q, qText); ov.hidden = false; Dino.sfx('pop', .7); Dino.voice.stop(); Dino.voice(voiceUrl(qId));
    const choice = await userWait(done => {
      const fin = v => { clearTimeout(tm); done(v); };
      card.querySelectorAll('.answers button, .two .pile').forEach(el => el.addEventListener('click', () => fin(el.dataset.v), { once: true }));
      const tm = setTimeout(() => fin(null), 45000 / FAST);
    });
    card.querySelectorAll('button').forEach(b => { b.disabled = true; });
    const ok = String(choice) === String(correct);
    Dino.voice.stop();
    if (ok) {
      const st = document.createElement('img'); st.src = 'assets/dinopost-workmark-stamp-transparent-v1.png'; st.className = 'qstamp'; st.alt = ''; card.style.position = 'relative'; card.appendChild(st);
      st.style.left = '50%'; st.style.top = '34%'; st.style.marginLeft = '-85px';
      Dino.sfx('stamp', .9); Dino.sfx('correct', .6); kid(q, '答對了！給你郵票！'); Dino.voice(voiceUrl('quiz_ok'));
      card.querySelectorAll('.answers button').forEach(b => b.dataset.v === String(correct) && b.classList.add('ok'));
      stamps++; bumpStamps(); await sleep(2200);
    } else {
      kid(q, '沒關係，一起數！'); Dino.voice(voiceUrl('quiz_no')); await sleep(1500); Dino.voice.stop();
      card.querySelectorAll('.answers button').forEach(b => b.dataset.v === String(correct) && b.classList.add('ok'));
      await demo(); await sleep(1200);
    }
    ov.hidden = true;
  }
  function bumpStamps() { const s = $('stamps'); $('stampN').textContent = stamps; s.hidden = stamps === 0; s.classList.remove('bump'); void s.offsetWidth; s.classList.add('bump'); }

  // ───────── 回合 ─────────
  const checkWin = t => { if (t.at >= N && !winner) { winner = t; return true; } return !!winner; };
  async function afterLanding(t) {   // 抵達後：整十石小挑戰（只有孩子）→ 事件石
    if (checkWin(t)) return;
    const ev = L.events[t.at];
    if (t.human && t.at % 10 === 0) { Dino.sfx('pop', .8); await say('arrive_ten', '整十石！郵差小挑戰！', { min: 1200 }); hideBubble(); await runQuiz(); camera([posOf(t)]); await sleep(300); }
    else if (ev) { await runEvent(t, ev); if (checkWin(t)) return; }
  }
  // 走法（導演 11-04 方案 A，所有難度都一樣）：可以一格一格點，也可以直接點要停的石頭；點對一路數過去＋稱讚，點錯逐格示範
  async function walkCount(t, to, dur = .42) { const d = to > t.at ? 1 : -1; while (t.at !== to) await stepTo(t, t.at + d, { dur }); }
  async function childMove(target) {
    const dir = target >= you.at ? 1 : -1, reach = L.dice * L.dmax;
    while (true) {
      const lo = dir > 0 ? you.at + 1 : Math.max(1, you.at - reach), hi = dir > 0 ? Math.min(N, you.at + reach) : you.at - 1;
      camera([posOf(you), ...P.slice(lo, hi + 1)]);   // 走得到的石頭全部入鏡
      const n = await waitTap(x => dir > 0 ? x > you.at : x < you.at, { idle: 12000, auto: 45000, onIdle: () => mark(you.at + dir, 'next') });
      clearMarks();
      if (n === null) { mark(target, 'hint'); await say('', '我們一起一格一格數！', { min: 800 }); await walkCount(you, target); return; }
      if (n === you.at + dir && (n - target) * dir <= 0) {
        hideBubble(); await stepTo(you, n, { dur: .45 });
        if (you.at === target) { Dino.sfx('correct', .7); await say('move_ok', '數對了！好棒！', { min: 900 }); return; }
        continue;
      }
      if (n === target) { hideBubble(); await walkCount(you, target); Dino.sfx('correct', .7); await say('move_ok', '數對了！好棒！', { min: 900 }); return; }
      stones[n] && stones[n].classList.add('nope');
      mark(target, 'hint'); await say('move_fix', '我們一起一格一格數！', { min: 900 }); await walkCount(you, target, .55); return;
    }
  }
  async function childTurn() {
    if (you.skip) { you.skip = false; if (you.vine) { const v = you.vine; v.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400 / FAST }).onfinish = () => v.remove(); you.vine = null; } await say('', '藤蔓纏住腳，停一回合！', { min: 1200 }); return; }
    camera([posOf(you)]); setRest(false); you.mark.hidden = false;
    await say('turn_you', '輪到你了！點骰子！', { min: 600, hold: true });
    setRest(true);
    await userWait(done => { const h = () => { rest.removeEventListener('click', h); done(); }; rest.addEventListener('click', h); });
    hideBubble(); you.mark.hidden = true; rest.hidden = true;
    const sgn = L.sign && you.at > L.dmax && Math.random() < 1 / 6 ? '-' : '+';   // 加減骰：5 面＋、1 面－；離起點不到 10 格不會擲到－
    const vals = await throwDice(L.dice, false, L.sign && sgn, you);
    const total = sgn === '-' ? vals[0] - vals[1] : vals.reduce((a, b) => a + b, 0);   // 困難：a＋b 或 a－b（可能是負的＝往回）
    if (L.sign && total === 0) {   // a－b＝0：不動
      tiles.forEach(t => t.classList.add('tappable'));
      await say('', `${vals[0]}減${vals[1]}，等於零，不用動！`, { min: 1600 }); clearDice(); hideBubble(); await afterLanding(you); return;
    }
    if (L.eq) {   // 普通／困難：看算式自己算，直接點答案那顆石頭
      await sleep(1200); parkDice(false);
      if (you.at + total > N) showBubble('超過山頂了，走到山頂！'); else showBubble('算一算，走到幾號？');
      Dino.voice.stop();
    } else if (L.dice === 1) {   // 單顆：一起數圓點，再念出點數
      await countTile(tiles[0]); parkDice(true);
      await say(total <= 6 ? 'roll_' + total : '', `擲到${CN[total]}！`, { min: 700 }); if (total > 6) numVoice(total);
      showBubble('走幾格？點石頭！'); Dino.voice.stop(); Dino.voice(voiceUrl('tap_target'));
    } else {              // 雙顆：不幫忙加總，孩子自己數或接著數（點骰子會幫數那一顆）
      // 導演 11-04：數骰子時骰子留在畫面中間，孩子按「數好了，走！」才縮到左上角
      tiles.forEach(t => t.classList.add('tappable'));
      showBubble('數一數，走幾格？'); Dino.voice.stop(); Dino.voice(voiceUrl('count_dice'));
      const ok = document.createElement('button'); ok.type = 'button'; ok.id = 'counted';
      ok.innerHTML = '<svg viewBox="0 0 40 40" aria-hidden="true"><use href="#i-tick"/></svg><span></span>'; kid(ok.querySelector('span'), '數好了，走！');
      ($('diceWrap').querySelector('.eq') || $('diceWrap').querySelector('.thrower')).after(ok);
      await userWait(done => { const t = setTimeout(done, 90000 / FAST); ok.addEventListener('click', () => { clearTimeout(t); Dino.sfx('tap', .6); done(); }, { once: true }); });
      ok.remove(); parkDice(true);
      if (total < 0) { showBubble('往回走幾格？點石頭！'); Dino.voice.stop(); Dino.voice(voiceUrl('tap_back')); } else showBubble('走幾格？點石頭！');
    }
    const target = Math.max(0, Math.min(N, you.at + total)); S._target = target;
    await childMove(target);
    if (L.eq) { const q = $('diceWrap').querySelector('.eq .q'); if (q) { q.textContent = you.at; q.classList.add('ans'); } await sleep(900); }
    clearMarks(); hideBubble(); clearDice(); S._target = 0;
    await afterLanding(you);
  }
  async function npcTurn() {
    const d = npc.def;
    if (npc.skip) { npc.skip = false; if (npc.vine) { npc.vine.remove(); npc.vine = null; } await say('', '藤蔓纏住腳，停一回合！', { min: 900 }); return; }
    camera([posOf(npc)]); await say(d.turn, d.turnText, { min: 500, who: 'iggy' });
    const sgn = L.sign && npc.at > L.dmax && Math.random() < 1 / 6 ? '-' : '+';
    const vals = await throwDice(L.dice, true, L.sign && sgn, npc);
    const total = sgn === '-' ? vals[0] - vals[1] : vals.reduce((a, b) => a + b, 0);
    hideBubble();
    if (L.eq) {   // 普通／困難：對手示範算式，再走
      const q = $('diceWrap').querySelector('.eq .q'), ans = npc.at + total; await sleep(700); if (q) { q.textContent = ans; q.classList.add('ans'); }
      await say('', eqSay([npc.at, ...vals], ans), { min: 1600 }); numVoice(ans); parkDice(false);
      const target = Math.min(N, ans); camera([posOf(npc), P[target]]);
      while (npc.at < target) await stepTo(npc, npc.at + 1, { dur: d.dur });
      clearDice(); hideBubble(); await afterLanding(npc); return;
    }
    if (L.sign) {   // （舊）加減骰：對手示範算式，再走（負的往回）
      const q = $('diceWrap').querySelector('.eq .q'); if (q) q.textContent = total;
      await say('', `${vals[0]}${sgn === '-' ? '減' : '加'}${vals[1]}，等於${total < 0 ? '負' + (-total) : total}！`, { min: 1400 }); numVoice(Math.abs(total)); parkDice(false);
      const target = Math.max(0, Math.min(N, npc.at + total));
      if (target < npc.at) { camera([posOf(npc), P[target]]); await walkCount(npc, target, d.dur); }
      else if (target > npc.at) { camera([posOf(npc), P[target]]); while (npc.at < target) await stepTo(npc, npc.at + 1, { dur: d.dur }); }
      clearDice(); hideBubble(); await afterLanding(npc); return;
    }
    if (L.dice === 1) { await countTile(tiles[0]); await say(total <= 6 ? 'roll_' + total : '', `擲到${CN[total]}！`, { min: 600 }); if (total > 6) numVoice(total); }
    else { await countOn(vals); await sleep(500); }   // 對手示範「接著數」
    parkDice(false);
    const oops = d.hasty && L.catchOn && Math.random() < .45 && npc.at + total < N;
    const target = Math.min(N, npc.at + total), steps = target - npc.at + (oops ? 1 : 0);
    hideBubble(); camera([posOf(npc), P[Math.min(N, npc.at + steps)]]);
    for (let i = 0; i < steps; i++) { await stepTo(npc, npc.at + 1, { dur: d.dur }); if (npc.at >= N) break; }
    if (oops) {
      let caught = false; const w = $('wrong'); w.hidden = false; kid(w, '不對！');
      const caughtP = userWait(done => { wrongClick = () => { caught = true; wrongClick = null; done(); }; });
      await Promise.race([say('catch_prompt', '阿暴數對了嗎？', { min: 2500, hold: true }), caughtP]);
      if (!caught) await Promise.race([sleep(2500), caughtP]);
      w.hidden = true; wrongClick = null; aborters.clear();
      if (caught) { Dino.sfx('correct', .8); await stepTo(npc, target, { count: false, dur: .5 }); stamps++; bumpStamps(); Dino.sfx('stamp', .8); await say('catch_ok', '抓到了！阿暴多走一格！', { min: 1200 }); }
    }
    clearDice(); hideBubble();
    await afterLanding(npc);
  }
  $('wrong').addEventListener('click', () => { Dino.sfx('tap', .6); wrongClick && wrongClick(); });

  // ───────── 一局 ─────────
  async function newGame() {
    G++; aborters.forEach(f => f()); aborters.clear(); tapHandler = null; wrongClick = null; paused = false;
    L = LEVELS[levelKey]; N = L.N; winner = null; stamps = 0; quizIdx = 0; dirty = false; running = true; $('stamps').hidden = true;
    world.querySelectorAll('.tok,.fx').forEach(e => e.remove()); clearDice(); hideBubble(); $('wrong').hidden = true; $('quiz').hidden = true; $('finish').hidden = true;
    layout(); buildStones();
    you = makeTok({ img: 'iggy', pose: 'walk_r', h: 210, dur: .5, hop: 1 }, true); npc = makeTok(NPCS[npcKey], false);
    place(you); place(npc); setRest(false); rest.hidden = true;
    const g = G;
    try {
      camera([], { overview: true, instant: true }); await sleep(500);
      await say('intro', '我們來比賽！看誰先把信送到山頂大樹下！', { min: 1500, hold: true });
      camera([posOf(you)]); await sleep(900);
      while (!winner) { await childTurn(); if (winner) break; await sleep(250); await npcTurn(); await sleep(250); }
      await finishGame();
    } catch (e) { if (!(e instanceof Abort)) { console.error(e); } if (g === G && !(e instanceof Abort)) { running = false; } }
  }
  async function finishGame() {
    hideBubble(); you.mark && (you.mark.hidden = true); rest.hidden = true; clearDice(); clearMarks();
    setPose(you, 'cheer'); if (npc.def.cheer) setPose(npc, npc.def.cheer); hop(you, 1.4, .6); hop(npc, 1.4, .6); Dino.sfx('finish', .9);
    camera([posOf(winner)]); await say(winner === you ? 'win_you' : 'win_npc', winner === you ? '太棒了！我們先到山頂！' : '對手先到了，我們也到了！', { min: 1500 });
    camera([], { overview: true }); await sleep(900); hideBubble();
    $('finishRow').innerHTML = `<img src="assets/cast/iggy__cheer.webp" alt=""><img src="assets/cast/${npc.def.img}__${npc.def.cheer}.webp" alt="">`;
    $('finishStamps').innerHTML = stamps ? `<img src="assets/dinopost-workmark-stamp-transparent-v1.png" alt="郵票">× ${stamps}` : '';
    $('finish').hidden = false; running = false; Dino.voice.stop(); Dino.voice(voiceUrl('goal')); setTimeout(() => Dino.bgm.start(), 3500 / FAST);
  }

  // ───────── 開始畫面兼選單 ─────────
  function buildNpcPicker() {   // 導演 11-04：只放角色圖，不寫字不放注音；點圖選擇，選中的放大、外框、打勾
    const box = $('pickNpc'); box.innerHTML = '';
    Object.entries(NPCS).forEach(([k, d]) => {
      const b = document.createElement('button'); b.type = 'button'; b.dataset.npc = k; b.setAttribute('aria-label', d.name);
      b.innerHTML = `<img src="assets/cast/${d.img}__hello.webp" alt=""><i class="tick" aria-hidden="true"><svg viewBox="0 0 40 40"><use href="#i-tick"/></svg></i>`; box.appendChild(b);
    });
  }
  function syncPick() {
    document.querySelectorAll('[data-lv]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lv === levelKey)));
    document.querySelectorAll('[data-npc]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.npc === npcKey)));
  }
  const save = () => { try { localStorage.setItem('dinopost-climb-level', levelKey); localStorage.setItem('dinopost-climb-npc', npcKey); } catch { /* ok */ } };

  async function init() {
    document.documentElement.classList.toggle('dino-mode', Dino.dinoMode());
    buildNpcPicker();
    document.title = TITLE + '・恐龍郵局'; kid($('title'), TITLE); kid($('startLabel'), '點一下，開始比賽！');
    [['pickOne', '簡單'], ['pickTwo', '普通'], ['pickHard', '困難'], ['again', '再玩一次'], ['home', '回首頁']].forEach(([id, t]) => kid($(id), t));
    kid($('finishTitle'), '信送到了！'); kid($('finishSub'), '漢默爺爺的樹洞家');
    syncPick();
    try { board = await (await fetch('assets/climb/board.json')).json(); } catch (e) { console.error('board.json 載入失敗', e); return; }
    L = LEVELS[levelKey]; N = L.N; layout(); buildStones(); camera([], { overview: true, instant: true });
    Dino.preload([...VOICES.map(voiceUrl), ...Array.from({ length: 60 }, (_, i) => `assets/audio/num/zh/${i + 1}.mp3`)]);
    Dino.bgm.start(); Dino.menuTaps($('ready')); Dino.menuTaps($('finish'));
    document.querySelectorAll('[data-lv]').forEach(b => b.addEventListener('click', () => { levelKey = b.dataset.lv; dirty = true; save(); syncPick(); }));
    $('pickNpc').addEventListener('click', e => { const b = e.target.closest('[data-npc]'); if (!b) return; npcKey = b.dataset.npc; dirty = true; save(); syncPick(); });
    document.querySelector('.dino-home').addEventListener('click', e => { e.preventDefault(); Dino.goTo('index.html'); });
    $('menuBtn').addEventListener('click', () => { Dino.sfx('tap', .5); paused = true; $('ready').hidden = false; document.body.classList.add('menu'); Dino.bgm.start(); });
    $('start').addEventListener('click', () => {
      $('ready').hidden = true; document.body.classList.remove('menu'); Dino.bgm.stop(); paused = false;
      if (dirty || !running) newGame();
    });
    $('again').addEventListener('click', () => { $('finish').hidden = true; Dino.bgm.stop(); Dino.voice.stop(); newGame(); });
    const HW = Dino.howto({ preview: stage => {
      stage.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:10px;padding:16px;background:#e6f2dc;aspect-ratio:auto';
      const c = makeD10(110); c._set(4); c._cube.style.transform = 'rotateX(-20deg) rotateY(-28deg)';
      stage.append(c, Object.assign(document.createElement('span'), { innerHTML: '<svg viewBox="0 0 40 40" width="48" height="48"><use href="#i-next"/></svg>' }),
        Object.assign(document.createElement('img'), { src: 'assets/cast/iggy__walk_r.webp', style: 'height:100px' }),
        Object.assign(document.createElement('span'), { innerHTML: '<svg viewBox="0 0 40 64" width="40" height="64"><use href="#i-flag"/></svg>' }));
    }, text: '擲骰子，走到山頂！', kid, onClose: () => { if (!$('ready').hidden) return; paused = false; } });
    $('help').addEventListener('click', () => { Dino.sfx('tap', .5); paused = true; HW.show(); });
  }
  init();
})();

// 字母送信：把英文字切成「一格一個音」的郵票（導演 2026-11-04：一起念的字母合成一張郵票、加母音組合、用難度控制單字量）
// 難度：1 短母音 cat → 2 子音連在一起 frog → 3 兩個子音念一個音 fish／duck → 4 長母音 cake／tree／rain／boat → 5 其他母音組合 moon／cow／car
// 瀏覽器掛在 window.SpellWords；node 可 require 來驗證題庫
(function (root) {
  const VOWEL = new Set('aeiou');
  const CONS2 = { sh: 'sh', ch: 'ch', th: 'th', ck: 'k', ng: 'ng', nk: 'nk', wh: 'w', ph: 'f', kn: 'n', ll: 'l', ss: 's', ff: 'f', zz: 'z' };
  const TEAM = { ee: 'long_e', ai: 'long_a', ay: 'long_a', oa: 'long_o', igh: 'long_i', oi: 'oy', oy: 'oy', ou: 'ow', ar: 'ar', or: 'or', er: 'er', ir: 'er', ur: 'er' };
  const EASY_TEAM = new Set(['ee', 'ai', 'ay', 'oa', 'igh']);
  const LONG = { a: 'long_a', e: 'long_e', i: 'long_i', o: 'long_o', u: 'oo' };   // 尾巴 e 讓前面母音念長音（題庫只有 flute，念 oo）
  // 同一組字母有不同念法：只出這裡逐字標過的字，沒標的先不出
  const AMBIG = { oo: 'oo', ow: 'ow', ea: 'long_e' };
  const SAY = { moon: 'oo', spoon: 'oo', broom: 'oo', zoo: 'oo', book: 'oo_short', foot: 'oo_short',
    cow: 'ow', owl: 'ow', brown: 'ow', snow: 'long_o', bowl: 'long_o',
    bean: 'long_e', meat: 'long_e', seal: 'long_e', leaf: 'long_e', peach: 'long_e', beach: 'long_e', bread: 'e' };
  // 拼法跟念法對不上的字（comb 的 b 不念、chef 的 ch 念 sh、soup 的 ou 念 oo、worm 的 or 念 er、school 的 ch 念 k）
  const SKIP = new Set(['comb', 'chef', 'soup', 'worm', 'school', 'swamp', 'nose', 'rose']);   // swamp 的 a 不是短 a、nose／rose 的 s 念 z
  // 干擾郵票：挑看起來或聽起來容易混的，但不放同音的（ck 不配 k、ir 不配 er）
  const CONF = { a: 'e', e: 'ia', i: 'e', o: 'u', u: 'oa', b: 'dp', d: 'bt', p: 'bq', g: 'jq', h: 'n', j: 'g', m: 'n', n: 'mh',
    t: 'df', c: 'g', s: 'f', r: 'l', l: 'r', f: 'v', w: 'v', v: 'f',
    sh: ['ch', 'th', 's'], ch: ['sh', 'th'], th: ['sh', 'f', 't'], ck: ['g', 't'], ng: ['nk', 'n'], nk: ['ng', 'm'], ll: ['r'],
    ss: ['z'], ff: ['v'], wh: ['v'], ph: ['v', 'th'], kn: ['m'],
    ee: ['ai', 'oa'], ai: ['ee', 'oa'], igh: ['ee', 'ai'], ay: ['ee', 'oa'], oa: ['ai', 'ee'], ea: ['ai', 'oa'], oo: ['oa', 'ai'], ow: ['oo', 'ai'],
    ou: ['oo', 'oa'], oi: ['ai', 'oa'], oy: ['ai', 'oa'], ar: ['or', 'er'], or: ['ar', 'er'], er: ['ar', 'or'], ir: ['ar', 'or'], ur: ['ar', 'or'] };

  const isVowel = (g, i) => !!(TEAM[g] || AMBIG[g]) || VOWEL.has(g) || (g === 'y' && i > 0);
  const soundOf = g => CONS2[g] || TEAM[g] || AMBIG[g] || g;
  const confusables = g => [...(CONF[g] || '')];

  function tiles(en) {
    const out = [];
    for (let i = 0; i < en.length;) {
      if (en.startsWith('igh', i)) { out.push('igh'); i += 3; continue; }
      const two = en.slice(i, i + 2);
      if (CONS2[two] || TEAM[two] || AMBIG[two]) { out.push(two); i += 2; } else { out.push(en[i]); i++; }
    }
    return out;
  }

  // 回傳 { tiles, sounds, vowel, silent, tier }；不適合拿來拼的字回傳 null
  function analyze(en) {
    if (!/^[a-z]{3,6}$/.test(en) || SKIP.has(en) || (en !== 'wind' && /(ind|ild|old|olt|ost|alk|all)$/.test(en)) || /c[eiy]|g[eiy]/.test(en)) return null;
    const t = tiles(en), n = t.length;
    if (n > 5 || t.some((g, i) => g.length === 1 && g === t[i + 1])) return null;   // 太長、egg 這種雙字母
    const sounds = t.map(soundOf);
    // 尾巴 e：前面是「一個母音字母＋一個子音字母」才算（cake、nine）；ire／are 會變音不收
    const magic = n >= 4 && t[n - 1] === 'e' && VOWEL.has(t[n - 3]) && t[n - 2].length === 1 && !isVowel(t[n - 2], n - 2) && t[n - 2] !== 'r';
    const vowels = t.map((g, i) => (isVowel(g, i) ? i : -1)).filter(i => i >= 0 && !(magic && i === n - 1));
    if (vowels.length !== 1) return null;   // 只收一個音節
    const v = vowels[0], g = t[v];
    if (magic) { sounds[v] = LONG[g]; sounds[n - 1] = ''; }
    if (AMBIG[g] && !SAY[en]) return null;
    if (SAY[en]) sounds[v] = SAY[en];
    const short = g.length === 1 && !magic;
    if (short && (v === 0 || v === n - 1)) return null;
    if (['r', 'w', 'y'].includes(t[v + 1])) return null;   // car、cow、deer、chair：母音被後面的 r／w／y 改掉
    const tier = !short ? (magic || EASY_TEAM.has(g) ? 4 : 5) : t.some(x => CONS2[x]) ? 3 : n > 3 ? 2 : 1;
    return { tiles: t, sounds, vowel: v, silent: magic ? n - 1 : -1, tier };
  }

  const api = { analyze, soundOf, confusables, isVowel, VOWEL };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.SpellWords = api;
})(typeof window === 'undefined' ? globalThis : window);

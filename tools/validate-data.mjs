import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
const words = JSON.parse(fs.readFileSync(path.join(dist, 'data.json'), 'utf8'));
const ids = new Set();
const english = new Set();
const counts = { 1: 0, 2: 0, 3: 0, dinosaur: 0 };
const visualGroup = word => word.category === 'number' ? 'number-emoji' : word.sheet ? `sheet:${word.sheet}` : word.image
  ? (word.category === 'dinosaur' ? 'dinosaur-image' : 'regular-image') : 'emoji';
const canonical = value => value.toLowerCase().replace(/[^a-z0-9]/g, '');
const numberEmoji = new Map([['one', '1️⃣'], ['two', '2️⃣'], ['three', '3️⃣'], ['four', '4️⃣'], ['five', '5️⃣'], ['six', '6️⃣'], ['seven', '7️⃣'], ['eight', '8️⃣'], ['nine', '9️⃣'], ['ten', '🔟']]);

for (const word of words) {
  if (!word.id || !word.category || !word.en || !word.zh || !word.emoji || ids.has(word.id)) throw Error(`Invalid or duplicate ID: ${word.id}`);
  const key = canonical(word.en);
  if (english.has(key)) throw Error(`Duplicate English: ${word.en}`);
  if (![1, 2, 3].includes(word.difficulty)) throw Error(`Invalid difficulty: ${word.id}`);
  if (word.category === 'number' && word.emoji !== numberEmoji.get(word.en)) throw Error(`Invalid number emoji: ${word.id}`);
  if (!Array.isArray(word.zhuyin) || word.zhuyin.length !== [...word.zh].length || word.zhuyin.some(x => !x || !/[ㄅ-ㄩ]/u.test(x) || /[^ㄅ-ㄩˊˇˋ˙]/u.test(x))) throw Error(`Invalid zhuyin: ${word.id}`);
  if ((word.sheet || word.cell !== undefined) && (!['animals', 'food', 'objects'].includes(word.sheet) || !Number.isInteger(word.cell) || word.cell < 0 || word.cell > 9)) throw Error(`Invalid image cell: ${word.id}`);
  if (word.image) {
    if (!/^(assets\/kidsapp\/|assets\/rebuilt\/)[^/]+(?:\/[^/]+)*\.(png|svg)$/.test(word.image) || word.image.includes('..')) throw Error(`Invalid image path: ${word.id}`);
    const image = path.join(dist, word.image);
    if (!fs.existsSync(image) || fs.statSync(image).size < 1000) throw Error(`Missing image: ${word.id}`);
  }
  if (word.zhAudio) {
    if (word.zhAudio !== `assets/audio/zh/${word.id}.mp3`) throw Error(`Invalid Chinese audio path: ${word.id}`);
    const chineseAudio = path.join(dist, word.zhAudio);
    if (!fs.existsSync(chineseAudio) || fs.statSync(chineseAudio).size < 1500) throw Error(`Missing Chinese audio: ${word.id}`);
  }
  const audio = path.join(dist, 'assets/audio', `${word.id}.mp3`);
  if (!fs.existsSync(audio) || fs.statSync(audio).size < 500) throw Error(`Missing audio: ${word.id}`);
  ids.add(word.id); english.add(key);
  counts[word.category === 'dinosaur' ? 'dinosaur' : word.difficulty]++;
}

for (const mode of ['all', 1, 2, 3, 'dinosaur']) {
  const pool = words.filter(word => mode === 'dinosaur' ? word.category === 'dinosaur'
    : word.category !== 'dinosaur' && (mode === 'all' || word.difficulty === mode));
  if (pool.length < 10) throw Error(`Mode too small: ${mode}`);
  for (const target of pool) {
    const matches = pool.filter(word => word.id !== target.id && visualGroup(word) === visualGroup(target));
    const fallback = words.filter(word => word.id !== target.id && visualGroup(word) === visualGroup(target)
      && (word.category === 'dinosaur') === (target.category === 'dinosaur'));
    if (matches.length < 3 && fallback.length < 3) throw Error(`Not enough same-style distractors: ${target.id}`);
  }
}

console.log(`${words.length} words validated: ${JSON.stringify(counts)}`);

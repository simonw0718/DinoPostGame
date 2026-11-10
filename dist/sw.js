/* 恐龍郵局小遊戲：手機端快取（導演 2026-11-10：切頁卡 1 秒）。
   做法「先給手機裡那份、背景再更新」：
     網頁／樣式／程式／json：馬上回快取，同時背景向伺服器確認，有新版就換掉 → 改版後「第二次開」看到新版。
     圖片／字型／音檔：馬上回快取，超過 1 小時才背景確認一次（跟 _headers 的 1 小時一致）。
   首頁會送 warm 訊息：把各遊戲頁與它們的樣式、程式先抓好（第一次進遊戲也不用等）。
   強制更新：任何一頁網址加 ?fresh=1（shared.js 會清掉快取再重開）。本機 localhost 不啟用（shared.js 判斷）。
   要整個停用：把本檔內容換成 self.registration.unregister() 即可。 */
const CACHE = 'dinopost-v1';
const SLOW = /\.(webp|png|jpe?g|svg|woff2|mp3|m4a|ogg|wav)$/i;   // 少變動的大檔
const HOUR = 3600e3;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));

const keyOf = url => { const u = new URL(url); return /\.html$|\/$|\/[^./]+$/.test(u.pathname) ? u.origin + u.pathname : u.href; };   // 網頁不看 ?參數（同一個檔）

// 抓新的存起來。重新包一份：去掉「轉址過」標記（Safari 不收轉址過的網頁回應），並記下存入時間
async function refresh(url, key) {
  const res = await fetch(url, { cache: 'no-cache', credentials: 'same-origin' });
  if (!res || res.status !== 200 || res.type === 'opaque') return res;
  const headers = new Headers(res.headers); headers.set('x-sw-time', String(Date.now()));
  const copy = new Response(await res.blob(), { status: 200, statusText: 'OK', headers });
  const cache = await caches.open(CACHE);
  await cache.put(key, copy.clone());
  return copy;
}

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || req.headers.has('range')) return;
  if (url.pathname === '/sw.js' || url.searchParams.has('fresh')) return;
  const key = keyOf(req.url);
  e.respondWith((async () => {
    const hit = await (await caches.open(CACHE)).match(key);
    if (!hit) return refresh(req.url, key).catch(() => fetch(req));
    const age = Date.now() - (+hit.headers.get('x-sw-time') || 0);
    if (!SLOW.test(url.pathname) || age > HOUR) e.waitUntil(refresh(req.url, key).catch(() => {}));
    return hit;
  })());
});

// 首頁預抓：pages＝遊戲頁網址；抓網頁，再從內容找出它用的樣式與程式一起抓
let warmedAt = 0;
self.addEventListener('message', e => {
  if (e.data?.type !== 'warm' || Date.now() - warmedAt < 60e3) return;
  warmedAt = Date.now();
  e.waitUntil((async () => {
    const seen = new Set();
    const grab = async url => { const k = keyOf(url); if (seen.has(k)) return null; seen.add(k); return refresh(url, k).catch(() => null); };
    for (const page of e.data.pages || []) {
      const res = await grab(page); if (!res || res.status !== 200) continue;
      const html = await res.clone().text();
      const subs = [...html.matchAll(/<(?:script|link)\b[^>]*?(?:src|href)="([^"#]+\.(?:js|css)(?:\?[^"]*)?)"/g)].map(m => new URL(m[1], page).href);
      await Promise.all(subs.filter(u => new URL(u).origin === location.origin).map(grab));
    }
  })());
});

// Nederlands — service worker
// Keeps a copy of the app on the device, so it opens without a connection after
// the first visit. tools/build-sw.mjs rewrites the file list below and raises the
// version number: run it before every push, or devices keep the old version.
//
// The site shares its address with other apps, and a browser keeps one cache
// store per address. So this worker only ever touches caches whose name starts
// with its own prefix.
const PREFIX = 'dutch-app-';
const CACHE = PREFIX + 'v13';
const SHELL = [
  './index.html',
  './manifest.json',
  './icon.svg',
  './styles/base.css',
  './styles/course-engine.css',
  './styles/courses.css',
  './styles/home.css',
  './styles/path.css',
  './styles/progress.css',
  './styles/variables.css',
  './src/backup-ui.js',
  './src/backup.js',
  './src/data/activity.js',
  './src/data/course-progress.js',
  './src/data/dehet-progress.js',
  './src/data/grammar-progress.js',
  './src/data/nouns.js',
  './src/data/path-progress.js',
  './src/data/path/a2.js',
  './src/data/path/b1.js',
  './src/data/path/b2.js',
  './src/data/path/index.js',
  './src/data/strong-verbs.js',
  './src/data/verb-progress.js',
  './src/grammar/course-engine.js',
  './src/grammar/dehet-ui.js',
  './src/grammar/drill-core.js',
  './src/grammar/grammar-ui.js',
  './src/grammar/path-ui.js',
  './src/grammar/verbs-ui.js',
  './src/main.js',
  './src/progress-ui.js',
  './src/review.js',
  './src/router.js',
  './src/sheet.js',
  './src/state.js',
  './src/store.js',
  './src/toast.js',
  './src/utils.js',
  './src/voice.js',
  './src/weak-spots.js',
];

// Install: fetch the whole app into the new cache.
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)));
  self.skipWaiting();
});

// Activate: remove this app's older caches. Another app's caches are not ours to delete.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith(PREFIX) && k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

// Fetch: the app's own files come from its cache first, then from the network.
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin || !url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  event.respondWith(
    caches.open(CACHE).then(cache => cache.match(event.request, { ignoreSearch: true })).then(cached => cached || fetch(event.request))
  );
});

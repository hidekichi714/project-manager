/**
 * Service Worker - オフライン対応とキャッシュ管理
 */

const CACHE_NAME = 'project-manager-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './css/styles.css',
    './css/gantt.css',
    './css/mobile.css',
    './js/app.js',
    './js/storage.js',
    './js/ui.js',
    './js/gantt.js',
    './js/export.js',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

// インストール時にアセットをキャッシュ
self.addEventListener('install', event => {
    console.log('Service Worker: Installing...');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching assets');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => {
                console.log('Service Worker: Installed');
                return self.skipWaiting();
            })
    );
});

// アクティベート時に古いキャッシュを削除
self.addEventListener('activate', event => {
    console.log('Service Worker: Activating...');

    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('Service Worker: Deleting old cache', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('Service Worker: Activated');
                return self.clients.claim();
            })
    );
});

// フェッチリクエストの処理
self.addEventListener('fetch', event => {
    // ネットワークファースト、フォールバックとしてキャッシュ
    event.respondWith(
        fetch(event.request)
            .then(response => {
                // 成功したレスポンスをキャッシュに保存
                if (response.ok) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request, responseClone);
                        });
                }
                return response;
            })
            .catch(() => {
                // ネットワークエラー時はキャッシュから返す
                return caches.match(event.request)
                    .then(cachedResponse => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        // キャッシュにもない場合はオフラインページを返す（将来的に実装）
                        return new Response('オフラインです', {
                            status: 503,
                            statusText: 'Service Unavailable'
                        });
                    });
            })
    );
});

// バックグラウンド同期（将来的に実装）
self.addEventListener('sync', event => {
    if (event.tag === 'sync-data') {
        console.log('Service Worker: Background sync triggered');
        // 同期処理をここに追加
    }
});

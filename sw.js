// Service Worker pour mode offline
const CACHE_NAME = 'jh-supermarket-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/acceuil.html',
    '/caisse.html',
    '/stock.html',
    '/users.html',
    '/tresoreri.html',
    '/assets/css/style.css',
    '/assets/css/style_acceuil.css',
    '/assets/css/caisse.css',
    '/assets/css/style_stock.css',
    '/assets/js/script.js',
    '/assets/js/pos.js',
    '/assets/js/auth.js',
    '/assets/js/logout.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// Installation du service worker
self.addEventListener('install', event => {
    console.log('[SW] Installation...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Mise en cache des ressources');
                return cache.addAll(urlsToCache);
            })
            .catch(err => console.error('[SW] Erreur cache:', err))
    );
});

// Activation et nettoyage des anciens caches
self.addEventListener('activate', event => {
    console.log('[SW] Activation');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Suppression ancien cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Stratégie: Network First, puis Cache
self.addEventListener('fetch', event => {
    const { request } = event;
    
    // Ignorer les requêtes POST/PUT/DELETE pour la synchronisation
    if (request.method !== 'GET') {
        return;
    }

    event.respondWith(
        fetch(request)
            .then(response => {
                // Clone la réponse car elle ne peut être utilisée qu'une fois
                const responseClone = response.clone();
                
                // Mettre en cache la réponse
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(request, responseClone);
                });
                
                return response;
            })
            .catch(() => {
                // Si la requête échoue (offline), utiliser le cache
                return caches.match(request).then(cachedResponse => {
                    if (cachedResponse) {
                        console.log('[SW] Récupération depuis cache:', request.url);
                        return cachedResponse;
                    }
                    
                    // Retourner une réponse par défaut
                    return new Response(
                        JSON.stringify({ 
                            success: false, 
                            offline: true, 
                            message: 'Mode hors ligne - données en cache non disponibles' 
                        }),
                        { 
                            headers: { 'Content-Type': 'application/json' },
                            status: 503
                        }
                    );
                });
            })
    );
});

// Background Sync pour synchroniser les données quand la connexion revient
self.addEventListener('sync', event => {
    console.log('[SW] Background sync:', event.tag);
    
    if (event.tag === 'sync-ventes') {
        event.waitUntil(syncVentes());
    }
});

async function syncVentes() {
    console.log('[SW] Synchronisation des ventes...');
    
    // Récupérer les ventes en attente depuis IndexedDB
    const db = await openDB();
    const tx = db.transaction('pending_ventes', 'readonly');
    const store = tx.objectStore('pending_ventes');
    const ventes = await store.getAll();
    
    // Envoyer chaque vente au serveur
    for (const vente of ventes) {
        try {
            const response = await fetch('/assets/Api/createVente.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(vente.data)
            });
            
            if (response.ok) {
                // Supprimer la vente de la file d'attente
                const txDel = db.transaction('pending_ventes', 'readwrite');
                await txDel.objectStore('pending_ventes').delete(vente.id);
                console.log('[SW] Vente synchronisée:', vente.id);
            }
        } catch (error) {
            console.error('[SW] Erreur sync vente:', error);
        }
    }
}

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('JH_SuperMarket', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            if (!db.objectStoreNames.contains('pending_ventes')) {
                db.createObjectStore('pending_ventes', { keyPath: 'id', autoIncrement: true });
            }
            
            if (!db.objectStoreNames.contains('products')) {
                db.createObjectStore('products', { keyPath: 'id' });
            }
            
            if (!db.objectStoreNames.contains('ventes')) {
                db.createObjectStore('ventes', { keyPath: 'id_vente' });
            }
        };
    });
}

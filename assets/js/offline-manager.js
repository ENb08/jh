// Gestionnaire IndexedDB pour mode offline
class OfflineManager {
    constructor() {
        this.dbName = 'JH_SuperMarket';
        this.version = 1;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Store pour les ventes en attente
                if (!db.objectStoreNames.contains('pending_ventes')) {
                    const ventesStore = db.createObjectStore('pending_ventes', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    ventesStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                // Store pour les produits (cache)
                if (!db.objectStoreNames.contains('products')) {
                    db.createObjectStore('products', { keyPath: 'id' });
                }

                // Store pour les ventes synchronisées
                if (!db.objectStoreNames.contains('ventes')) {
                    const ventesSync = db.createObjectStore('ventes', { keyPath: 'id_vente' });
                    ventesSync.createIndex('date', 'date_vente', { unique: false });
                }

                // Store pour la config
                if (!db.objectStoreNames.contains('config')) {
                    db.createObjectStore('config', { keyPath: 'key' });
                }
            };
        });
    }

    // Helper pour transformer une IDBRequest en Promise
    requestToPromise(req) {
        return new Promise((resolve, reject) => {
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    // Sauvegarder les produits localement
    async saveProducts(products) {
        const tx = this.db.transaction('products', 'readwrite');
        const store = tx.objectStore('products');
        
        for (const product of products) {
            const req = store.put(product);
            await this.requestToPromise(req);
        }
        return true;
    }

    // Récupérer les produits locaux
    async getProducts() {
        const tx = this.db.transaction('products', 'readonly');
        const store = tx.objectStore('products');
        const req = store.getAll();
        return await this.requestToPromise(req);
    }

    // Ajouter une vente en attente
    async addPendingVente(venteData) {
        const tx = this.db.transaction('pending_ventes', 'readwrite');
        const store = tx.objectStore('pending_ventes');

        const vente = {
            data: venteData,
            timestamp: Date.now(),
            synced: false
        };

        const req = store.add(vente);
        const id = await this.requestToPromise(req);
        console.log('Vente ajoutée en file d\'attente:', id);
        return id;
    }

    // Récupérer toutes les ventes en attente
    async getPendingVentes() {
        const tx = this.db.transaction('pending_ventes', 'readonly');
        const store = tx.objectStore('pending_ventes');
        const req = store.getAll();
        return await this.requestToPromise(req);
    }

    // Supprimer une vente en attente
    async deletePendingVente(id) {
        const tx = this.db.transaction('pending_ventes', 'readwrite');
        const store = tx.objectStore('pending_ventes');
        const req = store.delete(id);
        await this.requestToPromise(req);
        console.log('Vente supprimée de la file:', id);
    }

    // Sauvegarder une vente synchronisée
    async saveVente(vente) {
        const tx = this.db.transaction('ventes', 'readwrite');
        const store = tx.objectStore('ventes');
        const req = store.put(vente);
        return await this.requestToPromise(req);
    }

    // Récupérer les ventes locales
    async getVentes() {
        const tx = this.db.transaction('ventes', 'readonly');
        const store = tx.objectStore('ventes');
        const req = store.getAll();
        return await this.requestToPromise(req);
    }

    // Sauvegarder la configuration
    async saveConfig(key, value) {
        const tx = this.db.transaction('config', 'readwrite');
        const store = tx.objectStore('config');
        const req = store.put({ key, value });
        return await this.requestToPromise(req);
    }

    // Récupérer la configuration
    async getConfig(key) {
        const tx = this.db.transaction('config', 'readonly');
        const store = tx.objectStore('config');
        const req = store.get(key);
        const result = await this.requestToPromise(req);
        return result ? result.value : null;
    }
}

// Gestionnaire de synchronisation
class SyncManager {
    constructor(offlineManager) {
        this.offlineManager = offlineManager;
        this.isOnline = navigator.onLine;
        this.syncInProgress = false;

        // Écouter les changements de connectivité
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
    }

    handleOnline() {
        console.log('✅ Connexion rétablie');
        this.isOnline = true;
        this.updateStatus(true);
        this.syncPendingData();
    }

    handleOffline() {
        console.log('⚠️ Mode hors ligne');
        this.isOnline = false;
        this.updateStatus(false);
    }

    updateStatus(online) {
        const statusElement = document.getElementById('connection-status');
        if (statusElement) {
            statusElement.textContent = online ? '🟢 En ligne' : '🔴 Hors ligne';
            statusElement.className = online ? 'status-online' : 'status-offline';
        }
    }

    async syncPendingData() {
        if (this.syncInProgress) {
            console.log('Synchronisation déjà en cours...');
            return;
        }

        this.syncInProgress = true;
        console.log('🔄 Début de la synchronisation...');

        try {
            const pendingVentes = await this.offlineManager.getPendingVentes();
            console.log(`${pendingVentes.length} vente(s) en attente`);

            for (const vente of pendingVentes) {
                try {
                    const response = await fetch('assets/Api/createVente.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(vente.data)
                    });

                    const result = await response.json();

                    if (result.success) {
                        // Sauvegarder la vente synchronisée
                        await this.offlineManager.saveVente(result.data);
                        
                        // Supprimer de la file d'attente
                        await this.offlineManager.deletePendingVente(vente.id);
                        
                        console.log('✅ Vente synchronisée:', vente.id);
                    } else {
                        console.error('❌ Erreur sync vente:', result.message);
                    }
                } catch (error) {
                    console.error('❌ Erreur réseau pour vente:', vente.id, error);
                }
            }

            console.log('✅ Synchronisation terminée');
        } catch (error) {
            console.error('❌ Erreur synchronisation:', error);
        } finally {
            this.syncInProgress = false;
        }
    }

    // Wrapper pour les requêtes API
    async apiRequest(url, options = {}) {
        if (this.isOnline) {
            try {
                const response = await fetch(url, options);
                return await response.json();
            } catch (error) {
                console.error('Erreur API:', error);
                return { success: false, offline: true, message: 'Erreur réseau' };
            }
        } else {
            return { success: false, offline: true, message: 'Mode hors ligne' };
        }
    }
}

// Instance globale
window.offlineManager = new OfflineManager();
window.syncManager = null;

// Initialiser au chargement
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await window.offlineManager.init();
        window.syncManager = new SyncManager(window.offlineManager);
        console.log('✅ Gestionnaire offline initialisé');
    } catch (error) {
        console.error('❌ Erreur init offline:', error);
    }
});

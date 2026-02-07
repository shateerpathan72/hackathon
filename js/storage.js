// IndexedDB wrapper for local-first storage
class StorageManager {
    constructor() {
        this.dbName = 'RumoralityDB';
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

                // Create object stores
                if (!db.objectStoreNames.contains('identity')) {
                    db.createObjectStore('identity', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('reputation')) {
                    db.createObjectStore('reputation', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('rumors')) {
                    const rumorStore = db.createObjectStore('rumors', { keyPath: 'id' });
                    rumorStore.createIndex('timestamp', 'timestamp', { unique: false });
                    rumorStore.createIndex('sealed', 'sealed', { unique: false });
                }
                if (!db.objectStoreNames.contains('votes')) {
                    const voteStore = db.createObjectStore('votes', { keyPath: 'id' });
                    voteStore.createIndex('rumorId', 'rumorId', { unique: false });
                    voteStore.createIndex('userId', 'userId', { unique: false });
                }
            };
        });
    }

    async get(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    async put(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    async delete(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    async clear(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    async clearAll() {
        const stores = ['identity', 'reputation', 'rumors', 'votes'];
        for (const store of stores) {
            await this.clear(store);
        }
    }
}

// Global storage instance
const storage = new StorageManager();

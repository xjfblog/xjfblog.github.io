// IndexedDB 数据库服务
const DB = {
    name: 'ErpSystemDB',
    version: 1,
    db: null,

    // 初始化数据库
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.name, this.version);

            request.onerror = (event) => {
                console.error('数据库打开失败:', event.target.error);
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('数据库连接成功');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                // 创建数据存储对象
                if (!db.objectStoreNames.contains('systemData')) {
                    db.createObjectStore('systemData', { keyPath: 'id' });
                }
            };
        });
    },

    // 保存数据
    async saveData(data) {
        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.transaction(['systemData'], 'readwrite');
                const store = transaction.objectStore('systemData');
                
                const request = store.put({
                    id: 'current',
                    ...data
                });

                request.onsuccess = () => resolve(true);
                request.onerror = () => reject(request.error);
            } catch (error) {
                reject(error);
            }
        });
    },

    // 加载数据
    async loadData() {
        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.transaction(['systemData'], 'readonly');
                const store = transaction.objectStore('systemData');
                const request = store.get('current');

                request.onsuccess = () => {
                    if (request.result) {
                        const { id, ...data } = request.result;
                        resolve(data);
                    } else {
                        resolve(null);
                    }
                };

                request.onerror = () => reject(request.error);
            } catch (error) {
                reject(error);
            }
        });
    },

    // 清除数据
    async clearData() {
        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.transaction(['systemData'], 'readwrite');
                const store = transaction.objectStore('systemData');
                const request = store.clear();

                request.onsuccess = () => resolve(true);
                request.onerror = () => reject(request.error);
            } catch (error) {
                reject(error);
            }
        });
    }
}; 
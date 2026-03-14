import { promisifyStore } from './utils/promisifyStore.js';

/**
 * TinyIndexDB - IndexedDB 的轻量级封装
 * 提供数据库初始化、连接缓存、CRUD 操作
 */
class TinyIndexDB {

    constructor(dbName, keyPath, dbV) {
        const indexDbApi = window.indexedDB || window.webkitIndexedDB || window.msIndexedDB || window.mozIndexedDB;
        this.dbName = dbName;
        this.dbV = dbV;
        this.indexDbApi = indexDbApi;
        this.keyPath = keyPath;
        this.tablesConfig = null;
        this._db = null;  // 缓存的数据库连接
    }

    /**
     * 初始化数据库，创建缺失的表
     * @param {Object} tables - 表配置 { tableName: [['indexName', unique], ...] }
     */
    async initDB(tables) {
        this.tablesConfig = { ...this.tablesConfig, ...tables };
        let tableNames = Object.keys(tables);
        
        // 先打开数据库检查表是否存在
        let db = await this._openDBInternal();
        
        // 检查是否所有表都存在
        let missingTables = tableNames.filter(name => !db.objectStoreNames.contains(name));
        
        if (missingTables.length > 0) {
            // 有表不存在，需要升级版本号创建
            console.log('Missing tables:', missingTables.join(', '));
            db.close();
            
            // 关闭缓存的连接，否则升级版本时会被阻塞
            if (this._db) {
                this._db.close();
            }
            this._db = null;
            
            // 升级版本号并重新打开
            this.dbV += 1;
            try {
                db = await this._openDBAndCreateTables(tables);
            } catch (err) {
                // 如果版本已被其他实例升级，重新获取当前版本
                if (err && err.name === 'VersionError') {
                    console.log('Version conflict during table creation, retrying...');
                    const actualVersion = await this._getCurrentVersion();
                    this.dbV = actualVersion;
                    // 重新检查表是否存在
                    db = await this._openDBInternal();
                    let stillMissing = tableNames.filter(name => !db.objectStoreNames.contains(name));
                    if (stillMissing.length > 0) {
                        // 还是需要创建表，再升级一次版本
                        this.dbV += 1;
                        db.close();
                        db = await this._openDBAndCreateTables(tables);
                    }
                } else {
                    throw err;
                }
            }
        }
        
        this._db = db;
        return db;
    }

    async _openDBInternal() {
        let self = this;
        
        try {
            return await this._doOpenRaw();
        } catch (err) {
            // 如果版本号过低，获取当前版本并重试
            if (err && err.name === 'VersionError') {
                console.log(`VersionError: requested ${self.dbV}, getting actual version...`);
                const actualVersion = await self._getCurrentVersion();
                self.dbV = actualVersion;
                return this._doOpenRaw();
            }
            throw err;
        }
    }

    _doOpenRaw() {
        let self = this;
        return new Promise((resolve, reject) => {
            let req = self.indexDbApi.open(self.dbName, self.dbV);
            req.onerror = function (e) {
                reject(e.target.error);
            };
            req.onsuccess = function (e) {
                resolve(e.target.result);
            };
            req.onblocked = function (e) {
                console.warn('Database open blocked, waiting for other connections to close...');
            };
        });
    }

    /**
     * 获取数据库当前版本（不传版本号打开）
     */
    _getCurrentVersion() {
        let self = this;
        return new Promise((resolve, reject) => {
            // 不传版本号，获取当前版本
            let req = self.indexDbApi.open(self.dbName);
            req.onsuccess = function (e) {
                let db = e.target.result;
                let version = db.version;
                db.close();
                console.log(`Current database version: ${version}`);
                resolve(version);
            };
            req.onerror = function (e) {
                reject(req.error);
            };
        });
    }

    async _openDBAndCreateTables(tables) {
        let self = this;
        
        try {
            return await this._doOpenAndCreate(tables);
        } catch (err) {
            // 如果版本号过低，获取当前版本并更新后再试
            if (err && err.name === 'VersionError') {
                console.log(`VersionError in _openDBAndCreateTables: requested ${self.dbV}, getting actual version...`);
                const actualVersion = await self._getCurrentVersion();
                self.dbV = actualVersion;
                return this._doOpenAndCreate(tables);
            }
            throw err;
        }
    }

    _doOpenAndCreate(tables) {
        let self = this;
        let tableNames = Object.keys(tables);
        let tableIndexes = Object.values(tables);
        
        return new Promise((resolve, reject) => {
            let req = self.indexDbApi.open(self.dbName, self.dbV);
            req.onerror = function (e) {
                reject(e.target.error);
            };
            req.onsuccess = function (e) {
                resolve(e.target.result);
            };
            req.onupgradeneeded = function (e) {
                let db = e.target.result;
                let store;
                for (let i = 0; i < tableNames.length; i++) {
                    if (!db.objectStoreNames.contains(tableNames[i])) {
                        store = db.createObjectStore(tableNames[i], {keyPath: self.keyPath, autoIncrement: false});
                        console.log('TABLE ' + tableNames[i] + ' created Success');
                        for (let j = 0; j < tableIndexes[i].length; j++) {
                            store.createIndex(tableIndexes[i][j][0], tableIndexes[i][j][0], {unique: tableIndexes[i][j][1]});
                        }
                    }
                }
            };
        });
    }

    /**
     * 打开数据库连接（带缓存）
     */
    async openDB() {
        let self = this;
        
        // 如果已有连接且未关闭，直接返回
        if (this._db && !this._db.closed) {
            return this._db;
        }
        
        try {
            return await this._doOpenDB();
        } catch (err) {
            // 如果版本号过低，获取当前版本并重试
            if (err.name === 'VersionError') {
                console.log(`VersionError in openDB: requested ${self.dbV}, getting actual version...`);
                const actualVersion = await self._getCurrentVersion();
                self.dbV = actualVersion;
                return this._doOpenDB();
            }
            throw err;
        }
    }

    _doOpenDB() {
        let self = this;
        return new Promise((resolve, reject) => {
            let req = self.indexDbApi.open(self.dbName, self.dbV);
            req.onerror = function (e) {
                reject(e.target.error);
            };
            req.onsuccess = function (e) {
                let db = e.target.result;
                // 监听连接意外关闭事件
                db.onclose = function() {
                    self._db = null;
                };
                // 监听版本变化事件（其他标签页升级了数据库）
                db.onversionchange = function(event) {
                    console.log('Database version changed, closing connection...');
                    db.close();
                    self._db = null;
                };
                self._db = db;
                resolve(db);
            };
        });
    }

    /**
     * 统一的 withTable 包装器 - 打开数据库执行操作
     */
    async withTable(tableName, callback) {
        let db = await this.openDB();
        return await callback(db);
    }

    async delData(tableName, keys) {
        return this.withTable(tableName, async (db) => {
            let tx = db.transaction(tableName, 'readwrite');
            let store = tx.objectStore(tableName);
            const store_delete = promisifyStore(store, 'delete');

            for (let i = 0; i < keys.length; i++) {
                await store_delete(keys[i]);
            }
        });
    }

    async readData(tableName, keys) {
        return this.withTable(tableName, async (db) => {
            let tx = db.transaction(tableName);
            let store = tx.objectStore(tableName);
            let store_get = promisifyStore(store, 'get');

            let result = [];
            for (let i = 0; i < keys.length; i++) {
                let d = await store_get(keys[i]);
                result.push(d.result);
            }
            return result;
        });
    }

    async saveOrUpdate(tableName, dataList) {
        return this.withTable(tableName, async (db) => {
            let tx = db.transaction(tableName, 'readwrite');
            let store = tx.objectStore(tableName);
            const store_put = promisifyStore(store, 'put');
            for (let i = 0; i < dataList.length; i++) {
                await store_put(dataList[i]);
            }
        });
    }

    async addData(tableName, dataList) {
        return this.withTable(tableName, async (db) => {
            let tx = db.transaction(tableName, 'readwrite');
            let store = tx.objectStore(tableName);
            const store_add = promisifyStore(store, 'add');
            for (let i = 0; i < dataList.length; i++) {
                await store_add(dataList[i]);
            }
        });
    }

    async updateData(tableName, dataList) {
        return this.withTable(tableName, async (db) => {
            let tx = db.transaction(tableName, 'readwrite');
            let store = tx.objectStore(tableName);
            const store_put = promisifyStore(store, 'put');
            for (let i = 0; i < dataList.length; i++) {
                await store_put(dataList[i]);
            }
        });
    }

    async clearTable(tableName) {
        return this.withTable(tableName, async (db) => {
            let tx = db.transaction(tableName, 'readwrite');
            let store = tx.objectStore(tableName);
            const store_clear = promisifyStore(store, 'clear');
            await store_clear();
        });
    }

}

/**
 * IndexDBStorageFactory - IndexedDB 存储工厂
 * 全局缓存 storage 实例，以 dbName + tableName 为维度
 */
class IndexDBStorageFactory {

    // 全局缓存：{ 'dbName:tableName': IndexDBStorage }
    static _storageCache = new Map();
    
    // 全局缓存：{ 'dbName': TinyIndexDB }
    static _tinyIndexDBCache = new Map();

    /**
     * 获取或创建 storage 实例
     * @param {string} dbName - 数据库名
     * @param {string} tableName - 表名
     * @param {number} dbV - 数据库版本（可选，首次创建时使用）
     * @returns {IndexDBStorage}
     */
    static getStorage(dbName, tableName, dbV = 1) {
        const cacheKey = `${dbName}:${tableName}`;
        
        // 从缓存获取
        if (this._storageCache.has(cacheKey)) {
            return this._storageCache.get(cacheKey);
        }
        
        // 创建新实例
        const storage = new IndexDBStorage(dbName, tableName, dbV);
        this._storageCache.set(cacheKey, storage);
        
        return storage;
    }

    /**
     * 获取或创建 TinyIndexDB 实例
     * @param {string} dbName - 数据库名
     * @param {number} dbV - 数据库版本（可选）
     * @returns {TinyIndexDB}
     */
    static getTinyIndexDB(dbName, dbV = 1) {
        if (this._tinyIndexDBCache.has(dbName)) {
            return this._tinyIndexDBCache.get(dbName);
        }
        
        const tinyIndexDB = new TinyIndexDB(dbName, 'name', dbV);
        this._tinyIndexDBCache.set(dbName, tinyIndexDB);
        
        return tinyIndexDB;
    }

    /**
     * 清除指定缓存
     * @param {string} dbName - 数据库名
     * @param {string} tableName - 表名（可选，不传则清除整个数据库缓存）
     */
    static clearCache(dbName, tableName) {
        if (tableName) {
            this._storageCache.delete(`${dbName}:${tableName}`);
        } else {
            // 清除该数据库的所有表缓存
            for (const key of this._storageCache.keys()) {
                if (key.startsWith(`${dbName}:`)) {
                    this._storageCache.delete(key);
                }
            }
            this._tinyIndexDBCache.delete(dbName);
        }
    }

    /**
     * 清除所有缓存
     */
    static clearAllCache() {
        this._storageCache.clear();
        this._tinyIndexDBCache.clear();
    }

}

/**
 * IndexDBStorage - 单表存储封装
 * 自动初始化表，提供 CRUD 操作
 */
class IndexDBStorage {

    constructor(dbName, tableName, dbV = 1) {
        this.dbName = dbName;
        this.tableName = tableName;
        this.isInited = false;
        
        // 使用工厂获取共享的 TinyIndexDB 实例
        this.tinyIndexDB = IndexDBStorageFactory.getTinyIndexDB(dbName, dbV);
    }

    /**
     * 初始化表（如果不存在会自动创建）
     */
    async init() {
        if (this.isInited) {
            return;
        }
        
        // 初始化表配置
        const tablesConfig = {
            [this.tableName]: [
                ['name', true],
                ['data', false]
            ]
        };
        
        await this.tinyIndexDB.initDB(tablesConfig);
        this.isInited = true;
    }

    async saveItem(name, data) {
        await this.init();
        await this.tinyIndexDB.saveOrUpdate(this.tableName, [{name: name, data: data}]);
    }

    async addItem(name, data) {
        await this.init();
        await this.tinyIndexDB.addData(this.tableName, [{name: name, data: data}]);
    }

    async updateItem(name, data) {
        await this.init();
        await this.tinyIndexDB.updateData(this.tableName, [{name: name, data: data}]);
    }

    async deleteItem(name) {
        await this.init();
        await this.tinyIndexDB.delData(this.tableName, [name]);
    }

    async clear() {
        await this.init();
        await this.tinyIndexDB.clearTable(this.tableName);
    }

    async getItem(name) {
        await this.init();
        try {
            let values = await this.tinyIndexDB.readData(this.tableName, [name]);
            let value0 = values[0];
            return value0 && value0.data;
        } catch (e) {
            console.log(e);
            return null;
        }
    }
}

export { TinyIndexDB, IndexDBStorage, IndexDBStorageFactory };

import { promisifyStore } from './utils/promisifyStore.js';

/**
 * TinyIndexDB - IndexedDB 的轻量级封装
 * 提供数据库初始化、连接缓存、CRUD 操作
 */
class TinyIndexDB {

    constructor(dbName, keyPath) {
        const indexDbApi = window.indexedDB || window.webkitIndexedDB || window.msIndexedDB || window.mozIndexedDB;
        this.dbName = dbName;
        this.dbV = null;  // dbV不需要外面传，内部自动获取
        this.indexDbApi = indexDbApi;
        this.keyPath = keyPath;
        this.tablesConfig = null;
        this._db = null;  // 缓存的数据库连接
    }

    /**
     * 确保 dbV 已设置，未设置时自动获取当前版本
     */
    async _ensureDbVersion() {
        if (this.dbV === undefined || this.dbV === null) {
            this.dbV = await this._getCurrentVersion();
        }
    }

    /**
     * 初始化数据库，创建缺失的表
     * @param {Object} tables - 表配置 { tableName: [['indexName', unique], ...] }
     */
    async initDB(tables) {
        this.tablesConfig = { ...this.tablesConfig, ...tables };
        let tableNames = Object.keys(tables);

        // 确保版本号已设置
        await this._ensureDbVersion();

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

        // 确保版本号已设置
        await this._ensureDbVersion();

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

export { TinyIndexDB };

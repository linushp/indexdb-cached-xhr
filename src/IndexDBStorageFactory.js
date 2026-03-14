import { TinyIndexDB } from './TinyIndexDB.js';
import { IndexDBStorage } from './IndexDBStorage.js';

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
     * @returns {IndexDBStorage}
     */
    static getStorage(dbName, tableName) {
        const cacheKey = `${dbName}:${tableName}`;

        // 从缓存获取
        if (this._storageCache.has(cacheKey)) {
            return this._storageCache.get(cacheKey);
        }

        // 创建新实例
        const storage = new IndexDBStorage(dbName, tableName);
        this._storageCache.set(cacheKey, storage);

        return storage;
    }

    /**
     * 获取或创建 TinyIndexDB 实例
     * @param {string} dbName - 数据库名
     * @returns {TinyIndexDB}
     */
    static getTinyIndexDB(dbName) {
        if (this._tinyIndexDBCache.has(dbName)) {
            return this._tinyIndexDBCache.get(dbName);
        }

        const tinyIndexDB = new TinyIndexDB(dbName, 'name');
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

export { IndexDBStorageFactory };

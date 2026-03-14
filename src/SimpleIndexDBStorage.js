import { IndexDBStorageFactory } from './TinyIndexDB.js';

/**
 * SimpleIndexDBStorage - 单表存储封装
 * 使用工厂模式，全局缓存实例
 */
class SimpleIndexDBStorage {

    constructor(dbName, tableName, dbVersion) {
        this.dbName = dbName || 'linushp_default';
        this.tableName = tableName || 'linushp_t';
        this.dbVersion = dbVersion || 1;
        // 使用工厂获取缓存的 storage 实例
        this._storage = null;
    }

    // 延迟获取 storage 实例
    _getStorage() {
        if (!this._storage) {
            this._storage = IndexDBStorageFactory.getStorage(this.dbName, this.tableName, this.dbVersion);
        }
        return this._storage;
    }

    async saveItem(name, data) {
        return this._getStorage().saveItem(name, data);
    }

    async getItem(name) {
        return this._getStorage().getItem(name);
    }

    async deleteItem(name) {
        return this._getStorage().deleteItem(name);
    }

    async clear() {
        return this._getStorage().clear();
    }

}

export { SimpleIndexDBStorage };

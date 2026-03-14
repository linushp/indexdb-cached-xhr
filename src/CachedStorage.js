import { StorageFactory } from './StorageFactory.js';

/**
 * CachedStorage - 带内存缓存的单表存储封装
 * 读取优先从内存获取，写入同时更新内存和 IndexedDB
 */
class CachedStorage {

    constructor(dbName, tableName) {
        this.dbName = dbName || 'linushp_default';
        this.tableName = tableName || 'linushp_t';
        // 内存缓存
        this._memoryCache = new Map();
        // 使用工厂获取缓存的 storage 实例
        this._storage = null;
    }

    // 延迟获取 storage 实例
    _getStorage() {
        if (!this._storage) {
            this._storage = StorageFactory.getStorage(this.dbName, this.tableName);
        }
        return this._storage;
    }

    async saveItem(name, data) {
        // 先更新内存
        this._memoryCache.set(name, data);
        // 再持久化到 IndexedDB
        return this._getStorage().saveItem(name, data);
    }

    async getItem(name) {
        // 先查内存缓存
        if (this._memoryCache.has(name)) {
            return this._memoryCache.get(name);
        }
        // 内存没有，查 IndexedDB
        const data = await this._getStorage().getItem(name);
        // 写入内存缓存
        if (data !== null && data !== undefined) {
            this._memoryCache.set(name, data);
        }
        return data;
    }

    async deleteItem(name) {
        // 先删除内存
        this._memoryCache.delete(name);
        // 再删除 IndexedDB
        return this._getStorage().deleteItem(name);
    }

    async clear() {
        // 清空内存
        this._memoryCache.clear();
        // 清空 IndexedDB
        return this._getStorage().clear();
    }

    /**
     * 获取内存缓存统计
     */
    getMemoryCacheSize() {
        return this._memoryCache.size;
    }

    /**
     * 清空内存缓存（不影响 IndexedDB）
     */
    clearMemoryCache() {
        this._memoryCache.clear();
    }

}

export { CachedStorage };

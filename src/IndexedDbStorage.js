import { TinyIndexDB } from './TinyIndexDB.js';

/**
 * IndexedDbStorage - 单表存储封装
 * 自动初始化表，提供 CRUD 操作
 */
class IndexedDbStorage {

    constructor(dbName, tableName) {
        this.dbName = dbName;
        this.tableName = tableName;
        this.isInited = false;

        // 使用全局缓存获取共享的 TinyIndexDB 实例，确保同一个数据库共享版本管理
        this.tinyIndexDB = TinyIndexDB.getInstance(dbName);
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

export { IndexedDbStorage };

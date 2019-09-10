function promisifyStore(store, method) {
    return function (...args) {
        return new Promise(function (resolve, reject) {
            let func = store[method];

            func = func.bind(store);

            let req = func(...args);

            req.onsuccess = function () {
                resolve(req);
            };
            req.onerror = function (e) {
                reject(e);
            }
        })
    }
}


class TinyIndexDB {


    constructor(dbName, keyPath, dbV) {
        const indexDbApi = window.indexedDB || window.webkitindexedDB || window.msIndexedDB || window.mozIndexedDB;
        this.dbName = dbName;
        this.dbV = dbV;
        this.indexDbApi = indexDbApi;
        this.keyPath = keyPath;
    }


    // openDB & create tables
    initDB(tables) {
        let self = this;
        return new Promise(function (resolve, reject) {
            let req = self.indexDbApi.open(self.dbName, self.dbV);
            let db;
            let tableNames = Object.keys(tables);
            let tableIndexes = Object.values(tables);

            req.onerror = function (e) {
                console.log('DB init Error');
                reject(e);
            };
            req.onsuccess = function (e) {
                db = e.target.result;
                console.log('DB init Success');
                setTimeout(function () {
                    resolve(db);
                }, 100);
            };
            req.onupgradeneeded = function (e) {
                db = e.target.result;
                let store;
                for (let i = 0; i < tableNames.length; i++) {
                    if (!db.objectStoreNames.contains(tableNames[i])) {
                        store = db.createObjectStore(tableNames[i], {keyPath: self.keyPath, autoIncrement: false});
                        console.log('TABLE ' + tableNames[i] + ' created Success');
                    }
                    for (let j = 0; j < tableIndexes[i].length; j++) {
                        store.createIndex(tableIndexes[i][j][0], tableIndexes[i][j][0], {unique: tableIndexes[i][j][1]});
                    }
                }
                console.log("onupgradeneeded");
            };
        });

    }


    openDB() {
        let dbName = this.dbName;
        let self = this;
        let dbV = this.dbV;
        return new Promise((resolve, reject) => {
            let req = self.indexDbApi.open(dbName, dbV);
            req.onerror = function (e) {
                reject(e);
            };
            req.onsuccess = function (e) {
                let db = e.target.result;
                resolve(db);
            };
        })
    }


    async delData(tableName, keys) {
        let db = await this.openDB();
        let tx = db.transaction(tableName, 'readwrite');
        let store = tx.objectStore(tableName);
        const store_delete = promisifyStore(store, 'delete');

        for (let i = 0; i < keys.length; i++) {
            let k = keys[i];
            let d = await store_delete(k);
        }

    }


    async readData(tableName, keys) {
        let db = await this.openDB();
        let tx = db.transaction(tableName);
        let store = tx.objectStore(tableName);
        let store_get = promisifyStore(store, 'get');

        let result = [];
        for (let i = 0; i < keys.length; i++) {
            let k = keys[i];
            let d = await store_get(k);
            result.push(d.result);
        }
        return result;
    }


    async saveOrUpdate(tableName, dataList) {
        const keyPath = this.keyPath;
        let db = await this.openDB();
        let tx = db.transaction(tableName, 'readwrite');
        let store = tx.objectStore(tableName);
        const store_delete = promisifyStore(store, 'delete');
        const store_add = promisifyStore(store, 'add');
        for (let i = 0; i < dataList.length; i++) {
            let dataObj = dataList[i];
            let dataKey = dataObj[keyPath];
            await store_delete(dataKey);
            await store_add(dataObj);
        }
    }


    async addData(tableName, dataList) {
        let db = await this.openDB();
        let tx = db.transaction(tableName, 'readwrite');
        let store = tx.objectStore(tableName);
        const store_add = promisifyStore(store, 'add');
        for (let i = 0; i < dataList.length; i++) {
            await store_add(dataList[i]);
        }
    }


    async updateData(tableName, dataList) {
        let db = await this.openDB();
        let tx = db.transaction(tableName, 'readwrite');
        let store = tx.objectStore(tableName);
        const store_put = promisifyStore(store, 'put');
        for (let i = 0; i < dataList.length; i++) {
            await store_put(dataList[i]);
        }
    }


    //清空整个表格
    async clearTable(tableName) {
        let db = await this.openDB();
        let tx = db.transaction(tableName, 'readwrite');
        let store = tx.objectStore(tableName);
        const store_clear = promisifyStore(store, 'clear');
        await store_clear();
    }

}


class IndexDBStorage {

    constructor(dbName, tableNames, dbV = 1) {
        this.isInited = false;
        this.tableNames = tableNames;
        this.tinyIndexDB = new TinyIndexDB(dbName, 'name', dbV);
    }

    init() {
        if (this.isInited) {
            return Promise.resolve();
        }
        this.isInited = true;


        let tables = {};
        for (let i = 0; i < this.tableNames.length; i++) {
            let tableName = this.tableNames[i];
            tables[tableName] = {
                name: true,
                data: false
            }
        }
        return this.tinyIndexDB.initDB(tables);
    }

    async saveItem(tableName, name, data) {
        await this.init();
        await this.tinyIndexDB.saveOrUpdate(tableName, [{name: name, data: data}]);
    }

    async addItem(tableName, name, data) {
        await this.init();
        await this.tinyIndexDB.addData(tableName, [{name: name, data: data}])
    }

    async updateItem(tableName, name, data) {
        await this.init();
        await this.tinyIndexDB.updateData(tableName, [{name: name, data: data}])
    }

    async deleteItem(tableName, name) {
        await this.init();
        await this.tinyIndexDB.delData(tableName, [name]);
    }

    async clearTable(tableName) {
        await this.init();
        await this.tinyIndexDB.clearTable(tableName);
    }

    async getItem(tableName, name) {
        await this.init();
        try {
            let values = await this.tinyIndexDB.readData(tableName, [name]);
            let value0 = values[0];
            return value0 && value0.data;
        } catch (e) {
            if (e) {
                console.log(e);
            }
            return null;
        }
    }
}


class SimpleIndexDBStorage {

    constructor(dbName, tableName, dbVersion) {
        this.dbName = dbName || 'linushp_default';
        this.tableName = tableName || 'linushp_t';
        this.dbVersion = dbVersion || 1;
        this.indexdbStorage = new IndexDBStorage(this.dbName, [this.tableName], this.dbVersion);
    }

    async saveItem(name, data) {
        return this.indexdbStorage.saveItem(this.tableName, name, data);
    }

    async getItem(name) {
        return this.indexdbStorage.getItem(this.tableName, name);
    }

    async deleteItem(name) {
        return this.indexdbStorage.deleteItem(this.tableName, name);
    }

    async clear() {
        return this.indexdbStorage.clearTable(this.tableName);
    }

}


class IndexedDBCachedFetch {

    constructor(dbName, tableName) {
        this.indexDbStorage = new SimpleIndexDBStorage(dbName, tableName)
    }

    fetchJson(url, converter) {
        return this.fetch(url, 'json', converter);
    }

    fetchArrayBuffer(url, converter) {
        return this.fetch(url, 'arrayBuffer', converter);
    }

    fetchBlob(url, converter) {
        return this.fetch(url, 'blob', converter);
    }

    fetchText(url, converter) {
        return this.fetch(url, 'text', converter);
    }

    async fetch(url, responseType, converter) {
        let cached = await this.indexDbStorage.getItem(url);
        if (!cached) {
            let fetchd = await fetch(url);
            if (responseType === 'arrayBuffer') {
                cached = await fetchd.arrayBuffer();
            } else if (responseType === 'json') {
                cached = await fetchd.json();
            } else if (responseType === 'blob') {
                cached = await fetchd.blob();
            } else if (responseType === 'text') {
                cached = await fetchd.text();
            } else {
                cached = null;
                console.error("responseType error")
            }

            if (converter) {
                cached = await converter(cached);
            }

            await this.indexDbStorage.saveItem(url, cached);
        }
        return cached;
    }
}


export {
    SimpleIndexDBStorage as default,
    IndexedDBCachedFetch,
    SimpleIndexDBStorage,
    IndexDBStorage,
    TinyIndexDB
};



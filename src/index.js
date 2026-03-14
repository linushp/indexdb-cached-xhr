import { TinyIndexDB, IndexDBStorage, IndexDBStorageFactory } from './TinyIndexDB.js';
import { SimpleIndexDBStorage } from './SimpleIndexDBStorage.js';
import { IndexedDBCachedFetch } from './IndexedDBCachedFetch.js';

export {
    SimpleIndexDBStorage as default,
    IndexedDBCachedFetch,
    SimpleIndexDBStorage,
    IndexDBStorage,
    IndexDBStorageFactory,
    TinyIndexDB
};

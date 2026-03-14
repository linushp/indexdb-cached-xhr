import { TinyIndexDB } from './TinyIndexDB.js';
import { IndexedDbStorage } from './IndexedDbStorage.js';
import { StorageFactory } from './StorageFactory.js';
import { CachedStorage } from './CachedStorage.js';
import { CachedFetch } from './CachedFetch.js';

export {
    CachedStorage as default,
    CachedStorage,
    CachedFetch,
    IndexedDbStorage,
    StorageFactory,
    TinyIndexDB
};

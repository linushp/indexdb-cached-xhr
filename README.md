# indexdb-cached-xhr

A lightweight IndexedDB wrapper with dual-layer caching (Memory + IndexedDB), table management, CRUD operations, and HTTP request caching.

## Features

- **Ultra Small** - Only **~3KB** gzipped, zero dependencies, extremely lightweight
- **Dual-Layer Caching** - **Memory + IndexedDB**, subsequent reads return directly from memory, 100-500x performance boost
- Automatic Version Management - No manual database upgrades needed
- Automatic Table Creation - Tables are created automatically when used
- Factory Pattern - Global instance caching, avoids duplicate connections
- Promise API - Fully asynchronous, supports async/await
- HTTP Caching - Automatically cache fetch request results
- TypeScript Support - Complete type definitions
- Zero Dependencies - No external dependencies

## Performance Comparison

| Operation | Pure IndexedDB | indexdb-cached-xhr (Memory Cache) | Performance Boost |
|-----------|---------------|----------------------------------|-------------------|
| First Read | ~1-5ms | ~1-5ms | Same |
| Subsequent Reads | ~1-5ms | **~0.01ms** | **100-500x** |
| Write | ~2-8ms | ~2-8ms (Memory + Persistence) | Reliable persistence |

> Based on Chrome/Edge browser testing, actual performance varies by data size and device. SimpleIndexDBStorage automatically caches read data to memory, making subsequent access nearly instant.

## Installation

```bash
npm install indexdb-cached-xhr
```

## Usage

### Option 1: CachedStorage (Recommended)

The simplest way to use it, with **built-in memory caching**, one line for high-performance data storage:

```javascript
import { CachedStorage } from 'indexdb-cached-xhr';

// Create storage instance (with dual-layer Memory + IndexedDB caching)
const storage = new CachedStorage('myDB', 'myTable');

// Save data (writes to both memory and IndexedDB)
await storage.saveItem('user1', { name: 'John', age: 25 });

// First read - loads from IndexedDB and caches to memory
const user1 = await storage.getItem('user1');

// Second read - returns directly from memory, 100x+ faster!
const user2 = await storage.getItem('user1'); // ⚡ Lightning fast, almost no delay

// Check memory cache status
console.log('Memory cache entries:', storage.getMemoryCacheSize());

// Delete data (removes from both memory and IndexedDB)
await storage.deleteItem('user1');

// Clear table (clears both memory and IndexedDB)
await storage.clear();

// Clear only memory cache (keeps IndexedDB data)
storage.clearMemoryCache();
```

**Performance Benefits:**
- First read: Load from IndexedDB → ~1-5ms
- Subsequent reads: Return from memory → **~0.01ms, 100-500x faster**

### Option 2: IndexedDBCachedFetch (HTTP Request Caching)

Automatically cache network request results:

```javascript
import { IndexedDBCachedFetch } from 'indexdb-cached-xhr';

const cachedFetch = new CachedFetch('cacheDB', 'apiCache');

// First request hits the network and caches the result
const data = await cachedFetch.fetchJson('https://api.example.com/data');

// Subsequent requests read directly from IndexedDB, no network access
const cachedData = await cachedFetch.fetchJson('https://api.example.com/data');

// Support for other response types
const text = await cachedFetch.fetchText('https://api.example.com/text');
const blob = await cachedFetch.fetchBlob('https://api.example.com/image.png');
const buffer = await cachedFetch.fetchArrayBuffer('https://api.example.com/binary');

// Use converter function to process data
const users = await cachedFetch.fetchJson('https://api.example.com/users', (data) => {
  return data.map(user => ({ ...user, fullName: `${user.firstName} ${user.lastName}` }));
});
```

### Option 3: Factory Pattern (Multi-Table Shared Connection)

Share database connections in multi-table scenarios for better resource efficiency:

```javascript
import { StorageFactory } from 'indexdb-cached-xhr';

// Get storage instances (global caching)
const userStorage = StorageFactory.getStorage('appDB', 'users');
const orderStorage = StorageFactory.getStorage('appDB', 'orders');
const productStorage = StorageFactory.getStorage('appDB', 'products');

// Usage same as SimpleIndexDBStorage
await userStorage.saveItem('user1', { name: 'John' });
await orderStorage.saveItem('order1', { total: 100 });
await productStorage.saveItem('product1', { name: 'Product A' });

// Retrieve data
const user = await userStorage.getItem('user1');
const order = await orderStorage.getItem('order1');
const product = await productStorage.getItem('product1');

// Clear cache (when recreating instances is needed)
StorageFactory.clearCache('appDB', 'users');     // Clear specific table
StorageFactory.clearCache('appDB');               // Clear entire database
StorageFactory.clearAllCache();                   // Clear all caches
```

### Option 4: Low-Level API (TinyIndexDB)

Use when more control is needed:

```javascript
import { TinyIndexDB } from 'indexdb-cached-xhr';

// Create instance
const db = new TinyIndexDB('myDatabase', 'id');

// Initialize database (create multiple tables)
await db.initDB({
  users: [['name', true], ['email', false]],     // [indexName, unique]
  orders: [['userId', false], ['status', false]]
});

// Batch save data
await db.saveOrUpdate('users', [
  { id: 'user1', name: 'John', email: 'john@example.com' },
  { id: 'user2', name: 'Jane', email: 'jane@example.com' }
]);

// Batch read data
const users = await db.readData('users', ['user1', 'user2']);

// Batch delete
await db.delData('users', ['user1']);

// Clear table
await db.clearTable('users');

// Custom transactions
await db.withTable('users', async (database) => {
  const tx = database.transaction('users', 'readwrite');
  const store = tx.objectStore('users');
  // Execute custom operations...
});
```

## API Reference

### CachedStorage

| Method | Parameters | Return | Description |
|--------|-----------|--------|-------------|
| `saveItem(name, data)` | `name: string`, `data: any` | `Promise<void>` | Save or update data (Memory + IndexedDB) |
| `getItem(name)` | `name: string` | `Promise<any>` | Get data (priority from memory cache) |
| `deleteItem(name)` | `name: string` | `Promise<void>` | Delete data (Memory + IndexedDB) |
| `clear()` | - | `Promise<void>` | Clear table (Memory + IndexedDB) |
| `clearMemoryCache()` | - | `void` | Clear only memory cache |
| `getMemoryCacheSize()` | - | `number` | Get memory cache entry count |

### CachedFetch

| Method | Parameters | Return | Description |
|--------|-----------|--------|-------------|
| `fetchJson(url, converter?)` | `url: string`, `converter?: (data) => any` | `Promise<T>` | Get JSON data |
| `fetchText(url, converter?)` | `url: string`, `converter?: (data) => string` | `Promise<string>` | Get text data |
| `fetchBlob(url, converter?)` | `url: string`, `converter?: (data) => Blob` | `Promise<Blob>` | Get Blob data |
| `fetchArrayBuffer(url, converter?)` | `url: string`, `converter?: (data) => ArrayBuffer` | `Promise<ArrayBuffer>` | Get binary data |

### StorageFactory

| Method | Parameters | Return | Description |
|--------|-----------|--------|-------------|
| `getStorage(dbName, tableName)` | `dbName: string`, `tableName: string` | `IndexedDbStorage` | Get/create storage instance |
| `clearCache(dbName, tableName?)` | `dbName: string`, `tableName?: string` | `void` | Clear specific cache |
| `clearAllCache()` | - | `void` | Clear all caches |

## Development

```bash
# Install dependencies
npm install

# Development mode (start local server)
npm run dev

# Build production version
npm run build

# Build development version
npm run build:dev
```

## Browser Compatibility

- Chrome/Edge 24+
- Firefox 16+
- Safari 10+
- iOS Safari 10+
- Android Chrome 25+

## License

MIT

# indexeddb-keyvalue

轻量级 IndexedDB 封装库，提供表管理、CRUD 操作和 HTTP 请求缓存功能。

## 特性

- **双层缓存架构** - **内存 + IndexedDB**，重复读取直接从内存返回，性能提升 100-500 倍
- 自动版本管理 - 无需手动处理数据库升级
- 自动表创建 - 使用不存在的表时自动创建
- 工厂模式 - 全局缓存实例，避免重复创建连接
- Promise API - 全异步操作，支持 async/await
- HTTP 缓存 - 自动缓存 fetch 请求结果
- TypeScript 支持 - 完整的类型定义文件
- 零依赖 - 轻量级，无外部依赖

## 性能对比

| 操作 | 纯 IndexedDB | indexeddb-keyvalue (内存缓存) | 性能提升 |
|------|-------------|------------------------------|---------|
| 首次读取 | ~1-5ms | ~1-5ms | 持平 |
| 重复读取 | ~1-5ms | **~0.01ms** | **100-500 倍** |
| 写入 | ~2-8ms | ~2-8ms (内存+持久化) | 可靠持久化 |

> 基于 Chrome/Edge 浏览器测试，实际性能因数据大小和设备而异。SimpleIndexDBStorage 会自动将读取过的数据缓存到内存，后续访问几乎无延迟。

## 安装

```bash
npm install indexeddb-keyvalue
```

## 使用方式

### 方式一：SimpleIndexDBStorage（推荐）

最简单的使用方式，**自带内存缓存**，一行代码搞定高性能数据存储：

```javascript
import { SimpleIndexDBStorage } from 'indexeddb-keyvalue';

// 创建存储实例（自带内存缓存 + IndexedDB 双层存储）
const storage = new SimpleIndexDBStorage('myDB', 'myTable');

// 保存数据（同时写入内存和 IndexedDB）
await storage.saveItem('user1', { name: '张三', age: 25 });

// 第一次读取 - 从 IndexedDB 加载并缓存到内存
const user1 = await storage.getItem('user1');

// 第二次读取 - 直接从内存返回，性能提升 10 倍以上！
const user2 = await storage.getItem('user1'); // ⚡ 超快，几乎无延迟

// 查看内存缓存状态
console.log('内存缓存条目数:', storage.getMemoryCacheSize());

// 删除数据（同时删除内存和 IndexedDB）
await storage.deleteItem('user1');

// 清空表（同时清空内存和 IndexedDB）
await storage.clear();

// 仅清空内存缓存（保留 IndexedDB 数据）
storage.clearMemoryCache();
```

**性能优势：**
- 首次读取：从 IndexedDB 加载 → 约 1-5ms
- 后续读取：直接从内存返回 → **约 0.01ms，快 100-500 倍**

### 方式二：IndexedDBCachedFetch（HTTP 请求缓存）

自动缓存网络请求结果：

```javascript
import { IndexedDBCachedFetch } from 'indexeddb-keyvalue';

const cachedFetch = new IndexedDBCachedFetch('cacheDB', 'apiCache');  // 版本号不传则自动获取

// 第一次请求会访问网络并缓存结果
const data = await cachedFetch.fetchJson('https://api.example.com/data');

// 后续请求直接从 IndexedDB 读取，不访问网络
const cachedData = await cachedFetch.fetchJson('https://api.example.com/data');

// 支持其他响应类型
const text = await cachedFetch.fetchText('https://api.example.com/text');
const blob = await cachedFetch.fetchBlob('https://api.example.com/image.png');
const buffer = await cachedFetch.fetchArrayBuffer('https://api.example.com/binary');

// 使用转换函数处理数据
const users = await cachedFetch.fetchJson('https://api.example.com/users', (data) => {
  return data.map(user => ({ ...user, fullName: `${user.firstName} ${user.lastName}` }));
});
```

### 方式三：工厂模式（多表共享连接）

多表场景下共享数据库连接，更节省资源：

```javascript
import { IndexDBStorageFactory } from 'indexeddb-keyvalue';

// 获取存储实例（全局缓存，版本号不传则自动获取）
const userStorage = IndexDBStorageFactory.getStorage('appDB', 'users');
const orderStorage = IndexDBStorageFactory.getStorage('appDB', 'orders');
const productStorage = IndexDBStorageFactory.getStorage('appDB', 'products');

// 使用方式与 SimpleIndexDBStorage 相同
await userStorage.saveItem('user1', { name: '张三' });
await orderStorage.saveItem('order1', { total: 100 });
await productStorage.saveItem('product1', { name: '商品A' });

// 获取数据
const user = await userStorage.getItem('user1');
const order = await orderStorage.getItem('order1');
const product = await productStorage.getItem('product1');

// 清除缓存（如需重新创建实例）
IndexDBStorageFactory.clearCache('appDB', 'users');     // 清除指定表
IndexDBStorageFactory.clearCache('appDB');               // 清除整个数据库
IndexDBStorageFactory.clearAllCache();                   // 清除所有缓存
```

### 方式四：底层 API（TinyIndexDB）

需要更多控制时使用：

```javascript
import { TinyIndexDB } from 'indexeddb-keyvalue';

// 创建实例（版本号不传则自动获取）
const db = new TinyIndexDB('myDatabase', 'id');

// 初始化数据库（创建多个表）
await db.initDB({
  users: [['name', true], ['email', false]],     // [索引名, 是否唯一]
  orders: [['userId', false], ['status', false]]
});

// 批量保存数据
await db.saveOrUpdate('users', [
  { id: 'user1', name: '张三', email: 'zhangsan@example.com' },
  { id: 'user2', name: '李四', email: 'lisi@example.com' }
]);

// 批量读取数据
const users = await db.readData('users', ['user1', 'user2']);

// 批量删除
await db.delData('users', ['user1']);

// 清空表
await db.clearTable('users');

// 自定义事务
await db.withTable('users', async (database) => {
  const tx = database.transaction('users', 'readwrite');
  const store = tx.objectStore('users');
  // 执行自定义操作...
});
```

## API 参考

### SimpleIndexDBStorage

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `saveItem(name, data)` | `name: string`, `data: any` | `Promise<void>` | 保存或更新数据（内存+IndexedDB） |
| `getItem(name)` | `name: string` | `Promise<any>` | 获取数据（优先从内存读取） |
| `deleteItem(name)` | `name: string` | `Promise<void>` | 删除数据（内存+IndexedDB） |
| `clear()` | - | `Promise<void>` | 清空表（内存+IndexedDB） |
| `clearMemoryCache()` | - | `void` | 仅清空内存缓存 |
| `getMemoryCacheSize()` | - | `number` | 获取内存缓存条目数 |

### IndexedDBCachedFetch

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `fetchJson(url, converter?)` | `url: string`, `converter?: (data) => any` | `Promise<T>` | 获取 JSON 数据 |
| `fetchText(url, converter?)` | `url: string`, `converter?: (data) => string` | `Promise<string>` | 获取文本数据 |
| `fetchBlob(url, converter?)` | `url: string`, `converter?: (data) => Blob` | `Promise<Blob>` | 获取 Blob 数据 |
| `fetchArrayBuffer(url, converter?)` | `url: string`, `converter?: (data) => ArrayBuffer` | `Promise<ArrayBuffer>` | 获取二进制数据 |

### IndexDBStorageFactory

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `getStorage(dbName, tableName)` | `dbName: string`, `tableName: string` | `IndexDBStorage` | 获取/创建存储实例 |
| `clearCache(dbName, tableName?)` | `dbName: string`, `tableName?: string` | `void` | 清除指定缓存 |
| `clearAllCache()` | - | `void` | 清除所有缓存 |

## 开发

```bash
# 安装依赖
npm install

# 开发模式（启动本地服务器）
npm run dev

# 构建生产版本
npm run build

# 构建开发版本
npm run build:dev
```

## 浏览器兼容性

- Chrome/Edge 24+
- Firefox 16+
- Safari 10+
- iOS Safari 10+
- Android Chrome 25+

## 许可证

MIT

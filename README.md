# indexdb-cached-xhr

轻量级 IndexedDB 封装库，提供表管理、CRUD 操作和 HTTP 请求缓存功能。

## 特性

- 自动版本管理 - 无需手动处理数据库升级
- 自动表创建 - 使用不存在的表时自动创建
- 工厂模式 - 全局缓存实例，避免重复创建连接
- Promise API - 全异步操作，支持 async/await
- HTTP 缓存 - 自动缓存 fetch 请求结果
- TypeScript 支持 - 完整的类型定义文件
- 零依赖 - 轻量级，无外部依赖

## 安装

```bash
npm install indexdb-cached-xhr
```

## 使用方式

### 方式一：SimpleIndexDBStorage（推荐）

最简单的使用方式，一行代码搞定数据存储：

```javascript
import { SimpleIndexDBStorage } from 'indexdb-cached-xhr';

// 创建存储实例
const storage = new SimpleIndexDBStorage('myDB', 'myTable');

// 保存数据
await storage.saveItem('user1', { name: '张三', age: 25 });

// 读取数据
const user = await storage.getItem('user1');
console.log(user); // { name: '张三', age: 25 }

// 删除数据
await storage.deleteItem('user1');

// 清空表
await storage.clear();
```

### 方式二：IndexedDBCachedFetch（HTTP 请求缓存）

自动缓存网络请求结果：

```javascript
import { IndexedDBCachedFetch } from 'indexdb-cached-xhr';

const cachedFetch = new IndexedDBCachedFetch('cacheDB', 'apiCache');

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
import { IndexDBStorageFactory } from 'indexdb-cached-xhr';

// 获取存储实例（全局缓存）
const userStorage = IndexDBStorageFactory.getStorage('appDB', 'users', 1);
const orderStorage = IndexDBStorageFactory.getStorage('appDB', 'orders', 1);
const productStorage = IndexDBStorageFactory.getStorage('appDB', 'products', 1);

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
import { TinyIndexDB } from 'indexdb-cached-xhr';

// 创建实例
const db = new TinyIndexDB('myDatabase', 'id', 1);

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
| `saveItem(name, data)` | `name: string`, `data: any` | `Promise<void>` | 保存或更新数据 |
| `getItem(name)` | `name: string` | `Promise<any>` | 获取数据 |
| `deleteItem(name)` | `name: string` | `Promise<void>` | 删除数据 |
| `clear()` | - | `Promise<void>` | 清空表 |

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
| `getStorage(dbName, tableName, dbV?)` | `dbName: string`, `tableName: string`, `dbV?: number` | `IndexDBStorage` | 获取/创建存储实例 |
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

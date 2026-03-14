/**
 * IndexedDB Cached XHR - TypeScript 定义文件
 * 轻量级 IndexedDB 封装库，提供表管理、CRUD 操作和 HTTP 请求缓存功能
 */

// ============================================
// TinyIndexDB - 底层 IndexedDB 封装
// ============================================

export interface TableConfig {
  [tableName: string]: Array<[string, boolean]>;
}

export interface TableCallback<T> {
  (db: IDBDatabase): Promise<T>;
}

export declare class TinyIndexDB {
  dbName: string;
  dbV: number;
  keyPath: string;
  tablesConfig: TableConfig | null;

  constructor(dbName: string, keyPath: string, dbV: number);

  /**
   * 初始化数据库，自动创建缺失的表
   * @param tables - 表配置 { tableName: [['indexName', unique], ...] }
   */
  initDB(tables: TableConfig): Promise<IDBDatabase>;

  /**
   * 打开数据库连接（带缓存）
   */
  openDB(): Promise<IDBDatabase>;

  /**
   * 统一的 withTable 包装器 - 打开数据库执行操作
   */
  withTable<T>(tableName: string, callback: TableCallback<T>): Promise<T>;

  /**
   * 删除数据
   */
  delData(tableName: string, keys: string[]): Promise<void>;

  /**
   * 读取数据
   */
  readData(tableName: string, keys: string[]): Promise<{ data: any }[]>;

  /**
   * 保存或更新数据（不存在则新增，存在则更新）
   */
  saveOrUpdate(tableName: string, dataList: any[]): Promise<void>;

  /**
   * 新增数据
   */
  addData(tableName: string, dataList: any[]): Promise<void>;

  /**
   * 更新数据
   */
  updateData(tableName: string, dataList: any[]): Promise<void>;

  /**
   * 清空表
   */
  clearTable(tableName: string): Promise<void>;
}

// ============================================
// IndexDBStorageFactory - 工厂模式
// ============================================

export declare class IndexDBStorageFactory {
  /**
   * 获取或创建 storage 实例（全局缓存）
   * @param dbName - 数据库名
   * @param tableName - 表名
   * @param dbV - 数据库版本（可选，首次创建时使用）
   */
  static getStorage(dbName: string, tableName: string, dbV?: number): IndexDBStorage;

  /**
   * 获取或创建 TinyIndexDB 实例（全局缓存）
   * @param dbName - 数据库名
   * @param dbV - 数据库版本（可选）
   */
  static getTinyIndexDB(dbName: string, dbV?: number): TinyIndexDB;

  /**
   * 清除指定缓存
   * @param dbName - 数据库名
   * @param tableName - 表名（可选，不传则清除整个数据库缓存）
   */
  static clearCache(dbName: string, tableName?: string): void;

  /**
   * 清除所有缓存
   */
  static clearAllCache(): void;
}

// ============================================
// IndexDBStorage - 单表存储封装
// ============================================

export declare class IndexDBStorage {
  dbName: string;
  tableName: string;
  tinyIndexDB: TinyIndexDB;

  constructor(dbName: string, tableName: string, dbV?: number);

  /**
   * 初始化表（如果不存在会自动创建）
   */
  init(): Promise<void>;

  /**
   * 保存或更新条目
   */
  saveItem(name: string, data: any): Promise<void>;

  /**
   * 新增条目
   */
  addItem(name: string, data: any): Promise<void>;

  /**
   * 更新条目
   */
  updateItem(name: string, data: any): Promise<void>;

  /**
   * 删除条目
   */
  deleteItem(name: string): Promise<void>;

  /**
   * 清空表
   */
  clear(): Promise<void>;

  /**
   * 获取条目
   */
  getItem(name: string): Promise<any>;
}

// ============================================
// SimpleIndexDBStorage - 简化版单表存储
// ============================================

export declare class SimpleIndexDBStorage {
  dbName: string;
  tableName: string;
  dbVersion: number;

  constructor(dbName?: string, tableName?: string, dbVersion?: number);

  /**
   * 保存条目
   */
  saveItem(name: string, data: any): Promise<void>;

  /**
   * 获取条目
   */
  getItem(name: string): Promise<any>;

  /**
   * 删除条目
   */
  deleteItem(name: string): Promise<void>;

  /**
   * 清空表
   */
  clear(): Promise<void>;
}

// ============================================
// IndexedDBCachedFetch - 缓存 Fetch
// ============================================

export type ResponseType = 'json' | 'text' | 'arrayBuffer' | 'blob';

export type Converter<T> = (data: any) => T | Promise<T>;

export declare class IndexedDBCachedFetch {
  indexDbStorage: SimpleIndexDBStorage;

  constructor(dbName: string, tableName: string);

  /**
   * 获取 JSON 数据（带缓存）
   * @param url - 请求地址
   * @param converter - 可选的数据转换函数
   */
  fetchJson<T = any>(url: string, converter?: Converter<T>): Promise<T>;

  /**
   * 获取 ArrayBuffer 数据（带缓存）
   * @param url - 请求地址
   * @param converter - 可选的数据转换函数
   */
  fetchArrayBuffer<T = ArrayBuffer>(url: string, converter?: Converter<T>): Promise<T>;

  /**
   * 获取 Blob 数据（带缓存）
   * @param url - 请求地址
   * @param converter - 可选的数据转换函数
   */
  fetchBlob<T = Blob>(url: string, converter?: Converter<T>): Promise<T>;

  /**
   * 获取文本数据（带缓存）
   * @param url - 请求地址
   * @param converter - 可选的数据转换函数
   */
  fetchText<T = string>(url: string, converter?: Converter<T>): Promise<T>;

  /**
   * 通用的 fetch 方法（带缓存）
   * @param url - 请求地址
   * @param responseType - 响应类型
   * @param converter - 可选的数据转换函数
   */
  fetch<T = any>(url: string, responseType: ResponseType, converter?: Converter<T>): Promise<T>;
}

// ============================================
// 默认导出
// ============================================

export default SimpleIndexDBStorage;

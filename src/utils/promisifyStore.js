/**
 * 将 IndexedDB object store 方法 Promise 化
 * @param {IDBObjectStore} store - IndexedDB object store
 * @param {string} method - 方法名 (get, put, add, delete, clear 等)
 * @returns {Function} 返回一个 Promise 化的函数
 */
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
            };
        });
    };
}

export { promisifyStore };

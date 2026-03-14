import { CachedStorage } from './CachedStorage.js';

/**
 * CachedFetch - 基于 IndexedDB 的缓存 Fetch
 * 将网络请求结果缓存到 IndexedDB 中
 */
class CachedFetch {

    constructor(dbName, tableName) {
        this.cachedStorage = new CachedStorage(dbName, tableName);
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
        let cached = await this.cachedStorage.getItem(url);
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
                console.error("responseType error");
            }

            if (converter) {
                cached = await converter(cached);
            }

            await this.cachedStorage.saveItem(url, cached);
        }
        return cached;
    }
}

export { CachedFetch };

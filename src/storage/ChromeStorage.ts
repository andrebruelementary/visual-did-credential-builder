// src/storage/ChromeStorage.ts
/**
* Helper class for interacting with Chrome storage API
* Provides a Promise-based wrapper around the chrome.storage.local API
*/
export class ChromeStorage {
    /**
     * Store data in Chrome storage
     * @param key Storage key
     * @param value Value to store
     * @returns Promise that resolves when the operation is complete
     */
    public static async set(key: string, value: any): Promise<void> {
      return new Promise((resolve, reject) => {
        try {
          chrome.storage.local.set({ [key]: value }, () => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve();
            }
          });
        } catch (error) {
          reject(error);
        }
      });
    }
   
    /**
     * Retrieve data from Chrome storage
     * @param key Storage key
     * @returns Promise that resolves with the stored value or undefined if not found
     */
    public static async get(key: string): Promise<any> {
      return new Promise((resolve, reject) => {
        try {
          chrome.storage.local.get([key], (result) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(result[key]);
            }
          });
        } catch (error) {
          reject(error);
        }
      });
    }
   
    /**
     * Remove data from Chrome storage
     * @param key Storage key
     * @returns Promise that resolves when the operation is complete
     */
    public static async remove(key: string): Promise<void> {
      return new Promise((resolve, reject) => {
        try {
          chrome.storage.local.remove(key, () => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve();
            }
          });
        } catch (error) {
          reject(error);
        }
      });
    }
   
    /**
     * Clear all data from Chrome storage
     * @returns Promise that resolves when the operation is complete
     */
    public static async clear(): Promise<void> {
      return new Promise((resolve, reject) => {
        try {
          chrome.storage.local.clear(() => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve();
            }
          });
        } catch (error) {
          reject(error);
        }
      });
    }
   
    /**
     * Get all keys in Chrome storage
     * @returns Promise that resolves with array of keys
     */
    public static async getAllKeys(): Promise<string[]> {
      return new Promise((resolve, reject) => {
        try {
          chrome.storage.local.get(null, (items) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(Object.keys(items));
            }
          });
        } catch (error) {
          reject(error);
        }
      });
    }
   
    /**
     * Get all items in Chrome storage
     * @returns Promise that resolves with all stored items
     */
    public static async getAll(): Promise<{ [key: string]: any }> {
      return new Promise((resolve, reject) => {
        try {
          chrome.storage.local.get(null, (items) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(items);
            }
          });
        } catch (error) {
          reject(error);
        }
      });
    }
   
    /**
     * Listen for changes to Chrome storage
     * @param key Storage key to watch (or null for all changes)
     * @param callback Function to call when changes occur
     */
    public static addChangeListener(key: string | null, callback: (newValue: any, oldValue: any) => void): void {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'local') return;
        
        if (key === null) {
          // Listen for all changes
          Object.keys(changes).forEach(changedKey => {
            const change = changes[changedKey];
            callback(change.newValue, change.oldValue);
          });
        } else if (changes[key]) {
          // Listen for specific key
          const change = changes[key];
          callback(change.newValue, change.oldValue);
        }
      });
    }
   
    /**
     * Implements the Pluto.Store interface for Identus SDK
     * Used as a storage backend for the agent
     */
    async insert(table: string, model: any): Promise<void> {
      const tableKey = `identus_${table}`;
      const tableData = await ChromeStorage.get(tableKey) || [];
      tableData.push(model);
      await ChromeStorage.set(tableKey, tableData);
    }
   
    async query<T>(table: string, query?: any): Promise<T[]> {
      const tableKey = `identus_${table}`;
      const tableData = await ChromeStorage.get(tableKey) || [];
      
      if (!query) {
        return tableData;
      }
      
      // Filtering based on query.selector
      const filtered = tableData.filter((item: any) => {
        if (query.selector) {
          for (const [key, value] of Object.entries(query.selector)) {
            if (item[key] !== value) {
              return false;
            }
          }
        }
        return true;
      });
      
      return filtered;
    }
   
    async update<T extends { uuid: string }>(table: string, model: T): Promise<void> {
      const tableKey = `identus_${table}`;
      const tableData = await ChromeStorage.get(tableKey) || [];
      const index = tableData.findIndex((item: { uuid: string }) => item.uuid === model.uuid);
      
      if (index !== -1) {
        tableData[index] = model;
        await ChromeStorage.set(tableKey, tableData);
      }
    }
   
    async delete(table: string, uuid: string): Promise<void> {
      const tableKey = `identus_${table}`;
      const tableData = await ChromeStorage.get(tableKey) || [];
      const filteredData = tableData.filter((item: { uuid: string }) => item.uuid !== uuid);
      await ChromeStorage.set(tableKey, filteredData);
    }
   }
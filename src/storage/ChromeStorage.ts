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
        console.log(`Setting Chrome storage for key "${key}":`, value);

        chrome.storage.local.set({ [key]: value }, () => {
          if (chrome.runtime.lastError) {
            console.error(`Chrome storage set error for key "${key}":`, chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
          } else {
            console.log(`Chrome storage set successful for key "${key}"`);
            resolve();
          }
        });
      } catch (error) {
        console.error(`Error setting Chrome storage for key "${key}":`, error);
        reject(error);
      }
    });
  }

  /**
   * Helper methods for tracking DID status in Chrome storage
   */

  /**
   * Store the status of a DID publication operation
   * @param didId The DID identifier
   * @param status The current status (pending, published, failed)
   * @returns Promise that resolves when the operation is complete
   */
  public static async storeDIDStatus(didId: string, status: string): Promise<void> {
    const statusKey = `did_status_${didId}`;
    try {
      console.log(`Storing DID status for ${didId}: ${status}`);

      // Also store timestamp for reference
      const statusData = {
        status: status,
        updatedAt: new Date().toISOString()
      };

      await this.set(statusKey, statusData);
    } catch (error) {
      console.error(`Error storing DID status for ${didId}:`, error);
      throw error;
    }
  }

  /**
   * Retrieve the status of a DID publication operation
   * @param didId The DID identifier
   * @returns Promise that resolves with the status or undefined if not found
   */
  public static async getDIDStatus(didId: string): Promise<string | undefined> {
    const statusKey = `did_status_${didId}`;
    try {
      const statusData = await this.get(statusKey);

      if (statusData && typeof statusData === 'object' && 'status' in statusData) {
        return statusData.status;
      } else if (typeof statusData === 'string') {
        // Handle legacy format (string only)
        return statusData;
      }

      return undefined;
    } catch (error) {
      console.error(`Error retrieving DID status for ${didId}:`, error);
      return undefined;
    }
  }

  /**
   * Get additional information about a DID status
   * @param didId The DID identifier
   * @returns Promise that resolves with status info including timestamp
   */
  public static async getDIDStatusInfo(didId: string): Promise<{ status: string, updatedAt: string } | undefined> {
    const statusKey = `did_status_${didId}`;
    try {
      const statusData = await this.get(statusKey);

      if (statusData && typeof statusData === 'object' && 'status' in statusData) {
        return statusData as { status: string, updatedAt: string };
      } else if (typeof statusData === 'string') {
        // Handle legacy format (string only)
        return {
          status: statusData,
          updatedAt: new Date().toISOString() // Use current time as fallback
        };
      }

      return undefined;
    } catch (error) {
      console.error(`Error retrieving DID status info for ${didId}:`, error);
      return undefined;
    }
  }

  /**
   * Store operation information for a DID
   * @param didId The DID identifier
   * @param operationData Information about the operation (e.g., operationId, timestamp)
   * @returns Promise that resolves when the operation is complete
   */
  public static async storeDIDOperation(didId: string, operationData: any): Promise<void> {
    const operationKey = `did_operation_${didId}`;
    try {
      console.log(`Storing DID operation data for ${didId}:`, operationData);

      // Include timestamp for reference if not already present
      const enrichedData = {
        ...operationData,
        timestamp: operationData.timestamp || new Date().toISOString()
      };

      await this.set(operationKey, enrichedData);
    } catch (error) {
      console.error(`Error storing DID operation data for ${didId}:`, error);
      throw error;
    }
  }

  /**
   * Retrieve operation information for a DID
   * @param didId The DID identifier
   * @returns Promise that resolves with the operation data or undefined if not found
   */
  public static async getDIDOperation(didId: string): Promise<any | undefined> {
    const operationKey = `did_operation_${didId}`;
    try {
      return await this.get(operationKey);
    } catch (error) {
      console.error(`Error retrieving DID operation data for ${didId}:`, error);
      return undefined;
    }
  }

  /**
   * Clear operation information for a DID
   * @param didId The DID identifier
   * @returns Promise that resolves when the operation is complete
   */
  public static async clearDIDOperation(didId: string): Promise<void> {
    const operationKey = `did_operation_${didId}`;
    try {
      await this.remove(operationKey);
    } catch (error) {
      console.error(`Error clearing DID operation data for ${didId}:`, error);
      throw error;
    }
  }

  /**
   * Store Cloud API operation information
   * @param operationId The Cloud API operation ID
   * @param operationData Information about the operation
   * @returns Promise that resolves when the operation is complete
   */
  public static async storeCloudOperation(operationId: string, operationData: any): Promise<void> {
    const operationKey = `cloud_operation_${operationId}`;
    try {
      console.log(`Storing Cloud operation data for ${operationId}:`, operationData);

      // Include timestamp for reference if not already present
      const enrichedData = {
        ...operationData,
        timestamp: operationData.timestamp || new Date().toISOString()
      };

      await this.set(operationKey, enrichedData);
    } catch (error) {
      console.error(`Error storing Cloud operation data for ${operationId}:`, error);
      throw error;
    }
  }

  /**
   * Retrieve Cloud API operation information
   * @param operationId The Cloud API operation ID
   * @returns Promise that resolves with the operation data or undefined if not found
   */
  public static async getCloudOperation(operationId: string): Promise<any | undefined> {
    const operationKey = `cloud_operation_${operationId}`;
    try {
      return await this.get(operationKey);
    } catch (error) {
      console.error(`Error retrieving Cloud operation data for ${operationId}:`, error);
      return undefined;
    }
  }

  /**
   * Store a mapping between a DID and a Cloud API operation ID
   * @param didId The DID identifier
   * @param operationId The Cloud API operation ID
   * @param type The type of operation (e.g., 'publish', 'create')
   * @returns Promise that resolves when the operation is complete
   */
  public static async storeDIDOperationMapping(didId: string, operationId: string, type: string): Promise<void> {
    try {
      // Store the operation ID in the DID operation data
      await this.storeDIDOperation(didId, {
        operationId,
        type,
        timestamp: new Date().toISOString()
      });
      
      // Also store a reverse mapping for lookup by operation ID
      await this.set(`operation_did_${operationId}`, {
        didId,
        type,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error(`Error storing DID-operation mapping:`, error);
      throw error;
    }
  }

  /**
   * Get the DID associated with a Cloud API operation ID
   * @param operationId The Cloud API operation ID
   * @returns Promise that resolves with the DID ID or undefined if not found
   */
  public static async getDIDForOperation(operationId: string): Promise<string | undefined> {
    try {
      const mapping = await this.get(`operation_did_${operationId}`);
      return mapping?.didId;
    } catch (error) {
      console.error(`Error retrieving DID for operation ${operationId}:`, error);
      return undefined;
    }
  }

  /**
   * Track publication history for a DID
   * @param didId The DID identifier
   * @param event Publication event (e.g., "submitted", "confirmed", "failed")
   * @param details Additional details about the event
   * @returns Promise that resolves when the operation is complete
   */
  public static async addDIDPublicationEvent(didId: string, event: string, details?: any): Promise<void> {
    const historyKey = `did_publication_history_${didId}`;
    try {
      // Get existing history or create new array
      const history = await this.get(historyKey) || [];

      // Add new event
      history.push({
        event,
        timestamp: new Date().toISOString(),
        details
      });

      // Store updated history
      await this.set(historyKey, history);
    } catch (error) {
      console.error(`Error adding DID publication event for ${didId}:`, error);
      throw error;
    }
  }

  /**
   * Get publication history for a DID
   * @param didId The DID identifier
   * @returns Promise that resolves with the publication history or empty array if none
   */
  public static async getDIDPublicationHistory(didId: string): Promise<any[]> {
    const historyKey = `did_publication_history_${didId}`;
    try {
      return await this.get(historyKey) || [];
    } catch (error) {
      console.error(`Error retrieving DID publication history for ${didId}:`, error);
      return [];
    }
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
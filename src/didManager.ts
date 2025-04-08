// src/didManager.ts
//import { DID } from '@hyperledger/identus-edge-agent-sdk/build/domain';
import Domain from '@hyperledger/identus-edge-agent-sdk';
import { Agent } from './agent';
import { ChromeStorage } from './storage/ChromeStorage';



/**
* Types of DIDs for different purposes
*/
export enum DIDType {
 HOLDER = 'holder',   // For receiving credentials
 ISSUER = 'issuer',   // For issuing credentials
 VERIFIER = 'verifier' // For verifying credentials
}

/**
* Interface for stored DID information
*/
export interface DIDInfo {
 id: string;
 alias: string;
 type: DIDType;
 createdAt: string;
}

/**
* Manages creation and storage of DIDs
*/
export class DIDManager {
 private eventListeners: Map<string, Set<Function>> = new Map();
 private agent: Agent;
 private storage: ChromeStorage;
  
  /**
   * Initialize the DID Manager
   * @param agent An initialized Agent instance
   * @param storage Storage service for DIDs
   */
  constructor(agent: Agent, storage: ChromeStorage) {
    this.agent = agent;
    this.storage = storage;
  }

 /**
   * Create a new DID
   * @param type The type of DID to create (holder, issuer, verifier)
   * @returns Promise with the result of the DID creation
   */
 async createDID(type: string): Promise<{success: boolean, did?: string, error?: string}> {
    if (!this.agent.isInitialized()) {
      return {
        success: false,
        error: 'Agent not initialized. Please initialize first.'
      };
    }
    
    try {
      // Get the underlying agent instance
      const agentInstance = this.agent.getAgent();
      
      // Create a new DID with an alias based on type
      const did = await agentInstance.createNewPrismDID(`${type}-did`);
      
      // Store the DID with its type
      await this.storeDID(did.toString(), type);
      
      return {
        success: true,
        did: did.toString()
      };
    } catch (error) {
      console.error('Failed to create DID:', error);
      return {
        success: false,
        error: `Failed to create DID: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

 /**
 * Store a DID with its type
 * @param didString The DID string to store
 * @param typeString The type of the DID as string
 */
private async storeDID(didString: string, typeString: string): Promise<void> {
  // Get existing DIDs
  const dids = await this.getAllDIDs();
  
  // Convert string type to DIDType enum
  const type = typeString as DIDType;
  
  // Create DID info object
  const didInfo: DIDInfo = {
    id: didString,
    alias: `${typeString}-did-${Date.now()}`,
    type: type,
    createdAt: new Date().toISOString()
  };
  
  // Add new DID
  dids.push(didInfo);
  
  // Store updated list using static method
  await ChromeStorage.set('dids', dids);
  console.log(`✅ DID stored: ${didInfo.id}`);
  
  // Emit event for subscribers
  this.emitEvent('did-created', didInfo);
}

 /**
  * Get all stored DIDs
  * @returns Promise with array of DID info
  */
 public async getAllDIDs(): Promise<DIDInfo[]> {
   const dids = await ChromeStorage.get('dids') || [];
   return dids;
 }

 /**
  * Get DIDs by type
  * @param type DID type to filter
  * @returns Promise with array of matching DIDs
  */
 public async getDIDsByType(type: DIDType): Promise<DIDInfo[]> {
   const dids = await this.getAllDIDs();
   return dids.filter(did => did.type === type);
 }

 /**
  * Get a specific DID by ID
  * @param id DID identifier
  * @returns Promise with DID info if found
  */
 public async getDIDById(id: string): Promise<DIDInfo | undefined> {
   const dids = await this.getAllDIDs();
   return dids.find(did => did.id === id);
 }

 /**
  * Check if a DID of specific type exists
  * @param type DID type to check
  * @returns Promise with boolean result
  */
 public async hasDIDOfType(type: DIDType): Promise<boolean> {
   const dids = await this.getDIDsByType(type);
   return dids.length > 0;
 }

 /**
  * Get the first DID of a specific type
  * @param type DID type to get
  * @returns Promise with DID info if found
  */
 public async getFirstDIDOfType(type: DIDType): Promise<DIDInfo | undefined> {
   const dids = await this.getDIDsByType(type);
   return dids.length > 0 ? dids[0] : undefined;
 }

 /**
  * Delete a DID
  * @param id DID identifier to delete
  * @returns Promise with success boolean
  */
 public async deleteDID(id: string): Promise<boolean> {
   try {
     const dids = await this.getAllDIDs();
     const filteredDIDs = dids.filter(did => did.id !== id);
     
     if (dids.length === filteredDIDs.length) {
       return false; // DID not found
     }
     
     await ChromeStorage.set('dids', filteredDIDs);
     
     this.emitEvent('did-deleted', id);
     
     return true;
   } catch (error) {
     console.error(`❌ Error deleting DID:`, error);
     return false;
   }
 }

 /**
  * Format a DID object or string consistently
  * @param didObj DID object or string
  * @returns Formatted DID string
  */
 public static formatDID(didObj: any): string {
   // If it's already a string, return it
   if (typeof didObj === 'string') return didObj;
   
   // If it's an object, try to extract the DID string
   if (didObj && typeof didObj === 'object') {
     try {
       // If it's a DID object, use toString
       if (didObj instanceof Domain.Domain.DID) {
         return didObj.toString();
       }
       
       // Common DID object structures
       if (didObj.id) return didObj.id;
       if (didObj.did) return didObj.did;
       if (didObj.uri) return didObj.uri;
       
       // Try to stringify the object for debugging
       return JSON.stringify(didObj);
     } catch (e) {
       console.error('Error formatting DID object:', e);
     }
   }
   
   // Fallback
   return String(didObj);
 }

 /**
  * Register event listener
  * @param event Event name
  * @param callback Callback function
  */
 public on(event: string, callback: Function): void {
   if (!this.eventListeners.has(event)) {
     this.eventListeners.set(event, new Set());
   }
   this.eventListeners.get(event)?.add(callback);
 }

 /**
  * Remove event listener
  * @param event Event name
  * @param callback Callback function
  */
 public off(event: string, callback: Function): void {
   if (this.eventListeners.has(event)) {
     this.eventListeners.get(event)?.delete(callback);
   }
 }

 /**
  * Emit event to listeners
  * @param event Event name
  * @param data Event data
  */
 private emitEvent(event: string, data: any): void {
   if (this.eventListeners.has(event)) {
     this.eventListeners.get(event)?.forEach(callback => {
       try {
         callback(data);
       } catch (e) {
         console.error(`Error in event listener for ${event}:`, e);
       }
     });
   }
 }
}

// Export a factory function
let instance: DIDManager | null = null;

export function getDIDManager(agent?: Agent, storage?: ChromeStorage): DIDManager {
  if (!instance) {
    if (!agent || !storage) {
      throw new Error('Agent and storage must be provided for initialization');
    }
    instance = new DIDManager(agent, storage);
  }
  return instance;
}

//export { DIDType, DIDInfo };
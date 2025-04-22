import SDK from '@hyperledger/identus-sdk';
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
  console.log('Creating DID of type:', type);
  
  if (!this.agent.isInitialized()) {
    return {
      success: false,
      error: 'Agent not initialized. Please initialize first.'
    };
  }
  
  try {
    // Get a proxy to the agent functionality
    const agentProxy = this.agent.getAgent();
    
    // Use the direct method with explicit type
    const did = await agentProxy.createDIDWithType(
      type as 'holder' | 'issuer' | 'verifier', 
      `${type}-did-${Date.now()}`
    );
    
    // Convert the DID to string
    const didString = did.toString();
    
    return {
      success: true,
      did: didString
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
   * Publish a DID to the blockchain
   * @param didId The DID string to publish
   * @returns Promise with the result of the DID publication
   */
  public async publishDID(didId: string): Promise<{ success: boolean, error?: string }> {
    if (!this.agent.isInitialized()) {
      return {
        success: false,
        error: 'Agent not initialized. Please initialize first.'
      };
    }
  
    try {
      // Get the DID info from storage
      const didInfo = await this.getDIDById(didId);
      if (!didInfo) {
        return {
          success: false,
          error: 'DID not found in storage.'
        };
      }
  
      // Get the castor service which handles DID operations
      const castor = this.agent.getCastor();
      if (!castor) {
        return {
          success: false,
          error: 'Castor service not available in agent.'
        };
      }
  
      // Parse the DID string to get a DID object
      const didObj = castor.parseDID(didId);
  
      // Check if this is a PRISM DID
      if (!didId.startsWith('did:prism:')) {
        return {
          success: false,
          error: 'Only PRISM DIDs can be published to the blockchain.'
        };
      }
  
      try {
        // Try to resolve the DID first to see if it's already published
        await castor.resolveDID(didId);
        // If we get here, the DID is already published
        await this.updateDIDStatus(didId, 'published');
        return {
          success: true
        };
      } catch (e) {
        // If resolution fails, the DID isn't published yet, which is fine
        console.log('DID not yet published, proceeding with publication');
      }
  
      const published = await this.agent.publishDID(didObj);
      
      if (published) {
        // Update the DID status in storage
        await this.updateDIDStatus(didId, 'publishing');
        
        // Emit event for subscribers
        this.emitEvent('did-publishing', didId);
        
        return { success: true };
      } else {
        return {
          success: false,
          error: 'Failed to submit DID to blockchain'
        };
      }
    } catch (error) {
      console.error('Failed to publish DID:', error);
      return {
        success: false,
        error: `Failed to publish DID: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  
  /**
   * Check blockchain status of a DID
   * @param didId DID identifier
   * @returns Promise with the blockchain status
   */
  public async checkBlockchainStatus(didId: string): Promise<string> {
    try {
      if (!this.agent.isInitialized()) {
        return 'unknown';
      }
      
      // Get the Castor service
      const castor = this.agent.getCastor();
      
      // Try to resolve the DID
      try {
        await castor.resolveDID(didId);
        // If resolution succeeds, the DID is published
        await this.updateDIDStatus(didId, 'published');
        return 'published';
      } catch (error) {
        // Check local status
        const currentStatus = await this.getDIDStatus(didId);
        
        // If we've attempted to publish, mark as pending
        if (currentStatus === 'publishing') {
          return 'pending';
        }
        
        return 'unpublished';
      }
    } catch (error) {
      console.error('Error checking blockchain status:', error);
      return 'unknown';
    }
  }
  
  /**
   * Start polling for blockchain confirmation
   * @param didId DID identifier
   * @param callback Function to call with status updates
   * @returns Polling ID to stop polling
   */
  public pollBlockchainStatus(
    didId: string, 
    callback: (status: string) => void, 
    maxAttempts: number = 10
  ): number {
    let attempts = 0;
    
    // Set initial status
    this.updateDIDStatus(didId, 'publishing');
    callback('pending');
    
    const pollId = window.setInterval(async () => {
      attempts++;
      
      const status = await this.checkBlockchainStatus(didId);
      callback(status);
      
      if (status === 'published' || attempts >= maxAttempts) {
        // If published or max attempts reached, stop polling
        clearInterval(pollId);
        
        if (attempts >= maxAttempts && status !== 'published') {
          // If max attempts reached and not published, mark as failed
          await this.updateDIDStatus(didId, 'failed');
          callback('failed');
        }
      }
    }, 5000); // Poll every 5 seconds
    
    return pollId;
  }
  
/**
 * Update the status of a DID in storage
 * @param didId DID identifier
 * @param status New status value
 * @returns Promise with success boolean
 */
private async updateDIDStatus(didId: string, status: string): Promise<boolean> {
  try {
    const dids = await this.getAllDIDs();
    const didIndex = dids.findIndex(did => did.id === didId);
    
    if (didIndex === -1) {
      return false; // DID not found
    }
    
    // Store the status in a separate storage key to avoid modifying the DIDInfo interface
    const statusKey = `did_status_${didId}`;
    await ChromeStorage.set(statusKey, status);
    
    return true;
  } catch (error) {
    console.error(`❌ Error updating DID status:`, error);
    return false;
  }
}

/**
 * Get status of a DID
 * @param didId DID identifier
 * @returns Promise with the status string or undefined if not set
 */
public async getDIDStatus(didId: string): Promise<string | undefined> {
  try {
    const statusKey = `did_status_${didId}`;
    return await ChromeStorage.get(statusKey);
  } catch (error) {
    console.error(`❌ Error getting DID status:`, error);
    return undefined;
  }
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
    console.log(`Deleting DID with ID: ${id}`);
    
    // Get all DIDs first
    const dids = await this.getAllDIDs();
    console.log(`Current DIDs before deletion:`, dids);
    
    // Find the DID to delete by ID
    const didToDelete = dids.find(did => did.id === id);
    if (!didToDelete) {
      console.warn(`DID with ID ${id} not found in storage`);
      return false;
    }
    
    // Filter out the DID using both id AND alias for more precise matching
    const filteredDIDs = dids.filter(did => !(did.id === id && did.alias === didToDelete.alias));
    console.log(`Filtered DIDs after deletion:`, filteredDIDs);
    
    if (dids.length === filteredDIDs.length) {
      console.warn(`DID with ID ${id} and alias ${didToDelete.alias} not found in storage`);
      return false; // DID not found
    }
    
    // Store the updated list
    await ChromeStorage.set('dids', filteredDIDs);
    console.log(`DIDs successfully updated in storage`);
    
    // Also delete the private key for this DID
    try {
      await ChromeStorage.remove(`did_private_key_${id}`);
      await ChromeStorage.remove(`master_key_${id}`);
    } catch (error) {
      // Just log this error but don't fail the operation
      console.warn(`Error removing keys for DID ${id}:`, 
                 error instanceof Error ? error.message : String(error));
    }
    
    // Emit event for subscribers
    this.emitEvent('did-deleted', id);
    
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Error deleting DID:`, errorMessage);
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
       if (didObj instanceof SDK.Domain.DID) {
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

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
  isContact?: boolean; // Flag to indicate if this DID is saved as a contact
}

// Re-export from identusCloudService to avoid circular dependencies
export interface DIDRegistrarResponse {
  did: string;
  longFormDid?: string;
  status: 'CREATED' | 'PUBLICATION_PENDING' | 'PUBLISHED' | 'failed';
  didDocumentMetadata?: any;
  didDocument?: any;
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
   * @param alias Optional human-readable alias for the DID
   * @returns Promise with the result of the DID creation
   */
  async createDID(type: string, alias?: string): Promise<{ success: boolean, did?: string, error?: string }> {
    console.log(`Creating DID of type: ${type} with alias: ${alias}`);

    if (!this.agent.isInitialized()) {
      return {
        success: false,
        error: 'Agent not initialized. Please initialize first.'
      };
    }

    try {
      // Get cloud service using the public getter
      const cloudService = this.agent.getCloudService();
      
      // If Cloud API is available, use it
      if (cloudService) {
        console.log('Using Cloud API to create DID');
        const cloudResult = await cloudService.createDID(type as DIDType);
        
        if (cloudResult.success && cloudResult.did) {
          const didString = cloudResult.did.did;
          
          // Store the DID with the correct type and alias
          const didAlias = alias || `${type}-did-${Date.now()}`;
          
          // Store the DID type explicitly for future reference
          await ChromeStorage.set(`did_type_${didString}`, type);
          
          await this.storeDID(didString, type as DIDType, didAlias);
          
          // After creating a DID, synchronize with cloud agent to ensure UI is updated
          setTimeout(() => {
            // This will reload the DID list
            if (typeof window.loadDIDs === 'function') {
              window.loadDIDs();
            }
          }, 500);
          
          return {
            success: true,
            did: didString
          };
        } else {
          return {
            success: false,
            error: cloudResult.error || 'Unknown error creating DID'
          };
        }
      }
      
      // Fall back to local SDK implementation
      // Get a proxy to the agent functionality
      const agentProxy = this.agent.getAgent();
      
      // Generate default alias if not provided
      const didAlias = alias || `${type}-did-${Date.now()}`;
      
      // Use the direct method with explicit type
      const did = await agentProxy.createDIDWithType(
        type as 'holder' | 'issuer' | 'verifier',
        didAlias
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
   * Store a DID with its type and alias
   * @param did The DID string
   * @param type The DID type
   * @param alias The DID alias
   */
  private async storeDID(didString: string, type: DIDType | string, alias: string): Promise<void> {
    console.log(`Storing DID with explicit type: ${type}, alias: ${alias}`);
    
    // Convert string type to DIDType enum if necessary
    let didType: DIDType;
    if (typeof type === 'string') {
      switch (type.toLowerCase()) {
        case 'holder':
          didType = DIDType.HOLDER;
          break;
        case 'issuer':
          didType = DIDType.ISSUER;
          break;
        case 'verifier':
          didType = DIDType.VERIFIER;
          break;
        default:
          didType = DIDType.HOLDER; // Default to HOLDER if unknown
      }
    } else {
      didType = type;
    }
    
    // Get existing DIDs
    const dids = await this.getAllDIDs();
    
    // Create DID info object
    const didInfo: DIDInfo = {
      id: didString,
      alias: alias,
      type: didType,
      createdAt: new Date().toISOString()
    };
    
    console.log("DID info being stored:", didInfo);
    
    // Add new DID
    dids.push(didInfo);
    
    // Store updated list
    console.log("Storing DIDs:", dids);
    await ChromeStorage.set('dids', dids);
    console.log("DIDs stored successfully");
  }

  /**
   * Update the alias of a DID
   * @param didId DID identifier
   * @param newAlias New alias to assign
   * @returns Promise with success boolean
   */
  public async updateDIDAlias(didId: string, newAlias: string): Promise<boolean> {
    try {
      const dids = await this.getAllDIDs();
      const didIndex = dids.findIndex(did => did.id === didId);

      if (didIndex === -1) {
        return false; // DID not found
      }

      // Update the alias
      dids[didIndex].alias = newAlias;

      // Store updated list
      await ChromeStorage.set('dids', dids);

      // Emit event for subscribers
      this.emitEvent('did-updated', dids[didIndex]);

      return true;
    } catch (error) {
      console.error(`Error updating DID alias:`, error);
      return false;
    }
  }

  /**
   * Publish a DID to the blockchain via Cloud API
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

      // Check if this is a PRISM DID
      if (!didId.startsWith('did:prism:')) {
        return {
          success: false,
          error: 'Only PRISM DIDs can be published to the blockchain.'
        };
      }

      // Try to resolve the DID first to see if it's already published
      try {
        const status = await this.checkBlockchainStatus(didId);
        if (status === 'published') {
          // If we get here, the DID is already published
          await this.updateDIDStatus(didId, 'published');
          return {
            success: true
          };
        }
      } catch (e) {
        // If resolution fails, the DID isn't published yet, which is fine
        console.log('DID not yet published, proceeding with publication');
      }

      // Use the agent to publish the DID via Cloud API
      const published = await this.agent.publishDID(didId);

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
   * Check blockchain status of a DID using Cloud API
   * @param didId DID identifier
   * @returns Promise with the blockchain status
   */
  public async checkBlockchainStatus(didId: string): Promise<string> {
    try {
      if (!this.agent.isInitialized()) {
        return 'unknown';
      }

      // Check if there's an operation ID for this DID
      const operation = await ChromeStorage.getDIDOperation(didId);
      if (operation && operation.operationId) {
        // If we have an operation ID, check the status via Cloud API
        const status = await this.agent.checkOperationStatus(operation.operationId);
        
        // Update the DID status in storage
        await this.updateDIDStatus(didId, status);
        
        return status;
      }

      // If no operation ID found, try to resolve the DID to see if it's already published
      try {
        const castor = this.agent.getCastor();
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
   * Start polling for blockchain confirmation using Cloud API
   * @param didId DID identifier
   * @param callback Function to call with status updates
   * @param maxAttempts Maximum number of polling attempts
   * @returns Polling ID to stop polling
   */
  public pollBlockchainStatus(
    didId: string,
    callback: (status: string) => void,
    maxAttempts: number = 20
  ): number {
    let attempts = 0;

    // Set initial status
    this.updateDIDStatus(didId, 'publishing');
    callback('pending');

    // Get operation data from storage
    ChromeStorage.getDIDOperation(didId).then(operation => {
      console.log(`Retrieved operation data for DID ${didId}:`, operation);
    });

    const pollId = window.setInterval(async () => {
      attempts++;

      try {
        const status = await this.checkBlockchainStatus(didId);
        callback(status);

        if (status === 'published' || status === 'failed' || attempts >= maxAttempts) {
          // If published, failed, or max attempts reached, stop polling
          clearInterval(pollId);

          if (attempts >= maxAttempts && status !== 'published' && status !== 'failed') {
            // If max attempts reached and not published or failed, mark as failed
            await this.updateDIDStatus(didId, 'failed');
            callback('failed');
          }
        }
      } catch (error) {
        console.error('Error during status polling:', error);

        // If there's an error checking status, don't immediately fail
        // Just log it and continue, unless we've reached max attempts
        if (attempts >= maxAttempts) {
          clearInterval(pollId);
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
  public async updateDIDStatus(didId: string, status: string, details?: any): Promise<boolean> {
    try {
      // Store the status
      await ChromeStorage.storeDIDStatus(didId, status);
      
      // Log the event
      await ChromeStorage.addDIDPublicationEvent(didId, `status_${status}`, details);
      
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
    const cloudService = this.agent.getCloudService();
    
    // First try to get status from cloud agent if available
    if (cloudService) {
      try {
        const cloudStatus = await cloudService.getDIDStatus(didId);
        if (cloudStatus.status !== 'failed') {
          return cloudStatus.status;
        }
      } catch (error) {
        console.warn(`Error getting DID status from cloud agent: ${error}`);
        // Fall through to local storage check
      }
    }
    
    // Fall back to local storage
    try {
      return await ChromeStorage.getDIDStatus(didId);
    } catch (error) {
      console.error(`❌ Error getting DID status from local storage:`, error);
      return undefined;
    }
  }

  /**
   * Synchronize local DIDs with cloud agent
   * @returns Promise with success boolean
   */
  public async synchronizeWithCloud(): Promise<boolean> {
    const cloudService = this.agent.getCloudService();
    
    if (!cloudService) {
      console.log('No cloud service available for synchronization');
      return false;
    }
    
    try {
      console.log('Synchronizing DIDs with cloud agent...');
      
      // Get all DIDs from cloud agent
      const cloudResult = await cloudService.getAllDIDs();
      
      if (!cloudResult.success || !cloudResult.dids) {
        console.error('Failed to get DIDs from cloud agent');
        return false;
      }
      
      // Get local DIDs
      const localDIDs = (await ChromeStorage.get('dids') || []) as DIDInfo[];

      // Create a map of existing local DIDs for quick lookup  
      const localDIDMap = new Map<string, DIDInfo>(localDIDs.map((did) => [did.id, did]));

      // Update or add cloud DIDs to local storage with explicit type
      const updatedDIDs: DIDInfo[] = cloudResult.dids.map((cloudDID) => {
        const localDID = localDIDMap.get(cloudDID.did);
        
        return {
          id: cloudDID.did,
          alias: localDID?.alias || `cloud-${cloudDID.status?.toLowerCase()}-${cloudDID.did.split(':').pop()?.substring(0, 8) || 'unknown'}`,
          type: localDID?.type || this.determineDIDType(cloudDID),
          createdAt: localDID?.createdAt || new Date().toISOString(),
          isContact: localDID?.isContact === true
        };
      });
      
      // Update local storage
      await ChromeStorage.set('dids', updatedDIDs);
      
      console.log(`Synchronized ${updatedDIDs.length} DIDs from cloud agent`);
      
      // Emit event for subscribers
      this.emitEvent('dids-synchronized', updatedDIDs);
      
      return true;
    } catch (error) {
      console.error('Error synchronizing DIDs with cloud agent:', error);
      return false;
    }
  }

  /**
   * Get all stored DIDs, prioritizing cloud agent if available
   * @returns Promise with array of DID info
   */
  public async getAllDIDs(): Promise<DIDInfo[]> {
    const cloudService = this.agent.getCloudService();
    
    if (cloudService) {
      try {
        // Get DIDs from cloud agent
        const cloudResult = await cloudService.getAllDIDs();
        
        if (cloudResult.success && cloudResult.dids) {
          // Convert cloud DIDs to our DIDInfo format
          const cloudDIDs: DIDInfo[] = await Promise.all(
            cloudResult.dids.map(async (cloudDID) => {
              // Try to get existing local info for alias and contact status
              const localDIDs = await ChromeStorage.get('dids') || [];
              const localDID = localDIDs.find((d: DIDInfo) => d.id === cloudDID.did);
              
              return {
                id: cloudDID.did,
                alias: localDID?.alias || `cloud-${cloudDID.status?.toLowerCase()}-${cloudDID.did.split(':').pop()?.substring(0, 8) || 'unknown'}`,
                type: this.determineDIDType(cloudDID),
                createdAt: localDID?.createdAt || new Date().toISOString(),
                isContact: localDID?.isContact || false
              };
            })
          );
          
          // Update local storage to stay in sync
          await ChromeStorage.set('dids', cloudDIDs);
          
          return cloudDIDs;
        }
      } catch (error) {
        console.error('Error getting DIDs from cloud agent:', error);
      }
    }
    
    // Fall back to local storage
    const dids = await ChromeStorage.get('dids') || [];
    return dids;
  }

  /**
   * Determine DID type based on cloud DID data
   * @param cloudDID The DID data from cloud agent
   * @returns DIDType
   */
  private determineDIDType(cloudDID: any): DIDType {
    console.log('determineDIDType called with:', cloudDID);
    
    // Check if the DID document has verification methods
    if (cloudDID.didDocument?.verificationMethod) {
      const verificationMethods = cloudDID.didDocument.verificationMethod;
      console.log('DID verification methods:', verificationMethods);
      
      // Check for issuer capabilities
      const hasIssuerKey = verificationMethods.some((vm: any) => {
        console.log('Checking issuer VM:', vm);
        const isIssuer = vm.id?.includes('issue') || 
               vm.id?.includes('assertion') || 
               vm.id?.includes('Assert') ||
               (Array.isArray(vm.purpose) && vm.purpose.includes('assertionMethod'));
        console.log('Is issuer?', isIssuer);
        return isIssuer;
      });
      
      // Check for verifier capabilities
      const hasVerifierKey = verificationMethods.some((vm: any) => {
        console.log('Checking verifier VM:', vm);
        const isVerifier = vm.id?.includes('verify') || 
               (Array.isArray(vm.purpose) && vm.purpose.includes('verify'));
        console.log('Is verifier?', isVerifier);
        return isVerifier;
      });
      
      console.log('DID type check results:', { hasIssuerKey, hasVerifierKey });
      
      if (hasIssuerKey) {
        console.log('Determined DID type: ISSUER');
        return DIDType.ISSUER;
      } else if (hasVerifierKey) {
        console.log('Determined DID type: VERIFIER');
        return DIDType.VERIFIER;
      }
    } else {
      console.log('No verification methods in DID document');
    }
    
    // If we can't determine, check the curve type as a fallback
    if (cloudDID.didDocument?.verificationMethod) {
      const hasEd25519 = cloudDID.didDocument.verificationMethod.some((vm: any) => {
        console.log('Checking curve for VM:', vm);
        const curve = vm.publicKeyJwk?.crv || vm.curve;
        console.log('Curve:', curve, 'Is Ed25519?', curve === 'Ed25519');
        return curve === 'Ed25519';
      });
      
      console.log('Has Ed25519 curve?', hasEd25519);
      
      if (hasEd25519) {
        console.log('Determined DID type based on Ed25519: HOLDER');
        return DIDType.HOLDER;
      }
    }
    
    console.log('Default DID type: HOLDER');
    return DIDType.HOLDER;
  }

  /**
   * Get DIDs that can be used as contacts (marked as contacts or all DIDs from cloud agent)
   * @returns Promise with array of contact-ready DIDs
   */
  public async getDIDsForContacts(): Promise<DIDInfo[]> {
    const allDIDs = await this.getAllDIDs();
    const cloudService = this.agent.getCloudService();
    
    if (cloudService) {
      // If using cloud agent, return all DIDs as potential contacts
      // but filter out the locally created ones (they won't be in cloud agent)
      const cloudResult = await cloudService.getAllDIDs();
      
      if (cloudResult.success && cloudResult.dids) {
        const cloudDIDIds = new Set(cloudResult.dids.map(d => d.did));
        return allDIDs.filter(did => cloudDIDIds.has(did.id) || did.isContact);
      }
    }
    
    // Fall back to only DIDs marked as contacts in local storage
    return allDIDs.filter(did => did.isContact === true);
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

  /**
   * Mark or unmark a DID as a contact
   * @param didId The DID identifier
   * @param isContact Whether to mark as contact or not
   * @returns Promise with success result
   */
  public async toggleContact(didId: string, isContact: boolean): Promise<boolean> {
    try {
      const dids = await this.getAllDIDs();
      const didIndex = dids.findIndex(did => did.id === didId);

      if (didIndex === -1) {
        return false; // DID not found
      }

      // Update the contact flag
      dids[didIndex].isContact = isContact;

      // Store updated list
      await ChromeStorage.set('dids', dids);

      // Emit event for subscribers
      this.emitEvent('did-contact-toggled', { did: dids[didIndex], isContact });

      return true;
    } catch (error) {
      console.error(`Error toggling contact status for DID:`, error);
      return false;
    }
  }

  /**
   * Check if a DID is marked as a contact
   * @param didId DID identifier
   * @returns Promise with boolean result
   */
  public async isContact(didId: string): Promise<boolean> {
    try {
      const did = await this.getDIDById(didId);
      return did?.isContact === true;
    } catch (error) {
      console.error(`Error checking contact status for DID:`, error);
      return false;
    }
  }

  /**
   * Get all DIDs marked as contacts
   * @returns Promise with array of DID info objects
   */
  public async getContactDIDs(): Promise<DIDInfo[]> {
    const dids = await this.getAllDIDs();
    return dids.filter(did => did.isContact === true);
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
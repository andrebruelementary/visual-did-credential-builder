import { Contact } from '../models/contact';
import { StorageService } from './storageService';
import { DIDInfo, DIDType } from '../didManager';
import { ChromeStorage } from '../storage/ChromeStorage';

/**
 * Manager class for all contact-related operations
 */
export class ContactManager {
  private eventListeners: Map<string, Set<Function>> = new Map();

  constructor() {
    
    // Listen for cloud configuration changes to trigger synchronization
    ChromeStorage.addChangeListener('cloud_api_config', (newValue, oldValue) => {
      if (newValue && (!oldValue || JSON.stringify(newValue) !== JSON.stringify(oldValue))) {
        console.log('Cloud API configuration changed, synchronizing...');
        this.synchronizeWithCloudAgent().catch(error => {
          console.error('Failed to synchronize with cloud agent:', error);
        });
      }
    });
  }

  /**
   * Get contacts from cloud agent that can receive credentials
   */
  public async getCloudCredentialRecipients(): Promise<Contact[]> {
    const cloudService = await this.getCloudServiceFromAgent();
    if (!cloudService) {
      return [];
    }
    
    try {
      const cloudDIDsResult = await cloudService.getAllDIDs();
      if (!cloudDIDsResult.success || !cloudDIDsResult.dids) {
        return [];
      }
      
      // Get local DID contact flags
      const localDIDs = await ChromeStorage.get('dids') || [];
      
      // Filter for DIDs that are marked as contacts and have holder capability
      const recipients: Contact[] = [];
      
      for (const cloudDID of cloudDIDsResult.dids) {
        const localDID = localDIDs.find((d: any) => d.id === cloudDID.did);
        
        if (localDID && localDID.isContact) {
          // This DID is marked as a contact
          recipients.push({
            id: cloudDID.did,
            name: localDID.alias || `cloud-${cloudDID.status.toLowerCase()}-${cloudDID.did.split(':').pop()?.substring(0, 8)}`,
            did: cloudDID.did,
            didType: localDID.type,
            isLocal: true,
            createdAt: localDID.createdAt
          });
        }
      }
      
      return recipients;
    } catch (error) {
      console.error('Error getting cloud credential recipients:', error);
      return [];
    }
  }

  /**
   * Get all contacts (both DID contacts and imported)
   */
  public async getAllContacts(): Promise<Contact[]> {
    // First, try to get all contacts including those from cloud agent
    const allContacts = await StorageService.getAllContacts();
    
    // If we have a cloud service, check for DIDs that can be used as contacts
    const cloudService = await this.getCloudServiceFromAgent();
    if (cloudService) {
      try {
        const cloudDIDsResult = await cloudService.getAllDIDs();
        if (cloudDIDsResult.success && cloudDIDsResult.dids) {
          // Convert cloud DIDs to contacts for those marked as contacts in local storage
          for (const cloudDID of cloudDIDsResult.dids) {
            // Check if this DID is marked as a contact
            const localDID = allContacts.find(c => c.id === cloudDID.did && c.isLocal);
            
            if (localDID && cloudDID.did.isContact) {
              // Update the contact with status from cloud
              const updatedContact: Contact = {
                ...localDID,
                did: cloudDID.did,
                isLocal: true  // It's a local DID used as a contact
              };
              
              // Replace the local contact with the updated one
              const index = allContacts.findIndex(c => c.id === cloudDID.did);
              if (index >= 0) {
                allContacts[index] = updatedContact;
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching DIDs from cloud agent:', error);
      }
    }
    
    return allContacts;
  }

  /**
   * Get the cloud service from the agent if available
   */
  private async getCloudServiceFromAgent(): Promise<any> {
    try {
      // Get the agent from global context
      const agent = (window as any).agent;
      if (agent && agent.getCloudService) {
        return agent.getCloudService();
      }
      return null;
    } catch (error) {
      console.error('Error getting cloud service:', error);
      return null;
    }
  }

  /**
   * Synchronize contacts with cloud agent DIDs
   */
  public async synchronizeWithCloudAgent(): Promise<void> {
    const cloudService = await this.getCloudServiceFromAgent();
    if (!cloudService) {
      console.log('Cloud service not available for synchronization');
      return;
    }
    
    try {
      // Get all DIDs from cloud agent
      const cloudDIDsResult = await cloudService.getAllDIDs();
      if (!cloudDIDsResult.success || !cloudDIDsResult.dids) {
        return;
      }
      
      // Get local contact flags
      const localDIDs = await ChromeStorage.get('dids') || [];
      
      // Check each cloud DID and sync with local storage
      for (const cloudDID of cloudDIDsResult.dids) {
        const localDID = localDIDs.find((d: any) => d.id === cloudDID.did);
        
        if (localDID && localDID.isContact) {
          // This DID is already marked as a contact
          continue;
        } else if (!localDID) {
          // This is a new DID from the cloud agent
          const newDIDInfo = {
            id: cloudDID.did,
            alias: `cloud-${cloudDID.status.toLowerCase()}-${cloudDID.did.split(':').pop()?.substring(0, 8) || 'unknown'}`,
            type: 'issuer', // Default to issuer type
            createdAt: new Date().toISOString(),
            isContact: false
          };
          localDIDs.push(newDIDInfo);
        }
      }
      
      // Save updated DIDs back to storage
      await ChromeStorage.set('dids', localDIDs);
      
      // Emit synchronization complete event
      this.emitEvent('cloud-sync-complete', cloudDIDsResult.dids);
    } catch (error) {
      console.error('Error synchronizing with cloud agent:', error);
      throw error;
    }
  }

  /**
   * Get contacts that are suitable for receiving credentials (Holder DIDs)
   */
  public async getCredentialRecipients(): Promise<Contact[]> {
    // Get all contacts including locally stored and imported contacts
    const contacts = await this.getAllContacts();
    
    // Get cloud DIDs that are marked as contacts
    const cloudContacts = await this.getCloudCredentialRecipients();
    
    // Merge both lists and remove duplicates
    const allContacts = [...contacts];
    
    // Add cloud contacts that aren't already in the list
    cloudContacts.forEach(cloudContact => {
      if (!allContacts.some(c => c.id === cloudContact.id)) {
        allContacts.push(cloudContact);
      }
    });
    
    // Filter to only include holders, unless there are none
    const holders = allContacts.filter(c => c.didType === DIDType.HOLDER);
    
    // If no holders are found, return all contacts
    return holders.length > 0 ? holders : allContacts;
  }

  /**
   * Import a new external contact
   */
  public async importContact(contact: Contact): Promise<boolean> {
    try {
      // Validate DID format
      if (!this.isValidDID(contact.did)) {
        throw new Error('Invalid DID format');
      }

      // Check if DID is already in use
      const isDIDUsed = await StorageService.isDIDUsedAsContact(contact.did);
      if (isDIDUsed) {
        throw new Error('This DID is already in use by another contact');
      }

      // Ensure required fields
      const newContact: Contact = {
        id: contact.id || `imported-${Date.now()}`,
        name: contact.name,
        did: contact.did,
        didType: contact.didType || DIDType.HOLDER, // Default to holder
        isLocal: false,
        createdAt: contact.createdAt || new Date().toISOString()
      };

      // Save the contact
      await StorageService.saveImportedContact(newContact);

      // Emit event
      this.emitEvent('contact-imported', newContact);

      return true;
    } catch (error) {
      console.error('Error importing contact:', error);
      throw error;
    }
  }

  /**
   * Update an existing contact
   */
  public async updateContact(contact: Contact): Promise<boolean> {
    try {
      const result = await StorageService.updateContact(contact);

      if (result) {
        // Emit event
        this.emitEvent('contact-updated', contact);
      }

      return result;
    } catch (error) {
      console.error('Error updating contact:', error);
      return false;
    }
  }

  /**
   * Delete a contact
   */
  public async deleteContact(contactId: string, isLocal: boolean): Promise<boolean> {
    try {
      const result = await StorageService.deleteContact(contactId, isLocal);

      if (result) {
        // Emit event
        this.emitEvent('contact-deleted', { id: contactId, isLocal });
      }

      return result;
    } catch (error) {
      console.error('Error deleting contact:', error);
      return false;
    }
  }

  /**
   * Get a specific contact by ID
   */
  public async getContactById(contactId: string): Promise<Contact | null> {
    return await StorageService.getContactById(contactId);
  }

  /**
   * Mark or unmark a DID as a contact
   */
  public async toggleDIDContact(didInfo: DIDInfo, isContact: boolean): Promise<boolean> {
    try {
      const result = await StorageService.toggleDIDContact(didInfo.id, isContact);

      if (result) {
        // Emit event
        this.emitEvent('did-contact-toggled', { did: didInfo, isContact });
      }

      return result;
    } catch (error) {
      console.error('Error toggling DID contact status:', error);
      return false;
    }
  }

  /**
   * Check if a DID string is in a valid format
   */
  private isValidDID(did: string): boolean {
    // Basic validation - should start with did: prefix
    return typeof did === 'string' && did.startsWith('did:');
  }

  /**
   * Register an event listener
   */
  public on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)?.add(callback);
  }

  /**
   * Remove an event listener
   */
  public off(event: string, callback: Function): void {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event)?.delete(callback);
    }
  }

  /**
   * Emit an event to all registered listeners
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
let instance: ContactManager | null = null;

export function getContactManager(): ContactManager {
  if (!instance) {
    instance = new ContactManager();
  }
  return instance;
}
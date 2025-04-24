import { Contact } from '../models/contact';
import { StorageService } from './storageService';
import { DIDInfo, DIDType } from '../didManager';

/**
 * Manager class for all contact-related operations
 */
export class ContactManager {
  private eventListeners: Map<string, Set<Function>> = new Map();

  constructor() { }

  /**
   * Get all contacts (both DID contacts and imported)
   */
  public async getAllContacts(): Promise<Contact[]> {
    return await StorageService.getAllContacts();
  }

  /**
   * Get contacts that are suitable for receiving credentials (Holder DIDs)
   */
  public async getCredentialRecipients(): Promise<Contact[]> {
    const contacts = await this.getAllContacts();
    // Filter to only include holders, unless there are none
    const holders = contacts.filter(c => c.didType === DIDType.HOLDER);

    // If no holders are found, return all contacts
    return holders.length > 0 ? holders : contacts;
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
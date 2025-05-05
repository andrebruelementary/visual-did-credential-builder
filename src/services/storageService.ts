import { CredentialTemplate } from '../models/template';
import { Contact } from '../models/contact';
import { Credential } from '../models/credential';
import { DIDInfo, DIDType } from '../didManager';
import { ChromeStorage } from '../storage/ChromeStorage';
import { DIDRegistrarResponse } from '../services/identusCloudService';

export class StorageService {
  private static readonly TEMPLATES_KEY = 'credential_builder_demo_private_templates';
  private static readonly CONTACTS_KEY = 'credential_builder_demo_contacts';
  private static readonly CREDENTIALS_KEY = 'credential_builder_demo_credentials';
  private static readonly IMPORTED_CONTACTS_KEY = 'credential_builder_demo_imported_contacts';

  // Template storage methods
  public static async getPrivateTemplates(): Promise<CredentialTemplate[]> {
    const result = await chrome.storage.local.get(this.TEMPLATES_KEY);
    return result[this.TEMPLATES_KEY] || [];
  }

  public static async savePrivateTemplate(template: CredentialTemplate): Promise<void> {
    const templates = await this.getPrivateTemplates();
    const existingIndex = templates.findIndex(t => t.id === template.id);

    if (existingIndex >= 0) {
      templates[existingIndex] = template;
    } else {
      templates.push({ ...template, isPublic: false });
    }

    await chrome.storage.local.set({ [this.TEMPLATES_KEY]: templates });
  }

  public static async deletePrivateTemplate(templateId: string): Promise<void> {
    const templates = await this.getPrivateTemplates();
    const filteredTemplates = templates.filter(t => t.id !== templateId);
    await chrome.storage.local.set({ [this.TEMPLATES_KEY]: filteredTemplates });
  }

  // Contact management methods

  /**
   * Get all contacts from both local DIDs and imported contacts
   */
  public static async getAllContacts(): Promise<Contact[]> {
    try {
      // Get DID contacts
      const didContacts = await this.getDIDContacts();

      // Get imported contacts
      const importedContacts = await this.getImportedContacts();

      // Get cloud agent contacts (for Issue tab compatibility)
      const cloudContacts = await this.getCloudAgentContacts();

      // Combine all lists and remove duplicates (by DID)
      const allContacts = [...didContacts, ...importedContacts, ...cloudContacts];
      const uniqueContacts = allContacts.filter((contact, index, self) =>
        index === self.findIndex(c => c.did === contact.did)
      );

      // Sort by name
      return uniqueContacts.sort((a, b) => a.name.localeCompare(b.name));

    } catch (error) {
      console.error('Error getting all contacts:', error);
      return [];
    }
  }

  /**
   * Get contacts from local DIDs that are marked as contacts
   */
  public static async getDIDContacts(): Promise<Contact[]> {
    try {
      // Get all DIDs
      const dids = await ChromeStorage.get('dids') || [];

      // Filter to only those marked as contacts
      const didContacts: Contact[] = dids
        .filter((did: DIDInfo) => did.isContact === true)
        .map((did: DIDInfo) => ({
          id: did.id,
          name: did.alias || `DID-${did.id.substring(did.id.length - 8)}`,
          did: did.id,
          didType: did.type,
          isLocal: true,
          createdAt: did.createdAt
        }));

      return didContacts;
    } catch (error) {
      console.error('Error getting DID contacts:', error);
      return [];
    }
  }

  /**
   * Get imported contacts
   */
  public static async getImportedContacts(): Promise<Contact[]> {
    try {
      const result = await chrome.storage.local.get(this.IMPORTED_CONTACTS_KEY);
      return result[this.IMPORTED_CONTACTS_KEY] || [];
    } catch (error) {
      console.error('Error getting imported contacts:', error);
      return [];
    }
  }

  /**
   * Get DIDs from cloud agent that can be used as contacts
   */
  public static async getCloudAgentContacts(): Promise<Contact[]> {
    try {
      // This is called from Angular component context, so we need to get the agent
      const agent = (window as any).agent;
      if (!agent) return [];

      const cloudService = agent.getCloudService();
      if (!cloudService) return [];

      // Get all DIDs from cloud agent
      const cloudResult = await cloudService.getAllDIDs();
      
      if (!cloudResult.success || !cloudResult.dids) {
        return [];
      }

      // Convert cloud DIDs to contacts (only those not already in local storage)
      const localDIDs = await this.getAllDIDs();
      
      const cloudContacts: Contact[] = cloudResult.dids
        .filter((cloudDID : DIDRegistrarResponse) => !localDIDs.some(localDID => localDID.id === cloudDID.did))
        .map((cloudDID : DIDRegistrarResponse) => ({
          id: cloudDID.did,
          name: `Cloud-${cloudDID.status}-${cloudDID.did.split(':').pop()?.substring(0, 8) || 'unknown'}`,
          did: cloudDID.did,
          didType: DIDType.ISSUER, // Default type
          isLocal: false,
          createdAt: new Date().toISOString()
        }));

      return cloudContacts;
    } catch (error) {
      console.error('Error getting cloud agent contacts:', error);
      return [];
    }
  }

  /**
   * Save or update an imported contact
   */
  public static async saveImportedContact(contact: Contact): Promise<void> {
    try {
      const contacts = await this.getImportedContacts();

      // Check if contact already exists
      const existingIndex = contacts.findIndex(c => c.id === contact.id);

      if (existingIndex >= 0) {
        // Update existing contact
        contacts[existingIndex] = {
          ...contacts[existingIndex],
          ...contact,
          isLocal: false // Ensure it's marked as imported
        };
      } else {
        // Add new contact
        contacts.push({
          ...contact,
          id: contact.id || `imported-${Date.now()}`,
          isLocal: false,
          createdAt: contact.createdAt || new Date().toISOString()
        });
      }

      await chrome.storage.local.set({ [this.IMPORTED_CONTACTS_KEY]: contacts });
    } catch (error) {
      console.error('Error saving imported contact:', error);
      throw error;
    }
  }

  /**
   * Update an existing contact (either DID or imported)
   */
  public static async updateContact(contact: Contact): Promise<boolean> {
    try {
      // Check if this is a local DID contact
      if (contact.isLocal) {
        // Update the DID alias if needed
        const dids = await ChromeStorage.get('dids') || [];
        const didIndex = dids.findIndex((did: DIDInfo) => did.id === contact.id);

        if (didIndex >= 0) {
          // Update the alias if different
          if (dids[didIndex].alias !== contact.name) {
            dids[didIndex].alias = contact.name;
            await ChromeStorage.set('dids', dids);
          }
          return true;
        }

        return false;
      } else {
        // Update imported contact
        const contacts = await this.getImportedContacts();
        const contactIndex = contacts.findIndex(c => c.id === contact.id);

        if (contactIndex >= 0) {
          contacts[contactIndex] = {
            ...contacts[contactIndex],
            ...contact,
            isLocal: false // Ensure it's still marked as imported
          };

          await chrome.storage.local.set({ [this.IMPORTED_CONTACTS_KEY]: contacts });
          return true;
        }

        return false;
      }
    } catch (error) {
      console.error('Error updating contact:', error);
      return false;
    }
  }

  /**
   * Delete a contact (either DID contact flag or imported contact)
   */
  public static async deleteContact(contactId: string, isLocal: boolean): Promise<boolean> {
    try {
      if (isLocal) {
        // For DID contacts, just remove the contact flag
        const dids = await ChromeStorage.get('dids') || [];
        const didIndex = dids.findIndex((did: DIDInfo) => did.id === contactId);

        if (didIndex >= 0) {
          dids[didIndex].isContact = false;
          await ChromeStorage.set('dids', dids);
          return true;
        }

        return false;
      } else {
        // Delete imported contact
        const contacts = await this.getImportedContacts();
        const filteredContacts = contacts.filter(c => c.id !== contactId);

        if (filteredContacts.length !== contacts.length) {
          await chrome.storage.local.set({ [this.IMPORTED_CONTACTS_KEY]: filteredContacts });
          return true;
        }

        return false;
      }
    } catch (error) {
      console.error('Error deleting contact:', error);
      return false;
    }
  }

  /**
   * Get a specific contact by ID
   */
  public static async getContactById(contactId: string): Promise<Contact | null> {
    try {
      // First check DID contacts
      const didContacts = await this.getDIDContacts();
      const didContact = didContacts.find(c => c.id === contactId);
      if (didContact) {
        return didContact;
      }

      // Then check imported contacts
      const importedContacts = await this.getImportedContacts();
      const importedContact = importedContacts.find(c => c.id === contactId);
      if (importedContact) {
        return importedContact;
      }

      // Finally check cloud agent contacts
      const cloudContacts = await this.getCloudAgentContacts();
      const cloudContact = cloudContacts.find(c => c.id === contactId);
      if (cloudContact) {
        return cloudContact;
      }

      return null;
    } catch (error) {
      console.error('Error getting contact by ID:', error);
      return null;
    }
  }

  /**
   * Mark or unmark a DID as a contact
   */
  public static async toggleDIDContact(didId: string, isContact: boolean): Promise<boolean> {
    try {
      const dids = await ChromeStorage.get('dids') || [];
      const didIndex = dids.findIndex((did: DIDInfo) => did.id === didId);

      if (didIndex === -1) {
        return false; // DID not found
      }

      // Update the contact flag
      dids[didIndex].isContact = isContact;

      // Save the updated DIDs
      await ChromeStorage.set('dids', dids);

      return true;
    } catch (error) {
      console.error('Error toggling DID contact status:', error);
      return false;
    }
  }

  /**
   * Check if a DID is already used as a contact
   */
  public static async isDIDUsedAsContact(did: string): Promise<boolean> {
    try {
      // Check imported contacts
      const importedContacts = await this.getImportedContacts();
      if (importedContacts.some(c => c.did === did)) {
        return true;
      }

      // Check DID contacts (should always be false since DID is the ID for DID contacts)
      const didContacts = await this.getDIDContacts();
      return didContacts.some(c => c.did === did && c.id !== did);
    } catch (error) {
      console.error('Error checking if DID is used as contact:', error);
      return false;
    }
  }

  // Legacy method for backward compatibility
  public static async getContacts(): Promise<Contact[]> {
    // This will now return all contacts including DIDs marked as contacts
    const contacts = await this.getAllContacts();

    // If no contacts are available, return sample contacts for development
    if (contacts.length === 0) {
      return [
        // Sample contacts for development
        {
          id: '1',
          name: 'Alice',
          did: 'did:example:alice',
          didType: DIDType.HOLDER,
          isLocal: false,
          createdAt: new Date().toISOString()
        },
        {
          id: '2',
          name: 'Bob',
          did: 'did:example:bob',
          didType: DIDType.HOLDER,
          isLocal: false,
          createdAt: new Date().toISOString()
        },
        {
          id: '3',
          name: 'Charlie',
          did: 'did:example:charlie',
          didType: DIDType.HOLDER,
          isLocal: false,
          createdAt: new Date().toISOString()
        },
        {
          id: '4',
          name: 'University',
          did: 'did:example:university',
          didType: DIDType.ISSUER,
          isLocal: false,
          createdAt: new Date().toISOString()
        },
        {
          id: '5',
          name: 'Work',
          did: 'did:example:work',
          didType: DIDType.ISSUER,
          isLocal: false,
          createdAt: new Date().toISOString()
        },
        {
          id: '6',
          name: 'Doctor',
          did: 'did:example:doctor',
          didType: DIDType.ISSUER,
          isLocal: false,
          createdAt: new Date().toISOString()
        }
      ];
    }

    return contacts;
  }

  // Credentials storage methods
  public static async getCredentials(): Promise<Credential[]> {
    const result = await chrome.storage.local.get(this.CREDENTIALS_KEY);
    return result[this.CREDENTIALS_KEY] || [];
  }

  public static async saveCredential(credential: Credential): Promise<void> {
    const credentials = await this.getCredentials();
    const existingIndex = credentials.findIndex(c => c.id === credential.id);

    if (existingIndex >= 0) {
      credentials[existingIndex] = credential;
    } else {
      credentials.push(credential);
    }

    await chrome.storage.local.set({ [this.CREDENTIALS_KEY]: credentials });
  }

  // Add helper method for getting all DID info
  private static async getAllDIDs(): Promise<DIDInfo[]> {
    const dids = await ChromeStorage.get('dids') || [];
    return dids;
  }
}
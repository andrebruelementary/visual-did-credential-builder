import { Contact } from '../models/contact';
import { DIDInfo, DIDType } from '../didManager';
import { StorageService } from './storageService';
import { getContactManager } from './contactManager';
import { openContactDetailDialog } from '../components/contactManagement/contactDetailDialog';

/**
 * Integrated Contact Management System
 * Connects all the contact-related components and provides a unified API
 */
export class ContactSystem {
  private static instance: ContactSystem;
  private eventListeners: Map<string, Set<Function>> = new Map();

  private constructor() {
    // Initialize event listeners for contact changes
    this.initEventListeners();
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): ContactSystem {
    if (!ContactSystem.instance) {
      ContactSystem.instance = new ContactSystem();
    }
    return ContactSystem.instance;
  }

  /**
   * Initialize event listeners
   */
  private initEventListeners(): void {
    // Listen for contact changes from the contact manager
    const contactManager = getContactManager();

    contactManager.on('contact-imported', this.handleContactChanged.bind(this));
    contactManager.on('contact-updated', this.handleContactChanged.bind(this));
    contactManager.on('contact-deleted', this.handleContactDeleted.bind(this));
    contactManager.on('did-contact-toggled', this.handleDIDContactToggled.bind(this));
  }

  /**
   * Handle contact changes
   */
  private handleContactChanged(contact: Contact): void {
    // Emit event to notify listeners
    this.emitEvent('contact-changed', contact);
  }

  /**
   * Handle contact deletion
   */
  private handleContactDeleted(data: { id: string, isLocal: boolean }): void {
    // Emit event to notify listeners
    this.emitEvent('contact-deleted', data);
  }

  /**
   * Handle DID contact toggled
   */
  private handleDIDContactToggled(data: { did: DIDInfo, isContact: boolean }): void {
    // Emit event to notify listeners
    this.emitEvent('did-contact-toggled', data);
  }

  /**
   * Get all contacts
   */
  public async getAllContacts(): Promise<Contact[]> {
    return await StorageService.getAllContacts();
  }

  /**
   * Get credential recipients (contacts that can receive credentials)
   */
  public async getCredentialRecipients(): Promise<Contact[]> {
    const contacts = await this.getAllContacts();

    // Filter to only include holders, unless there are none
    const holders = contacts.filter(c => c.didType === DIDType.HOLDER);

    // If no holders are found, return all contacts
    return holders.length > 0 ? holders : contacts;
  }

  /**
   * Toggle a DID's contact status
   */
  public async toggleDIDContact(didInfo: DIDInfo, isContact: boolean): Promise<boolean> {
    try {
      return await getContactManager().toggleDIDContact(didInfo, isContact);
    } catch (error) {
      console.error('Error toggling DID contact status:', error);
      throw error;
    }
  }

  /**
   * Import a new contact
   */
  public async importContact(contact: Contact): Promise<boolean> {
    try {
      return await getContactManager().importContact(contact);
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
      return await getContactManager().updateContact(contact);
    } catch (error) {
      console.error('Error updating contact:', error);
      throw error;
    }
  }

  /**
   * Delete a contact
   */
  public async deleteContact(contactId: string, isLocal: boolean): Promise<boolean> {
    try {
      return await getContactManager().deleteContact(contactId, isLocal);
    } catch (error) {
      console.error('Error deleting contact:', error);
      throw error;
    }
  }

  /**
   * Get a contact by ID
   */
  public async getContactById(contactId: string): Promise<Contact | null> {
    try {
      return await getContactManager().getContactById(contactId);
    } catch (error) {
      console.error('Error getting contact by ID:', error);
      throw error;
    }
  }

  /**
   * Open the contact detail dialog
   */
  public openContactDetail(contact: Contact): void {
    openContactDetailDialog(
      contact,
      // On save
      (updatedContact) => {
        this.emitEvent('contact-updated', updatedContact);
      },
      // On delete
      (contactId) => {
        this.emitEvent('contact-deleted', { id: contactId, isLocal: contact.isLocal });
      }
    );
  }

  /**
   * Open the contact import dialog
   */
  public openContactImport(): void {
    const contactManagement = document.querySelector('.contact-management');
    if (contactManagement && 'openContactImportDialog' in contactManagement) {
      (contactManagement as any).openContactImportDialog();
    } else {
      // Fallback - create an import dialog component
      this.createImportDialog();
    }
  }

  /**
   * Create an import dialog programmatically
   */
  private createImportDialog(): void {
    // Get the dialog template
    const dialogTemplate = document.getElementById('contact-import-dialog-template') as HTMLTemplateElement;
    if (!dialogTemplate) {
      console.error('Contact import dialog template not found');
      return;
    }

    const dialog = dialogTemplate.content.cloneNode(true) as DocumentFragment;
    const dialogOverlay = dialog.querySelector('.dialog-overlay') as HTMLElement;

    // Get form elements
    const nameInput = dialog.querySelector('#contact-name') as HTMLInputElement;
    const didInput = dialog.querySelector('#contact-did') as HTMLInputElement;
    const typeSelect = dialog.querySelector('#contact-type') as HTMLSelectElement;

    // Get buttons
    const cancelBtn = dialog.querySelector('.cancel-btn') as HTMLButtonElement;
    const closeBtn = dialog.querySelector('.close-dialog-btn') as HTMLButtonElement;
    const saveBtn = dialog.querySelector('.save-btn') as HTMLButtonElement;

    // Close dialog function
    const closeDialog = () => {
      document.body.querySelector('.contact-import-dialog')?.remove();
    };

    // Set up cancel and close buttons
    cancelBtn.addEventListener('click', closeDialog);
    closeBtn.addEventListener('click', closeDialog);

    // Set up save button
    saveBtn.addEventListener('click', async () => {
      // Validate inputs
      const name = nameInput.value.trim();
      const did = didInput.value.trim();
      const type = typeSelect.value as DIDType;

      if (!name) {
        this.showDialogError(dialogOverlay, 'Please enter a contact name');
        nameInput.focus();
        return;
      }

      if (!did) {
        this.showDialogError(dialogOverlay, 'Please enter a DID');
        didInput.focus();
        return;
      }

      // Validate DID format (basic check)
      if (!did.startsWith('did:')) {
        this.showDialogError(dialogOverlay, 'Please enter a valid DID (should start with "did:")');
        didInput.focus();
        return;
      }

      try {
        // Create contact object
        const contact: Contact = {
          id: `imported-${Date.now()}`,
          name,
          did,
          didType: type,
          isLocal: false,
          createdAt: new Date().toISOString()
        };

        // Save the contact
        await this.importContact(contact);

        // Close the dialog
        closeDialog();

      } catch (error) {
        console.error('Error importing contact:', error);
        this.showDialogError(dialogOverlay, `Failed to import contact: ${error instanceof Error ? error.message : String(error)}`);
      }
    });

    // Append dialog to body
    document.body.appendChild(dialog);

    // Focus name input
    setTimeout(() => {
      nameInput.focus();
    }, 100);
  }

  /**
   * Show error message in dialog
   */
  private showDialogError(dialog: HTMLElement, message: string): void {
    // Check if error message already exists
    let errorEl = dialog.querySelector('.dialog-error');

    if (!errorEl) {
      // Create error element
      errorEl = document.createElement('div');
      errorEl.className = 'dialog-error error-message';

      // Insert after dialog body
      const dialogBody = dialog.querySelector('.dialog-body');
      if (dialogBody) {
        dialogBody.appendChild(errorEl);
      }
    }

    // Set error message
    errorEl.textContent = message;

    // Auto-hide after 3 seconds
    setTimeout(() => {
      errorEl.remove();
    }, 3000);
  }

  /**
   * Register event listener
   */
  public on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)?.add(callback);
  }

  /**
   * Remove event listener
   */
  public off(event: string, callback: Function): void {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event)?.delete(callback);
    }
  }

  /**
   * Emit event to listeners
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

// Export a getter function
export function getContactSystem(): ContactSystem {
  return ContactSystem.getInstance();
}
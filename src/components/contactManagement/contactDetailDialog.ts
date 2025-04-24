import { Contact } from '../../models/contact';
import { ContactManager, getContactManager } from '../../services/contactManager';
import { DIDType } from '../../didManager';

/**
 * A dialog for viewing and editing contact details
 */
export class ContactDetailDialog {
  private contact: Contact;
  private contactManager: ContactManager;
  private dialogElement: HTMLElement | null = null;
  private onSaveCallback: ((contact: Contact) => void) | null = null;
  private onDeleteCallback: ((contactId: string) => void) | null = null;

  /**
   * Creates a new contact detail dialog
   * @param contact The contact to display/edit
   */
  constructor(contact: Contact) {
    this.contact = contact;
    this.contactManager = getContactManager();
  }

  /**
   * Set a callback for when a contact is saved
   */
  public onSave(callback: (contact: Contact) => void): ContactDetailDialog {
    this.onSaveCallback = callback;
    return this;
  }

  /**
   * Set a callback for when a contact is deleted
   */
  public onDelete(callback: (contactId: string) => void): ContactDetailDialog {
    this.onDeleteCallback = callback;
    return this;
  }

  /**
   * Open the dialog
   */
  public open(): void {
    // Get the template
    const dialogTemplate = document.getElementById('contact-detail-dialog-template') as HTMLTemplateElement;
    if (!dialogTemplate) {
      console.error('Contact detail dialog template not found');
      return;
    }

    // Clone the template
    const dialogContent = dialogTemplate.content.cloneNode(true) as DocumentFragment;

    // Get the dialog overlay
    this.dialogElement = dialogContent.querySelector('.contact-detail-dialog') as HTMLElement;
    if (!this.dialogElement) {
      console.error('Contact detail dialog element not found in template');
      return;
    }

    // Populate the dialog with contact data
    this.populateDialog();

    // Set up event listeners
    this.setupEventListeners();

    // Add the dialog to the document
    document.body.appendChild(dialogContent);
  }

  /**
   * Close the dialog
   */
  private close(): void {
    if (this.dialogElement) {
      // Find the actual element in the DOM
      const dialogInDOM = document.querySelector('.contact-detail-dialog');
      if (dialogInDOM) {
        dialogInDOM.remove();
      }
      this.dialogElement = null;
    }
  }

  /**
   * Populate the dialog with contact data
   */
  private populateDialog(): void {
    if (!this.dialogElement) return;

    // Set dialog title
    const dialogTitle = this.dialogElement.querySelector('.dialog-header h2') as HTMLHeadingElement;
    if (dialogTitle) {
      dialogTitle.textContent = this.contact.isLocal ? 'Local DID Contact' : 'Contact Details';
    }

    // Set avatar
    const avatar = this.dialogElement.querySelector('.contact-detail-avatar') as HTMLElement;
    if (avatar) {
      // Set background color based on DID type
      if (this.contact.didType === 'holder') {
        avatar.style.backgroundColor = '#93c5fd';
        avatar.style.color = '#1e40af';
      } else if (this.contact.didType === 'issuer') {
        avatar.style.backgroundColor = '#86efac';
        avatar.style.color = '#166534';
      } else if (this.contact.didType === 'verifier') {
        avatar.style.backgroundColor = '#c4b5fd';
        avatar.style.color = '#5b21b6';
      }

      // Set avatar content
      avatar.textContent = this.contact.name.charAt(0).toUpperCase();
    }

    // Set name
    const nameElement = this.dialogElement.querySelector('.contact-detail-name') as HTMLElement;
    if (nameElement) {
      nameElement.textContent = this.contact.name;
    }

    // Add badges
    const badgesContainer = this.dialogElement.querySelector('.contact-detail-badges') as HTMLElement;
    if (badgesContainer) {
      // DID type badge
      const typeBadge = document.createElement('span');
      typeBadge.className = `contact-badge contact-badge-${this.contact.didType || 'holder'}`;
      typeBadge.textContent = this.contact.didType || 'Holder';
      badgesContainer.appendChild(typeBadge);

      // Source badge
      const sourceBadge = document.createElement('span');
      sourceBadge.className = `contact-badge contact-badge-${this.contact.isLocal ? 'local' : 'imported'}`;
      sourceBadge.textContent = this.contact.isLocal ? 'Local DID' : 'Imported';
      badgesContainer.appendChild(sourceBadge);
    }

    // Set DID
    const didElement = this.dialogElement.querySelector('.contact-detail-did') as HTMLElement;
    if (didElement) {
      didElement.textContent = this.contact.did;
      didElement.title = this.contact.did;
    }

    // Set created date
    const dateElement = this.dialogElement.querySelector('.contact-detail-date') as HTMLElement;
    if (dateElement) {
      // Format the date nicely
      const createdDate = new Date(this.contact.createdAt);
      dateElement.textContent = createdDate.toLocaleString();
    }

    // Set form fields
    const nameInput = this.dialogElement.querySelector('#contact-detail-name-input') as HTMLInputElement;
    if (nameInput) {
      nameInput.value = this.contact.name;
    }

    const typeSelect = this.dialogElement.querySelector('#contact-detail-type-select') as HTMLSelectElement;
    if (typeSelect) {
      typeSelect.value = this.contact.didType || 'holder';
    }

    // If this is a special non-editable contact, disable the form
    if (this.contact.isLocal && this.contact.didType !== 'holder') {
      const form = this.dialogElement.querySelector('.contact-detail-form') as HTMLElement;
      if (form) {
        form.classList.add('read-only');
      }

      // Hide the save button
      const saveButton = this.dialogElement.querySelector('.save-btn') as HTMLButtonElement;
      if (saveButton) {
        saveButton.style.display = 'none';
      }
    }
  }

  /**
   * Set up event listeners for the dialog
   */
  private setupEventListeners(): void {
    if (!this.dialogElement) return;

    // Close button
    const closeButton = this.dialogElement.querySelector('.close-dialog-btn') as HTMLButtonElement;
    if (closeButton) {
      closeButton.addEventListener('click', () => this.close());
    }

    // Cancel button
    const cancelButton = this.dialogElement.querySelector('.cancel-btn') as HTMLButtonElement;
    if (cancelButton) {
      cancelButton.addEventListener('click', () => this.close());
    }

    // Copy DID button
    const copyButton = this.dialogElement.querySelector('.contact-detail-copy-btn') as HTMLButtonElement;
    if (copyButton) {
      copyButton.addEventListener('click', () => this.copyDID());
    }

    // Save button
    const saveButton = this.dialogElement.querySelector('.save-btn') as HTMLButtonElement;
    if (saveButton) {
      saveButton.addEventListener('click', () => this.saveContact());
    }

    // Delete button
    const deleteButton = this.dialogElement.querySelector('.delete-contact-btn') as HTMLButtonElement;
    if (deleteButton) {
      deleteButton.addEventListener('click', () => this.confirmDelete());
    }
  }

  /**
   * Copy the DID to clipboard
   */
  private copyDID(): void {
    if (!this.dialogElement) return;

    // Copy the DID to clipboard
    navigator.clipboard.writeText(this.contact.did)
      .then(() => {
        // Show success message
        const didContainer = this.dialogElement?.querySelector('.contact-detail-section') as HTMLElement;

        if (didContainer) {
          // Check if success element already exists
          let successElement = didContainer.querySelector('.copy-success');

          if (!successElement) {
            successElement = document.createElement('span');
            successElement.className = 'copy-success';
            successElement.textContent = 'Copied!';
            didContainer.appendChild(successElement);
          }

          // Show the success message
          successElement.classList.add('visible');

          // Hide after 2 seconds
          setTimeout(() => {
            successElement.classList.remove('visible');
          }, 2000);
        }
      })
      .catch(err => {
        console.error('Failed to copy DID:', err);
      });
  }

  /**
   * Save the contact changes
   */
  private async saveContact(): Promise<void> {
    if (!this.dialogElement) return;

    // Get the form values
    const nameInput = this.dialogElement.querySelector('#contact-detail-name-input') as HTMLInputElement;
    const typeSelect = this.dialogElement.querySelector('#contact-detail-type-select') as HTMLSelectElement;

    const name = nameInput.value.trim();
    const didType = typeSelect.value as DIDType;

    // Validate name
    if (!name) {
      this.showError('Contact name cannot be empty');
      nameInput.focus();
      return;
    }

    try {
      // Update the contact object
      const updatedContact: Contact = {
        ...this.contact,
        name,
        didType
      };

      // Show loading state
      this.setLoadingState(true);

      // Save the contact
      const success = await this.contactManager.updateContact(updatedContact);

      if (success) {
        // Call the save callback if provided
        if (this.onSaveCallback) {
          this.onSaveCallback(updatedContact);
        }

        // Close the dialog
        this.close();
      } else {
        this.showError('Failed to update contact');
      }
    } catch (error) {
      console.error('Error saving contact:', error);
      this.showError(`Error saving contact: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      // Hide loading state
      this.setLoadingState(false);
    }
  }

  /**
   * Show a confirmation dialog for deleting the contact
   */
  private confirmDelete(): void {
    // Get the template
    const dialogTemplate = document.getElementById('delete-confirmation-dialog-template') as HTMLTemplateElement;
    if (!dialogTemplate) {
      console.error('Delete confirmation dialog template not found');
      return;
    }

    // Clone the template
    const dialogContent = dialogTemplate.content.cloneNode(true) as DocumentFragment;

    // Get the dialog overlay
    const dialogElement = dialogContent.querySelector('.delete-confirmation-dialog') as HTMLElement;
    if (!dialogElement) {
      console.error('Delete confirmation dialog element not found in template');
      return;
    }

    // Set the contact name
    const nameElement = dialogElement.querySelector('.contact-name') as HTMLElement;
    if (nameElement) {
      nameElement.textContent = this.contact.name;
    }

    // Set up event listeners
    const closeButton = dialogElement.querySelector('.close-dialog-btn') as HTMLButtonElement;
    const cancelButton = dialogElement.querySelector('.cancel-btn') as HTMLButtonElement;
    const deleteButton = dialogElement.querySelector('.delete-btn') as HTMLButtonElement;

    const closeDialog = () => {
      document.body.querySelector('.delete-confirmation-dialog')?.remove();
    };

    // Close button
    if (closeButton) {
      closeButton.addEventListener('click', closeDialog);
    }

    // Cancel button
    if (cancelButton) {
      cancelButton.addEventListener('click', closeDialog);
    }

    // Delete button
    if (deleteButton) {
      deleteButton.addEventListener('click', async () => {
        try {
          // Delete the contact
          const success = await this.contactManager.deleteContact(
            this.contact.id,
            this.contact.isLocal === true
          );

          if (success) {
            // Call the delete callback if provided
            if (this.onDeleteCallback) {
              this.onDeleteCallback(this.contact.id);
            }

            // Close the confirmation dialog
            closeDialog();

            // Close the contact detail dialog
            this.close();
          } else {
            // Show error in the confirmation dialog
            const dialogBody = dialogElement.querySelector('.dialog-body') as HTMLElement;
            if (dialogBody) {
              const errorElement = document.createElement('p');
              errorElement.className = 'error-message';
              errorElement.textContent = 'Failed to delete contact';
              dialogBody.appendChild(errorElement);
            }
          }
        } catch (error) {
          console.error('Error deleting contact:', error);
          // Show error in the confirmation dialog
          const dialogBody = dialogElement.querySelector('.dialog-body') as HTMLElement;
          if (dialogBody) {
            const errorElement = document.createElement('p');
            errorElement.className = 'error-message';
            errorElement.textContent = `Error deleting contact: ${error instanceof Error ? error.message : String(error)}`;
            dialogBody.appendChild(errorElement);
          }
        }
      });
    }

    // Add the dialog to the document
    document.body.appendChild(dialogContent);
  }

  /**
   * Show an error message in the dialog
   */
  private showError(message: string): void {
    if (!this.dialogElement) return;

    // Check if error message already exists
    let errorElement = this.dialogElement.querySelector('.dialog-error') as HTMLElement;

    if (!errorElement) {
      // Create error element
      errorElement = document.createElement('div');
      errorElement.className = 'dialog-error';

      // Insert after dialog body
      const dialogBody = this.dialogElement.querySelector('.dialog-body') as HTMLElement;
      if (dialogBody) {
        dialogBody.appendChild(errorElement);
      }
    }

    // Set error message
    errorElement.textContent = message;

    // Auto-hide after 3 seconds
    setTimeout(() => {
      errorElement.remove();
    }, 3000);
  }

  /**
   * Set the loading state of the dialog
   */
  private setLoadingState(loading: boolean): void {
    if (!this.dialogElement) return;

    if (loading) {
      this.dialogElement.classList.add('loading');

      // Disable buttons
      const saveButton = this.dialogElement.querySelector('.save-btn') as HTMLButtonElement;
      const deleteButton = this.dialogElement.querySelector('.delete-contact-btn') as HTMLButtonElement;

      if (saveButton) saveButton.disabled = true;
      if (deleteButton) deleteButton.disabled = true;
    } else {
      this.dialogElement.classList.remove('loading');

      // Enable buttons
      const saveButton = this.dialogElement.querySelector('.save-btn') as HTMLButtonElement;
      const deleteButton = this.dialogElement.querySelector('.delete-contact-btn') as HTMLButtonElement;

      if (saveButton) saveButton.disabled = false;
      if (deleteButton) deleteButton.disabled = false;
    }
  }
}

/**
 * Factory function to create and open a contact detail dialog
 */
export function openContactDetailDialog(
  contact: Contact,
  onSave?: (contact: Contact) => void,
  onDelete?: (contactId: string) => void
): void {
  new ContactDetailDialog(contact)
    .onSave(onSave || (() => { }))
    .onDelete(onDelete || (() => { }))
    .open();
}
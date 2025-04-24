import { Contact } from '../../models/contact';
import { ContactManager, getContactManager } from '../../services/contactManager';
import { DIDType } from '../../didManager';

/**
 * Component to manage contacts in the Issue tab
 */
export class ContactManagement {
  private container: HTMLElement;
  private contactsList: HTMLElement;
  private searchInput: HTMLInputElement;
  private contactManager: ContactManager;
  private selectedContactCallback: ((contact: Contact) => void) | null = null;
  private currentContacts: Contact[] = [];

  constructor(containerSelector: string) {
    const containerElement = document.querySelector(containerSelector);
    if (!containerElement) {
      throw new Error(`Container element not found: ${containerSelector}`);
    }

    this.container = containerElement as HTMLElement;
    this.contactManager = getContactManager();

    // Find or create the contacts list
    let contactsList = this.container.querySelector('.contacts-list');
    if (!contactsList) {
      contactsList = document.createElement('div');
      contactsList.className = 'contacts-list';
      this.container.appendChild(contactsList);
    }
    this.contactsList = contactsList as HTMLElement;

    // Find or create search input
    let searchContainer = this.container.querySelector('.contact-search');
    let searchInput: HTMLInputElement;

    if (!searchContainer) {
      searchContainer = document.createElement('div');
      searchContainer.className = 'contact-search';
      searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.placeholder = 'Search contacts';
      searchContainer.appendChild(searchInput);

      // Add after the header
      const header = this.container.querySelector('.contact-section-header');
      if (header && header.nextSibling) {
        this.container.insertBefore(searchContainer, header.nextSibling);
      } else {
        this.container.appendChild(searchContainer);
      }
    } else {
      searchInput = searchContainer.querySelector('input') as HTMLInputElement;
      if (!searchInput) {
        searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Search contacts';
        searchContainer.appendChild(searchInput);
      }
    }
    this.searchInput = searchInput;

    // Set up event listeners
    this.initEventListeners();

    // Initial load of contacts
    this.loadContacts();
  }

  private initEventListeners(): void {
    // Search input
    this.searchInput.addEventListener('input', () => {
      this.filterContacts(this.searchInput.value);
    });

    // Listen for contact changes from ContactManager
    this.contactManager.on('contact-imported', () => this.loadContacts());
    this.contactManager.on('contact-updated', () => this.loadContacts());
    this.contactManager.on('contact-deleted', () => this.loadContacts());
    this.contactManager.on('did-contact-toggled', () => this.loadContacts());
  }

  /**
   * Load contacts from storage
   */
  public async loadContacts(): Promise<void> {
    try {
      // Update the contact section header
      this.updateContactHeader();

      // Get contacts that can receive credentials (holders)
      const contacts = await this.contactManager.getCredentialRecipients();
      this.currentContacts = contacts;

      // Render the contacts
      this.renderContacts(contacts);
    } catch (error) {
      console.error('Error loading contacts:', error);
      this.showError('Failed to load contacts');
    }
  }

  /**
   * Update the header with import button
   */
  private updateContactHeader(): void {
    // Check if header already exists
    let header = this.container.querySelector('.contact-section-header');

    if (!header) {
      // Get the existing h2
      const existingTitle = this.container.querySelector('h2');
      if (!existingTitle) return;

      // Create the header container
      header = document.createElement('div');
      header.className = 'contact-section-header';

      // Move the existing title into the container
      const titleElement = existingTitle.cloneNode(true);
      existingTitle.parentNode?.replaceChild(header, existingTitle);
      header.appendChild(titleElement);

      // Create import button
      const importButton = document.createElement('button');
      importButton.className = 'secondary-button import-contact-btn';
      importButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="8.5" cy="7" r="4"></circle>
          <line x1="20" y1="8" x2="20" y2="14"></line>
          <line x1="23" y1="11" x2="17" y2="11"></line>
        </svg>
        Import
      `;
      importButton.addEventListener('click', () => this.openContactImportDialog());
      header.appendChild(importButton);
    }
  }

  /**
   * Render the contacts list
   */
  private renderContacts(contacts: Contact[]): void {
    this.contactsList.innerHTML = '';

    if (contacts.length === 0) {
      this.renderEmptyState();
      return;
    }

    // Create and add each contact item
    contacts.forEach(contact => {
      const contactItem = this.createContactItem(contact);
      this.contactsList.appendChild(contactItem);
    });
  }

  /**
   * Create a contact list item
   */
  private createContactItem(contact: Contact): HTMLElement {
    const contactItem = document.createElement('div');
    contactItem.className = 'contact-item';
    contactItem.setAttribute('data-contact-id', contact.id);
    contactItem.setAttribute('data-contact-source', contact.isLocal ? 'local' : 'imported');

    // Create avatar
    const avatar = document.createElement('div');
    avatar.className = 'contact-avatar';

    // Set avatar content based on contact name
    if (contact.name) {
      avatar.textContent = contact.name.charAt(0).toUpperCase();
    } else {
      avatar.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      `;
    }

    // Set avatar color based on DID type
    if (contact.didType === DIDType.HOLDER) {
      avatar.style.backgroundColor = '#93c5fd'; // Light blue for holders
      avatar.style.color = '#1e40af';
    } else if (contact.didType === DIDType.ISSUER) {
      avatar.style.backgroundColor = '#86efac'; // Light green for issuers
      avatar.style.color = '#166534';
    } else if (contact.didType === DIDType.VERIFIER) {
      avatar.style.backgroundColor = '#c4b5fd'; // Light purple for verifiers
      avatar.style.color = '#5b21b6';
    }

    // Create info container
    const infoContainer = document.createElement('div');
    infoContainer.className = 'contact-info';

    // Create name element
    const nameEl = document.createElement('div');
    nameEl.className = 'contact-name';
    nameEl.textContent = contact.name;

    // Add type label
    const typeInfo = document.createElement('small');
    typeInfo.style.display = 'block';
    typeInfo.style.color = '#666';
    typeInfo.style.fontSize = '12px';
    typeInfo.style.marginTop = '2px';

    const sourceLabel = contact.isLocal ? 'Local' : 'Imported';
    typeInfo.textContent = `${contact.didType || 'DID'} (${sourceLabel})`;
    nameEl.appendChild(typeInfo);

    // Add truncated DID
    const truncatedDid = contact.did.length > 30
      ? `${contact.did.substring(0, 15)}...${contact.did.substring(contact.did.length - 10)}`
      : contact.did;

    const didInfo = document.createElement('small');
    didInfo.style.display = 'block';
    didInfo.style.color = '#999';
    didInfo.style.fontSize = '10px';
    didInfo.style.marginTop = '2px';
    didInfo.textContent = truncatedDid;
    didInfo.title = contact.did;
    nameEl.appendChild(didInfo);

    // Build the item
    infoContainer.appendChild(nameEl);
    contactItem.appendChild(avatar);
    contactItem.appendChild(infoContainer);

    // Add selection handler
    contactItem.addEventListener('click', () => {
      this.selectContact(contact, contactItem);
    });

    return contactItem;
  }

  /**
   * Render empty state
   */
  private renderEmptyState(): void {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-contacts';

    const emptyIcon = document.createElement('div');
    emptyIcon.className = 'empty-contacts-icon';
    emptyIcon.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
      </svg>
    `;

    const emptyText = document.createElement('div');
    emptyText.className = 'empty-contacts-text';
    emptyText.innerHTML = `
      <p>No contacts available for issuing credentials.</p>
      <p>You can import a contact or save a DID as a contact in the DIDs tab.</p>
    `;

    const emptyActions = document.createElement('div');
    emptyActions.className = 'empty-contacts-actions';

    const importBtn = document.createElement('button');
    importBtn.className = 'primary-button';
    importBtn.textContent = 'Import Contact';
    importBtn.addEventListener('click', () => this.openContactImportDialog());

    emptyActions.appendChild(importBtn);

    emptyState.appendChild(emptyIcon);
    emptyState.appendChild(emptyText);
    emptyState.appendChild(emptyActions);

    this.contactsList.appendChild(emptyState);
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    const errorElement = document.createElement('p');
    errorElement.className = 'error-message';
    errorElement.textContent = message;

    this.contactsList.innerHTML = '';
    this.contactsList.appendChild(errorElement);
  }

  /**
   * Filter contacts based on search query
   */
  private filterContacts(query: string): void {
    const normalizedQuery = query.toLowerCase().trim();

    // Remove any existing empty state messages
    const existingEmptyMessage = this.contactsList.querySelector('.filter-empty-message');
    if (existingEmptyMessage) {
      existingEmptyMessage.remove();
    }

    // Handle the case where we're showing the empty state
    const emptyContacts = this.contactsList.querySelector('.empty-contacts');
    if (emptyContacts) {
      // If filtering with empty contacts state, don't do anything
      if (normalizedQuery === '') {
        (emptyContacts as HTMLElement).style.display = 'flex';
      } else {
        (emptyContacts as HTMLElement).style.display = 'none';

        // Show "no results" message
        const noResults = document.createElement('div');
        noResults.className = 'empty-state filter-empty-message';
        noResults.textContent = `No contacts matching "${query}"`;
        this.contactsList.appendChild(noResults);
      }
      return;
    }

    // If we have contacts, filter them
    const contactItems = this.contactsList.querySelectorAll('.contact-item');
    let visibleCount = 0;

    contactItems.forEach(item => {
      const name = item.querySelector('.contact-name')?.textContent || '';
      const did = item.getAttribute('data-contact-id') || '';

      if (name.toLowerCase().includes(normalizedQuery) || did.toLowerCase().includes(normalizedQuery)) {
        (item as HTMLElement).style.display = 'flex';
        visibleCount++;
      } else {
        (item as HTMLElement).style.display = 'none';
      }
    });

    // Show "no results" message if no contacts match
    if (visibleCount === 0 && normalizedQuery !== '') {
      const noResults = document.createElement('div');
      noResults.className = 'empty-state filter-empty-message';
      noResults.textContent = `No contacts matching "${query}"`;
      this.contactsList.appendChild(noResults);
    }
  }

  /**
   * Select a contact
   */
  private selectContact(contact: Contact, element: HTMLElement): void {
    // Clear previous selection
    this.contactsList.querySelectorAll('.contact-item').forEach(item => {
      item.classList.remove('selected');
    });

    // Set new selection
    element.classList.add('selected');

    // Call callback if set
    if (this.selectedContactCallback) {
      this.selectedContactCallback(contact);
    }
  }

  /**
   * Open dialog to import a new contact
   */
  public openContactImportDialog(): void {
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

        // Save the contact using ContactManager
        await this.contactManager.importContact(contact);

        // Close the dialog
        closeDialog();

        // Reload contacts
        this.loadContacts();

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
   * Show error message in the dialog
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
   * Set callback for contact selection
   */
  public onContactSelected(callback: (contact: Contact) => void): void {
    this.selectedContactCallback = callback;
  }
}

// Export factory function
let instance: ContactManagement | null = null;

export function getContactManagement(containerSelector: string): ContactManagement {
  if (!instance) {
    instance = new ContactManagement(containerSelector);
  }
  return instance;
}
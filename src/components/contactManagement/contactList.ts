// src/components/contactManagement/contactList.ts
import { Contact } from '../../models/contact';
import { getContactSystem } from '../../services/contactSystem';
import { DIDType } from '../../didManager';
import { ChromeStorage } from '../../storage/ChromeStorage';
import { DIDRegistrarResponse } from '@/services/identusCloudService';

/**
 * A component for managing and displaying contacts in the Issue tab
 */
export class ContactList {
  private container: HTMLElement;
  private listElement: HTMLElement;
  private searchInput: HTMLInputElement;
  private contactSystem = getContactSystem();
  private selectedContactCallback: ((contact: Contact) => void) | null = null;
  private contacts: Contact[] = [];

  /**
   * Create a new contact list
   * @param container The container element or selector
   */
  constructor(container: HTMLElement | string) {
    // Get container element
    if (typeof container === 'string') {
      const element = document.querySelector(container);
      if (!element) {
        throw new Error(`Container not found: ${container}`);
      }
      this.container = element as HTMLElement;
    } else {
      this.container = container;
    }

    // Create or find list element
    let listElement = this.container.querySelector('.contacts-list');
    if (!listElement) {
      listElement = document.createElement('div');
      listElement.className = 'contacts-list';
      this.container.appendChild(listElement);
    }
    this.listElement = listElement as HTMLElement;

    // Create or find search input
    let searchContainer = this.container.querySelector('.contact-search');
    let searchInput: HTMLInputElement;

    if (!searchContainer) {
      searchContainer = document.createElement('div');
      searchContainer.className = 'contact-search';
      searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.placeholder = 'Search contacts';
      searchContainer.appendChild(searchInput);

      // Add search container before list
      this.container.insertBefore(searchContainer, this.listElement);
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
    this.setupEventListeners();

    // Initialize header
    this.initializeHeader();

    // Load contacts
    this.loadContacts();
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // Search input
    this.searchInput.addEventListener('input', () => {
      this.filterContacts(this.searchInput.value);
    });

    // Contact system events
    this.contactSystem.on('contact-changed', () => this.loadContacts());
    this.contactSystem.on('contact-deleted', () => this.loadContacts());
    this.contactSystem.on('did-contact-toggled', () => this.loadContacts());
  }

  /**
   * Initialize header with import button
   */
  private initializeHeader(): void {
    // Check if header already exists
    let header = this.container.querySelector('.contact-section-header');

    if (!header) {
      // Get existing title (h2)
      const title = this.container.querySelector('h2');
      if (!title) {
        return; // Can't create header without title
      }

      // Create header
      header = document.createElement('div');
      header.className = 'contact-section-header';

      // Move title to header
      const titleClone = title.cloneNode(true);
      title.parentNode?.removeChild(title);
      header.appendChild(titleClone);

      // Add import button
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
      importButton.addEventListener('click', () => this.contactSystem.openContactImport());
      header.appendChild(importButton);

      // Add header to container (at the beginning)
      if (this.container.firstChild) {
        this.container.insertBefore(header, this.container.firstChild);
      } else {
        this.container.appendChild(header);
      }
    }
  }

  /**
   * Load contacts from the contact system
   */
  public async loadContacts(): Promise<void> {
    try {
      console.log('[ContactList] Loading contacts...');
      
      // Get regular contacts first
      const regularContacts = await this.contactSystem.getCredentialRecipients();
      console.log('[ContactList] Regular contacts loaded:', regularContacts.length);
      
      // Get cloud DIDs that might be usable as contacts
      const cloudService = (window as any).agent?.getCloudService();
      let cloudContacts: Contact[] = [];
      
      if (cloudService) {
        try {
          const cloudResult = await cloudService.getAllDIDs();
          if (cloudResult.success && cloudResult.dids) {
            console.log('[ContactList] Cloud DIDs fetched:', cloudResult.dids);
            
            // Filter and convert cloud DIDs that can be used as contacts
            // Only include PUBLISHED DIDs as they can be used in credentials
            cloudContacts = cloudResult.dids
              .filter((cloudDID : DIDRegistrarResponse) => cloudDID.status === 'PUBLISHED')
              .map((cloudDID : DIDRegistrarResponse) => ({
                id: cloudDID.did,
                name: `Cloud: ${cloudDID.did.split(':').pop()?.substring(0, 8) || 'unknown'}`,
                did: cloudDID.did,
                didType: DIDType.HOLDER, // Default to holder for compatibility
                isLocal: true, // Mark as local to distinguish from imported
                createdAt: new Date().toISOString()
              }));
            
            console.log('[ContactList] Cloud DIDs converted to contacts:', cloudContacts.length);
          }
        } catch (error) {
          console.error('[ContactList] Error fetching cloud DIDs:', error);
        }
      }
      
      // Merge and deduplicate contacts
      // Create a map to avoid duplicates
      const contactMap = new Map<string, Contact>();
      
      // Add regular contacts first
      regularContacts.forEach(contact => {
        contactMap.set(contact.did, contact);
      });
      
      // Add cloud contacts, but don't override existing ones
      cloudContacts.forEach(contact => {
        if (!contactMap.has(contact.did)) {
          contactMap.set(contact.did, contact);
        }
      });
      
      // Convert map back to array
      const allContacts = Array.from(contactMap.values());
      
      console.log('[ContactList] Total contacts after merging:', allContacts.length);
      
      this.contacts = allContacts;

      // Apply current filter if search input has a value
      if (this.searchInput.value.trim()) {
        this.filterContacts(this.searchInput.value);
      } else {
        // Otherwise render all contacts
        this.renderContacts(allContacts);
      }
    } catch (error) {
      console.error('[ContactList] Error loading contacts:', error);
      this.showError('Failed to load contacts');
    }
  }

  /**
   * Render contacts in the list
   */
  private renderContacts(contacts: Contact[]): void {
    // Clear list
    this.listElement.innerHTML = '';

    // Show empty state if no contacts
    if (contacts.length === 0) {
      this.renderEmptyState();
      return;
    }

    // Create and add each contact item
    contacts.forEach(contact => {
      const contactItem = this.createContactItem(contact);
      this.listElement.appendChild(contactItem);
    });
  }

  /**
   * Create a contact item element
   */
  private createContactItem(contact: Contact): HTMLElement {
    const item = document.createElement('div');
    item.className = 'contact-item';
    item.setAttribute('data-contact-id', contact.id);

    // Create avatar
    const avatar = document.createElement('div');
    avatar.className = 'contact-avatar';

    // Set avatar content and color based on contact type
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
    const info = document.createElement('div');
    info.className = 'contact-info';

    // Add name
    const name = document.createElement('div');
    name.className = 'contact-name';
    name.textContent = contact.name;

    // Add type with special handling for cloud contacts
    const type = document.createElement('div');
    type.className = 'contact-type';
    
    let sourceLabel = contact.isLocal ? 'Local' : 'Imported';
    
    // Check if this is actually a cloud DID by checking the name pattern
    if (contact.name?.startsWith('Cloud:')) {
      sourceLabel = 'Cloud Agent';
    }
    
    type.textContent = `${contact.didType || 'DID'} (${sourceLabel})`;

    // Add truncated DID
    const didElement = document.createElement('div');
    didElement.className = 'contact-did';
    const truncatedDid = contact.did.length > 30
      ? `${contact.did.substring(0, 15)}...${contact.did.substring(contact.did.length - 10)}`
      : contact.did;
    didElement.textContent = truncatedDid;
    didElement.title = contact.did;

    // Add elements to info
    info.appendChild(name);
    info.appendChild(type);
    info.appendChild(didElement);

    // Create actions container
    const actions = document.createElement('div');
    actions.className = 'contact-actions';

    // Don't add edit button for cloud DIDs as they can't be edited
    if (!contact.name?.startsWith('Cloud:')) {
      // Add view/edit button
      const viewButton = document.createElement('button');
      viewButton.className = 'contact-action-btn edit';
      viewButton.title = 'View details';
      viewButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
      `;
      viewButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent selection of contact
        this.contactSystem.openContactDetail(contact);
      });
      actions.appendChild(viewButton);
    }

    // Add elements to item
    item.appendChild(avatar);
    item.appendChild(info);
    item.appendChild(actions);

    // Add click handler for selection
    item.addEventListener('click', () => {
      this.selectContact(contact, item);
    });

    return item;
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
    importBtn.addEventListener('click', () => this.contactSystem.openContactImport());

    emptyActions.appendChild(importBtn);

    emptyState.appendChild(emptyIcon);
    emptyState.appendChild(emptyText);
    emptyState.appendChild(emptyActions);

    this.listElement.appendChild(emptyState);
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    this.listElement.innerHTML = '';

    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.textContent = message;

    this.listElement.appendChild(errorElement);
  }

  /**
   * Filter contacts based on search query
   */
  private filterContacts(query: string): void {
    const normalizedQuery = query.toLowerCase().trim();

    if (normalizedQuery === '') {
      // If query is empty, show all contacts
      this.renderContacts(this.contacts);
      return;
    }

    // Filter contacts by name or DID
    const filteredContacts = this.contacts.filter(contact =>
      contact.name.toLowerCase().includes(normalizedQuery) ||
      contact.did.toLowerCase().includes(normalizedQuery)
    );

    // Render filtered contacts
    this.renderContacts(filteredContacts);

    // Show "no results" message if no matches
    if (filteredContacts.length === 0 && this.contacts.length > 0) {
      const noResults = document.createElement('div');
      noResults.className = 'filter-empty-message';
      noResults.textContent = `No contacts matching "${query}"`;
      this.listElement.appendChild(noResults);
    }
  }

  /**
   * Select a contact
   */
  private selectContact(contact: Contact, element: HTMLElement): void {
    console.log(`[ContactList] Contact selected: ${contact.name}`);
    
    // Clear previous selection
    this.listElement.querySelectorAll('.contact-item').forEach(item => {
      item.classList.remove('selected');
    });

    // Mark as selected
    element.classList.add('selected');

    // Call selection callback if set
    if (this.selectedContactCallback) {
      this.selectedContactCallback(contact);
    }

    // Scroll item into view
    element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /**
   * Set callback for contact selection
   */
  public onContactSelected(callback: (contact: Contact) => void): void {
    this.selectedContactCallback = callback;
  }

  /**
   * Open contact import dialog
   */
  public openContactImportDialog(): void {
    this.contactSystem.openContactImport();
  }
}

// Export a factory function
let instance: ContactList | null = null;

export function getContactList(container: HTMLElement | string): ContactList {
  if (!instance) {
    instance = new ContactList(container);
  }
  return instance;
}
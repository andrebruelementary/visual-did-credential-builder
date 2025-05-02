import { Agent } from './agent';
import { DIDInfo, DIDManager, DIDType } from './didManager';
import { TabManager } from './components/TabManager';
import { ChromeStorage } from './storage/ChromeStorage';
import { CredentialBuilder } from './components/credentialBuilder/credentialBuilder';
import { Contact } from './models/contact';
import { StorageService } from './services/storageService';
import { DIDStatus } from './components/DIDStatus';
import { getContactSystem } from './services/contactSystem';
import { ContactManagement, getContactManagement } from './components/contactManagement/contactManagement';
import { getContactList, ContactList } from './components/contactManagement/contactList';
import { setupCredentialVerificationGlobal } from './services/credentialVerifier';


// Declare global variables and functions
declare global {
  interface Window {
    activePollId?: number;
    credentialBuilder?: any;
    loadDIDs?: Function;
    initializeApplication?: Function;
    verifyCredential: (credentialId?: string) => Promise<any>;
  }
}

/**
 * Main entry point for the extension 
 */
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Initializing Visual DID & Credential Builder application...');

  // Initialize components
  const storage = new ChromeStorage();
  const tabManager = new TabManager();
  tabManager.initialize('.tab', '.tab-content', 'data-tab', 'setup');
  const agent = new Agent();
  const didManager = new DIDManager(agent, storage);

  // UI Elements
  const initButton = document.getElementById('initButton') as HTMLButtonElement;
  const mediatorDIDInput = document.getElementById('mediatorDID') as HTMLInputElement;
  const createDIDButton = document.getElementById('createDIDButton') as HTMLButtonElement;
  const didTypeSelect = document.getElementById('didType') as HTMLSelectElement;
  const didListElement = document.getElementById('didList') as HTMLElement;
  const statusElement = document.getElementById('status') as HTMLElement;

  const publishDIDButton = document.getElementById('publishDIDButton') as HTMLButtonElement;
  const deleteDIDButton = document.getElementById('deleteDIDButton') as HTMLButtonElement;
  const didAliasInput = document.getElementById('didAlias') as HTMLInputElement;

  let selectedDID: DIDInfo | null = null;

  document.addEventListener('retry-did-publish', function(event: Event) {
    // Type cast to access the detail property
    const customEvent = event as CustomEvent;
    const didId = customEvent.detail?.didId;
    
    if (!didId) {
      console.error('No DID ID provided for retry');
      return;
    }
    
    console.log(`Retrying publication for DID: ${didId}`);
    
    // Find the DID info
    didManager.getDIDById(didId).then(didInfo => {
      if (didInfo) {
        // Update the selected DID to the one being retried
        selectedDID = didInfo;
        
        // Get the DID status component
        const didStatus = new DIDStatus('did-status-container');
        
        // Show the retrying status
        showStatus(`Retrying DID publication...`, 'loading');
        didStatus.updateStatus('pending', didId);
        
        // Attempt to publish the DID again
        didManager.publishDID(didId).then(result => {
          if (result.success) {
            showStatus(`DID publication reinitiated`, 'info');
            
            // Start polling for blockchain confirmation
            const pollId = didManager.pollBlockchainStatus(
              didId, 
              (status) => {
                // Update status display
                didStatus.updateStatus(status, didId);
                
                if (status === 'published') {
                  showStatus(`DID published successfully to blockchain`, 'success');
                  // Refresh the DID list to show updated status
                  loadDIDs();
                } else if (status === 'failed') {
                  showStatus(`DID publishing failed or timed out`, 'error');
                }
              }
            );
            
            // Store poll ID
            if (window.activePollId) {
              clearInterval(window.activePollId);
            }
            window.activePollId = pollId;
          } else {
            showStatus(`Failed to republish DID: ${result.error || 'Unknown error'}`, 'error');
            didStatus.updateStatus('failed', didId);
          }
        }).catch(error => {
          console.error('Error republishing DID:', error);
          const errorMsg = error instanceof Error ? error.message : String(error);
          showStatus(`Error republishing DID: ${errorMsg}`, 'error');
          didStatus.updateStatus('failed', didId);
        });
      } else {
        showStatus(`DID not found for retry`, 'error');
      }
    });
  });


  // Full screen specifics
  document.title = 'Visual DID & Credential Builder';

  // Initialize credential builder for the Issue tab
  let credentialBuilder: CredentialBuilder;

  if (!window.credentialBuilder) {
    credentialBuilder = new CredentialBuilder('credential-builder');
    window.credentialBuilder = credentialBuilder;
  } else {
    credentialBuilder = window.credentialBuilder;
  }

  console.log('[DEBUG] credentialBuilder initialized:', {
    instance: credentialBuilder,
    windowInstance: window.credentialBuilder,
    isSameInstance: credentialBuilder === window.credentialBuilder
  });

  // Initialize contacts for credential issuance
  const contactsList = document.getElementById('contacts-list') as HTMLElement;
  const contactSearch = document.getElementById('contact-search') as HTMLInputElement;

  /**
   * Handles window resize events to adjust layout 
   */
  const handleResize = () => {
    const container = document.querySelector('.container') as HTMLElement;
    const windowHeight = window.innerHeight;

    if (container) {
      // Adjust container height to fill window while leaving space for potential browser UI
      container.style.height = `${windowHeight}px`;

      // Adjust tab content heights
      const header = document.querySelector('.header') as HTMLElement;
      const tabs = document.querySelector('.tabs') as HTMLElement;
      const status = document.getElementById('status') as HTMLElement;

      const headerHeight = header ? header.offsetHeight : 0;
      const tabsHeight = tabs ? tabs.offsetHeight : 0;
      const statusHeight = status && status.style.display !== 'none' ? status.offsetHeight : 0;

      const availableHeight = windowHeight - headerHeight - tabsHeight - statusHeight;

      document.querySelectorAll('.tab-content').forEach((content: Element) => {
        (content as HTMLElement).style.maxHeight = `${availableHeight}px`;
      });
    }
  };

  // Add window resize listener
  window.addEventListener('resize', handleResize);

  // Initial layout adjustment
  setTimeout(handleResize, 100);

  // Set up contact search
  contactSearch?.addEventListener('input', () => {
    filterContacts(contactSearch.value);
  });

  // Load contacts when the Issue tab is selected
  tabManager.on('tab-changed', (tabId: string) => {
    if (tabId === 'issue') {
      loadContacts();
    }

    // Re-adjust layout when changing tabs
    setTimeout(handleResize, 100);
  });

  // Check if agent is already initialized
  const isInitialized = await ChromeStorage.get('agent_initialized');
  const mediatorDID = await ChromeStorage.get('mediator_did');

  if (isInitialized && mediatorDID) {
    mediatorDIDInput.value = mediatorDID;
    try {
      await agent.initialize();
      showStatus('Agent already initialized', 'info');
      createDIDButton.disabled = false;
      loadDIDs();
    } catch (error) {
      console.error('Failed to initialize agent from stored state:', error);
      showStatus('Failed to initialize agent from stored state. Please reinitialize.', 'error');
    }
  }

  // Initialize agent when the Init button is clicked
  initButton?.addEventListener('click', async () => {
    const mediatorDID = mediatorDIDInput.value.trim();
    if (!mediatorDID) {
      showStatus('Please enter a Mediator DID', 'error');
      return;
    }

    showStatus('Initializing...', 'loading');
    try {
      const initialized = await agent.initialize();
      if (initialized) {
        showStatus('Agent initialized successfully', 'success');
        // Store for future use
        await ChromeStorage.set('mediator_did', mediatorDID);
        await ChromeStorage.set('agent_initialized', true);
        // Enable DID creation
        createDIDButton.disabled = false;
        // Load existing DIDs
        loadDIDs();
      } else {
        showStatus('Failed to initialize agent', 'error');
      }
    } catch (error) {
      console.error('Error initializing agent:', error);
      showStatus(`Initialization error: ${(error as Error).message}`, 'error');
    }
  });

  // Create DID when the Create DID button is clicked
  createDIDButton?.addEventListener('click', async () => {
    const didType = didTypeSelect.value;
    const didAlias = didAliasInput.value.trim() || `${didType}-did-${Date.now()}`;

    console.log(`User selected DID type: ${didType} with alias: ${didAlias}`);
    showStatus(`Creating ${didType} DID...`, 'loading');
    try {
      const result = await didManager.createDID(didType, didAlias);
      if (result.success) {
        showStatus(`${didType} DID created successfully`, 'success');
        // Clear the alias input for next creation
        didAliasInput.value = '';
        loadDIDs();

        // Enable appropriate functionality based on DID type
        if (didType === 'issuer') {
          // Enable issuer functionality
          tabManager.enableTab('issue');
        } else if (didType === 'verifier') {
          // Enable verifier functionality
          tabManager.enableTab('verify');
        }
      } else {
        showStatus(`Failed to create DID: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Error creating DID:', error);
      showStatus(`Error creating DID: ${(error as Error).message}`, 'error');
    }
  });

  

  function openEditAliasDialog(didInfo: DIDInfo): void {
    // Create dialog overlay
    const dialogOverlay = document.createElement('div');
    dialogOverlay.className = 'edit-alias-dialog';

    // Create dialog content
    const dialogContent = document.createElement('div');
    dialogContent.className = 'edit-alias-dialog-content';

    // Create title
    const title = document.createElement('h3');
    title.textContent = 'Edit DID Alias';

    // Create form
    const formGroup = document.createElement('div');
    formGroup.className = 'form-group';

    const label = document.createElement('label');
    label.setAttribute('for', 'edit-alias-input');
    label.textContent = 'Alias:';

    const input = document.createElement('input');
    input.id = 'edit-alias-input';
    input.className = 'input-field';
    input.type = 'text';
    input.value = didInfo.alias || '';
    input.placeholder = 'Enter a human-readable name for this DID';

    formGroup.appendChild(label);
    formGroup.appendChild(input);

    // Create actions
    const actions = document.createElement('div');
    actions.className = 'edit-alias-dialog-actions';

    const cancelButton = document.createElement('button');
    cancelButton.className = 'secondary-button';
    cancelButton.textContent = 'Cancel';

    const saveButton = document.createElement('button');
    saveButton.className = 'primary-button';
    saveButton.textContent = 'Save';

    actions.appendChild(cancelButton);
    actions.appendChild(saveButton);

    // Assemble dialog
    dialogContent.appendChild(title);
    dialogContent.appendChild(formGroup);
    dialogContent.appendChild(actions);
    dialogOverlay.appendChild(dialogContent);

    // Add event listeners
    cancelButton.addEventListener('click', () => {
      dialogOverlay.remove();
    });

    saveButton.addEventListener('click', async () => {
      const newAlias = input.value.trim();
      if (!newAlias) {
        showStatus('Alias cannot be empty', 'error');
        return;
      }

      try {
        await updateDIDAlias(didInfo.id, newAlias);
        dialogOverlay.remove();
        showStatus('DID alias updated successfully', 'success');
        loadDIDs(); // Reload DIDs to show the updated alias
      } catch (error) {
        console.error('Error updating DID alias:', error);
        showStatus(`Failed to update alias: ${(error as Error).message}`, 'error');
      }
    });

    // Add dialog to document
    document.body.appendChild(dialogOverlay);

    // Focus input
    input.focus();
  }

  async function updateDIDAlias(didId: string, newAlias: string): Promise<void> {
    try {
      // Get all DIDs
      const dids = await didManager.getAllDIDs();

      // Find the DID to update
      const didIndex = dids.findIndex(did => did.id === didId);
      if (didIndex === -1) {
        throw new Error('DID not found');
      }

      // Update the alias
      dids[didIndex].alias = newAlias;

      // Save back to storage
      await ChromeStorage.set('dids', dids);

      console.log(`Updated alias for DID ${didId} to "${newAlias}"`);
    } catch (error) {
      console.error('Error updating DID alias:', error);
      throw error;
    }
  }

  // Function to handle DID selection
  function selectDID(didInfo: DIDInfo, element: HTMLElement) {
    // Clean up any active polling
    cleanupActivePolling();
    
    console.log(`Selecting DID:`, didInfo);
  
    // Clear previous selection
    document.querySelectorAll('.did-item').forEach(item => {
      item.classList.remove('selected');
    });
  
    // Mark this DID as selected
    element.classList.add('selected');
    selectedDID = didInfo;
  
    // Get current DID status to update button state
    didManager.getDIDStatus(didInfo.id).then(status => {
      // Enable or disable publish button based on current status
      publishDIDButton.disabled = false;
      
      if (status === 'publishing' || status === 'pending') {
        publishDIDButton.disabled = true;
        // Restart polling for this DID if it's in a transient state
        const didStatus = new DIDStatus('did-status-container');
        didStatus.updateStatus(status, didInfo.id);
        
        window.activePollId = didManager.pollBlockchainStatus(
          didInfo.id,
          (newStatus) => {
            didStatus.updateStatus(newStatus, didInfo.id);
            
            if (newStatus !== 'pending') {
              publishDIDButton.disabled = false;
            }
          }
        );
      } else if (status === 'published') {
        // If already published, disable the button
        publishDIDButton.disabled = true;
        publishDIDButton.title = 'This DID is already published';
        
        // Show published status
        const didStatus = new DIDStatus('did-status-container');
        didStatus.updateStatus('published', didInfo.id);
      }
    });
  
    // Visual feedback for selection in full-screen mode
    element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  
    console.log(`Selected DID set to:`, selectedDID);
    // Update button state based on whether selectedDID is null
    if (selectedDID) {
      publishDIDButton.disabled = false;
      deleteDIDButton.disabled = false;
    } else {
      publishDIDButton.disabled = true;
      deleteDIDButton.disabled = true;
    }

  }

  // Load DIDs from storage and display them
  async function loadDIDs() {
    try {
      console.log("Loading DIDs...");
      const dids = await didManager.getAllDIDs();
      console.log("DIDs loaded:", dids);

      // Clear the list
      if (!didListElement) {
        console.error("didListElement not found");
        return;
      }
      didListElement.innerHTML = '';

      if (dids.length === 0) {
        console.log("No DIDs found");
        didListElement.innerHTML = '<div class="empty-state">No DIDs created yet</div>';
        return;
      }

      // Add each DID to the list
      dids.forEach(didInfo => {
        const didItem = document.createElement('div');
        didItem.className = 'did-item';
        didItem.setAttribute('data-did-id', didInfo.id);
        if (didInfo.isContact) {
          didItem.classList.add('is-contact');
        }

        const headerRow = document.createElement('div');
        headerRow.className = 'did-header';

        // Create container for alias and edit icon
        const aliasContainer = document.createElement('div');
        aliasContainer.className = 'did-alias-container';

        // Create alias display
        const aliasElement = document.createElement('span');
        aliasElement.className = 'did-alias';
        // Use alias if available, otherwise use a shortened version of the DID
        aliasElement.textContent = didInfo.alias || `${didInfo.type}-${didInfo.id.substring(didInfo.id.length - 8)}`;
        aliasContainer.appendChild(aliasElement);

        // Add pencil icon for editing (placed right after the alias)
        const editIcon = document.createElement('span');
        editIcon.className = 'edit-alias-icon';
        editIcon.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        `;
        editIcon.title = "Edit Alias";

        // Add click event for editing (stop propagation to prevent DID selection)
        editIcon.addEventListener('click', (e) => {
          e.stopPropagation();
          openEditAliasDialog(didInfo);
        });

        aliasContainer.appendChild(editIcon);
        headerRow.appendChild(aliasContainer);

        // Create type display (in parentheses)
        const typeElement = document.createElement('span');
        typeElement.className = 'did-type';
        typeElement.textContent = `(${didInfo.type})`;
        headerRow.appendChild(typeElement);

        const didElement = document.createElement('div');
        didElement.className = 'did-value';
        didElement.textContent = didInfo.id;

        const dateElement = document.createElement('div');
        dateElement.className = 'did-date';
        dateElement.textContent = new Date(didInfo.createdAt).toLocaleString();

        // Create actions row for the contact toggle
        const actionsRow = document.createElement('div');
        actionsRow.className = 'did-actions-row';

        // Add contact badge if this DID is already a contact
        if (didInfo.isContact) {
          const contactBadge = document.createElement('span');
          contactBadge.className = 'contact-badge';
          contactBadge.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="8.5" cy="7" r="4"></circle>
            </svg>
            Contact
          `;
          actionsRow.appendChild(contactBadge);
        }

        // Add spacer
        const spacer = document.createElement('span');
        spacer.className = 'spacer';
        actionsRow.appendChild(spacer);

        // First add the core elements to the DID item
        didItem.appendChild(headerRow);
        didItem.appendChild(didElement);
        didItem.appendChild(dateElement);
        didItem.appendChild(actionsRow);

        // Fetch and add status indicator if available
        (async () => {
          const status = await didManager.getDIDStatus(didInfo.id);
          if (status) {
            const statusElement = document.createElement('div');
            statusElement.className = `did-status did-status-${status.toLowerCase()}`;
            
            // Add status icon based on state
            const statusIcon = document.createElement('span');
            statusIcon.className = 'status-icon';
            
            // Add appropriate icon based on status
            if (status === 'publishing' || status === 'pending') {
              statusIcon.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              `;
            } else if (status === 'published') {
              statusIcon.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              `;
            } else if (status === 'failed') {
              statusIcon.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="15" y1="9" x2="9" y2="15"></line>
                  <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
              `;
            }
            
            statusElement.appendChild(statusIcon);
            
            // Add status text
            const statusText = document.createElement('span');
            statusText.className = 'status-text';
            statusText.textContent = status.charAt(0).toUpperCase() + status.slice(1); // Capitalize first letter
            statusElement.appendChild(statusText);
            
            didItem.appendChild(statusElement);
            
            // If DID is in a transient state (publishing/pending), start polling
            if ((status === 'publishing' || status === 'pending') && selectedDID?.id === didInfo.id) {
              const didStatus = new DIDStatus('did-status-container');
              didStatus.updateStatus(status, didInfo.id);
              
              window.activePollId = didManager.pollBlockchainStatus(
                didInfo.id,
                (newStatus) => {
                  didStatus.updateStatus(newStatus, didInfo.id);
                  
                  // Refresh list when status changes
                  if (newStatus !== status) {
                    loadDIDs();
                  }
                }
              );
            }
          }
        })();

        // Add click for selection
        didItem.addEventListener('click', () => {
          selectDID(didInfo, didItem);
        });

        // Separate click handler for copy functionality with modifier key
        didItem.addEventListener('click', (e) => {
          // Only copy if holding Ctrl/Cmd key
          if (e.ctrlKey || e.metaKey) {
            navigator.clipboard.writeText(didInfo.id)
              .then(() => {
                showStatus('DID copied to clipboard', 'success');

                // Add visual feedback
                const message = document.createElement('div');
                message.textContent = 'Copied!';
                message.style.position = 'absolute';
                message.style.right = '8px';
                message.style.top = '8px';
                message.style.backgroundColor = 'var(--success-color)';
                message.style.color = 'white';
                message.style.padding = '2px 6px';
                message.style.borderRadius = '4px';
                message.style.fontSize = '10px';

                didItem.style.position = 'relative';
                didItem.appendChild(message);

                // Remove after 2 seconds
                setTimeout(() => {
                  message.remove();
                }, 2000);
              })
              .catch(error => {
                console.error('Failed to copy DID:', error);
                showStatus('Failed to copy DID to clipboard', 'error');
              });
          }
        });

        didListElement.appendChild(didItem);
      });

      // Update UI based on available DIDs
      updateUIBasedOnDIDs(dids);

      // Reset selected DID if it's no longer in the list
      if (selectedDID && !dids.find(d => d.id === selectedDID?.id)) {
        selectedDID = null;
        publishDIDButton.disabled = true;
        deleteDIDButton.disabled = true;
      }
    } catch (error) {
      console.error('Error loading DIDs:', error);
      showStatus('Failed to load DIDs', 'error');
    }
    enhanceDIDItemsWithContactToggle();

  }

  // Update UI elements based on available DIDs
  function updateUIBasedOnDIDs(dids: DIDInfo[]) {
    const hasIssuerDID = dids.some(did => did.type === 'issuer');
    const hasVerifierDID = dids.some(did => did.type === 'verifier');

    // Enable or disable tabs based on available DIDs
    if (hasIssuerDID) {
      tabManager.enableTab('issue');
    } else {
      tabManager.disableTab('issue');
    }

    if (hasVerifierDID) {
      tabManager.enableTab('verify');
    } else {
      tabManager.disableTab('verify');
    }

    console.log('DID availability:', { hasIssuerDID, hasVerifierDID });
  }

  // Function to load contacts from both DIDs and imported contacts
  async function loadContacts() {
    try {
      // Get all contacts (both marked DIDs and imported contacts)
      const contacts = await StorageService.getAllContacts();

      // Update the contact section header to include import button
      updateContactSectionHeader();

      // Render the contacts or show empty state
      renderContacts(contacts);
    } catch (error) {
      console.error('Error loading contacts:', error);
      if (contactsList) {
        contactsList.innerHTML = '<p class="error-message">Error loading contacts</p>';
      }
    }
  }

  // Function to update the contact section header with import button
  function updateContactSectionHeader() {
    const contactSection = document.querySelector('.contact-section');
    if (!contactSection) return;

    // Check if header already exists
    let header = contactSection.querySelector('.contact-section-header');

    if (!header) {
      // Get the existing h2
      const existingTitle = contactSection.querySelector('h2');
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
      importButton.addEventListener('click', openContactImportDialog);
      header.appendChild(importButton);
    }
  }

  // Render contacts in the contacts list
function renderContacts(contacts: Contact[]) {
  console.log("renderContacts called with", contacts.length, "contacts");
  if (!contactsList) {
    console.error("contactsList element not found!");
    return;
  }

  contactsList.innerHTML = '';

  if (contacts.length === 0) {
    console.log("No contacts to render, showing empty state");
    // ... empty state code ...
    return;
  }

  console.log("Rendering contacts:", contacts.map(c => c.name));

  // Add each contact to the list
  contacts.forEach(contact => {
    const contactTemplate = document.getElementById('contact-item-template') as HTMLTemplateElement;
    if (!contactTemplate) {
      console.error("Contact item template not found!");
      return;
    }
    
    const contactEl = contactTemplate.content.cloneNode(true) as DocumentFragment;

    const contactItem = contactEl.querySelector('.contact-item') as HTMLElement;
    contactItem.setAttribute('data-contact-id', contact.id);

    // Add a data attribute to indicate if this is a local or imported contact
    contactItem.setAttribute('data-contact-source', contact.isLocal ? 'local' : 'imported');

    // ... avatar and name setup code ...

    // Enhanced click handler for debugging
    contactItem.addEventListener('click', (e) => {
      console.log(`Contact clicked: ${contact.name} (${contact.id})`);
      
      // Visual selection
      const previouslySelected = document.querySelector('.contact-item.selected');
      if (previouslySelected) {
        console.log("Removing selection from:", previouslySelected.getAttribute('data-contact-id'));
        previouslySelected.classList.remove('selected');
      }
      
      console.log(`Adding selected class to ${contact.name}`);
      contactItem.classList.add('selected');
      
      // Check window.credentialBuilder reference
      console.log("Checking credentialBuilder reference:", {
        windowRefExists: !!window.credentialBuilder,
        windowRefHasSetSelectedContact: window.credentialBuilder && typeof window.credentialBuilder.setSelectedContact === 'function',
        instanceId: window.credentialBuilder?.instanceId,
      });
      
      // Use window reference first
      if (window.credentialBuilder && typeof window.credentialBuilder.setSelectedContact === 'function') {
        console.log(`Calling window.credentialBuilder.setSelectedContact for ${contact.name}`);
        window.credentialBuilder.setSelectedContact(contact);
        
        // Verify contact was actually set
        setTimeout(() => {
          console.log("Verifying contact was set:", {
            contactSet: !!window.credentialBuilder.selectedContact,
            contactName: window.credentialBuilder.selectedContact?.name
          });
        }, 50);
      } else {
        console.error("window.credentialBuilder not found or missing setSelectedContact method!");
        
        // Try event dispatch as fallback
        const credentialBuilderElement = document.getElementById('credential-builder');
        if (credentialBuilderElement) {
          console.log(`Falling back to custom event for ${contact.name}`);
          const event = new CustomEvent('contact-selected', { detail: contact });
          credentialBuilderElement.dispatchEvent(event);
        } else {
          console.error("Neither window.credentialBuilder nor credential-builder element found!");
        }
      }

      // Get the issue button state right after contact selection
      const issueBtn = document.getElementById('issue-credential-btn') as HTMLButtonElement;
      if (issueBtn) {
        console.log("Issue button disabled state immediately after selection:", issueBtn.disabled);
        
        // Check if the button is properly responding to the selection
        const hasSubject = document.getElementById('credential-subject') &&
                          (document.getElementById('credential-subject') as HTMLInputElement).value.trim().length > 0;
        
        console.log("Issue button should be disabled:", !hasSubject, {
          hasSubject,
          hasContact: true, // We just selected a contact
          buttonActuallyDisabled: issueBtn.disabled
        });
      } else {
        console.warn("Issue button not found in DOM after contact selection!");
      }

      // Scroll into view for better UX
      contactItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

    contactsList.appendChild(contactItem);
  });
  
  console.log("Contact rendering complete");
}

  function openContactImportDialog() {
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
        showStatus('Please enter a contact name', 'error');
        nameInput.focus();
        return;
      }

      if (!did) {
        showStatus('Please enter a DID', 'error');
        didInput.focus();
        return;
      }

      // Validate DID format (basic check)
      if (!did.startsWith('did:')) {
        showStatus('Please enter a valid DID (should start with "did:")', 'error');
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
        await StorageService.saveImportedContact(contact);

        // Close the dialog
        closeDialog();

        // Show success message
        showStatus('Contact imported successfully', 'success');

        // Reload contacts
        loadContacts();

      } catch (error) {
        console.error('Error importing contact:', error);
        showStatus('Failed to import contact', 'error');
      }
    });

    // Append dialog to body
    document.body.appendChild(dialog);

    // Focus name input
    setTimeout(() => {
      nameInput.focus();
    }, 100);
  }


  // Filter contacts based on search query
  function filterContacts(query: string) {
    if (!contactsList) return;

    const normalizedQuery = query.toLowerCase().trim();

    // Remove any existing empty state messages
    const existingEmptyMessage = contactsList.querySelector('.filter-empty-message');
    if (existingEmptyMessage) {
      existingEmptyMessage.remove();
    }

    // Handle the case where we're showing the empty state
    const emptyContacts = contactsList.querySelector('.empty-contacts');
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
        contactsList.appendChild(noResults);
      }
      return;
    }

    const contactItems = contactsList.querySelectorAll('.contact-item');
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
      contactsList.appendChild(noResults);
    }
  }

  // Helper to show status messages
  function showStatus(message: string, type: 'success' | 'error' | 'loading' | 'info') {
    if (!statusElement) return;

    statusElement.textContent = message;
    statusElement.className = `status ${type}`;
    statusElement.style.display = 'block';

    // Adjust layout after showing status
    handleResize();

    // Auto-hide success and info messages after delay
    if (type === 'success' || type === 'info') {
      setTimeout(() => {
        statusElement.style.display = 'none';
        // Re-adjust layout after hiding status
        handleResize();
      }, 3000);
    }
  }

  publishDIDButton?.addEventListener('click', async () => {
    if (!selectedDID) {
      showStatus('Please select a DID to publish', 'error');
      return;
    }
  
    // Disable button during operation
    publishDIDButton.disabled = true;
    showStatus(`Publishing DID to blockchain...`, 'loading');
  
    try {
      const result = await didManager.publishDID(selectedDID.id);
  
      if (result.success) {
        showStatus(`DID publishing initiated`, 'info');
  
        // Initialize status component
        const didStatus = new DIDStatus('did-status-container');
  
        // Start polling for blockchain confirmation
        didManager.pollBlockchainStatus(selectedDID.id, (status) => {
          if(selectedDID != null) {
          didStatus.updateStatus(status, selectedDID.id);
  
          if (status === 'published') {
            showStatus(`DID published successfully to blockchain`, 'success');
            // Refresh the DID list to show updated status
            loadDIDs();
          } else if (status === 'failed') {
            showStatus(`DID publishing timed out`, 'error');
          }
        }
        });
      } else {
        showStatus(`Failed to publish DID: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Error publishing DID:', error);
      showStatus(`Error publishing DID: ${(error as Error).message}`, 'error');
    } finally {
      // Re-enable button after operation completes
      publishDIDButton.disabled = false;
    }
  });

  function cleanupActivePolling() {
    if (window.activePollId) {
      clearInterval(window.activePollId);
      window.activePollId = undefined;
    }
  }

  deleteDIDButton?.addEventListener('click', async () => {
    if (!selectedDID) {
      showStatus('Please select a DID to delete', 'error');
      return;
    }

    const confirmDelete = confirm(`Are you sure you want to delete this DID? This action cannot be undone.`);
    if (!confirmDelete) {
      return;
    }

    showStatus(`Deleting DID...`, 'loading');
    try {
      console.log(`Attempting to delete DID: ${selectedDID.id}`);

      const result = await didManager.deleteDID(selectedDID.id);
      if (result) {
        showStatus(`DID deleted successfully`, 'success');
        // Refresh the DID list
        loadDIDs();
      } else {
        showStatus(`Failed to delete DID`, 'error');
      }
    } catch (error) {
      console.error('Error deleting DID:', error);
      showStatus(`Error deleting DID: ${(error as Error).message}`, 'error');
    }
  });

  /**
   * Initialize everything when the extension loads
   */
  async function initializeApplication() {
    console.log('Initializing Visual DID & Credential Builder application...');

    // Check if templates are loaded
    addRequiredTemplates();

    // Add styles if not already present
    addRequiredStyles();

    // Initialize contact system first
    getContactSystem();

    // Initialize credential builder for the Issue tab
    if (!window.credentialBuilder) {
      console.log('Creating new CredentialBuilder instance');
      const credBuilder = new CredentialBuilder('credential-builder');
      // window.credentialBuilder is set inside constructor
    } else {
      console.log('Using existing credentialBuilder instance:', window.credentialBuilder);
    }

    // When navigating to the Issue tab, ensure contacts are properly loaded
    tabManager.on('tab-changed', (tabId: string) => {
      if (tabId === 'issue') {
        // Add a small delay to allow DOM to update
        setTimeout(() => {
          // Clean up any active polling when changing tabs
          cleanupActivePolling();
          // Initialize contact list in the Issue tab
          initializeContactList();
        }, 100);
      }
    });

    // Connect DID tab to contacts system
    initializeDIDContactsIntegration();

    setupCredentialVerificationGlobal();
  }

  /**
   * Initialize contact list in the Issue tab
   */
  function initializeContactList() {
    console.log("initializeContactList called");
    const contactSection = document.querySelector('.contact-section');
    if (!contactSection) {
      console.error('Contact section not found');
      return;
    }

    console.log('Initializing contact list in Issue tab');

    // Check if contact list already exists
    const existingList = contactSection.querySelector('.contacts-list');
    if (existingList) {
      console.log('Contact list already exists, refreshing data with getContactList');
      const contactList = getContactList('.contact-section');
      
      // Add debug for contact list object
      console.log("Contact list instance:", {
        type: contactList.constructor.name,
        hasMethods: {
          onContactSelected: typeof contactList.onContactSelected === 'function',
          loadContacts: typeof contactList.loadContacts === 'function'
        }
      });
      
      contactList.loadContacts();
    } else {
      console.log('Creating new contacts list');
      const contactList = getContactList('.contact-section');
      
      console.log("New contact list instance:", {
        type: contactList.constructor.name,
        hasMethods: {
          onContactSelected: typeof contactList.onContactSelected === 'function',
          loadContacts: typeof contactList.loadContacts === 'function'
        }
      });
      
      // Add a specific handler for completeness in debugging
      contactList.onContactSelected((contact) => {
        console.log("Contact selected via ContactList.onContactSelected:", contact.name);
        
        if (window.credentialBuilder) {
          console.log("Forwarding to window.credentialBuilder.setSelectedContact from onContactSelected");
          window.credentialBuilder.setSelectedContact(contact);
        }
      });
      
      contactList.loadContacts();
    }
    
    console.log("Contact list initialization complete");

    // Wait a moment for the DOM to fully update, then attach handlers
    setTimeout(() => {
      attachContactClickHandlers();
    }, 200);
  }

  // Apply this as a standalone function that's called after the tab is activated and contacts are loaded
  function attachContactClickHandlers() {
    console.log("Attaching click handlers to contacts");
    
    const contactItems = document.querySelectorAll('.contact-item');
    console.log(`Found ${contactItems.length} contact items in DOM`);
    
    contactItems.forEach(item => {
      const existingContactId = item.getAttribute('data-contact-id');
      console.log(`Attaching click handler to contact: ${existingContactId}`);
      
      // Remove existing click handlers
      const newItem = item.cloneNode(true);
      item.parentNode?.replaceChild(newItem, item);
      
      // Add new click handler
      newItem.addEventListener('click', function(e) {
        // Get the contact ID from the clicked element
        const clickedContactId = (newItem as HTMLElement).getAttribute('data-contact-id');
        console.log(`Direct click handler fired for contact: ${clickedContactId}`);
        
        // Remove selection from all items
        document.querySelectorAll('.contact-item').forEach(i => {
          i.classList.remove('selected');
        });
        
        // Add selection to clicked item
        (newItem as HTMLElement).classList.add('selected');
        
        // Validate we have a contact ID
        if (!clickedContactId) {
          console.error("Missing contact ID on clicked element");
          return;
        }
        
        // Get all contacts - either from a global cache or by querying the store
        StorageService.getAllContacts().then(contacts => {
          const contact = contacts.find(c => c.id === clickedContactId);
          if (!contact) {
            console.error(`Contact not found with ID: ${clickedContactId}`);
            return;
          }
          
          console.log(`Found contact for selection: ${contact.name}`);
          
          // Directly access the window.credentialBuilder
          if (window.credentialBuilder) {
            console.log(`Setting selected contact on window.credentialBuilder: ${contact.name}`);
            window.credentialBuilder.setSelectedContact(contact);
            
            // Verify it worked
            setTimeout(() => {
              const issueBtn = document.getElementById('issue-credential-btn') as HTMLButtonElement;
              if (issueBtn) {
                console.log("Issue button disabled state:", issueBtn.disabled);
              } else {
                console.error("Issue button not found when checking state");
              }
            }, 50);
          } else {
            console.error("window.credentialBuilder not available");
          }
        }).catch(error => {
          console.error("Error getting contacts:", error);
        });
      });
    });
    
    console.log("Contact click handlers attached");
  }

  /**
   * Initialize DID tab to work with contacts
   */
  function initializeDIDContactsIntegration() {
    // Override the existing toggleDID function to use the contact system
    // This is a monkey patch - in a real implementation you'd refactor the code
    const originalLoadDIDs = window.loadDIDs || loadDIDs;

    window.loadDIDs = async function () {
      // Call the original function
      await originalLoadDIDs.apply(this, arguments);

      // Now enhance the DID items with contact toggle
      enhanceDIDItemsWithContactToggle();
    };

    // If DIDs are already loaded, enhance them
    if (document.querySelector('.did-item')) {
      enhanceDIDItemsWithContactToggle();
    }
  }

  /**
   * Add contact toggle to DID items
   */
  function enhanceDIDItemsWithContactToggle() {
    const contactSystem = getContactSystem();
    const didItems = document.querySelectorAll('.did-item');

    didItems.forEach(item => {
      const didId = item.getAttribute('data-did-id');
      if (!didId) return;

      // Check if actions row already exists
      let actionsRow = item.querySelector('.did-actions-row');
      if (!actionsRow) {
        // Create actions row
        actionsRow = document.createElement('div');
        actionsRow.className = 'did-actions-row';

        // Add a spacer
        const spacer = document.createElement('span');
        spacer.className = 'spacer';
        actionsRow.appendChild(spacer);

        // Append to DID item (before date if possible)
        const dateElement = item.querySelector('.did-date');
        if (dateElement) {
          item.insertBefore(actionsRow, dateElement);
        } else {
          item.appendChild(actionsRow);
        }
      }

      // Get DID info from data attributes
      const didInfo = {
        id: didId,
        type: (item.querySelector('.did-type')?.textContent || '').toLowerCase().replace(/[()]/g, '') as DIDType,
        alias: item.querySelector('.did-alias')?.textContent || '',
        createdAt: new Date().toISOString(),
        isContact: item.classList.contains('is-contact')
      };

      // Always create or update the contact toggle
      let contactToggle = actionsRow.querySelector('.contact-toggle');
      
      // If toggle exists, update it
      if (contactToggle) {
        contactToggle.className = `contact-toggle ${didInfo.isContact ? 'active' : ''}`;
        (contactToggle as HTMLElement).title = didInfo.isContact ? 'Remove from contacts' : 'Save as contact';
        contactToggle.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="8.5" cy="7" r="4"></circle>
            ${didInfo.isContact ?
              '<path d="M20 8L22 10L18 14" fill="none" stroke="currentColor" stroke-width="2"></path>' :
              '<path d="M16 3.13a4 4 0 0 1 0 7.75" fill="none" stroke="currentColor" stroke-width="2"></path>'}
          </svg>
          <span class="contact-toggle-label">${didInfo.isContact ? 'Remove Contact' : 'Save as Contact'}</span>
        `;
      } else {
        // Create new toggle if it doesn't exist
        contactToggle = document.createElement('button');
        contactToggle.className = `contact-toggle ${didInfo.isContact ? 'active' : ''}`;
        (contactToggle as HTMLElement).title = didInfo.isContact ? 'Remove from contacts' : 'Save as contact';
        contactToggle.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="8.5" cy="7" r="4"></circle>
            ${didInfo.isContact ?
              '<path d="M20 8L22 10L18 14" fill="none" stroke="currentColor" stroke-width="2"></path>' :
              '<path d="M16 3.13a4 4 0 0 1 0 7.75" fill="none" stroke="currentColor" stroke-width="2"></path>'}
          </svg>
          <span class="contact-toggle-label">${didInfo.isContact ? 'Remove Contact' : 'Save as Contact'}</span>
        `;
        actionsRow.appendChild(contactToggle);
      }

      // Always add click handler (removing existing ones)
      contactToggle.replaceWith(contactToggle.cloneNode(true));
      contactToggle = actionsRow.querySelector('.contact-toggle') as HTMLElement;
      
      // Add new click handler
      contactToggle.addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
          const isContact = !didInfo.isContact;
          const success = await contactSystem.toggleDIDContact(didInfo, isContact);

          if (success) {
            showStatus(`${isContact ? 'Added to' : 'Removed from'} contacts`, 'success');
            // Update UI for this item
            didInfo.isContact = isContact;
            
            // Update toggle
            contactToggle.className = `contact-toggle ${isContact ? 'active' : ''}`;
            (contactToggle as HTMLElement).title = isContact ? 'Remove from contacts' : 'Save as contact';
            contactToggle.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="8.5" cy="7" r="4"></circle>
                ${isContact ?
                  '<path d="M20 8L22 10L18 14" fill="none" stroke="currentColor" stroke-width="2"></path>' :
                  '<path d="M16 3.13a4 4 0 0 1 0 7.75" fill="none" stroke="currentColor" stroke-width="2"></path>'}
              </svg>
              <span class="contact-toggle-label">${isContact ? 'Remove Contact' : 'Save as Contact'}</span>
            `;

            // Toggle contact badge
            let contactBadge = item.querySelector('.contact-badge');
            if (isContact) {
              if (!contactBadge) {
                contactBadge = document.createElement('span');
                contactBadge.className = 'contact-badge';
                contactBadge.innerHTML = `
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="8.5" cy="7" r="4"></circle>
                  </svg>
                  Contact
                `;
                const headerRow = item.querySelector('.did-header');
                if (headerRow) {
                  headerRow.appendChild(contactBadge);
                }
              }
            } else if (contactBadge) {
              contactBadge.remove();
            }

            // Mark item as contact
            if (isContact) {
              item.classList.add('is-contact');
            } else {
              item.classList.remove('is-contact');
            }
          } else {
            showStatus(`Failed to ${isContact ? 'add' : 'remove'} contact`, 'error');
          }
        } catch (error) {
          console.error('Error toggling contact status:', error);
          showStatus('Error updating contact status', 'error');
        }
      });
    });
  }

  /**
   * Add required styles to document
   */
  function addRequiredStyles() {
    if (!document.getElementById('contact-system-styles')) {
      const styleElement = document.createElement('style');
      styleElement.id = 'contact-system-styles';
      styleElement.textContent = `
      /* Contact toggle in DID items */
      .did-actions-row {
        display: flex;
        align-items: center;
        margin-top: 8px;
      }
      
      .did-actions-row .spacer {
        flex-grow: 1;
      }
      
      .contact-toggle {
        display: flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        padding: 6px 10px;
        border-radius: 4px;
        transition: background-color 0.2s;
        background-color: #f9fafb;
        color: #1f2937;
        border: 1px solid #d1d5db;
        font-size: 14px;
      }
      
      .contact-toggle:hover {
        background-color: #f3f4f6;
        border-color: #9ca3af;
      }
      
      .contact-toggle.active {
        color: var(--success-color);
        background-color: #ecfdf5;
        border-color: #a7f3d0;
      }
      
      .contact-toggle svg {
        width: 16px;
        height: 16px;
      }
      
      .contact-toggle-label {
        font-size: 14px;
        font-weight: 500;
      }
      
      /* Style contact badge in DID item */
      .contact-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background-color: #e8f5e9;
        color: #1b5e20;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 500;
        margin-left: 8px;
      }
      
      .contact-badge svg {
        width: 12px;
        height: 12px;
      }
      
      /* Mark DID items that are contacts */
      .did-item.is-contact {
        border-left: 3px solid #4ade80;
      }
    `;
      document.head.appendChild(styleElement);
    }
  }

  // Initialize contact system
  const contactSystem = getContactSystem();

  // Set up the contact management component in the Issue tab
  let contactManagement: ContactManagement | null = null;

  // Updated function to initialize the Issue tab
  function initializeIssueTab() {
    // Initialize contact management component
    if (!contactManagement) {
      contactManagement = getContactManagement('.contact-section');

      // Set up event listener for contact selection
      contactManagement.onContactSelected((contact) => {
        // Pass selected contact to credential builder
        window.credentialBuilder.setSelectedContact(contact);
      });
    }

    // Listen for tab changes
    tabManager.on('tab-changed', (tabId: string) => {
      if (tabId === 'issue') {
        // Reload contacts when Issue tab is selected
        contactManagement?.loadContacts();
      }
    });
  }

  // Connect DID contact toggle to contact system
  function updateDIDContactHandler() {
    // When a DID's contact status is toggled, update the contacts list
    contactSystem.on('did-contact-toggled', () => {
      // Reload contacts if on the Issue tab
      if (tabManager.getActiveTabId() === 'issue') {
        contactManagement?.loadContacts();
      }
    });
  }

  // Function to add required templates if they don't exist
  function addRequiredTemplates() {
    // Check if contact templates are present
    if (!document.getElementById('contact-import-dialog-template') ||
      !document.getElementById('contact-detail-dialog-template') ||
      !document.getElementById('delete-confirmation-dialog-template')) {

      // Create and append the templates
      const templates = `
    <!-- Contact Import Dialog Template -->
    <template id="contact-import-dialog-template">
      <div class="dialog-overlay contact-import-dialog">
        <div class="dialog-content">
          <div class="dialog-header">
            <h2>Import Contact</h2>
            <button class="close-dialog-btn icon-button">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          <div class="dialog-body">
            <p class="dialog-description">Add an external DID as a contact for issuing credentials.</p>
            
            <div class="form-group">
              <label for="contact-name">Contact Name:</label>
              <input type="text" id="contact-name" class="input-field" placeholder="Enter a name for this contact">
            </div>
            
            <div class="form-group">
              <label for="contact-did">DID:</label>
              <input type="text" id="contact-did" class="input-field" placeholder="Enter the DID string (e.g., did:prism:...)">
            </div>
            
            <div class="form-group">
              <label for="contact-type">DID Type:</label>
              <select id="contact-type" class="input-field">
                <option value="holder">Holder</option>
                <option value="issuer">Issuer</option>
                <option value="verifier">Verifier</option>
              </select>
            </div>
          </div>
          <div class="dialog-footer">
            <button class="secondary-button cancel-btn">Cancel</button>
            <button class="primary-button save-btn">Save Contact</button>
          </div>
        </div>
      </div>
    </template>

    <!-- Contact Detail Dialog Template -->
    <template id="contact-detail-dialog-template">
      <div class="dialog-overlay contact-detail-dialog">
        <div class="dialog-content">
          <div class="dialog-header">
            <h2>Contact Details</h2>
            <button class="close-dialog-btn icon-button">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          <div class="dialog-body">
            <div class="contact-detail-header">
              <div class="contact-detail-avatar">
                <!-- Avatar will be set dynamically -->
              </div>
              <div class="contact-detail-info">
                <h3 class="contact-detail-name"></h3>
                <div class="contact-detail-badges">
                  <!-- Badges will be added dynamically -->
                </div>
              </div>
            </div>
            
            <div class="contact-detail-section">
              <div class="contact-detail-label">DID</div>
              <div class="contact-detail-value contact-detail-did"></div>
              <button class="contact-detail-copy-btn" title="Copy DID">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
            </div>
            
            <div class="contact-detail-section">
              <div class="contact-detail-label">Created</div>
              <div class="contact-detail-value contact-detail-date"></div>
            </div>
            
            <div class="contact-detail-form">
              <div class="form-group">
                <label for="contact-detail-name-input">Name</label>
                <input type="text" id="contact-detail-name-input" class="input-field" placeholder="Contact name">
              </div>
              
              <div class="form-group">
                <label for="contact-detail-type-select">DID Type</label>
                <select id="contact-detail-type-select" class="input-field">
                  <option value="holder">Holder</option>
                  <option value="issuer">Issuer</option>
                  <option value="verifier">Verifier</option>
                </select>
              </div>
            </div>
          </div>
          <div class="dialog-footer">
            <button class="secondary-button delete-contact-btn">Delete</button>
            <div class="spacer"></div>
            <button class="secondary-button cancel-btn">Cancel</button>
            <button class="primary-button save-btn">Save Changes</button>
          </div>
        </div>
      </div>
    </template>

    <!-- Delete Confirmation Dialog Template -->
    <template id="delete-confirmation-dialog-template">
      <div class="dialog-overlay delete-confirmation-dialog">
        <div class="dialog-content">
          <div class="dialog-header">
            <h2>Delete Contact</h2>
            <button class="close-dialog-btn icon-button">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          <div class="dialog-body">
            <div class="dialog-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </div>
            <p>Are you sure you want to delete this contact?</p>
            <p class="contact-name"></p>
            <p>This action cannot be undone.</p>
          </div>
          <div class="dialog-footer">
            <button class="secondary-button cancel-btn">Cancel</button>
            <button class="delete-btn primary-button">Delete Contact</button>
          </div>
        </div>
      </div>
    </template>
    `;

      // Create a container for the templates
      const templateContainer = document.createElement('div');
      templateContainer.style.display = 'none';
      templateContainer.innerHTML = templates;

      // Add to the document
      document.body.appendChild(templateContainer);
    }
  }

  initializeIssueTab();
  updateDIDContactHandler();

  // Add HTML templates to the document if they don't exist
  addRequiredTemplates();
  initializeApplication();

  // Add this to expose the function globally
  (window as any).initializeApplication = initializeApplication;

  

});


document.addEventListener('click', (e) => {
  console.log('Global click detected on:', e.target);
  
  // Check if the click is on or within a contact item
  const contactItem = (e.target as HTMLElement).closest('.contact-item');
  if (contactItem) {
    console.log('Click was on/within a contact item:', contactItem);
  }
});

// Global error handler to help troubleshoot issues
window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error);
});

// Global unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});


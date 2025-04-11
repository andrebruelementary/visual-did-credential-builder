// src/popup.ts
import { Agent } from './agent';
import { DIDInfo, DIDManager, DIDType } from './didManager';
import { TabManager } from './components/TabManager';
import { ChromeStorage } from './storage/ChromeStorage';
import { CredentialBuilder } from './components/credentialBuilder/credentialBuilder';
import { Contact } from './models/contact';
import { StorageService } from './services/storageService';

/**
 * Main entry point for the extension popup
 */
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Initializing Identus Credential Manager extension...');
  
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
  let selectedDID: DIDInfo | null = null;
  
  // Initialize credential builder for the Issue tab
  const credentialBuilder = new CredentialBuilder('credential-builder');
  
  // Initialize contacts for credential issuance
  const contactsList = document.getElementById('contacts-list') as HTMLElement;
  const contactSearch = document.getElementById('contact-search') as HTMLInputElement;
  
  // Set up contact search
  contactSearch?.addEventListener('input', () => {
    filterContacts(contactSearch.value);
  });
  
  // Load contacts when Issue tab is selected
  tabManager.on('tab-changed', (tabId: string) => {
    if (tabId === 'issue') {
      loadContacts();
    }
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
    
    showStatus(`Creating ${didType} DID...`, 'loading');
    try {
      const result = await didManager.createDID(didType);
      if (result.success) {
        showStatus(`${didType} DID created successfully`, 'success');
        loadDIDs();
        
        // Enable appropriate functionality based on DID type
        if (didType === 'issuer') {
          // Enable issuer functionality
          const issueTab = tabManager.enableTab('issue');
        } else if (didType === 'verifier') {
          // Enable verifier functionality
          const verifyTab = tabManager.enableTab('verify');
        }
      } else {
        showStatus(`Failed to create DID: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Error creating DID:', error);
      showStatus(`Error creating DID: ${(error as Error).message}`, 'error');
    }
  });
  
  // Function to handle DID selection
function selectDID(didInfo: DIDInfo, element: HTMLElement) {
  // Clear previous selection
  document.querySelectorAll('.did-item').forEach(item => {
    item.classList.remove('selected');
  });
  
  // Mark this DID as selected
  element.classList.add('selected');
  selectedDID = didInfo;
  
  // Enable buttons
  publishDIDButton.disabled = false;
  deleteDIDButton.disabled = false;
}

// Load DIDs from storage and display them
async function loadDIDs() {
  try {
    const dids = await didManager.getAllDIDs();
    
    // Clear the list
    if (!didListElement) return;
    didListElement.innerHTML = '';
    
    if (dids.length === 0) {
      didListElement.innerHTML = '<div class="empty-state">No DIDs created yet</div>';
      return;
    }
    
    // Add each DID to the list
    dids.forEach(didInfo => {
      const didItem = document.createElement('div');
      didItem.className = 'did-item';
      didItem.setAttribute('data-did-id', didInfo.id);
      
      const typeElement = document.createElement('div');
      typeElement.className = 'did-type';
      typeElement.textContent = didInfo.type;
      
      const didElement = document.createElement('div');
      didElement.className = 'did-value';
      didElement.textContent = didInfo.id;
      
      const dateElement = document.createElement('div');
      dateElement.className = 'did-date';
      dateElement.textContent = new Date(didInfo.createdAt).toLocaleString();
      
      // Create and append date element
      didItem.appendChild(typeElement);
      didItem.appendChild(didElement);
      didItem.appendChild(dateElement);

      // Fetch and add status indicator if available
      // Using an immediately invoked async function to fetch the status
      (async () => {
        const status = await didManager.getDIDStatus(didInfo.id);
        if (status) {
          const statusElement = document.createElement('div');
          statusElement.className = `did-status did-status-${status.toLowerCase()}`;
          statusElement.textContent = status;
          didItem.appendChild(statusElement);
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
    
    // Reset selected DID
    selectedDID = null;
    publishDIDButton.disabled = true;
    deleteDIDButton.disabled = true;
  } catch (error) {
    console.error('Error loading DIDs:', error);
    showStatus('Failed to load DIDs', 'error');
  }
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
  
  // Load contacts for the Issue tab
  async function loadContacts() {
    try {
      const contacts = await StorageService.getContacts();
      renderContacts(contacts);
    } catch (error) {
      console.error('Error loading contacts:', error);
      if (contactsList) {
        contactsList.innerHTML = '<p class="error-message">Error loading contacts</p>';
      }
    }
  }
  
  // Render contacts in the contacts list
  function renderContacts(contacts: Contact[]) {
    if (!contactsList) return;
    
    contactsList.innerHTML = '';
    
    contacts.forEach(contact => {
      const contactTemplate = document.getElementById('contact-item-template') as HTMLTemplateElement;
      const contactEl = contactTemplate.content.cloneNode(true) as DocumentFragment;
      
      const contactItem = contactEl.querySelector('.contact-item') as HTMLElement;
      contactItem.setAttribute('data-contact-id', contact.id);
      
      const nameEl = contactEl.querySelector('.contact-name') as HTMLElement;
      nameEl.textContent = contact.name;
      
      // Set up selection
      contactItem.addEventListener('click', () => {
        // Remove selected class from all contacts
        document.querySelectorAll('.contact-item').forEach(item => {
          item.classList.remove('selected');
        });

        // Add selected class to this contact
        contactItem.classList.add('selected');

        // Update credential builder with selected contact
        credentialBuilder.setSelectedContact(contact);
      });
      
      contactsList.appendChild(contactItem);
    });
  }
  
  // Filter contacts based on search query
  function filterContacts(query: string) {
    if (!contactsList) return;
    
    const normalizedQuery = query.toLowerCase().trim();
    
    const contactItems = contactsList.querySelectorAll('.contact-item');
    contactItems.forEach(item => {
      const name = item.querySelector('.contact-name')?.textContent || '';
      
      if (name.toLowerCase().includes(normalizedQuery)) {
        (item as HTMLElement).style.display = 'flex';
      } else {
        (item as HTMLElement).style.display = 'none';
      }
    });
  }
  
  // Helper to show status messages
  function showStatus(message: string, type: 'success' | 'error' | 'loading' | 'info') {
    if (!statusElement) return;
    
    statusElement.textContent = message;
    statusElement.className = `status ${type}`;
    statusElement.style.display = 'block';
    
    // Auto-hide success and info messages after delay
    if (type === 'success' || type === 'info') {
      setTimeout(() => {
        statusElement.style.display = 'none';
      }, 3000);
    }
  }

  publishDIDButton?.addEventListener('click', async () => {
    if (!selectedDID) {
      showStatus('Please select a DID to publish', 'error');
      return;
    }
    
    showStatus(`Publishing DID to blockchain...`, 'loading');
    try {
      const result = await didManager.publishDID(selectedDID.id);
      if (result.success) {
        showStatus(`DID published successfully`, 'success');
        // Refresh the DID list to show updated status
        loadDIDs();
      } else {
        showStatus(`Failed to publish DID: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Error publishing DID:', error);
      showStatus(`Error publishing DID: ${(error as Error).message}`, 'error');
    }
  });
  
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

});


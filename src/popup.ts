// src/popup.ts
import { Agent } from './agent';
import { DIDInfo, DIDManager } from './didManager';
import { TabManager } from './components/TabManager';
import { ChromeStorage } from './storage/ChromeStorage';

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
          // We'll implement issuer functionality later
          const issueTab = document.getElementById('issue-tab');
          if (issueTab) {
            // Could add a visual indicator that this tab is now functional
          }
        } else if (didType === 'verifier') {
          // We'll implement verifier functionality later
          const verifyTab = document.getElementById('verify-tab');
          if (verifyTab) {
            // Could add a visual indicator that this tab is now functional
          }
        }
      } else {
        showStatus(`Failed to create DID: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Error creating DID:', error);
      showStatus(`Error creating DID: ${(error as Error).message}`, 'error');
    }
  });
  
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
        
        const typeElement = document.createElement('div');
        typeElement.className = 'did-type';
        typeElement.textContent = didInfo.type;
        
        const didElement = document.createElement('div');
        didElement.className = 'did-value';
        didElement.textContent = didInfo.id;
        
        const dateElement = document.createElement('div');
        dateElement.className = 'did-date';
        dateElement.textContent = new Date(didInfo.createdAt).toLocaleString();
        
        didItem.appendChild(typeElement);
        didItem.appendChild(didElement);
        didItem.appendChild(dateElement);
        
        // Add click to copy functionality
        didItem.addEventListener('click', () => {
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
        });
        
        didListElement.appendChild(didItem);
      });
      
      // Update UI based on available DIDs
      updateUIBasedOnDIDs(dids);
    } catch (error) {
      console.error('Error loading DIDs:', error);
      showStatus('Failed to load DIDs', 'error');
    }
  }
  
  // Update UI elements based on available DIDs
  function updateUIBasedOnDIDs(dids: DIDInfo[]) {
    const hasIssuerDID = dids.some(did => did.type === 'issuer');
    const hasVerifierDID = dids.some(did => did.type === 'verifier');
    
    // We'll enable specific functionality based on available DIDs later
    // For now, just log this information
    console.log('DID availability:', { hasIssuerDID, hasVerifierDID });
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
});
// DID Display and Copy Handler
document.addEventListener('DOMContentLoaded', function() {
    // Function to properly format a DID object to string
    window.formatDID = function(didObj) {
      // If it's already a string, return it
      if (typeof didObj === 'string') return didObj;
      
      // If it's an object, try to extract the DID string
      if (didObj && typeof didObj === 'object') {
        // Common DID object structures
        if (didObj.id) return didObj.id;
        if (didObj.did) return didObj.did;
        if (didObj.uri) return didObj.uri;
        
        // Try to stringify the object for debugging
        try {
          return JSON.stringify(didObj);
        } catch (e) {
          console.error('Error stringifying DID object:', e);
        }
      }
      
      // Fallback
      return String(didObj);
    };
    
    // Function to create a DID item in the list
    window.createDIDItem = function(didObj, type, date) {
      // Get the DID list element
      const didList = document.getElementById('didList');
      
      // Clear the "No DIDs" message if present
      const emptyState = didList.querySelector('.empty-state');
      if (emptyState) {
        emptyState.remove();
      }
      
      // Create a new DID item
      const didItem = document.createElement('div');
      didItem.className = 'did-item';
      
      // Format the DID string properly
      const didString = window.formatDID(didObj);
      
      // Create the content
      const typeElement = document.createElement('div');
      typeElement.className = 'did-type';
      typeElement.textContent = type || 'Unknown Type';
      
      const didElement = document.createElement('div');
      didElement.className = 'did-value';
      didElement.textContent = didString;
      
      const dateElement = document.createElement('div');
      dateElement.className = 'did-date';
      dateElement.textContent = date || new Date().toLocaleString();
      
      // Add to the item
      didItem.appendChild(typeElement);
      didItem.appendChild(didElement);
      didItem.appendChild(dateElement);
      
      // Add click to copy functionality
      didItem.addEventListener('click', function() {
        navigator.clipboard.writeText(didString).then(function() {
          // Show a temporary "Copied!" message
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
          
          didItem.appendChild(message);
          didItem.style.position = 'relative';
          
          // Remove the message after 2 seconds
          setTimeout(function() {
            message.remove();
          }, 2000);
          
          console.log('DID copied to clipboard:', didString);
        }).catch(function(error) {
          console.error('Could not copy DID:', error);
          
          // Show error message
          const statusEl = document.getElementById('status');
          statusEl.textContent = 'Failed to copy DID to clipboard';
          statusEl.className = 'status error';
          statusEl.style.display = 'block';
          
          // Hide the message after 3 seconds
          setTimeout(function() {
            statusEl.style.display = 'none';
          }, 3000);
        });
      });
      
      // Add to the list
      didList.appendChild(didItem);
      
      return didItem;
    };
    
    // Helper function to display a status message
    window.showStatus = function(message, type = 'info') {
      const statusEl = document.getElementById('status');
      statusEl.textContent = message;
      statusEl.className = `status ${type}`;
      statusEl.style.display = 'block';
      
      // Hide after a timeout for non-error messages
      if (type !== 'error') {
        setTimeout(function() {
          statusEl.style.display = 'none';
        }, 3000);
      }
    };
  
    // MOCK implementation for DID creation (for demo purposes)
    const createDIDButton = document.getElementById('createDIDButton');
    const initButton = document.getElementById('initButton');
    
    if (initButton) {
      initButton.addEventListener('click', function() {
        const mediatorDID = document.getElementById('mediatorDID').value;
        if (!mediatorDID) {
          window.showStatus('Please enter a mediator DID', 'error');
          return;
        }
        
        window.showStatus('Initializing...', 'loading');
        
        // Mock delayed initialization
        setTimeout(function() {
          window.showStatus('Agent initialized successfully', 'success');
          createDIDButton.disabled = false;
          
          // Store initialization status
          chrome.storage.local.set({
            agent_initialized: true,
            mediator_did: mediatorDID
          });
          
          // Load existing DIDs
          loadStoredDIDs();
        }, 1500);
      });
    }
    
    if (createDIDButton) {
      createDIDButton.addEventListener('click', function() {
        const didType = document.getElementById('didType').value;
        
        window.showStatus(`Creating ${didType} DID...`, 'loading');
        
        // Mock DID creation
        setTimeout(function() {
          const randomId = 'did:prism:' + generateRandomHex(32);
          
          // Store the DID
          storeDID(randomId, didType);
          
          // Create the visual component
          window.createDIDItem(randomId, didType);
          
          window.showStatus(`${didType} DID created successfully`, 'success');
          
          // Enable proper tabs based on DID roles
          if (didType === 'issuer') {
            document.getElementById('issueCredential')?.removeAttribute('disabled');
          } else if (didType === 'verifier') {
            document.getElementById('verifyCredential')?.removeAttribute('disabled');
            document.getElementById('createQRCode')?.removeAttribute('disabled');
          }
        }, 1500);
      });
    }
    
    // Helper function to generate random hex string (for mock DIDs)
    function generateRandomHex(length) {
      const characters = '0123456789abcdef';
      let result = '';
      for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      return result;
    }
    
    // Store a DID in browser storage
    function storeDID(did, didType) {
      chrome.storage.local.get(['dids'], function(result) {
        const dids = result.dids || [];
        dids.push({
          did: did,
          type: didType,
          created: new Date().toISOString()
        });
        chrome.storage.local.set({ dids: dids });
      });
    }
    
    // Load DIDs from storage and display them
    function loadStoredDIDs() {
      chrome.storage.local.get(['dids'], function(result) {
        const dids = result.dids || [];
        const didList = document.getElementById('didList');
        
        // Clear the list
        if (didList) {
          // Keep the empty state message if there are no DIDs
          if (dids.length === 0) {
            didList.innerHTML = '<div class="empty-state">No DIDs created yet</div>';
            return;
          }
          
          // Otherwise clear completely
          didList.innerHTML = '';
          
          // Add each DID to the list
          dids.forEach(function(didInfo) {
            window.createDIDItem(didInfo.did, didInfo.type, new Date(didInfo.created).toLocaleString());
            
            // Enable proper tabs based on DID roles
            if (didInfo.type === 'issuer') {
              document.getElementById('issueCredential')?.removeAttribute('disabled');
            } else if (didInfo.type === 'verifier') {
              document.getElementById('verifyCredential')?.removeAttribute('disabled');
              document.getElementById('createQRCode')?.removeAttribute('disabled');
            }
          });
        }
      });
    }
    
    // Mock verify credential functionality
    const verifyCredentialButton = document.getElementById('verifyCredential');
    if (verifyCredentialButton) {
      verifyCredentialButton.addEventListener('click', function() {
        const holderDID = document.getElementById('holderToVerify').value;
        const courseName = document.getElementById('courseToVerify').value;
        
        if (!holderDID) {
          window.showStatus('Please enter a holder DID to verify', 'error');
          return;
        }
        
        window.showStatus('Verifying credential...', 'loading');
        
        // Mock verification (check if we have a matching credential in storage)
        chrome.storage.local.get(['issued_credentials'], function(result) {
          const credentials = result.issued_credentials || [];
          
          setTimeout(function() {
            // Look for a matching credential
            const matchingCredential = credentials.find(function(cred) {
              return cred.issuedTo === holderDID && 
                    (!courseName || cred.subject.includes(courseName));
            });
            
            if (matchingCredential) {
              window.showStatus('Credential verification successful', 'success');
            } else {
              window.showStatus('No matching credential found', 'error');
            }
          }, 1500);
        });
      });
    }
    
    // Mock QR code generation
    const createQRButton = document.getElementById('createQRCode');
    const qrContainer = document.getElementById('qrContainer');
    
    if (createQRButton && qrContainer) {
      createQRButton.addEventListener('click', function() {
        window.showStatus('Generating QR code...', 'loading');
        
        // Mock QR code generation
        setTimeout(function() {
          const mockURL = 'https://verify.identus.io/' + generateRandomHex(16);
          
          // Display the URL
          qrContainer.innerHTML = `
            <div class="qr-info">
              <p>Use this URL to create a QR code for verification:</p>
              <textarea readonly class="qr-url">${mockURL}</textarea>
              <button id="copyURL" class="secondary-button">Copy URL</button>
            </div>
          `;
          
          // Add copy functionality
          document.getElementById('copyURL').addEventListener('click', function() {
            const textarea = document.querySelector('.qr-url');
            textarea.select();
            document.execCommand('copy');
            window.showStatus('URL copied to clipboard', 'success');
          });
          
          window.showStatus('QR code URL generated successfully', 'success');
        }, 1500);
      });
    }
    
    // Check if already initialized
    chrome.storage.local.get(['agent_initialized', 'mediator_did'], function(result) {
      if (result.agent_initialized && result.mediator_did) {
        // Pre-fill mediator DID
        const mediatorDIDInput = document.getElementById('mediatorDID');
        if (mediatorDIDInput) {
          mediatorDIDInput.value = result.mediator_did;
        }
        
        // Enable DID creation
        if (createDIDButton) {
          createDIDButton.disabled = false;
        }
        
        // Load existing DIDs
        loadStoredDIDs();
        
        // Show status
        window.showStatus('Agent already initialized', 'info');
      }
    });
  });
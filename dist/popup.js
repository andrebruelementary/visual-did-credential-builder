// Main popup script - integrates all components
document.addEventListener('DOMContentLoaded', function() {
  console.log('Popup loaded');
  
  // Set up credential builder in the issue tab
  const issueTab = document.getElementById('issue-tab');
  
  if (issueTab && issueTab.querySelector('#credential-builder')) {
    console.log('Initializing credential builder in issue tab');
    
    // The credential builder will be initialized by its own script
    // We just ensure the tab is properly set up here
    
    // Check if we have any issuer DIDs
    chrome.storage.local.get(['dids'], function(result) {
      const dids = result.dids || [];
      const issuerDIDs = dids.filter(did => did.type === 'issuer');
      
      if (issuerDIDs.length === 0) {
        // Show warning that user needs to create an issuer DID
        const warningElement = document.createElement('div');
        warningElement.className = 'status warning';
        warningElement.textContent = 'You need to create an issuer DID in the DIDs tab before issuing credentials.';
        warningElement.style.display = 'block';
        
        // Insert at the top of the issue tab
        issueTab.insertBefore(warningElement, issueTab.firstChild);
      }
    });
  }
  
  // Set up verification in the verify tab
  const verifyTab = document.getElementById('verify-tab');
  
  if (verifyTab) {
    // Check if we have any verifier DIDs
    chrome.storage.local.get(['dids'], function(result) {
      const dids = result.dids || [];
      const verifierDIDs = dids.filter(did => did.type === 'verifier');
      
      if (verifierDIDs.length === 0) {
        // Show warning that user needs to create a verifier DID
        const warningElement = document.createElement('div');
        warningElement.className = 'status warning';
        warningElement.textContent = 'You need to create a verifier DID in the DIDs tab before verifying credentials.';
        warningElement.style.display = 'block';
        
        // Insert at the top of the verify tab
        verifyTab.insertBefore(warningElement, verifyTab.firstChild);
      }
    });
  }
  
  // Add global error handling
  window.addEventListener('error', function(event) {
    console.error('Global error caught:', event.message);
    
    if (window.showStatus) {
      window.showStatus('An error occurred: ' + event.message, 'error');
    }
  });
  
  // Pre-populate mediator DID
  const mediatorDIDInput = document.getElementById('mediatorDID');
  if (mediatorDIDInput && !mediatorDIDInput.value) {
    mediatorDIDInput.value = 'did:peer:2.Ez6LSghwSE437wnDE1pt3X6hVDUQzSjsHzinpX3XFvMjRAm7y.Vz6Mkhh1e5CEYYq6JBUcTZ6Cp2ranCWRrv7Yax3Le4N59R6dd.SeyJ0IjoiZG0iLCJzIjp7InVyaSI6Imh0dHA6Ly9sb2NhbGhvc3Q6ODA4MCIsImEiOlsiZGlkY29tbS92MiJdfX0.SeyJ0IjoiZG0iLCJzIjp7InVyaSI6IndzOi8vbG9jYWxob3N0OjgwODAvd3MiLCJhIjpbImRpZGNvbW0vdjIiXX19';
  }
});
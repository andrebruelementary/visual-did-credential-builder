// Enhanced credential builder component with template loading
class CredentialBuilder {
    constructor(containerId) {
      this.container = document.getElementById(containerId);
      this.selectedContact = null;
      this.templateSelector = null;
      
      if (!this.container) {
        console.error(`Container with ID ${containerId} not found`);
        return;
      }
      
      this.initialize();
    }
    
    async initialize() {
      // Create the basic HTML structure
      this.createHtmlStructure();
      
      // Add event listeners
      this.addEventListeners();
      
      // Listen for contact selection events
      document.addEventListener('contact-selected', (event) => {
        this.selectedContact = event.detail;
        console.log('Credential builder received contact:', this.selectedContact);
        this.updateIssueButtonState();
      });
    }
    
    createHtmlStructure() {
      this.container.innerHTML = `
        <div class="credential-builder-container">
          <div class="builder-header">
            <h1>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10.5 20.5 3 15l7.5-5.5" />
                <path d="M13.5 20.5 21 15l-7.5-5.5" />
              </svg>
              Credential builder
            </h1>
            <div class="header-actions">
              <button id="save-template-btn" class="secondary-button">Save template</button>
              <button id="load-template-btn" class="secondary-button">Load template</button>
            </div>
          </div>
        
          <div class="builder-form">
            <div class="form-group">
              <label for="credential-subject">Credential subject (title)</label>
              <input type="text" id="credential-subject" placeholder="Required value" required value="Plutus Pioneers Program Certificate">
            </div>
        
            <div id="dynamic-properties">
              <!-- Default properties -->
              <div class="form-row property-row">
                <div class="form-group">
                  <input type="text" class="property-label" placeholder="Property name" value="Participant Name">
                </div>
                <div class="form-group">
                  <input type="text" class="property-value" placeholder="Custom value" value="">
                </div>
                <button class="remove-property-btn icon-button">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
              
              <div class="form-row property-row">
                <div class="form-group">
                  <input type="text" class="property-label" placeholder="Property name" value="Completion Date">
                </div>
                <div class="form-group">
                  <input type="date" class="property-value" placeholder="Custom value" value="${new Date().toISOString().split('T')[0]}">
                </div>
                <button class="remove-property-btn icon-button">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
              
              <div class="form-row property-row">
                <div class="form-group">
                  <input type="text" class="property-label" placeholder="Property name" value="Grade">
                </div>
                <div class="form-group">
                  <input type="text" class="property-value" placeholder="Custom value" value="Distinguished Graduate">
                </div>
                <button class="remove-property-btn icon-button">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
            </div>
        
            <button id="add-property-btn" class="primary-button">Add property</button>
          </div>
        
          <div class="builder-actions">
            <button id="issue-credential-btn" class="primary-button" disabled>Issue credential</button>
          </div>
        </div>
        
        <!-- Template for property row -->
        <template id="property-template">
          <div class="form-row property-row">
            <div class="form-group">
              <input type="text" class="property-label" placeholder="Property name">
            </div>
            <div class="form-group">
              <input type="text" class="property-value" placeholder="Custom value">
            </div>
            <button class="remove-property-btn icon-button">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </template>
        
        <!-- Confirmation dialog template -->
        <template id="confirmation-dialog-template">
          <div class="dialog-overlay">
            <div class="dialog-content">
              <div class="dialog-header">
                <h2>Credential Issued</h2>
                <button class="close-dialog-btn icon-button">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
              <div class="dialog-body">
                <p>Credential has been successfully issued.</p>
                <div class="credential-summary">
                  <!-- Credential summary will be added here -->
                </div>
              </div>
              <div class="dialog-footer">
                <button class="primary-button close-btn">Close</button>
              </div>
            </div>
          </div>
        </template>
      `;
      
      // Add CSS styles for the credential builder
      const style = document.createElement('style');
      style.textContent = `
        .credential-builder-container {
          padding: 20px;
          height: 100%;
          width: 100%;
          display: flex;
          flex-direction: column;
        }
        
        .builder-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        
        .builder-header h1 {
          display: flex;
          align-items: center;
          font-size: 1.5rem;
          font-weight: 600;
          margin: 0;
          gap: 10px;
        }
        
        .builder-form {
          background-color: #f9f9f9;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
          flex: 1;
          overflow-y: auto;
        }
        
        .form-group {
          margin-bottom: 15px;
          width: 100%;
        }
        
        .form-row {
          display: flex;
          gap: 15px;
          align-items: center;
          margin-bottom: 15px;
          width: 100%;
        }
        
        .property-row {
          display: grid;
          grid-template-columns: 1fr 1fr auto;
          gap: 10px;
          align-items: center;
        }
        
        .builder-actions {
          display: flex;
          justify-content: flex-end;
          margin-top: auto;
          padding-top: 20px;
        }
        
        .icon-button {
          background-color: transparent;
          border: none;
          padding: 5px;
          cursor: pointer;
          color: #6b7280;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .icon-button:hover {
          background-color: #f3f4f6;
          color: #ef4444;
        }
        
        /* Dialog styles */
        .dialog-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        
        .dialog-content {
          background-color: white;
          border-radius: 8px;
          width: 90%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        
        .dialog-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px 20px;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .dialog-header h2 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
        }
        
        .dialog-body {
          padding: 20px;
        }
        
        .dialog-footer {
          padding: 15px 20px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }
        
        .credential-summary {
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          padding: 15px;
          margin-top: 15px;
        }
        
        .credential-summary-item {
          display: flex;
          margin-bottom: 8px;
        }
        
        .credential-summary-label {
          font-weight: 500;
          width: 40%;
          margin-right: 10px;
        }
        
        .credential-summary-value {
          width: 60%;
          word-break: break-word;
        }
        
        .header-actions {
          display: flex;
          gap: 10px;
        }
      `;
      document.head.appendChild(style);
    }
    
    addEventListeners() {
      // Get the elements
      this.addPropertyBtn = document.getElementById('add-property-btn');
      this.issueCredentialBtn = document.getElementById('issue-credential-btn');
      this.saveTemplateBtn = document.getElementById('save-template-btn');
      this.loadTemplateBtn = document.getElementById('load-template-btn');
      this.dynamicPropertiesContainer = document.getElementById('dynamic-properties');
      
      // Add property button
      this.addPropertyBtn.addEventListener('click', () => {
        this.addEmptyProperty();
      });
      
      // Issue credential button
      this.issueCredentialBtn.addEventListener('click', () => {
        this.issueCredential();
      });
      
      // Save template button
      this.saveTemplateBtn.addEventListener('click', () => {
        this.saveTemplate();
      });
      
      // Load template button
      this.loadTemplateBtn.addEventListener('click', () => {
        this.loadTemplate();
      });
      
      // Add event listeners to remove buttons for existing properties
      const removeButtons = this.dynamicPropertiesContainer.querySelectorAll('.remove-property-btn');
      removeButtons.forEach(button => {
        button.addEventListener('click', (e) => {
          const row = e.target.closest('.property-row');
          row.remove();
        });
      });
    }
    
    addEmptyProperty() {
      const template = document.getElementById('property-template');
      const propertyRow = template.content.cloneNode(true);
      
      // Add event listener to remove button
      const removeButton = propertyRow.querySelector('.remove-property-btn');
      removeButton.addEventListener('click', (e) => {
        const row = e.target.closest('.property-row');
        row.remove();
      });
      
      this.dynamicPropertiesContainer.appendChild(propertyRow);
    }
    
    updateIssueButtonState() {
      if (!this.issueCredentialBtn) return;
      
      this.issueCredentialBtn.disabled = !this.selectedContact;
    }
    
    gatherCredentialData() {
      const subject = document.getElementById('credential-subject').value.trim();
      if (!subject) {
        alert('Please enter a credential subject');
        return null;
      }
      
      if (!this.selectedContact) {
        alert('Please select a contact to issue the credential to');
        return null;
      }
      
      const properties = [];
      const propertyRows = this.dynamicPropertiesContainer.querySelectorAll('.property-row');
      
      propertyRows.forEach((row, index) => {
        const labelInput = row.querySelector('.property-label');
        const valueInput = row.querySelector('.property-value');
        
        const label = labelInput.value.trim();
        const value = valueInput.value.trim();
        
        if (label && value) {
          properties.push({
            id: `prop_${index}`,
            label,
            value
          });
        }
      });
      
      return {
        id: `cred_${Date.now()}`,
        subject,
        issuedTo: this.selectedContact.did,
        properties,
        templateId: 'template_demo',
        issuedDate: new Date().toISOString(),
        expiryDate: undefined
      };
    }
    
    issueCredential() {
      const credential = this.gatherCredentialData();
      if (!credential) return;
      
      // Show the confirmation dialog
      this.showCredentialConfirmation(credential);
      
      // Store the credential in local storage
      this.storeCredential(credential);
    }
    
    showCredentialConfirmation(credential) {
      const dialogTemplate = document.getElementById('confirmation-dialog-template');
      const dialog = dialogTemplate.content.cloneNode(true);
      
      const summaryElement = dialog.querySelector('.credential-summary');
      
      // Add recipient info
      const contactInfo = document.createElement('div');
      contactInfo.className = 'credential-summary-item';
      contactInfo.innerHTML = `
        <div class="credential-summary-label">Issued to:</div>
        <div class="credential-summary-value">${this.selectedContact.name} (${credential.issuedTo})</div>
      `;
      summaryElement.appendChild(contactInfo);
      
      // Add subject
      const subjectInfo = document.createElement('div');
      subjectInfo.className = 'credential-summary-item';
      subjectInfo.innerHTML = `
        <div class="credential-summary-label">Subject:</div>
        <div class="credential-summary-value">${credential.subject}</div>
      `;
      summaryElement.appendChild(subjectInfo);
      
      // Add all properties
      credential.properties.forEach(prop => {
        const propInfo = document.createElement('div');
        propInfo.className = 'credential-summary-item';
        propInfo.innerHTML = `
          <div class="credential-summary-label">${prop.label}:</div>
          <div class="credential-summary-value">${prop.value}</div>
        `;
        summaryElement.appendChild(propInfo);
      });
      
      // Add issue date
      const dateInfo = document.createElement('div');
      dateInfo.className = 'credential-summary-item';
      dateInfo.innerHTML = `
        <div class="credential-summary-label">Issued on:</div>
        <div class="credential-summary-value">${new Date(credential.issuedDate).toLocaleDateString()}</div>
      `;
      summaryElement.appendChild(dateInfo);
      
      // Add event listeners to close buttons
      const closeBtn = dialog.querySelector('.close-btn');
      const closeDialogBtn = dialog.querySelector('.close-dialog-btn');
      
      const closeDialog = () => {
        const dialogOverlay = document.querySelector('.dialog-overlay');
        if (dialogOverlay) {
          dialogOverlay.remove();
        }
      };
      
      closeBtn.addEventListener('click', closeDialog);
      closeDialogBtn.addEventListener('click', closeDialog);
      
      // Append the dialog to the document
      document.body.appendChild(dialog);
    }
    
    storeCredential(credential) {
      const storageKey = 'issued_credentials';
      
      chrome.storage.local.get([storageKey], (result) => {
        const credentials = result[storageKey] || [];
        credentials.push(credential);
        
        chrome.storage.local.set({ [storageKey]: credentials }, () => {
          console.log('Credential stored successfully');
        });
      });
    }
    
    saveTemplate() {
      const templateName = prompt('Enter a name for this template:');
      if (!templateName) return;
      
      const properties = [];
      const propertyRows = this.dynamicPropertiesContainer.querySelectorAll('.property-row');
      
      propertyRows.forEach((row, index) => {
        const labelInput = row.querySelector('.property-label');
        const label = labelInput.value.trim();
        
        if (label) {
          properties.push({
            id: `prop_${index}`,
            label,
            type: 'text',
            required: false
          });
        }
      });
      
      const template = {
        id: `template_${Date.now()}`,
        name: templateName,
        description: `${templateName} template`,
        properties,
        isPublic: false
      };
      
      const storageKey = 'credential_templates';
      
      chrome.storage.local.get([storageKey], (result) => {
        const templates = result[storageKey] || [];
        templates.push(template);
        
        chrome.storage.local.set({ [storageKey]: templates }, () => {
          alert('Template saved successfully');
        });
      });
    }
    
    async loadTemplate() {
      // Check if TemplateSelector is available
      if (!window.TemplateSelector) {
        console.error('TemplateSelector not found. Make sure template-selector.js is loaded');
        alert('Template selector not available');
        return;
      }
      
      // Create template selector
      this.templateSelector = new window.TemplateSelector();
      
      // Open dialog and wait for selection
      const selectedTemplate = await this.templateSelector.openDialog();
      
      // Apply selected template if any
      if (selectedTemplate) {
        this.applyTemplate(selectedTemplate);
      }
    }
    
    applyTemplate(template) {
      // Set the credential subject
      document.getElementById('credential-subject').value = template.name;
      
      // Clear existing properties
      this.dynamicPropertiesContainer.innerHTML = '';
      
      // Add properties from the template
      template.properties.forEach(property => {
        const propertyTemplate = document.getElementById('property-template');
        const propertyRow = propertyTemplate.content.cloneNode(true);
        
        const labelInput = propertyRow.querySelector('.property-label');
        labelInput.value = property.label;
        
        const removeButton = propertyRow.querySelector('.remove-property-btn');
        removeButton.addEventListener('click', (e) => {
          const row = e.target.closest('.property-row');
          row.remove();
        });
        
        this.dynamicPropertiesContainer.appendChild(propertyRow);
      });
    }
  }
  
  // Initialize the credential builder when the document is loaded
  document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing credential builder');
    const issueTab = document.getElementById('issue-tab');
    
    if (issueTab && issueTab.querySelector('#credential-builder')) {
      new CredentialBuilder('credential-builder');
    }
  });
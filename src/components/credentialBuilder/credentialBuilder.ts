// Keep all your original imports - do not modify them
import { CredentialTemplate, TemplateProperty } from '../../models/template';
import { Credential, CredentialProperty } from '../../models/credential';
import { Contact } from '../../models/contact';
import { StorageService } from '../../services/storageService';
import { TemplateService } from '../../services/templateService';
import './credentialBuilder.css';
import { TemplateSelector } from '../templateSelector/templateSelector';
import { Agent } from '../../agent';
import { DIDManager, DIDType } from '../../didManager';
import { ChromeStorage } from '../../storage/ChromeStorage';
import { CredentialVerifier } from '../../services/credentialVerifier';

export class CredentialBuilder {
  private container: HTMLElement;
  private template: CredentialTemplate | null = null;
  private selectedContact: Contact | null = null;

  // Initialize properties with default values to satisfy TypeScript strict mode
  private dynamicPropertiesContainer: HTMLElement = document.createElement('div');
  private loadTemplateBtn: HTMLButtonElement = document.createElement('button');
  private saveTemplateBtn: HTMLButtonElement = document.createElement('button');
  private addPropertyBtn: HTMLButtonElement = document.createElement('button');
  private issueCredentialBtn: HTMLButtonElement = document.createElement('button');
  private subjectInput: HTMLInputElement = document.createElement('input');
  
  // Add an instance ID for tracking
  private instanceId: string = `cb_${Date.now()}`;

  constructor(containerId: string) {
    console.log(`[CredentialBuilder:${this.instanceId}] Creating new instance with container: ${containerId}`);
    const containerElement = document.getElementById(containerId);
    if (!containerElement) {
      throw new Error(`Container element with ID "${containerId}" not found`);
    }
    this.container = containerElement;

    // Store a reference to this instance before any async operations
    console.log(`[CredentialBuilder:${this.instanceId}] Setting window.credentialBuilder`);
    window.credentialBuilder = this;
    
    // Add debugging check after setting
    setTimeout(() => {
      console.log(`[CredentialBuilder:${this.instanceId}] Confirm window.credentialBuilder set correctly:`, 
                  window.credentialBuilder === this, 
                  'ID check:', window.credentialBuilder?.instanceId === this.instanceId);
    }, 0);

    // Listen for custom events on the container
    this.container.addEventListener('contact-selected', (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log(`[CredentialBuilder:${this.instanceId}] Received contact-selected event:`, customEvent.detail);
      if (customEvent.detail) {
        this.setSelectedContact(customEvent.detail);
      }
    });
  
    // Load the HTML content
    this.loadHTML().then(() => {
      console.log(`[CredentialBuilder:${this.instanceId}] HTML loaded, initializing elements`);
      
      // Initialize elements - these assignments will override the defaults
      this.dynamicPropertiesContainer = document.getElementById('dynamic-properties') as HTMLElement;
      this.loadTemplateBtn = document.getElementById('load-template-btn') as HTMLButtonElement;
      this.saveTemplateBtn = document.getElementById('save-template-btn') as HTMLButtonElement;
      this.addPropertyBtn = document.getElementById('add-property-btn') as HTMLButtonElement;
      this.issueCredentialBtn = document.getElementById('issue-credential-btn') as HTMLButtonElement;
      this.subjectInput = document.getElementById('credential-subject') as HTMLInputElement;

      console.log(`[CredentialBuilder:${this.instanceId}] Elements initialized:`, {
        dynamicPropertiesFound: !!this.dynamicPropertiesContainer,
        loadButtonFound: !!this.loadTemplateBtn,
        saveButtonFound: !!this.saveTemplateBtn,
        addPropertyFound: !!this.addPropertyBtn,
        issueButtonFound: !!this.issueCredentialBtn,
        subjectInputFound: !!this.subjectInput
      });
      
      if (this.issueCredentialBtn) {
        console.log(`[CredentialBuilder:${this.instanceId}] Initial issue button state:`, 
                    this.issueCredentialBtn.disabled);
      }

      // Initialize event listeners
      this.initEventListeners();

      // Add visual emphasis to the issue button when a contact is selected
      this.updateIssueButtonState();
    });
  }

  private async loadHTML(): Promise<void> {
    try {
      const response = await fetch(chrome.runtime.getURL('dist/components/credentialBuilder/credentialBuilder.html'));
      const html = await response.text();
      this.container.innerHTML = html;
      console.log(`[CredentialBuilder:${this.instanceId}] HTML content loaded`);
    } catch (error) {
      console.error(`[CredentialBuilder:${this.instanceId}] Error loading HTML:`, error);
      this.container.innerHTML = '<p>Error loading credential builder</p>';
    }
  }

  private initEventListeners(): void {
    console.log(`[CredentialBuilder:${this.instanceId}] Initializing event listeners`);
    
    if (this.loadTemplateBtn) {
      this.loadTemplateBtn.addEventListener('click', this.openTemplateSelector.bind(this));
    }
    
    if (this.saveTemplateBtn) {
      this.saveTemplateBtn.addEventListener('click', this.saveTemplate.bind(this));
    }
    
    if (this.addPropertyBtn) {
      this.addPropertyBtn.addEventListener('click', this.addEmptyProperty.bind(this));
    }
    
    if (this.issueCredentialBtn) {
      console.log(`[CredentialBuilder:${this.instanceId}] Adding click listener to issue button`);
      this.issueCredentialBtn.addEventListener('click', () => {
        console.log(`[CredentialBuilder:${this.instanceId}] Issue button clicked, has contact:`, 
                    !!this.selectedContact);
        this.issueCredential();
      });
    } else {
      console.warn(`[CredentialBuilder:${this.instanceId}] Issue button not found for event listener`);
    }

    // Add validation listener to subject input
    if (this.subjectInput) {
      this.subjectInput.addEventListener('input', () => {
        console.log(`[CredentialBuilder:${this.instanceId}] Subject input changed:`, 
                    this.subjectInput.value);
        this.updateIssueButtonState();
      });
    }
  }

  /**
   * Update issue button state based on form state and contact selection
   */
  private updateIssueButtonState(): void {
    console.log(`[CredentialBuilder:${this.instanceId}] Updating issue button state`);
    
    // Always get fresh button reference for reliability
    const domIssueBtn = document.getElementById('issue-credential-btn') as HTMLButtonElement;
    
    // Update instance variable if DOM button found
    if (domIssueBtn && !this.issueCredentialBtn) {
      console.log(`[CredentialBuilder:${this.instanceId}] Updating issue button reference from DOM`);
      this.issueCredentialBtn = domIssueBtn;
    }
    
    const hasSubject = this.subjectInput && this.subjectInput.value.trim().length > 0;
    const hasContact = this.selectedContact !== null;

    console.log(`[CredentialBuilder:${this.instanceId}] State factors:`, {
      hasSubject,
      hasContact,
      selectedContact: this.selectedContact ? this.selectedContact.name : 'none',
      domButtonFound: !!domIssueBtn,
      instanceButtonFound: !!this.issueCredentialBtn,
      buttonDisabled: this.issueCredentialBtn ? this.issueCredentialBtn.disabled : 'N/A',
      domButtonDisabled: domIssueBtn ? domIssueBtn.disabled : 'N/A'
    });

    // Update DOM button
    if (domIssueBtn) {
      const shouldBeEnabled = hasSubject && hasContact;
      console.log(`[CredentialBuilder:${this.instanceId}] Setting DOM button disabled: ${!shouldBeEnabled}`);
      domIssueBtn.disabled = !shouldBeEnabled;
    }
    
    // Also update instance variable for consistency
    if (this.issueCredentialBtn) {
      const shouldBeEnabled = hasSubject && hasContact;
      console.log(`[CredentialBuilder:${this.instanceId}] Setting instance button disabled: ${!shouldBeEnabled}`);
      this.issueCredentialBtn.disabled = !shouldBeEnabled;
    }

    // Verify button state was properly set
    setTimeout(() => {
      const currentBtn = document.getElementById('issue-credential-btn') as HTMLButtonElement;
      console.log(`[CredentialBuilder:${this.instanceId}] Button state after update:`, {
        domButtonDisabled: currentBtn ? currentBtn.disabled : 'not found',
        instanceButtonDisabled: this.issueCredentialBtn ? this.issueCredentialBtn.disabled : 'not found',
        shouldBeEnabled: hasSubject && hasContact
      });
    }, 50);
  }

  private async openTemplateSelector(): Promise<void> {
    // In a real implementation, we would open the template selector dialog
    const templateSelector = new TemplateSelector();
    const selectedTemplate = await templateSelector.openDialog();
    if (selectedTemplate) {
      this.loadTemplate(selectedTemplate);
    }
  }

  private loadTemplate(template: CredentialTemplate): void {
    this.template = template;

    // Set the subject input to the template name
    this.subjectInput.value = template.name;

    // Clear existing dynamic properties
    this.dynamicPropertiesContainer.innerHTML = '';

    // Add properties from the template (excluding any that might be the subject)
    template.properties.forEach(property => {
      // Skip if this is a subject/title property
      if (property.id === 'subject' || property.label.toLowerCase().includes('subject') ||
        property.label.toLowerCase().includes('title')) {
        return;
      }

      this.addPropertyFromTemplate(property);
    });

    // Update issue button state after loading template
    this.updateIssueButtonState();
  }

  private async saveTemplate(): Promise<void> {
    // Create a dialog to get template name and description
    const templateName = prompt('Enter a name for this template:', this.template?.name || 'My Template');
    if (!templateName) return; // User canceled

    const templateDescription = prompt('Enter a description (optional):', this.template?.description || '');

    // Gather properties from the current state
    const properties: TemplateProperty[] = [];

    // Get all property rows
    const propertyRows = this.dynamicPropertiesContainer.querySelectorAll('.property-row');
    propertyRows.forEach((row, index) => {
      const labelInput = row.querySelector('.property-label') as HTMLInputElement;
      const propertyId = `prop_${index}`;

      properties.push({
        id: propertyId,
        label: labelInput.value.trim() || `Property ${index + 1}`,
        type: 'text', // Default to text type
        required: false
      });
    });

    // Create template object
    const template: CredentialTemplate = {
      id: `template_${Date.now()}`,
      name: templateName,
      description: templateDescription || undefined,
      properties: properties,
      isPublic: false,
      source: 'private'
    };

    // Save to storage
    try {
      await StorageService.savePrivateTemplate(template);
      alert('Template saved successfully!');
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save template. Please try again.');
    }
  }

  private addPropertyFromTemplate(property: TemplateProperty): void {
    const propertyTemplate = document.getElementById('property-template') as HTMLTemplateElement;
    const propertyRow = propertyTemplate.content.cloneNode(true) as DocumentFragment;

    const labelInput = propertyRow.querySelector('.property-label') as HTMLInputElement;
    labelInput.value = property.label;
    if (property.required) {
      labelInput.setAttribute('required', 'true');
    }

    const valueInput = propertyRow.querySelector('.property-value') as HTMLInputElement;
    valueInput.placeholder = property.required ? 'Required value' : 'Custom value';
    valueInput.setAttribute('data-property-id', property.id);

    const removeBtn = propertyRow.querySelector('.remove-property-btn') as HTMLButtonElement;
    removeBtn.addEventListener('click', (e) => {
      const btn = e.currentTarget as HTMLButtonElement;
      const row = btn.closest('.property-row') as HTMLElement;
      row.remove();
    });

    this.dynamicPropertiesContainer.appendChild(propertyRow);
  }

  private addEmptyProperty(): void {
    const propertyTemplate = document.getElementById('property-template') as HTMLTemplateElement;
    const propertyRow = propertyTemplate.content.cloneNode(true) as DocumentFragment;

    const removeBtn = propertyRow.querySelector('.remove-property-btn') as HTMLButtonElement;
    removeBtn.addEventListener('click', (e) => {
      const btn = e.currentTarget as HTMLButtonElement;
      const row = btn.closest('.property-row') as HTMLElement;
      row.remove();
    });

    this.dynamicPropertiesContainer.appendChild(propertyRow);
  }

  private gatherCredentialData(): Credential | null {
    const subject = this.subjectInput.value.trim();
    if (!subject) {
      alert('Please enter a credential subject');
      return null;
    }

    if (!this.selectedContact) {
      alert('Please select a contact to issue the credential to');
      return null;
    }

    const properties: CredentialProperty[] = [];
    const propertyRows = this.dynamicPropertiesContainer.querySelectorAll('.property-row');

    propertyRows.forEach((row, index) => {
      const labelInput = row.querySelector('.property-label') as HTMLInputElement;
      const valueInput = row.querySelector('.property-value') as HTMLInputElement;

      const label = labelInput.value.trim();
      const value = valueInput.value.trim();

      if (label && value) {
        const propertyId = valueInput.getAttribute('data-property-id') || `prop_${index}`;
        properties.push({
          id: propertyId,
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
      templateId: this.template?.id,
      issuedDate: new Date().toISOString(),
      expiryDate: undefined // Optional, could be set if needed
    };
  }

  private async issueCredential(): Promise<void> {
    const credential = this.gatherCredentialData();
    if (!credential) return;

    try {
      // Get necessary services from agent
      const agent = new Agent(); // Get agent instance
      if (!agent.isInitialized()) {
        await agent.initialize();
      }

      const storage = new ChromeStorage();

      // Get issuer DID
      const didManager = new DIDManager(agent, storage);
      const issuerDIDInfo = await didManager.getFirstDIDOfType(DIDType.ISSUER);

      if (!issuerDIDInfo) {
        alert('No issuer DID available. Please create an issuer DID first.');
        return;
      }

      // Show the confirmation dialog with mock issuance
      this.showCredentialConfirmation(credential);

      // Save the credential to storage
      await StorageService.saveCredential(credential);
    } catch (error) {
      console.error('Error issuing credential:', error);
      alert('Failed to issue credential. Please try again.');
    }
  }

  private showCredentialConfirmation(credential: Credential): void {
    const dialogTemplate = document.getElementById('confirmation-dialog-template') as HTMLTemplateElement;
    const dialog = dialogTemplate.content.cloneNode(true) as DocumentFragment;
  
    const summaryElement = dialog.querySelector('.credential-summary') as HTMLElement;
  
    // Add recipient info
    const contactInfo = document.createElement('div');
    contactInfo.className = 'credential-summary-item';
    contactInfo.innerHTML = `
      <div class="credential-summary-label">Issued to:</div>
      <div class="credential-summary-value">${this.selectedContact?.name || 'Unknown'} (${credential.issuedTo})</div>
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
  
    // Add expiry date if available
    if (credential.expiryDate) {
      const expiryInfo = document.createElement('div');
      expiryInfo.className = 'credential-summary-item';
      expiryInfo.innerHTML = `
        <div class="credential-summary-label">Expires on:</div>
        <div class="credential-summary-value">${new Date(credential.expiryDate).toLocaleDateString()}</div>
      `;
      summaryElement.appendChild(expiryInfo);
    }
  
    // Add close button event listeners
    const closeBtn = dialog.querySelector('.close-btn') as HTMLButtonElement;
    const closeDialogBtn = dialog.querySelector('.close-dialog-btn') as HTMLButtonElement;
  
    const closeDialog = () => {
      const dialogOverlay = document.querySelector('.dialog-overlay') as HTMLElement;
      if (dialogOverlay) {
        dialogOverlay.remove();
      }
    };
  
    // Add verify button
    const verifyBtn = document.createElement('button');
    verifyBtn.className = 'secondary-button';
    verifyBtn.textContent = 'Verify on Blockchain';
    verifyBtn.style.marginRight = 'auto'; // Push to left side
  
    verifyBtn.addEventListener('click', async () => {
      verifyBtn.disabled = true;
      verifyBtn.textContent = 'Verifying...';
      
      const result = await CredentialVerifier.verifyCredential(credential.id);
      
      verifyBtn.disabled = false;
      verifyBtn.textContent = 'Verify on Blockchain';
      
      // Show verification result
      const resultElement = document.createElement('div');
      resultElement.className = result.verified ? 'status success' : 'status error';
      resultElement.textContent = result.message;
      resultElement.style.marginTop = '10px';
      
      const footerElement = dialog.querySelector('.dialog-footer');
      if (footerElement) {
        // Remove any previous result
        const existingResult = footerElement.parentElement?.querySelector('.status');
        if (existingResult) {
          existingResult.remove();
        }
        
        footerElement.parentElement?.insertBefore(resultElement, footerElement);
      }
    });
  
    // Add verify button before close button
    const dialogFooter = dialog.querySelector('.dialog-footer') as HTMLElement;
    if (dialogFooter) {
      dialogFooter.insertBefore(verifyBtn, dialogFooter.firstChild);
    }
  
    closeBtn.addEventListener('click', closeDialog);
    closeDialogBtn.addEventListener('click', closeDialog);
  
    // Save the credential to storage
    StorageService.saveCredential(credential).catch(error => {
      console.error('Error saving credential:', error);
    });
  
    // Append dialog to the document
    document.body.appendChild(dialog);
  }

  /**
   * Sets the selected contact for credential issuance
   * @param contact Contact information
   */
  public setSelectedContact(contact: Contact): void {
    console.log(`[CredentialBuilder:${this.instanceId}] setSelectedContact called with:`, contact);
    
    // Store previous state for comparison
    const previousContact = this.selectedContact;
    
    // Set the new contact
    this.selectedContact = contact;
    
    console.log(`[CredentialBuilder:${this.instanceId}] Contact selection changed:`, {
      hadContactBefore: !!previousContact,
      hasContactNow: !!this.selectedContact,
      contactName: contact.name
    });
    
    // Update issue button state immediately
    this.updateIssueButtonState();
    
    // Update visual indication
    this.updateRecipientInfo(contact);
    
    // Re-check button state after a delay
    setTimeout(() => {
      console.log(`[CredentialBuilder:${this.instanceId}] Re-checking button state after delay`);
      this.updateIssueButtonState();
    }, 100);
  }

  /**
   * Updates the visual recipient information display
   */
  private updateRecipientInfo(contact: Contact): void {
    console.log(`[CredentialBuilder:${this.instanceId}] Updating recipient info UI`);
    const subjectLabel = document.querySelector('label[for="credential-subject"]');
    
    if (subjectLabel) {
      // Check if recipient info already exists
      let recipientInfo = subjectLabel.parentElement?.querySelector('.recipient-info');

      if (!recipientInfo) {
        console.log(`[CredentialBuilder:${this.instanceId}] Creating new recipient info element`);
        recipientInfo = document.createElement('div');
        recipientInfo.className = 'recipient-info';
        subjectLabel.parentElement?.insertBefore(recipientInfo, subjectLabel.nextSibling);
      } else {
        console.log(`[CredentialBuilder:${this.instanceId}] Updating existing recipient info element`);
      }

      recipientInfo.innerHTML = `
      <small style="display: block; margin-bottom: 8px; color: #4b5563;">
        Recipient: <strong>${contact.name}</strong> 
        <span style="color: #6b7280; font-style: italic;">(${this.truncateDID(contact.did)})</span>
      </small>
    `;
    } else {
      console.warn(`[CredentialBuilder:${this.instanceId}] Subject label not found, can't update recipient info`);
    }
  }

  /**
   * Helper method to truncate a DID for display
   */
  private truncateDID(did: string): string {
    if (did.length <= 30) return did;
    return `${did.substring(0, 15)}...${did.substring(did.length - 10)}`;
  }
}
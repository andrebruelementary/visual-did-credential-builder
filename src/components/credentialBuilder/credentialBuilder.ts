// src/components/credentialBuilder/credentialBuilder.ts
import { CredentialTemplate, TemplateProperty } from '../../models/template';
import { Credential, CredentialProperty } from '../../models/credential';
import { Contact } from '../../models/contact';
import { StorageService } from '../../services/storageService';
import { TemplateService } from '../../services/templateService';
import './credentialBuilder.css';
import { TemplateSelector } from '../templateSelector/templateSelector';

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
  
  constructor(containerId: string) {
    const containerElement = document.getElementById(containerId);
    if (!containerElement) {
      throw new Error(`Container element with ID "${containerId}" not found`);
    }
    this.container = containerElement;
    
    // Load the HTML content
    this.loadHTML().then(() => {
      // Initialize elements - these assignments will override the defaults
      this.dynamicPropertiesContainer = document.getElementById('dynamic-properties') as HTMLElement;
      this.loadTemplateBtn = document.getElementById('load-template-btn') as HTMLButtonElement;
      this.saveTemplateBtn = document.getElementById('save-template-btn') as HTMLButtonElement;
      this.addPropertyBtn = document.getElementById('add-property-btn') as HTMLButtonElement;
      this.issueCredentialBtn = document.getElementById('issue-credential-btn') as HTMLButtonElement;
      this.subjectInput = document.getElementById('credential-subject') as HTMLInputElement;
      
      // Initialize event listeners
      this.initEventListeners();
    });
  }
  
  private async loadHTML(): Promise<void> {
    try {
      const response = await fetch(chrome.runtime.getURL('dist/components/credentialBuilder/credentialBuilder.html'));
      const html = await response.text();
      this.container.innerHTML = html;
    } catch (error) {
      console.error('Error loading credential builder HTML:', error);
      this.container.innerHTML = '<p>Error loading credential builder</p>';
    }
  }
  
  private initEventListeners(): void {
    this.loadTemplateBtn.addEventListener('click', this.openTemplateSelector.bind(this));
    this.saveTemplateBtn.addEventListener('click', this.saveTemplate.bind(this));
    this.addPropertyBtn.addEventListener('click', this.addEmptyProperty.bind(this));
    this.issueCredentialBtn.addEventListener('click', this.issueCredential.bind(this));
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
  
  private issueCredential(): void {
    const credential = this.gatherCredentialData();
    if (!credential) return;
    
    // In a real implementation, we would call a service to issue the credential
    // For now, just show the confirmation dialog
    this.showCredentialConfirmation(credential);
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
    
    closeBtn.addEventListener('click', closeDialog);
    closeDialogBtn.addEventListener('click', closeDialog);
    
    // Save the credential to storage
    StorageService.saveCredential(credential).catch(error => {
      console.error('Error saving credential:', error);
    });
    
    // Append dialog to the document
    document.body.appendChild(dialog);
  }
  
  // Method to be called from contact selector
  public setSelectedContact(contact: Contact): void {
    console.log('Contact received in CredentialBuilder:', contact);
    this.selectedContact = contact;
  }
}
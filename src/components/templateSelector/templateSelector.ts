import { CredentialTemplate } from '../../models/template';
import { TemplateService } from '../../services/templateService';
import { StorageService } from '../../services/storageService';
import './templateSelector.css';

export class TemplateSelector {
  private overlay: HTMLElement | null = null;
  private selectedTemplate: CredentialTemplate | null = null;
  private publicTemplates: CredentialTemplate[] = [];
  private privateTemplates: CredentialTemplate[] = [];
  
  constructor() {}
  
  public async openDialog(): Promise<CredentialTemplate | null> {
    await this.createDialog();
    
    return new Promise<CredentialTemplate | null>((resolve) => {
      if (!this.overlay) {
        resolve(null);
        return;
      }
      
      const cancelBtn = this.overlay.querySelector('.cancel-btn') as HTMLButtonElement;
      const closeBtn = this.overlay.querySelector('.close-dialog-btn') as HTMLButtonElement;
      const selectBtn = this.overlay.querySelector('.select-btn') as HTMLButtonElement;
      
      // Set up cancel button
      const closeDialog = () => {
        this.overlay?.remove();
        resolve(null);
      };
      
      cancelBtn.addEventListener('click', closeDialog);
      closeBtn.addEventListener('click', closeDialog);
      
      // Set up select button
      selectBtn.addEventListener('click', () => {
        this.overlay?.remove();
        resolve(this.selectedTemplate);
      });
      
      // Load templates
      this.loadTemplates().catch(error => {
        console.error('Error loading templates:', error);
        this.showError();
      });
    });
  }
  
  private async createDialog(): Promise<void> {
    try {
      const response = await fetch(chrome.runtime.getURL('dist/components/templateSelector/templateSelector.html'));
      const html = await response.text();
      
      // Create the overlay element
      this.overlay = document.createElement('div');
      this.overlay.innerHTML = html;
      
      // Add it to the document
      document.body.appendChild(this.overlay);
      
      // Set up tab switching
      const tabBtns = this.overlay.querySelectorAll('.tab-btn');
      tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          const button = e.currentTarget as HTMLButtonElement;
          const tab = button.getAttribute('data-tab');
          
          // Update active tab button
          tabBtns.forEach(b => b.classList.remove('active'));
          button.classList.add('active');
          
          // Show the selected tab content
          const tabContents = this.overlay!.querySelectorAll('.tab-content');
          tabContents.forEach(content => content.classList.remove('active'));
          
          const activeContent = this.overlay!.querySelector(`#${tab}-templates-tab`);
          activeContent?.classList.add('active');
        });
      });
      
      // Set up search
      const searchInput = this.overlay.querySelector('#template-search-input') as HTMLInputElement;
      searchInput.addEventListener('input', () => {
        this.filterTemplates(searchInput.value);
      });

      const suggestBtn = this.overlay?.querySelector('#suggest-template-btn') as HTMLButtonElement;
      if (suggestBtn) {
        suggestBtn.addEventListener('click', () => {
          this.suggestTemplateForPublicRepo();
        });
      }

    } catch (error) {
      console.error('Error creating template selector dialog:', error);
    }
  }
  
  private async loadTemplates(): Promise<void> {
    try {
      const templates = await TemplateService.getAllTemplates();
      this.publicTemplates = templates.publicTemplates;
      this.privateTemplates = templates.privateTemplates;
      
      // Render templates
      this.renderPublicTemplates();
      this.renderPrivateTemplates();
    } catch (error) {
      console.error('Error loading templates:', error);
      throw error;
    }
  }
  
  private renderPublicTemplates(): void {
    if (!this.overlay) return;
    
    const container = this.overlay.querySelector('#public-templates-list') as HTMLElement;
    const loadingEl = this.overlay.querySelector('#public-templates-tab .templates-loading') as HTMLElement;
    const emptyEl = this.overlay.querySelector('#public-templates-tab .templates-empty') as HTMLElement;
    
    loadingEl.classList.add('hidden');
    
    if (this.publicTemplates.length === 0) {
      emptyEl.classList.remove('hidden');
      return;
    }
    
    // Group templates by folders (if available)
    const templatesByFolder: { [key: string]: CredentialTemplate[] } = {};
    
    this.publicTemplates.forEach(template => {
      // Extract folder path from template.path if available
      let folder = 'Main';
      
      if (template.path) {
        const pathParts = template.path.split('/');
        if (pathParts.length > 1) {
          // Remove the filename
          pathParts.pop();
          folder = pathParts.join('/');
        }
      }
      
      if (!templatesByFolder[folder]) {
        templatesByFolder[folder] = [];
      }
      
      templatesByFolder[folder].push(template);
    });
    
    // Clear container
    container.innerHTML = '';
    
    // Render folders and templates
    Object.entries(templatesByFolder).forEach(([folder, templates]) => {
      if (folder === 'Main') {
        // Render templates directly
        templates.forEach(template => {
          const templateEl = this.createTemplateElement(template);
          container.appendChild(templateEl);
        });
      } else {
        // Create folder
        const folderEl = this.createFolderElement(folder, templates);
        container.appendChild(folderEl);
      }
    });
  }
  
  private renderPrivateTemplates(): void {
    if (!this.overlay) return;
    
    const container = this.overlay.querySelector('#private-templates-list') as HTMLElement;
    const loadingEl = this.overlay.querySelector('#private-templates-tab .templates-loading') as HTMLElement;
    const emptyEl = this.overlay.querySelector('#private-templates-tab .templates-empty') as HTMLElement;
    
    loadingEl.classList.add('hidden');
    
    if (this.privateTemplates.length === 0) {
      emptyEl.classList.remove('hidden');
      return;
    }
    
    // Clear container
    container.innerHTML = '';
    
    // Render templates
    this.privateTemplates.forEach(template => {
      const templateEl = this.createTemplateElement(template);
      container.appendChild(templateEl);
    });
  }
  
  private createTemplateElement(template: CredentialTemplate): HTMLElement {
    const templateItemTemplate = document.getElementById('template-item-template') as HTMLTemplateElement;
    const templateEl = templateItemTemplate.content.cloneNode(true) as DocumentFragment;
    
    const templateItem = templateEl.querySelector('.template-item') as HTMLElement;
    templateItem.setAttribute('data-template-id', template.id);
    templateItem.setAttribute('data-is-public', template.isPublic.toString());
    
    const nameEl = templateEl.querySelector('.template-item-name') as HTMLElement;
    nameEl.textContent = template.name;
    
    const descEl = templateEl.querySelector('.template-item-description') as HTMLElement;
    descEl.textContent = template.description || 'No description available';
    
    const propsEl = templateEl.querySelector('.template-item-properties') as HTMLElement;
    template.properties.forEach(prop => {
      const propTag = document.createElement('span');
      propTag.className = 'template-property-tag';
      propTag.textContent = prop.label;
      propsEl.appendChild(propTag);
    });
    
    // Add delete button for private templates
    if (!template.isPublic) {
      const actionsEl = document.createElement('div');
      actionsEl.className = 'template-item-actions';
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-template-btn icon-button';
      deleteBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          <line x1="10" y1="11" x2="10" y2="17"></line>
          <line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>
      `;
      
      // Add event listener for delete button
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent template selection when clicking delete
        this.deleteTemplate(template);
      });
      
      actionsEl.appendChild(deleteBtn);
      templateItem.appendChild(actionsEl);
    }
    
    // Set up selection
    templateItem.addEventListener('click', () => {
      // Remove selected class from all templates
      document.querySelectorAll('.template-item').forEach(item => {
        item.classList.remove('selected');
      });
      
      // Add selected class to this template
      templateItem.classList.add('selected');
      
      // Set selected template
      this.selectedTemplate = template;
      
      // Enable select button
      const selectBtn = this.overlay?.querySelector('.select-btn') as HTMLButtonElement;
      selectBtn.disabled = false;
      
      // Enable/disable suggest button based on template source
      const suggestBtn = this.overlay?.querySelector('#suggest-template-btn') as HTMLButtonElement;
      if (suggestBtn) {
        suggestBtn.disabled = template.isPublic;
      }
    });
    
    return templateItem;
  }

  private createFolderElement(folderName: string, templates: CredentialTemplate[]): HTMLElement {
    const folderTemplate = document.getElementById('template-folder-template') as HTMLTemplateElement;
    const folderEl = folderTemplate.content.cloneNode(true) as DocumentFragment;
    
    const folderNameEl = folderEl.querySelector('.folder-name') as HTMLElement;
    folderNameEl.textContent = folderName;
    
    const folderHeader = folderEl.querySelector('.folder-header') as HTMLElement;
    const folderContent = folderEl.querySelector('.folder-content') as HTMLElement;
    const expandBtn = folderEl.querySelector('.expand-folder-btn') as HTMLButtonElement;
    
    // Add templates to folder
    templates.forEach(template => {
      const templateEl = this.createTemplateElement(template);
      folderContent.appendChild(templateEl);
    });
    
    // Set up expansion toggle
    const toggleFolder = () => {
      folderContent.classList.toggle('hidden');
      expandBtn.classList.toggle('expanded');
    };
    
    folderHeader.addEventListener('click', toggleFolder);
    
    return folderEl.querySelector('.template-folder') as HTMLElement;
  }

  private async deleteTemplate(template: CredentialTemplate): Promise<void> {
    // Show confirmation dialog
    const confirmDelete = confirm(`Are you sure you want to delete the template "${template.name}"?`);
    
    if (!confirmDelete) {
      return; // User canceled
    }
    
    try {
      // Delete from storage
      await StorageService.deletePrivateTemplate(template.id);
      
      // Update UI - remove the template from the list
      const templateItem = this.overlay?.querySelector(`.template-item[data-template-id="${template.id}"]`);
      if (templateItem) {
        templateItem.remove();
      }
      
      // Clear selection if this was the selected template
      if (this.selectedTemplate?.id === template.id) {
        this.selectedTemplate = null;
        const selectBtn = this.overlay?.querySelector('.select-btn') as HTMLButtonElement;
        if (selectBtn) {
          selectBtn.disabled = true;
        }
      }
      
      // Check if there are no templates left
      const remainingTemplates = this.overlay?.querySelectorAll('#private-templates-list .template-item');
      if (remainingTemplates?.length === 0) {
        const emptyEl = this.overlay?.querySelector('#private-templates-tab .templates-empty') as HTMLElement;
        if (emptyEl) {
          emptyEl.classList.remove('hidden');
        }
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Failed to delete template. Please try again.');
    }
  }

  private suggestTemplateForPublicRepo(): void {
    if (!this.selectedTemplate || this.selectedTemplate.isPublic) {
      alert('Please select a private template to suggest for the public repository.');
      return;
    }
    
    // Format the template as a JSON string for GitHub issue
    const templateJson = JSON.stringify(this.selectedTemplate, null, 2);
    
    // Create GitHub issue URL with prefilled template content
    const repoOwner = 'andrebruelementary';
    const repoName = 'verifiable-credential-templates';
    const issueTitle = encodeURIComponent(`Template Suggestion: ${this.selectedTemplate.name}`);
    const issueBody = encodeURIComponent(
      `## Template Suggestion\n\n` +
      `I'd like to suggest this template for inclusion in the public repository.\n\n` +
      `### Template JSON\n\n` +
      `\`\`\`json\n${templateJson}\n\`\`\`\n\n` +
      `### Additional Comments\n\n` +
      `(Add any additional information about this template here)`
    );
    
    const issueUrl = `https://github.com/${repoOwner}/${repoName}/issues/new?title=${issueTitle}&body=${issueBody}`;
    
    // Open GitHub issue creation page in a new tab
    window.open(issueUrl, '_blank');
  }
  
  private filterTemplates(query: string): void {
    if (!this.overlay) return;
    
    const normalizedQuery = query.toLowerCase().trim();
    
    // Filter public templates
    const publicItems = this.overlay.querySelectorAll('#public-templates-list .template-item');
    publicItems.forEach(item => {
      const name = item.querySelector('.template-item-name')?.textContent || '';
      const description = item.querySelector('.template-item-description')?.textContent || '';
      
      if (name.toLowerCase().includes(normalizedQuery) || description.toLowerCase().includes(normalizedQuery)) {
        item.classList.remove('hidden');
      } else {
        item.classList.add('hidden');
      }
    });
    
    // Filter private templates
    const privateItems = this.overlay.querySelectorAll('#private-templates-list .template-item');
    privateItems.forEach(item => {
      const name = item.querySelector('.template-item-name')?.textContent || '';
      const description = item.querySelector('.template-item-description')?.textContent || '';
      
      if (name.toLowerCase().includes(normalizedQuery) || description.toLowerCase().includes(normalizedQuery)) {
        item.classList.remove('hidden');
      } else {
        item.classList.add('hidden');
      }
    });
    
    // Hide empty folders
    const folders = this.overlay.querySelectorAll('.template-folder');
    folders.forEach(folder => {
      const visibleItems = folder.querySelectorAll('.template-item:not(.hidden)').length;
      if (visibleItems === 0) {
        folder.classList.add('hidden');
      } else {
        folder.classList.remove('hidden');
      }
    });
  }
  
  private showError(): void {
    if (!this.overlay) return;
    
    const publicLoadingEl = this.overlay.querySelector('#public-templates-tab .templates-loading') as HTMLElement;
    const publicErrorEl = this.overlay.querySelector('#public-templates-tab .templates-error') as HTMLElement;
    
    const privateLoadingEl = this.overlay.querySelector('#private-templates-tab .templates-loading') as HTMLElement;
    const privateErrorEl = this.overlay.querySelector('#private-templates-tab .templates-error') as HTMLElement;
    
    publicLoadingEl.classList.add('hidden');
    publicErrorEl.classList.remove('hidden');
    
    privateLoadingEl.classList.add('hidden');
    privateErrorEl.classList.remove('hidden');
  }
}
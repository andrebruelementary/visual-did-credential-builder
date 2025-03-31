// Template selector for loading credential templates
class TemplateSelector {
    constructor() {
      this.selectedTemplate = null;
      this.publicTemplates = [];
      this.privateTemplates = [];
    }
    
    async openDialog() {
      await this.createDialog();
      
      return new Promise((resolve) => {
        const overlay = document.querySelector('.template-selector-overlay');
        if (!overlay) {
          resolve(null);
          return;
        }
        
        const cancelBtn = overlay.querySelector('.cancel-btn');
        const closeBtn = overlay.querySelector('.close-dialog-btn');
        const selectBtn = overlay.querySelector('.select-btn');
        
        // Set up cancel button
        const closeDialog = () => {
          overlay.remove();
          resolve(null);
        };
        
        cancelBtn.addEventListener('click', closeDialog);
        closeBtn.addEventListener('click', closeDialog);
        
        // Set up select button
        selectBtn.addEventListener('click', () => {
          overlay.remove();
          resolve(this.selectedTemplate);
        });
        
        // Load templates
        this.loadTemplates();
      });
    }
    
    async createDialog() {
      // Create the overlay element
      const overlay = document.createElement('div');
      overlay.className = 'template-selector-overlay';
      overlay.innerHTML = `
        <div class="template-selector-dialog">
          <div class="dialog-header">
            <h2>Select Credential Template</h2>
            <button class="icon-button close-dialog-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          
          <div class="template-tabs">
            <button class="tab-btn active" data-tab="public">Public Templates</button>
            <button class="tab-btn" data-tab="private">Private Templates</button>
          </div>
          
          <div class="template-search">
            <input type="text" id="template-search-input" placeholder="Search templates...">
          </div>
          
          <div class="tab-content active" id="public-templates-tab">
            <div class="templates-loading">Loading public templates...</div>
            <div class="templates-list" id="public-templates-list"></div>
            <div class="templates-empty hidden">No public templates found.</div>
            <div class="templates-error hidden">Error loading templates.</div>
          </div>
          
          <div class="tab-content" id="private-templates-tab">
            <div class="templates-loading">Loading private templates...</div>
            <div class="templates-list" id="private-templates-list"></div>
            <div class="templates-empty hidden">No private templates found. Save templates to your local storage.</div>
            <div class="templates-error hidden">Error loading templates.</div>
            
            <div class="suggest-template-container">
              <button id="suggest-template-btn" class="secondary-button" disabled>Suggest Selected Template for Public Repository</button>
            </div>
          </div>
          
          <div class="dialog-footer">
            <button class="secondary-button cancel-btn">Cancel</button>
            <button class="primary-button select-btn" disabled>Select Template</button>
          </div>
        </div>
      `;
      
      // Add it to the document
      document.body.appendChild(overlay);
      
      // Add CSS for the template selector
      const style = document.createElement('style');
      style.textContent = `
        .template-selector-overlay {
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
        
        .template-selector-dialog {
          background-color: white;
          border-radius: 8px;
          width: 90%;
          max-width: 800px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
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
        
        .template-tabs {
          display: flex;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .tab-btn {
          padding: 12px 20px;
          background-color: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          cursor: pointer;
          font-weight: 500;
          color: #6b7280;
          transition: all 0.2s;
        }
        
        .tab-btn.active {
          color: #6366f1;
          border-bottom-color: #6366f1;
        }
        
        .tab-btn:hover:not(.active) {
          color: #4b5563;
          background-color: #f9fafb;
        }
        
        .template-search {
          padding: 15px 20px;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .template-search input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 14px;
        }
        
        .tab-content {
          flex: 1;
          overflow-y: auto;
          padding: 15px 20px;
          display: none;
        }
        
        .tab-content.active {
          display: block;
        }
        
        .templates-loading, 
        .templates-empty, 
        .templates-error {
          padding: 20px;
          text-align: center;
          color: #6b7280;
        }
        
        .hidden {
          display: none !important;
        }
        
        .suggest-template-container {
          margin-top: 20px;
          text-align: center;
          padding: 10px;
          border-top: 1px solid #e5e7eb;
        }
  
        .templates-list {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        
        .template-item {
          position: relative;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 15px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .template-item:hover {
          border-color: #6366f1;
          background-color: #f9fafb;
        }
        
        .template-item.selected {
          border-color: #6366f1;
          background-color: #eff6ff;
        }
        
        .template-item-name {
          margin: 0 0 5px 0;
          font-size: 1rem;
          font-weight: 600;
        }
        
        .template-item-description {
          margin: 0 0 10px 0;
          color: #6b7280;
          font-size: 0.875rem;
        }
        
        .template-item-properties {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
        }
        
        .template-property-tag {
          background-color: #e5e7eb;
          color: #4b5563;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
        }
        
        .template-folder {
          margin-bottom: 10px;
        }
  
        .template-item-actions {
          position: absolute;
          top: 10px;
          right: 10px;
          display: flex;
          gap: 5px;
        }
        
        .delete-template-btn {
          color: #6b7280;
          transition: color 0.2s;
        }
        
        .delete-template-btn:hover {
          color: #ef4444;
        }
        
        .template-item-info {
          padding-right: 30px;
        }
        
        .folder-header {
          display: flex;
          align-items: center;
          padding: 8px 10px;
          background-color: #f9fafb;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .folder-header svg {
          margin-right: 8px;
          color: #6b7280;
        }
        
        .folder-name {
          flex: 1;
          font-weight: 500;
        }
        
        .folder-content {
          padding-left: 20px;
          margin-top: 5px;
        }
        
        .dialog-footer {
          padding: 15px 20px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }
      `;
      document.head.appendChild(style);
      
      // Set up tab switching
      const tabBtns = overlay.querySelectorAll('.tab-btn');
      tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          const button = e.currentTarget;
          const tab = button.getAttribute('data-tab');
          
          // Update active tab button
          tabBtns.forEach(b => b.classList.remove('active'));
          button.classList.add('active');
          
          // Show the selected tab content
          const tabContents = overlay.querySelectorAll('.tab-content');
          tabContents.forEach(content => content.classList.remove('active'));
          
          const activeContent = overlay.querySelector(`#${tab}-templates-tab`);
          activeContent?.classList.add('active');
        });
      });
      
      // Set up search
      const searchInput = overlay.querySelector('#template-search-input');
      searchInput.addEventListener('input', () => {
        this.filterTemplates(searchInput.value);
      });
  
      const suggestBtn = overlay.querySelector('#suggest-template-btn');
      if (suggestBtn) {
        suggestBtn.addEventListener('click', () => {
          this.suggestTemplateForPublicRepo();
        });
      }
    }
    
    loadTemplates() {
      // Load public templates
      this.loadPublicTemplates();
      
      // Load private templates
      this.loadPrivateTemplates();
    }
    
    loadPublicTemplates() {
      const overlay = document.querySelector('.template-selector-overlay');
      const loadingEl = overlay.querySelector('#public-templates-tab .templates-loading');
      const listEl = overlay.querySelector('#public-templates-list');
      const emptyEl = overlay.querySelector('#public-templates-tab .templates-empty');
      
      // Sample templates for demo
      this.publicTemplates = [
        {
          id: 'course-completion',
          name: 'Course Completion Certificate',
          description: 'Certificate of completion for a course',
          properties: [
            { id: 'name', label: 'Name issued to', type: 'text', required: true },
            { id: 'expiryDate', label: 'Credential expiry date', type: 'date', required: false },
            { id: 'courseName', label: 'Course name', type: 'text', required: true },
            { id: 'grade', label: 'Grade', type: 'text', required: false }
          ],
          isPublic: true,
          source: 'identus'
        },
        {
          id: 'university-diploma',
          name: 'University Diploma',
          description: 'Official university degree diploma',
          properties: [
            { id: 'name', label: 'Graduate name', type: 'text', required: true },
            { id: 'degree', label: 'Degree', type: 'text', required: true },
            { id: 'university', label: 'University', type: 'text', required: true },
            { id: 'graduationDate', label: 'Graduation date', type: 'date', required: true }
          ],
          isPublic: true,
          source: 'identus'
        },
        {
          id: 'professional-certification',
          name: 'Professional Certification',
          description: 'Certification for professional skills',
          properties: [
            { id: 'name', label: 'Recipient name', type: 'text', required: true },
            { id: 'certification', label: 'Certification name', type: 'text', required: true },
            { id: 'issuer', label: 'Issuing organization', type: 'text', required: true },
            { id: 'issueDate', label: 'Issue date', type: 'date', required: true },
            { id: 'expiryDate', label: 'Expiry date', type: 'date', required: false }
          ],
          isPublic: true,
          source: 'identus'
        }
      ];
      
      // Hide loading, show templates
      loadingEl.classList.add('hidden');
      
      if (this.publicTemplates.length === 0) {
        emptyEl.classList.remove('hidden');
        return;
      }
      
      // Clear container
      listEl.innerHTML = '';
      
      // Add templates
      this.publicTemplates.forEach(template => {
        const templateEl = this.createTemplateElement(template);
        listEl.appendChild(templateEl);
      });
    }
    
    loadPrivateTemplates() {
      const overlay = document.querySelector('.template-selector-overlay');
      const loadingEl = overlay.querySelector('#private-templates-tab .templates-loading');
      const listEl = overlay.querySelector('#private-templates-list');
      const emptyEl = overlay.querySelector('#private-templates-tab .templates-empty');
      
      // Load from storage
      chrome.storage.local.get(['credential_templates'], (result) => {
        this.privateTemplates = result.credential_templates || [];
        
        // Hide loading
        loadingEl.classList.add('hidden');
        
        if (this.privateTemplates.length === 0) {
          emptyEl.classList.remove('hidden');
          return;
        }
        
        // Clear container
        listEl.innerHTML = '';
        
        // Add templates
        this.privateTemplates.forEach(template => {
          const templateEl = this.createTemplateElement(template);
          listEl.appendChild(templateEl);
        });
      });
    }
    
    createTemplateElement(template) {
      const templateItem = document.createElement('div');
      templateItem.className = 'template-item';
      templateItem.setAttribute('data-template-id', template.id);
      templateItem.setAttribute('data-is-public', template.isPublic.toString());
      
      const templateContent = document.createElement('div');
      templateContent.className = 'template-item-info';
      
      const nameEl = document.createElement('h3');
      nameEl.className = 'template-item-name';
      nameEl.textContent = template.name;
      
      const descEl = document.createElement('p');
      descEl.className = 'template-item-description';
      descEl.textContent = template.description || 'No description available';
      
      const propsEl = document.createElement('div');
      propsEl.className = 'template-item-properties';
      
      template.properties.forEach(prop => {
        const propTag = document.createElement('span');
        propTag.className = 'template-property-tag';
        propTag.textContent = prop.label;
        propsEl.appendChild(propTag);
      });
      
      templateContent.appendChild(nameEl);
      templateContent.appendChild(descEl);
      templateContent.appendChild(propsEl);
      templateItem.appendChild(templateContent);
      
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
        const selectBtn = document.querySelector('.select-btn');
        if (selectBtn) {
          selectBtn.disabled = false;
        }
        
        // Enable/disable suggest button based on template source
        const suggestBtn = document.querySelector('#suggest-template-btn');
        if (suggestBtn) {
          suggestBtn.disabled = template.isPublic;
        }
      });
      
      return templateItem;
    }
    
    deleteTemplate(template) {
      // Show confirmation dialog
      const confirmDelete = confirm(`Are you sure you want to delete the template "${template.name}"?`);
      
      if (!confirmDelete) {
        return; // User canceled
      }
      
      // Delete from storage
      chrome.storage.local.get(['credential_templates'], (result) => {
        const templates = result.credential_templates || [];
        const filteredTemplates = templates.filter(t => t.id !== template.id);
        
        chrome.storage.local.set({ credential_templates: filteredTemplates }, () => {
          // Update UI - remove the template from the list
          const templateItem = document.querySelector(`.template-item[data-template-id="${template.id}"]`);
          if (templateItem) {
            templateItem.remove();
          }
          
          // Clear selection if this was the selected template
          if (this.selectedTemplate?.id === template.id) {
            this.selectedTemplate = null;
            const selectBtn = document.querySelector('.select-btn');
            if (selectBtn) {
              selectBtn.disabled = true;
            }
          }
          
          // Update private templates list
          this.privateTemplates = filteredTemplates;
          
          // Check if there are no templates left
          if (this.privateTemplates.length === 0) {
            const emptyEl = document.querySelector('#private-templates-tab .templates-empty');
            if (emptyEl) {
              emptyEl.classList.remove('hidden');
            }
          }
        });
      });
    }
    
    suggestTemplateForPublicRepo() {
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
    
    filterTemplates(query) {
      const normalizedQuery = query.toLowerCase().trim();
      
      // Filter public templates
      const publicItems = document.querySelectorAll('#public-templates-list .template-item');
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
      const privateItems = document.querySelectorAll('#private-templates-list .template-item');
      privateItems.forEach(item => {
        const name = item.querySelector('.template-item-name')?.textContent || '';
        const description = item.querySelector('.template-item-description')?.textContent || '';
        
        if (name.toLowerCase().includes(normalizedQuery) || description.toLowerCase().includes(normalizedQuery)) {
          item.classList.remove('hidden');
        } else {
          item.classList.add('hidden');
        }
      });
    }
  }
  
  // Expose the class globally
  window.TemplateSelector = TemplateSelector;
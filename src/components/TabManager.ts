// src/components/TabManager.ts
/**
* Manages tab switching for the extension UI
*/
export class TabManager {
    private tabs: Map<string, HTMLElement> = new Map();
    private tabContents: Map<string, HTMLElement> = new Map();
    private activeTabId: string | null = null;
    private eventListeners: Map<string, Set<Function>> = new Map();
   
    /**
     * Initialize the tab manager
     * @param tabSelector CSS selector for tab elements
     * @param contentSelector CSS selector for tab content elements
     * @param tabAttribute Attribute containing tab ID
     * @param defaultTabId Default tab to show
     */
    public initialize(
      tabSelector: string,
      contentSelector: string,
      tabAttribute: string = 'data-tab',
      defaultTabId: string = 'setup'
    ): void {
      // Find all tab elements
      const tabElements = document.querySelectorAll<HTMLElement>(tabSelector);
      
      // Find all tab content elements
      const contentElements = document.querySelectorAll<HTMLElement>(contentSelector);
      
      console.log(`Found ${tabElements.length} tabs and ${contentElements.length} content sections`);
      
      // Store tabs and contents
      tabElements.forEach(tab => {
        const tabId = tab.getAttribute(tabAttribute);
        if (tabId) {
          this.tabs.set(tabId, tab);
        }
      });
      
      contentElements.forEach(content => {
        const contentId = content.id;
        if (contentId) {
          // Extract tab ID from content ID (e.g., "setup-tab" -> "setup")
          const tabId = contentId.replace(/-tab$/, '');
          this.tabContents.set(tabId, content);
        }
      });
      
      // Add click handlers to tabs
      tabElements.forEach(tab => {
        tab.addEventListener('click', () => {
          const tabId = tab.getAttribute(tabAttribute);
          if (tabId) {
            this.activateTab(tabId);
          }
        });
      });
      
      // Activate default tab
      if (defaultTabId && this.tabs.has(defaultTabId)) {
        this.activateTab(defaultTabId);
      } else if (this.tabs.size > 0) {
        // If default tab not found, activate the first one
        this.activateTab(this.tabs.keys().next()?.value || '');
      }
    }
   
    /**
     * Activate a specific tab
     * @param tabId ID of tab to activate
     */
    public activateTab(tabId: string): void {
      if (!this.tabs.has(tabId)) {
        console.error(`Tab "${tabId}" not found`);
        return;
      }
      
      // Deactivate current tab
      if (this.activeTabId) {
        const activeTab = this.tabs.get(this.activeTabId);
        const activeContent = this.tabContents.get(this.activeTabId);
        
        activeTab?.classList.remove('active');
        activeContent?.classList.remove('active');
      }
      
      // Activate new tab
      const newTab = this.tabs.get(tabId);
      const newContent = this.tabContents.get(tabId);
      
      newTab?.classList.add('active');
      newContent?.classList.add('active');
      
      // Update active tab
      this.activeTabId = tabId;
      
      // Emit tab change event
      this.emitEvent('tab-changed', tabId);
      
      console.log(`Activated tab: ${tabId}`);
    }
   
    /**
     * Get the currently active tab ID
     */
    public getActiveTabId(): string | null {
      return this.activeTabId;
    }
   
    /**
     * Disable a tab
     * @param tabId ID of tab to disable
     */
    public disableTab(tabId: string): void {
      const tab = this.tabs.get(tabId);
      if (tab) {
        tab.classList.add('disabled');
        tab.setAttribute('disabled', 'true');
      }
    }
   
    /**
     * Enable a tab
     * @param tabId ID of tab to enable
     */
    public enableTab(tabId: string): void {
      const tab = this.tabs.get(tabId);
      if (tab) {
        tab.classList.remove('disabled');
        tab.removeAttribute('disabled');
      }
    }
   
    /**
     * Check if a tab is enabled
     * @param tabId ID of tab to check
     */
    public isTabEnabled(tabId: string): boolean {
      const tab = this.tabs.get(tabId);
      return tab ? !tab.hasAttribute('disabled') : false;
    }
   
    /**
     * Register event listener
     * @param event Event name
     * @param callback Callback function
     */
    public on(event: string, callback: Function): void {
      if (!this.eventListeners.has(event)) {
        this.eventListeners.set(event, new Set());
      }
      this.eventListeners.get(event)?.add(callback);
    }
   
    /**
     * Remove event listener
     * @param event Event name
     * @param callback Callback function
     */
    public off(event: string, callback: Function): void {
      if (this.eventListeners.has(event)) {
        this.eventListeners.get(event)?.delete(callback);
      }
    }
   
    /**
     * Emit event to listeners
     * @param event Event name
     * @param data Event data
     */
    private emitEvent(event: string, data: any): void {
      if (this.eventListeners.has(event)) {
        this.eventListeners.get(event)?.forEach(callback => {
          try {
            callback(data);
          } catch (e) {
            console.error(`Error in event listener for ${event}:`, e);
          }
        });
      }
    }
   }
   
   // Export a singleton instance
   export const tabManager = new TabManager();
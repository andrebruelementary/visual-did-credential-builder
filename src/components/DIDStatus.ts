export class DIDStatus {
    private statusContainer: HTMLElement;
    
    constructor(containerId: string) {
      this.statusContainer = document.getElementById(containerId) as HTMLElement;
      if (!this.statusContainer) {
        throw new Error(`Container ${containerId} not found`);
      }
    }
    
    public updateStatus(status: string, didId: string): void {
      // Clear previous status
      this.statusContainer.innerHTML = '';
      
      // Create status element
      const statusElement = document.createElement('div');
      statusElement.className = `did-status did-status-${status.toLowerCase()}`;
      
      // Add status icon
      const iconElement = document.createElement('span');
      iconElement.className = 'status-icon';
      
      switch (status.toLowerCase()) {
        case 'pending':
          iconElement.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          `;
          break;
        case 'published':
          iconElement.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          `;
          break;
        case 'failed':
          iconElement.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
          `;
          break;
        default:
          iconElement.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
          `;
      }
      
      statusElement.appendChild(iconElement);
      
      // Add status text
      const textElement = document.createElement('span');
      textElement.className = 'status-text';
      textElement.textContent = status;
      statusElement.appendChild(textElement);
      
      // Add DID ID (truncated)
      const didElement = document.createElement('div');
      didElement.className = 'status-did';
      didElement.textContent = this.truncateDID(didId);
      statusElement.appendChild(didElement);
      
      this.statusContainer.appendChild(statusElement);
    }
    
    private truncateDID(did: string): string {
      if (did.length <= 30) return did;
      return `${did.substring(0, 15)}...${did.substring(did.length - 10)}`;
    }
  }
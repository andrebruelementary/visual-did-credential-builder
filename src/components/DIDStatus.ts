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

    // Add more detailed message based on status
    const messageElement = document.createElement('div');
    messageElement.className = 'status-message';

    switch (status.toLowerCase()) {
      case 'pending':
        messageElement.textContent = 'Your DID is being published to the blockchain. This may take a few minutes...';
        // Add animated spinner
        const spinner = document.createElement('div');
        spinner.className = 'status-spinner';
        spinner.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-spin">
            <circle cx="12" cy="12" r="10" stroke-dasharray="40" stroke-dashoffset="10"></circle>
            <path d="M12 6v2"></path>
          </svg>
        `;
        messageElement.appendChild(spinner);
        break;
      case 'published':
        messageElement.textContent = 'Your DID has been successfully published to the blockchain and is now available for use.';
        break;
      case 'failed':
        messageElement.textContent = 'Publication of your DID to the blockchain failed or timed out. You can try again later.';

        // Add a retry button
        const retryButton = document.createElement('button');
        retryButton.className = 'retry-button';
        retryButton.textContent = 'Retry Publication';
        retryButton.addEventListener('click', () => {
          // Dispatch a custom event that popup.ts can listen for
          const event = new CustomEvent('retry-did-publish', { detail: { didId } });
          document.dispatchEvent(event);
        });
        messageElement.appendChild(retryButton);
        break;
      default:
        messageElement.textContent = `DID status: ${status}`;
    }

    statusElement.appendChild(messageElement);

    // Add timestamp
    const timestampElement = document.createElement('div');
    timestampElement.className = 'status-timestamp';
    timestampElement.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
    statusElement.appendChild(timestampElement);

    this.statusContainer.appendChild(statusElement);

    // Animate the status update
    setTimeout(() => {
      statusElement.classList.add('status-visible');
    }, 10);
  }

  private truncateDID(did: string): string {
    if (did.length <= 30) return did;
    return `${did.substring(0, 15)}...${did.substring(did.length - 10)}`;
  }

  /**
   * Add a CSS class to style the status animation
   */
  private addStatusStyles(): void {
    if (!document.getElementById('did-status-styles')) {
      const styleElement = document.createElement('style');
      styleElement.id = 'did-status-styles';
      styleElement.textContent = `
        .did-status {
          opacity: 0;
          transform: translateY(10px);
          transition: opacity 0.3s ease, transform 0.3s ease;
        }
        
        .status-visible {
          opacity: 1;
          transform: translateY(0);
        }
        
        .status-spinner svg {
          animation: spin 1.5s linear infinite;
          margin-left: 8px;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .status-message {
          margin-top: 8px;
          font-size: 14px;
        }
        
        .status-timestamp {
          margin-top: 8px;
          font-size: 12px;
          color: #666;
          text-align: right;
        }
        
        .retry-button {
          margin-top: 8px;
          padding: 6px 12px;
          background-color: #6b7280;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        }
        
        .retry-button:hover {
          background-color: #4b5563;
        }
      `;
      document.head.appendChild(styleElement);
    }
  }

  /**
   * Initialize the component and add the necessary styles
   */
  public initialize(): void {
    this.addStatusStyles();
  }
}
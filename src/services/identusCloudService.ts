import { CredentialTemplate } from '../models/template';
import { Contact } from '../models/contact';
import { DIDInfo, DIDType } from '../didManager';

export interface DIDRegistrarResponse {
  did: string;
  longFormDid?: string;
  status: 'CREATED' | 'PUBLICATION_PENDING' | 'PUBLISHED' | 'failed';
  didDocumentMetadata?: any;
  didDocument?: any;  // Add this property
}

export interface ManagedDIDPage {
  self: string;
  kind: 'ManagedDIDPage';
  pageOf: string;
  contents: DIDRegistrarResponse[];
}

export interface CreateManagedDIDResponse {
  did: string;
  longFormDid?: string;
  status: string;
  didDocument?: any;
}

export interface ScheduledOperation {
  scheduledOperation: {
    didRef: string;
    id: string;
  };
}

export class IdentusCloudService {
  private baseUrl: string;
  private apiKey: string | null;
  
  constructor(baseUrl: string, apiKey?: string) {
    // Ensure baseUrl includes /cloud-agent/ if not already included
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
    if (!this.baseUrl.includes('/cloud-agent/')) {
      this.baseUrl += 'cloud-agent/';
    }
    this.apiKey = apiKey || null;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    if (this.apiKey) {
      headers['apikey'] = this.apiKey;
    }
    
    return headers;
  }

  /**
   * Check operation status
   */
  public async checkOperationStatus(operationId: string): Promise<{
    status: 'pending' | 'published' | 'failed';
    details?: any;
  }> {
    try {
      // Use the DID status endpoint to check operation status
      console.log(`Checking operation status via Cloud API`);
      
      // Since the API doesn't have a specific operation status endpoint,
      // we'll check the did status instead
      console.log('Operation status checking not implemented in Cloud API');
      
      return {
        status: 'pending'
      };
    } catch (error) {
      console.error('Error checking operation status:', error);
      return { status: 'failed' };
    }
  }

      /**
     * Resolve a DID
     */
  public async resolveDID(didString: string): Promise<any> {
    try {
      console.log(`Resolving DID via Cloud API - URL: ${this.baseUrl}dids/${didString}`);
      
      const response = await fetch(`${this.baseUrl}dids/${didString}`, {
        headers: this.getHeaders()
      });

      console.log(`Response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('DID resolution response:', data);
      
      return data;
    } catch (error) {
      console.error('Error resolving DID:', error);
      throw error;
    }
  }

  /**
   * Create a new DID in the agent's wallet
   */
  public async createDID(didType: DIDType = DIDType.ISSUER): Promise<{
    success: boolean;
    did?: CreateManagedDIDResponse;
    error?: string;
  }> {
    try {
      console.log(`Creating DID via Cloud API - URL: ${this.baseUrl}did-registrar/dids`);
      
      // Define different templates based on DID type
      let documentTemplate;
      
      switch (didType) {
        case DIDType.ISSUER:
          documentTemplate = {
            publicKeys: [
              {
                id: "auth-1",
                purpose: "authentication",
                curve: "secp256k1"
              },
              {
                id: "issue-1",
                purpose: "assertionMethod",
                curve: "secp256k1"
              },
              {
                id: "auth-2",
                purpose: "authentication",
                curve: "secp256k1"
              }
            ],
            services: []
          };
          break;
          
        case DIDType.HOLDER:
          documentTemplate = {
            publicKeys: [
              {
                id: "auth-1",
                purpose: "authentication",
                curve: "Ed25519"
              },
              {
                id: "auth-2",
                purpose: "authentication",
                curve: "Ed25519"
              }
            ],
            services: []
          };
          break;
          
        case DIDType.VERIFIER:
          documentTemplate = {
            publicKeys: [
              {
                id: "auth-1",
                purpose: "authentication",
                curve: "secp256k1"
              },
              {
                id: "verify-1",
                purpose: "assertionMethod",
                curve: "secp256k1"
              },
              {
                id: "auth-2",
                purpose: "authentication",
                curve: "secp256k1"
              }
            ],
            services: []
          };
          break;
      }
      
      const response = await fetch(`${this.baseUrl}did-registrar/dids`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          documentTemplate
        })
      });

      console.log(`Response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('DID creation response:', data);
      
      return {
        success: true,
        did: data
      };
    } catch (error) {
      console.error('Error creating DID via Cloud API:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get the DID document for a specific DID
   */
  public async getDIDDocument(didString: string): Promise<{
    success: boolean;
    didDocument?: any;
    error?: string;
  }> {
    try {
      console.log(`Getting DID document via Cloud API - URL: ${this.baseUrl}dids/${didString}`);
      
      const response = await fetch(`${this.baseUrl}dids/${didString}`, {
        headers: this.getHeaders()
      });

      console.log(`Response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('DID document response:', data);
      
      return {
        success: true,
        didDocument: data
      };
    } catch (error) {
      console.error('Error getting DID document:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Publish a DID to the blockchain
   */
  public async publishDID(didString: string): Promise<{
    success: boolean;
    operation?: ScheduledOperation;
    error?: string;
  }> {
    try {
      console.log(`Publishing DID via Cloud API - URL: ${this.baseUrl}did-registrar/dids/${didString}/publications`);
      
      const response = await fetch(`${this.baseUrl}did-registrar/dids/${didString}/publications`, {
        method: 'POST',
        headers: this.getHeaders()
      });

      console.log(`Response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('DID publication response:', data);
      
      return {
        success: true,
        operation: data
      };
    } catch (error) {
      console.error('Error publishing DID via Cloud API:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get the status of a DID
   */
  public async getDIDStatus(didString: string): Promise<{
    status: 'CREATED' | 'PUBLICATION_PENDING' | 'PUBLISHED' | 'failed';
    details?: any;
  }> {
    try {
      console.log(`Getting DID status via Cloud API - URL: ${this.baseUrl}did-registrar/dids/${didString}`);
      
      const response = await fetch(`${this.baseUrl}did-registrar/dids/${didString}`, {
        headers: this.getHeaders()
      });

      console.log(`Response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('DID status response:', data);
      
      // Map cloud API status to our internal status
      let mappedStatus: 'CREATED' | 'PUBLICATION_PENDING' | 'PUBLISHED' | 'failed';
      
      switch(data.status) {
        case 'CREATED':
          mappedStatus = 'CREATED';
          break;
        case 'PUBLICATION_PENDING':
          mappedStatus = 'PUBLICATION_PENDING';
          break;
        case 'PUBLISHED':
          mappedStatus = 'PUBLISHED';
          break;
        default:
          mappedStatus = 'failed';
      }
      
      return {
        status: mappedStatus,
        details: data
      };
    } catch (error) {
      console.error('Error getting DID status:', error);
      return { status: 'failed' };
    }
  }

  /**
   * Get all DIDs in the agent's wallet
   */
  public async getAllDIDs(): Promise<{
    success: boolean;
    dids?: DIDRegistrarResponse[];
    error?: string;
  }> {
    try {
      console.log(`Getting all DIDs via Cloud API - URL: ${this.baseUrl}did-registrar/dids`);
      
      const response = await fetch(`${this.baseUrl}did-registrar/dids`, {
        headers: this.getHeaders()
      });

      console.log(`Response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error ${response.status}: ${errorText}`);
      }

      const data: ManagedDIDPage = await response.json();
      console.log('All DIDs response:', data);
      
      return {
        success: true,
        dids: data.contents
      };
    } catch (error) {
      console.error('Error getting all DIDs:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Test connection to the Cloud API
   */
  public async testConnection(): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Use the correct health endpoint
      const baseUrlWithoutCloudAgent = this.baseUrl;
      const healthUrl = `${baseUrlWithoutCloudAgent}_system/health`;
      
      console.log(`Testing connection to Cloud API - URL: ${healthUrl}`);
      
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      console.log(`Response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('Connection test successful:', data);
      
      return {
        success: true
      };
    } catch (error) {
      console.error('Connection test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get all connections (contacts) from the cloud agent
   */
  public async getAllConnections(): Promise<{
    success: boolean;
    connections?: Array<{
      connectionId: string;
      state: string;
      theirDid?: string;
      invitation?: any;
      createdAt?: string;
    }>;
    error?: string;
  }> {
    try {
      console.log(`Getting all connections via Cloud API - URL: ${this.baseUrl}connections`);
      
      const response = await fetch(`${this.baseUrl}connections`, {
        headers: this.getHeaders()
      });

      console.log(`Response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('Connections response:', data);
      
      // Extract connections from the response
      const connections = data.contents || [];
      
      return {
        success: true,
        connections: connections
      };
    } catch (error) {
      console.error('Error getting connections:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get contacts suitable for receiving credentials (from DIDs and connections)
   */
  public async getContactsForCredentialRecipients(): Promise<{
    success: boolean;
    contacts?: Contact[];
    error?: string;
  }> {
    try {
      // Get all DIDs from the cloud agent
      const didsResult = await this.getAllDIDs();
      
      // Get all connections from the cloud agent
      const connectionsResult = await this.getAllConnections();
      
      const contacts: Contact[] = [];
      
      // Convert DIDs to contacts - but filter for holders
      if (didsResult.success && didsResult.dids) {
        didsResult.dids.forEach((did) => {
          // For now, we'll assume DIDs are holders. Later, you might want to add metadata
          // to track the DID type in the cloud agent
          if (did.status === 'PUBLISHED' || did.status === 'CREATED') {
            contacts.push({
              id: did.did,
              name: `CloudDID-${did.did.split(':').pop()?.substring(0, 8) || 'unknown'}`,
              did: did.did,
              didType: DIDType.HOLDER, // Default assumption
              isLocal: true,
              createdAt: new Date().toISOString()
            });
          }
        });
      }
      
      // Convert connections to contacts
      if (connectionsResult.success && connectionsResult.connections) {
        connectionsResult.connections.forEach((connection) => {
          if (connection.theirDid && connection.state === 'ConnectionResponseSent') {
            contacts.push({
              id: connection.connectionId,
              name: `Connection-${connection.connectionId.substring(0, 8)}`,
              did: connection.theirDid,
              didType: DIDType.HOLDER, // Default assumption for connections
              isLocal: false,
              createdAt: connection.createdAt || new Date().toISOString()
            });
          }
        });
      }
      
      return {
        success: true,
        contacts: contacts
      };
    } catch (error) {
      console.error('Error getting contacts for credential recipients:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get complete contact list (DIDs + connections + imported)
   */
  public async getAllContactsFromCloud(): Promise<{
    success: boolean;
    contacts?: Contact[];
    error?: string;
  }> {
    try {
      const contacts: Contact[] = [];
      
      // Get all DIDs (these are local DIDs in the cloud agent)
      const didsResult = await this.getAllDIDs();
      if (didsResult.success && didsResult.dids) {
        didsResult.dids.forEach((did) => {
          // Extract DID type from the keys if possible
          let didType = DIDType.HOLDER; // Default
          
          // Check if the DID has different key purposes to determine type
          if (did.didDocument?.verificationMethod) {
            const verificationMethods = did.didDocument.verificationMethod;
            const hasIssuerKey = verificationMethods.some((vm: any) => 
              vm.id?.includes('issue') || vm.id?.includes('assert'));
            const hasVerifierKey = verificationMethods.some((vm: any) => 
              vm.id?.includes('verify'));
              
            if (hasIssuerKey) {
              didType = DIDType.ISSUER;
            } else if (hasVerifierKey) {
              didType = DIDType.VERIFIER;
            }
          }
          
          contacts.push({
            id: did.did,
            name: `Cloud DID - ${did.did.split(':').pop()?.substring(0, 8) || 'unknown'}`,
            did: did.did,
            didType: didType,
            isLocal: true,
            createdAt: new Date().toISOString()
          });
        });
      }
      
      // Get all connections
      const connectionsResult = await this.getAllConnections();
      if (connectionsResult.success && connectionsResult.connections) {
        connectionsResult.connections.forEach((connection) => {
          if (connection.theirDid) {
            contacts.push({
              id: connection.connectionId,
              name: `Connection - ${connection.connectionId.substring(0, 8)}`,
              did: connection.theirDid,
              didType: DIDType.HOLDER, // Connections are typically holders
              isLocal: false,
              createdAt: connection.createdAt || new Date().toISOString()
            });
          }
        });
      }
      
      return {
        success: true,
        contacts: contacts
      };
    } catch (error) {
      console.error('Error getting all contacts from cloud:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

}
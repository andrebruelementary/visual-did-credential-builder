import SDK from '@hyperledger/identus-sdk';
import { ChromeStorage } from './storage/ChromeStorage';
import { IdentusCloudService } from './services/identusCloudService';

/**
 * Agent status for tracking initialization
 */
enum AgentStatus {
  UNINITIALIZED = 'uninitialized',
  INITIALIZING = 'initializing',
  INITIALIZED = 'initialized',
  FAILED = 'failed'
}

/**
 * Interface for Cloud API response when publishing a DID
 */
interface PublishDIDResponse {
  operationId: string;
  status: string;
}

/**
 * Interface for Cloud API operation status
 */
interface OperationStatus {
  status: string;
  result?: any;
  error?: string;
}

/**
 * Agent class wrapping the Identus Edge Agent SDK
 * with improved key management and error handling
 */
export class Agent {
  private status: AgentStatus = AgentStatus.UNINITIALIZED;
  private agent: SDK.Agent | null = null;
  private apollo: SDK.Apollo | null = null;
  private storage: any = null;
  private api: SDK.ApiImpl | null = null;

  // Store important objects for reuse
  private seed: SDK.Domain.Seed | null = null;
  private castor: SDK.Castor | null = null;
  private mercury: SDK.Mercury | null = null;
  private mediatorHandler: SDK.BasicMediatorHandler | null = null;
  private connectionsManager: SDK.ConnectionsManager | null = null;
  private cloudService: IdentusCloudService | null = null;
  
  // Cloud API configuration
  private cloudApiUrl: string = 'https://api.atalaprism.io/v1';
  private nodeUrl: string = 'http://localhost:5432'; // Local node fallback

  // Store important keys
  private edKey: SDK.Domain.PrivateKey | null = null;
 
  constructor() {}

  /**
   * Check if the agent is initialized
   */
  public isInitialized(): boolean {
    return this.status === AgentStatus.INITIALIZED;
  }

  /**
   * Get the agent status
   */
  public getStatus(): AgentStatus {
    return this.status;
  }

  /**
   * Get the Castor service
   * For DID operations like creation and resolution
   */
  public getCastor(): any {
    if (!this.castor) {
      throw new Error('Castor not initialized');
    }
    return this.castor;
  }

  /**
   * Get the Apollo service
   * For cryptographic operations
   */
  public getApollo(): any {
    if (!this.apollo) {
      throw new Error('Apollo not initialized');
    }
    return this.apollo;
  }

  /**
   * Get the API service
   * For blockchain operations
   */
  public getAPI(): any {
    if (!this.agent) {
      throw new Error('Agent not initialized');
    }
    
    // In the real implementation, this would use the agent's API
    return this.agent.api;
  }

  
  public getAgent(): any {
    if (!this.isInitialized()) {
      throw new Error('Agent not initialized');
    }
    
    // Return a proxy object that provides the necessary methods
    return {
      createNewPrismDID: async (alias: string) => {
        const typeParts = alias.split('-');
        const type = typeParts[0] as 'holder' | 'issuer' | 'verifier';
        console.log(`Creating DID via proxy with type: ${type}, alias: ${alias}`);
        return this.createDIDDirect(type, alias);
      },
      
      // Add a direct method that can be called with explicit type
      createDIDWithType: async (type: 'holder' | 'issuer' | 'verifier', alias: string) => {
        console.log(`Creating DID via direct method with type: ${type}, alias: ${alias}`);
        return this.createDIDDirect(type, alias);
      },
      
      // Add any other required methods here
      apollo: this.apollo,
      castor: this.castor,
      api: this.api
    };
  }

  /**
   * Initialize the agent with optional cloud service
   */
  public async initialize(cloudServiceConfig?: {baseUrl: string, apiKey?: string}): Promise<boolean> {
    try {
      this.status = AgentStatus.INITIALIZING;
      
      // Initialize Apollo for cryptographic operations
      console.log("Initializing Apollo");
      this.apollo = new SDK.Apollo();
      
      // Create a random seed
      console.log("Creating random seed");
      const { seed } = this.apollo.createRandomSeed();
      this.seed = seed;
      
      // Store the seed for later use
      await this.storeSeed(seed);
      
      // Initialize storage
      console.log("Initializing storage");
      const storageAdapter = new ChromeStorage();
      this.storage = new SDK.Pluto(storageAdapter, this.apollo);
      
      // Initialize Castor for DID operations
      console.log("Initializing Castor");
      this.castor = new SDK.Castor(this.apollo);
      
      // Initialize API
      console.log("Initializing API for node at localhost:5432");
      this.api = new SDK.ApiImpl();
      
      // Initialize Cloud API service if config provided
      if (cloudServiceConfig) {
        console.log("Initializing Cloud API service");
        this.cloudService = new IdentusCloudService(cloudServiceConfig.baseUrl, cloudServiceConfig.apiKey);
        
        // Test the connection
        const testResult = await this.cloudService.testConnection();
        if (!testResult.success) {
          console.error('Cloud API connection test failed:', testResult.error);
        }
      }
      
      // Set as initialized with the minimal configuration
      console.log("Setting up minimal environment for DID operations");
      this.status = AgentStatus.INITIALIZED;
      
      return true;
    } catch (error) {
      console.error("Initialization failed:", error);
      this.status = AgentStatus.FAILED;
      return false;
    }
  }

  /**
   * Create a DID directly using the specified type and alias
   */
  public async createDIDDirect(
    type: 'holder' | 'issuer' | 'verifier',
    alias?: string
  ): Promise<SDK.Domain.DID> {
    if (!this.isInitialized()) {
      throw new Error('Agent not initialized');
    }
    
    if (!this.apollo || !this.castor) {
      throw new Error('Required cryptographic services not initialized');
    }
    
    try {
      const didAlias = alias || `${type}-did-${Date.now()}`;
      
      console.log(`Creating ${type} DID with alias: ${didAlias} (direct mode)`);
      
      // Choose curve based on DID type - use Ed25519 for holders, Secp256k1 for issuers and verifiers
      const curve = (type === 'issuer' || type === 'verifier') ? 
        SDK.Domain.Curve.SECP256K1 : 
        SDK.Domain.Curve.ED25519;
      
      console.log(`Creating private key with curve: ${curve} for ${didAlias}`);
      
      let privateKey;
      
      if (curve === SDK.Domain.Curve.SECP256K1) {
        // For Secp256k1, we need to provide a seed
        // First, create a random seed
        const { seed } = this.apollo.createRandomSeed();
        
        // Store the seed for later use
        await this.storeSeedForDID(didAlias, seed);
        
        // Create the private key with the seed
        privateKey = this.apollo.createPrivateKey({
          type: SDK.Domain.KeyTypes.EC,
          curve: SDK.Domain.Curve.SECP256K1,
          seed: Buffer.from(seed.value).toString("hex")
        });
      } else {
        // For Ed25519, we can create a key without seed
        privateKey = this.apollo.createPrivateKey({
          type: SDK.Domain.KeyTypes.EC,
          curve: SDK.Domain.Curve.ED25519
        });
      }
      
      console.log("Created private key:", privateKey);
      
      // Create a service for the DID (optional)
      const service = new SDK.Domain.Service(
        'did-communication',
        ['DIDCommMessaging'],
        {
          uri: `https://example.com/endpoint/${Date.now()}`, // Make service URI unique
          accept: ['didcomm/v2'],
          routingKeys: []
        }
      );
      
      // Create the DID using Castor directly
      console.log("Creating PRISM DID with Castor...");
      const did = await this.castor.createPrismDID(privateKey, [service]);
      console.log("DID created:", did.toString());
      
      // Store the private key
      try {
        await this.storePrivateKeyForDID(did.toString(), privateKey);
        console.log("Private key stored successfully");
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Failed to store private key:", errorMessage);
        throw new Error(`DID created but failed to store key: ${errorMessage}`);
      }
      
      // Store the DID with the correct type
      try {
        await this.storeDID(did.toString(), type, didAlias);
        console.log(`DID stored successfully with type: ${type}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Failed to store DID:", errorMessage);
        throw new Error(`DID created but failed to store: ${errorMessage}`);
      }
      
      return did;
    } catch (error) {
      console.error(`Failed to create ${type} DID:`, error);
      throw error;
    }
  }

  /**
   * Get the Cloud Service if available
   */
  public getCloudService(): IdentusCloudService | null {
    return this.cloudService;
  }

  /**
   * Publish a DID to the blockchain using the Cloud API
   * @param didString The DID string to publish
   * @returns Promise with success result
   */
  public async publishDID(didString: string): Promise<boolean> {
    if (!this.isInitialized()) {
      throw new Error('Agent not initialized');
    }

    try {
      console.log(`Publishing DID to blockchain via Cloud API: ${didString}`);

      // Get the private key for this DID
      const privateKey = await this.getPrivateKeyForDID(didString);
      if (!privateKey) {
        throw new Error('Private key not found for this DID');
      }

      // Get the Cloud Service instance
      const cloudService = this.getCloudService();
      if(cloudService == null) return false;
      
      // Call the Cloud API directly to publish the DID
      const operationId = await cloudService.publishDID(didString);
      
      if (operationId) {
        // Store the operation ID for status checking
        await ChromeStorage.storeDIDOperation(didString, {
          operationId,
          timestamp: new Date().toISOString()
        });
        
        // Update the DID status to publishing
        await ChromeStorage.storeDIDStatus(didString, 'publishing');
        
        console.log(`DID publication initiated, operation ID: ${operationId}`);
        return true;
      } else {
        throw new Error('Failed to get operation ID from Cloud API');
      }
    } catch (error) {
      console.error('Error publishing DID to blockchain:', error);
      return false;
    }
  }

  /**
 * Prepare the DID data for the Cloud API
 * @param didString The DID string
 * @param privateKey The private key for the DID
 * @returns The prepared data for the Cloud API
 */
private async prepareCloudDIDData(didString: string, privateKey: SDK.Domain.PrivateKey): Promise<any> {
  try {
    // Parse the DID
    const did = this.castor?.parseDID(didString);
    if (!did) {
      throw new Error('Failed to parse DID');
    }
    
    // Get DID document data (this is a workaround to avoid resolving unpublished DIDs)
    const didDocumentData: {
      id: string;
      verificationMethod: Array<{
        id: string;
        type: string;
        controller: string;
        publicKeyMultibase: string;
      }>;
      service: any[];
    } = {
      id: didString,
      verificationMethod: [],
      service: []
    };
    
    // Extract verification method from private key
    const publicKey = (privateKey as any).publicKey();
    const keyId = `${didString}#${publicKey.fingerprint()}`;
    
    // Create verification method entry
    const verificationMethod = {
      id: keyId,
      type: 'Ed25519VerificationKey2020',
      controller: didString,
      publicKeyMultibase: Buffer.from(publicKey.raw).toString('base64')
    };
    
    didDocumentData.verificationMethod.push(verificationMethod);
    
    // Prepare the final data structure for the Cloud API
    return {
      did: didString,
      document: didDocumentData,
      privateKeyData: {
        keyId: keyId,
        privateKey: Buffer.from((privateKey as any).raw).toString('base64')
      }
    };
  } catch (error) {
    console.error('Error preparing DID data for Cloud API:', error);
    throw error;
  }
}

  /**
   * Publish a DID using the Cloud API
   * @param didData The prepared DID data
   * @returns The operation ID from the Cloud API
   */
  private async publishDIDViaCloudAPI(didData: any): Promise<string | null> {
    try {
      console.log('Calling Cloud API to publish DID...');
      
      // Make the API request
      const response = await fetch(`${this.cloudApiUrl}/dids/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(didData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Cloud API error: ${errorData.message || response.statusText}`);
      }
      
      const data = await response.json() as PublishDIDResponse;
      return data.operationId;
    } catch (error) {
      console.error('Error calling Cloud API:', error);
      throw error;
    }
  }

  /**
   * Check the status of a DID publication operation via Cloud API
   * @param operationId The operation ID from the Cloud API
   * @returns The status of the operation
   */
  public async checkOperationStatus(operationId: string): Promise<string> {
    try {
      const response = await fetch(`${this.cloudApiUrl}/operations/${operationId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to check operation status: ${response.statusText}`);
      }
      
      const data = await response.json() as OperationStatus;
      
      // Map API statuses to our internal statuses
      switch (data.status.toUpperCase()) {
        case 'COMPLETED':
          return 'published';
        case 'FAILED':
          return 'failed';
        case 'PENDING':
        case 'PROCESSING':
          return 'pending';
        default:
          return 'pending';
      }
    } catch (error) {
      console.error('Error checking operation status:', error);
      return 'failed';
    }
  }
  
  /**
   * Store a seed for a DID
   */
  private async storeSeedForDID(did: string, seed: SDK.Domain.Seed): Promise<void> {
    return new Promise((resolve, reject) => {
      // Convert Uint8Array to regular array for storage
      const seedArray = Array.from(seed.value);
      chrome.storage.local.set({ [`seed_${did}`]: seedArray }, () => {
        if (chrome.runtime.lastError) {
          console.error("Seed storage error:", chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          console.log("Seed stored successfully for DID:", did);
          resolve();
        }
      });
    });
  }

  /**
   * Get a seed for a DID
   */
  private async getSeedForDID(did: string): Promise<SDK.Domain.Seed | null> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get([`seed_${did}`], (result) => {
        try {
          const seedArray = result[`seed_${did}`];
          if (!seedArray) {
            console.warn(`No seed found for DID: ${did}`);
            resolve(null);
            return;
          }
          
          // Convert back to Uint8Array
          const seedValue = new Uint8Array(seedArray);
          resolve({ value: seedValue });
        } catch (err) {
          console.error("Error retrieving seed:", err);
          reject(err);
        }
      });
    });
  }

  /**
   * Store a private key for a DID with proper serialization
   */
  private async storePrivateKeyForDID(did: string, key: SDK.Domain.PrivateKey): Promise<void> {
    try {
      // Create a StorableKey structure with the properties needed for restoration
      // Convert the Uint8Array to a regular array which can be serialized
      const storableKey = {
        uuid: (key as any).uuid,
        recoveryId: (key as any).recoveryId,
        raw: Array.from((key as any).raw),
        size: (key as any).size,
        type: (key as any).type
      };
      
      console.log("Storing key with recoveryId:", storableKey.recoveryId);
      
      // Store the serialized key
      return new Promise((resolve, reject) => {
        try {
          chrome.storage.local.set({ [`master_key_${did}`]: storableKey }, () => {
            if (chrome.runtime.lastError) {
              console.error("Storage error:", chrome.runtime.lastError);
              reject(chrome.runtime.lastError);
            } else {
              resolve();
            }
          });
        } catch (err) {
          console.error("Error storing key:", err);
          reject(err);
        }
      });
    } catch (err) {
      console.error("Error preparing key for storage:", err);
      throw err;
    }
  }

  /**
   * Retrieve a private key for a DID
   */
  private async getPrivateKeyForDID(did: string): Promise<SDK.Domain.PrivateKey | null> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get([`master_key_${did}`], (result) => {
        try {
          const storedKey = result[`master_key_${did}`];
          if (!storedKey) {
            console.warn(`No key found for DID: ${did}`);
            resolve(null);
            return;
          }
          
          console.log("Retrieved key with recoveryId:", storedKey.recoveryId);
          
          // Convert the regular array back to Uint8Array
          const storableKey = {
            ...storedKey,
            raw: new Uint8Array(storedKey.raw)
          };
          
          // Use the built-in restore method from Apollo
          const privateKey = this.apollo?.restorePrivateKey(storableKey);
          
          if (!privateKey) {
            console.error("Failed to restore private key");
            resolve(null);
            return;
          }
          
          console.log("Successfully restored private key using SDK's restore method");
          resolve(privateKey);
        } catch (err) {
          console.error("Error retrieving key:", err);
          reject(err);
        }
      });
    });
  }

  /**
   * Store the agent seed in Chrome storage
   * @param seed The seed to store
   */
  private async storeSeed(seed: SDK.Domain.Seed): Promise<void> {
    return new Promise((resolve) => {
      const seedBytes = seed.value;
      chrome.storage.local.set({ 'identus_seed': Array.from(seedBytes) }, resolve);
    });
  }

  /**
   * Store a DID with its type and alias
   * @param did The DID string
   * @param type The DID type
   * @param alias The DID alias
   */
  private async storeDID(didString: string, typeString: string, alias: string): Promise<void> {
    console.log(`Storing DID with explicit type: ${typeString}, alias: ${alias}`);
    
    // Get existing DIDs
    const dids = await this.getAllDIDs();
    
    // Create DID info object
    const didInfo = {
      id: didString,
      alias: alias,
      type: typeString,
      createdAt: new Date().toISOString()
    };
    
    console.log("DID info being stored:", didInfo);
    
    // Add new DID
    dids.push(didInfo);
    
    // Store updated list
    console.log("Storing DIDs:", dids);
    await ChromeStorage.set('dids', dids);
    console.log("DIDs stored successfully");
  }
  
  // Make sure this method exists to retrieve DIDs
  private async getAllDIDs(): Promise<any[]> {
    const dids = await ChromeStorage.get('dids') || [];
    return dids;
  }

  /**
   * Store initialization state
   * @param initialized Whether initialization was successful
   * @param mediatorDID The mediator DID
   * @param limitedFunctionality Whether we have limited functionality
   */
  private async storeInitializationState(
    initialized: boolean, 
    mediatorDID: string,
    limitedFunctionality: boolean = false
  ): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set({
        'identus_initialized': initialized,
        'identus_mediator_did': mediatorDID,
        'identus_limited_functionality': limitedFunctionality
      }, resolve);
    });
  }
}

export default Agent;
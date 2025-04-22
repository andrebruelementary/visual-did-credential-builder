import SDK from '@hyperledger/identus-sdk';
import { ChromeStorage } from './storage/ChromeStorage';

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
  //private pollux: SDK.Pollux | null = null;
  private mercury: SDK.Mercury | null = null;
  private mediatorHandler: SDK.BasicMediatorHandler | null = null;
  private connectionsManager: SDK.ConnectionsManager | null = null;
  private nodeUrl: string = 'http://localhost:5432';

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
      
      // Create a unique private key for the DID
      // Add entropy based on alias and timestamp to ensure uniqueness
      const timestamp = Date.now();
      const randomBuffer = new Uint8Array(32);
      window.crypto.getRandomValues(randomBuffer);
      
      console.log(`Creating private key with unique entropy for ${didAlias}`);
      
      const privateKey = this.apollo.createPrivateKey({
        type: SDK.Domain.KeyTypes.EC,
        curve: SDK.Domain.Curve.ED25519
      });
      
      console.log("Created private key:", privateKey);
      
      // Create a service for the DID (optional)
      const service = new SDK.Domain.Service(
        'did-communication',
        ['DIDCommMessaging'],
        {
          uri: `https://example.com/endpoint/${timestamp}`, // Make service URI unique
          accept: ['didcomm/v2'],
          routingKeys: []
        }
      );
      
      // Create the DID using Castor directly
      console.log("Creating PRISM DID with Castor...");
      const did = await this.castor.createPrismDID(privateKey, [service]);
      console.log("DID created:", did.toString());
      
      // First store the private key
      try {
        await this.storePrivateKeyForDID(did.toString(), privateKey);
        console.log("Private key stored successfully");
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Failed to store private key:", errorMessage);
        throw new Error(`DID created but failed to store key: ${errorMessage}`);
      }
      
      // Then store the DID with the correct type
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
   * Initialize the agent without mediator connectivity
   * Focused on DID creation, publishing, and credential operations
   */
  public async initialize(): Promise<boolean> {
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
      
      // Since there's no configuration method, we'll need to handle the URL in the submit operation
      this.nodeUrl = 'http://localhost:5432';
      
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
   * Create a new DID based on the given type
   * @param type Type of DID to create
   * @param alias Optional alias for the DID
   */
  public async createDID(
    type: 'holder' | 'issuer' | 'verifier',
    alias?: string
  ): Promise<string | null> {
    if (!this.isInitialized()) {
      throw new Error('Agent not initialized');
    }
    
    try {
      const didAlias = alias || `${type}-did-${Date.now()}`;
      
      console.log(`Creating ${type} DID with alias: ${didAlias}`);
      
      // Using Castor directly if the agent isn't available or fails
      if (this.agent && typeof this.agent.createNewPrismDID === 'function') {
        console.log("Using agent.createNewPrismDID");
        try {
          const did = await this.agent.createNewPrismDID(didAlias);
          const didString = did.toString();
          
          console.log(`Successfully created ${type} DID using agent:`, didString);
          
          // Store the DID with its type
          await this.storeDID(didString, type, didAlias);
          
          return didString;
        } catch (agentError) {
          console.error("Error creating DID with agent:", agentError);
          console.log("Falling back to direct creation");
        }
      }
      
      // Fallback: Create DID directly with Castor
      if (!this.castor || !this.apollo) {
        throw new Error('Castor or Apollo not initialized');
      }
      
      // Create a private key for the DID
      const privateKey = this.apollo.createPrivateKey({
        type: SDK.Domain.KeyTypes.EC,
        curve: SDK.Domain.Curve.ED25519
      });
      
      // Optional: Create a service for the DID
      const service = new SDK.Domain.Service(
        'did-communication',
        ['DIDCommMessaging'],
        {
          uri: 'https://example.com/endpoint',
          accept: ['didcomm/v2'],
          routingKeys: []
        }
      );
      
      // Create the DID using Castor directly
      const did = await this.castor.createPrismDID(privateKey, [service]);
      
      // Convert to string for storage and return
      const didString = did.toString();
      console.log(`Successfully created ${type} DID directly:`, didString);
      
      // Store the DID with its type
      await this.storeDID(didString, type, didAlias);
      
      // Store the key for later use in publishing
      await this.storePrivateKeyForDID(didString, privateKey);
      
      return didString;
    } catch (error) {
      console.error(`Failed to create ${type} DID:`, error);
      return null;
    }
  }

  private base64ToArrayBuffer(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }
  
  // Helper method to store a private key for a DID
  private async storePrivateKeyForDID(did: string, key: SDK.Domain.PrivateKey): Promise<void> {
    try {

      console.log("Key properties:", {
        type: typeof key,
        properties: Object.getOwnPropertyNames(key),
        rawKeyType: typeof key.getProperty(SDK.Domain.KeyProperties.rawKey),
        methods: Object.getOwnPropertyNames(Object.getPrototypeOf(key))
      });

      // Get raw key data safely
      const rawKey = key.getProperty(SDK.Domain.KeyProperties.rawKey);
      let rawBase64: string | undefined;
      
      // Convert the key to a serializable format
      const serializableKey = {
        // Basic properties that most private keys have
        type: key.getProperty(SDK.Domain.KeyProperties.type),
        curve: key.getProperty(SDK.Domain.KeyProperties.curve),
        rawBase64: rawBase64,
        // For debugging purposes, include what we're trying to access
        keyProps: Object.getOwnPropertyNames(key)
      };
      
      console.log("Storing serializable key:", serializableKey);
      
      return new Promise((resolve, reject) => {
        try {
          // Store the serializable key with a reference to the DID
          chrome.storage.local.set({ [`master_key_${did}`]: serializableKey }, () => {
            if (chrome.runtime.lastError) {
              console.error("Storage error:", chrome.runtime.lastError);
              reject(chrome.runtime.lastError);
            } else {
              resolve();
            }
          });
        } catch (err) {
          console.error("Error serializing key:", err);
          reject(err);
        }
      });
    } catch (err) {
      console.error("Error preparing key for storage:", err);
      throw err;
    }
  }

  public async publishDID(didString: string): Promise<boolean> {
    if (!this.isInitialized()) {
      throw new Error('Agent not initialized');
    }
    
    if (!this.apollo || !this.castor || !this.api) {
      throw new Error('Required services not initialized');
    }
    
    try {
      console.log(`Publishing DID to blockchain: ${didString}`);
      
      // Parse the DID string
      const did = this.castor.parseDID(didString);
      
      // Get the private key for this DID
      const privateKey = await this.getPrivateKeyForDID(didString);
      if (!privateKey) {
        throw new Error('Private key not found for this DID');
      }
      
      // Create the Atala object for the DID operation
      const atalaObject = await this.castor.createPrismDIDAtalaObject(privateKey, did);
      
      // Manually submit to blockchain using the request method of the API
      const endpoint = `${this.nodeUrl}/prism-node/operations`;
      
      // Convert atalaObject to a string or format required by the API
      const atalaObjectBase64 = this.arrayBufferToBase64(atalaObject);
      
      // Create body for the request
      const requestBody = {
        operation: atalaObjectBase64
      };
      
      // Submit to the node
      const response = await this.api.request(
        'POST',
        endpoint,
        undefined, // No URL parameters
        new Map([['Content-Type', 'application/json']]), // Headers
        requestBody
      );
      
      console.log(`DID published successfully: ${didString}`, response);
      return true;
    } catch (error) {
      console.error(`Failed to publish DID: ${error}`);
      return false;
    }
  }
  
  // Helper method to convert array buffer to base64
  private arrayBufferToBase64(buffer: Uint8Array | ArrayBuffer): string {
    // First convert to binary string
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    // Then convert to base64
    return btoa(binary);
  }
  
  // Helper method to get the private key for a DID
  private async getPrivateKeyForDID(did: string): Promise<SDK.Domain.PrivateKey | null> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get([`master_key_${did}`], (result) => {
        try {
          const serializableKey = result[`master_key_${did}`];
          if (!serializableKey) {
            resolve(null);
            return;
          }
          
          console.log("Retrieved serializable key:", serializableKey);
          
          // Prepare parameters for key creation
          const keyParams: any = {
            type: serializableKey.type,
            curve: serializableKey.curve
          };
          
          // Only add raw if we can provide valid data
          if (serializableKey.rawBase64) {
            try {
              keyParams.raw = this.base64ToArrayBuffer(serializableKey.rawBase64);
            } catch (e) {
              console.warn("Failed to convert base64 to buffer:", e);
            }
          }
          
          // Recreate the private key from serializable format
          console.log("Creating private key with params:", keyParams);
          const privateKey = this.apollo?.createPrivateKey(keyParams);
          if(privateKey != undefined)
            resolve(privateKey);
          else
            reject(null);
        } catch (err) {
          console.error("Error recreating key:", err);
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
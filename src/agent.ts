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

  /**
   * Diagnostic function to inspect a private key
   * @param key The private key to inspect
   * @param stage Description of when this inspection is happening
   */
  private inspectPrivateKey(key: SDK.Domain.PrivateKey | null, stage: string): void {
    console.log(`[DEBUG] Private key inspection at stage: ${stage}`);
    
    if (!key) {
      console.error(`[DEBUG] Key is null at stage: ${stage}`);
      return;
    }
    
    try {
      // Safely check properties without throwing errors
      const safeGetProperty = (prop: string) => {
        try {
          return key.getProperty(prop);
        } catch (e) {
          return `Error accessing: ${e instanceof Error ? e.message : String(e)}`;
        }
      };
      
      // Get all available properties
      const knownProps = [
        SDK.Domain.KeyProperties.curve,
        SDK.Domain.KeyProperties.type,
        SDK.Domain.KeyProperties.rawKey,
        // Add any other known property constants from the SDK
      ];
      
      // Build diagnostics object
      const keyDiagnostics = {
        type: typeof key,
        isInstanceOf: key.constructor ? key.constructor.name : 'unknown',
        properties: Object.getOwnPropertyNames(key),
        methods: Object.getOwnPropertyNames(Object.getPrototypeOf(key)),
        known_properties: knownProps.reduce((acc, prop) => {
          acc[prop] = safeGetProperty(prop);
          return acc;
        }, {} as Record<string, any>),
        has_raw_key: !!safeGetProperty(SDK.Domain.KeyProperties.rawKey),
        raw_key_type: safeGetProperty(SDK.Domain.KeyProperties.rawKey) ? 
                      typeof safeGetProperty(SDK.Domain.KeyProperties.rawKey) : 'N/A',
        can_sign: typeof (key as any).sign === 'function'
      };
      
      console.log(`[DEBUG] Key details at ${stage}:`, keyDiagnostics);
      
      // Try to sign something as a test
      if (typeof (key as any).sign === 'function') {
        try {
          const testData = new Uint8Array([1, 2, 3, 4, 5]);
          const signature = (key as any).sign(testData);
          console.log(`[DEBUG] Test signing at ${stage} - SUCCESS:`, {
            signature_type: typeof signature,
            signature_length: signature instanceof Uint8Array ? signature.length : 'N/A'
          });
        } catch (e) {
          console.error(`[DEBUG] Test signing at ${stage} - FAILED:`, e);
        }
      }
    } catch (e) {
      console.error(`[DEBUG] Error inspecting key at ${stage}:`, e);
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
   * Create a new DID
   * @param type The type of DID to create (holder, issuer, verifier)
   * @param alias Optional human-readable alias for the DID
   * @returns Promise with the result of the DID creation
   */
  async createDID(type: string, alias?: string): Promise<{ success: boolean, did?: string, error?: string }> {
    console.log(`Creating DID of type: ${type} with alias: ${alias}`);

    if (!this.isInitialized()) {
      return {
        success: false,
        error: 'Agent not initialized. Please initialize first.'
      };
    }

    try {
      // Get a proxy to the agent functionality
      const agentProxy = this.getAgent();

      // Generate default alias if not provided
      const didAlias = alias || `${type}-did-${Date.now()}`;

      // Use the direct method with explicit type
      const did = await agentProxy.createDIDWithType(
        type as 'holder' | 'issuer' | 'verifier',
        didAlias
      );

      // Convert the DID to string
      const didString = did.toString();

      return {
        success: true,
        did: didString
      };
    } catch (error) {
      console.error('Failed to create DID:', error);
      return {
        success: false,
        error: `Failed to create DID: ${error instanceof Error ? error.message : String(error)}`
      };
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
   * Publish a DID to the blockchain
   */
  public async publishDID(didString: string): Promise<boolean> {
    if (!this.isInitialized()) {
      throw new Error('Agent not initialized');
    }

    if (!this.apollo || !this.castor || !this.api) {
      throw new Error('Required services not initialized');
    }

    try {
      console.log(`Publishing DID to blockchain: ${didString}`);

      // Parse the DID string to get a DID object
      const did = this.castor.parseDID(didString);
      console.log("Successfully parsed DID:", {
        didMethod: did.method,
        didIdentifier: did.toString()
      });

      // Get the private key for this DID
      const privateKey = await this.getPrivateKeyForDID(didString);
      if (!privateKey) {
        throw new Error('Private key not found for this DID');
      }
      
      // Log key details to help diagnose issues
      console.log("About to create Atala object with key:", {
        keyType: typeof privateKey,
        keyHasRaw: 'raw' in privateKey,
        rawType: typeof (privateKey as any).raw,
        rawLength: (privateKey as any).raw?.length,
        hasDeriveMethod: typeof (privateKey as any).derive === 'function',
        hasSignMethod: typeof (privateKey as any).sign === 'function',
        keyProperties: Object.getOwnPropertyNames(privateKey),
        recoveryId: (privateKey as any).recoveryId
      });
      
      console.log("Successfully retrieved private key for DID");

      // Try to create a public key from the private key
      try {
        const publicKey = (privateKey as any).publicKey();
        console.log("Successfully derived public key from private key");
      } catch (e) {
        console.error("Warning: Could not derive public key from private key:", e);
      }

      // Check if key is a Secp256k1PrivateKey which is required by the SDK
      if ((privateKey as any).recoveryId !== 'secp256k1+priv') {
        const errorMessage = `This DID was created with a ${(privateKey as any).recoveryId} key, but only Secp256k1 keys are supported for publication. Please create a new DID of type issuer or verifier which will use a Secp256k1 key.`;
        console.error(errorMessage);
        throw new Error(errorMessage);
      }

      try {
        console.log("Creating Atala object for DID publication...");
        const atalaObject = await this.castor.createPrismDIDAtalaObject(privateKey, did);
        
        // Manually submit to blockchain using the request method of the API
        const endpoint = `${this.nodeUrl}/prism-node/operations`;
        const atalaObjectBase64 = this.arrayBufferToBase64(atalaObject);
        
        const requestBody = {
          operation: atalaObjectBase64
        };

        const response = await this.api.request(
          'POST',
          endpoint,
          undefined, // No URL parameters
          new Map([['Content-Type', 'application/json']]), // Headers
          requestBody
        );

        console.log(`DID publication request submitted: ${didString}`, response);
        return true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Cannot sign with this key: ${errorMessage}`);
      }
    } catch (error) {
      console.error(`Failed to publish DID: ${error instanceof Error ? error.message : String(error)}`);
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

  /**
   * Diagnostic function for serialized key data
   * @param serializedKey The serialized key object
   * @param stage Description of when this inspection is happening
   */
  private inspectSerializedKey(serializedKey: any, stage: string): void {
    console.log(`[DEBUG] Serialized key inspection at stage: ${stage}`);
    
    if (!serializedKey) {
      console.error(`[DEBUG] Serialized key is null/undefined at stage: ${stage}`);
      return;
    }
    
    try {
      const diagnostics = {
        properties: Object.keys(serializedKey),
        type: serializedKey.type,
        curve: serializedKey.curve,
        has_raw_base64: !!serializedKey.rawBase64,
        raw_base64_length: serializedKey.rawBase64 ? serializedKey.rawBase64.length : 0,
        raw_base64_prefix: serializedKey.rawBase64 ? 
                          serializedKey.rawBase64.substring(0, 20) + '...' : 'N/A'
      };
      
      console.log(`[DEBUG] Serialized key details at ${stage}:`, diagnostics);
    } catch (e) {
      console.error(`[DEBUG] Error inspecting serialized key at ${stage}:`, e);
    }
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
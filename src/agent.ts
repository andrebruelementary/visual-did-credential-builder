// src/agent.ts
import SDK from '@hyperledger/identus-edge-agent-sdk';
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

  // Store important objects for reuse
  private seed: SDK.Domain.Seed | null = null;
  private castor: SDK.Castor | null = null;
  private pollux: SDK.Pollux | null = null;
  private mercury: SDK.Mercury | null = null;
  private mediatorHandler: SDK.BasicMediatorHandler | null = null;
  private connectionsManager: SDK.ConnectionsManager | null = null;

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
   * Get the agent instance (if initialized)
   */
  public getAgent(): SDK.Agent {
    if (!this.agent) {
      throw new Error('Agent not initialized');
    }
    return this.agent;
  }

  /**
   * Initialize the agent without mediator connectivity
   * Focused on DID creation, publishing, and credential operations
   */
  public async initialize(): Promise<boolean> {
    try {
      console.log("Starting agent initialization without mediator");
      
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
      
      // Create the Ed25519 key
      console.log("Creating Ed25519 key");
      this.edKey = this.apollo.createPrivateKey({
        type: SDK.Domain.KeyTypes.EC,
        curve: SDK.Domain.Curve.ED25519
      });
      
      // Initialize Castor for DID operations
      console.log("Initializing Castor");
      this.castor = new SDK.Castor(this.apollo);
      
      // Initialize API
      console.log("Initializing API");
      const api = new SDK.ApiImpl();
      
      // Initialize DIDComm with minimal requirements
      console.log("Initializing DIDComm");
      const didComm = new SDK.DIDCommWrapper(this.apollo, this.castor, this.storage);
      
      // Initialize Mercury with minimal requirements
      console.log("Initializing Mercury");
      this.mercury = new SDK.Mercury(this.castor, didComm, api);
      
      // Initialize Pollux for credential operations - essential for credentials
      console.log("Initializing Pollux");
      this.pollux = new SDK.Pollux(this.apollo, this.castor, api);
      
      // Start Pollux
      try {
        console.log("Starting Pollux");
        await this.pollux.start();
        console.log("Pollux started successfully");
      } catch (e) {
        console.error("Failed to start Pollux:", e);
        // Continue even if Pollux fails since we might not need it immediately
      }
      
      // Create a "dummy" mediator DID that won't be used for real mediation
      console.log("Creating dummy mediator DID");
      // This is just a placeholder and won't be used for actual mediation
      const dummyMediatorDID = SDK.Domain.DID.fromString("did:example:dummy");
      
      // Create a mediator store - required for the handler
      console.log("Creating mediator store");
      const mediatorStore = new SDK.PublicMediatorStore(this.storage);
      
      // Create the mediator handler with the dummy DID
      console.log("Creating mediator handler");
      this.mediatorHandler = new SDK.BasicMediatorHandler(dummyMediatorDID, this.mercury, mediatorStore);
      
      // Create connections manager
      console.log("Creating connections manager");
      this.connectionsManager = new SDK.ConnectionsManager(
        this.castor, 
        this.mercury, 
        this.storage, 
        this.pollux, 
        this.mediatorHandler
      );
      
      // Create the agent with real components but we'll prevent actual mediation later
      console.log("Creating the agent");
      this.agent = new SDK.Agent(
        this.apollo,
        this.castor,
        this.storage,
        this.mercury,
        this.mediatorHandler,
        this.connectionsManager,
        this.seed
      );
      
      // The key part: we'll set the agent as initialized without calling start()
      // This bypasses the mediation checks but still allows DID creation
      console.log("Setting agent as initialized without calling start()");
      this.status = AgentStatus.INITIALIZED;
      
      // Store initialization state
      await this.storeInitializationState(true, "no-mediator", true);
      
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
      
      // Create a PRISM DID
      const did = await this.agent!.createNewPrismDID(didAlias);
      
      // Convert to string for storage and return
      const didString = did.toString();
      console.log(`Successfully created ${type} DID:`, didString);
      
      // Store the DID with its type
      await this.storeDID(didString, type, didAlias);
      
      return didString;
    } catch (error) {
      console.error(`Failed to create ${type} DID:`, error);
      return null;
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
  private async storeDID(did: string, type: string, alias: string): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.get(['identus_dids'], (result) => {
        const dids = result.identus_dids || [];
        dids.push({
          did,
          type,
          alias,
          created: new Date().toISOString()
        });
        chrome.storage.local.set({ 'identus_dids': dids }, resolve);
      });
    });
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
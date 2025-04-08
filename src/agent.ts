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
  private x25519Key: SDK.Domain.PrivateKey | null = null;

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
   * Initialize the agent with either a mediator DID or an Out-of-Band invitation
   * @param mediatorInput Either a mediator DID or an OOB invitation URL
   * @param useOobUrl Whether the input is an OOB URL (true) or DID (false)
   */
  public async initialize(
    mediatorInput: string,
    useOobUrl: boolean = false
  ): Promise<boolean> {
    try {
      console.log(`Starting initialization with ${useOobUrl ? 'OOB URL' : 'mediator DID'}: ${mediatorInput}`);
      
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
      
      // Create cryptographic keys
      console.log("Creating Ed25519 key");
      this.edKey = this.apollo.createPrivateKey({
        type: SDK.Domain.KeyTypes.EC,
        curve: SDK.Domain.Curve.ED25519
      });
      
      console.log("Creating X25519 key");
      this.x25519Key = this.apollo.createPrivateKey({
        type: SDK.Domain.KeyTypes.Curve25519,
        curve: SDK.Domain.Curve.X25519
      });
      
      // Initialize Castor for DID operations
      console.log("Initializing Castor");
      this.castor = new SDK.Castor(this.apollo);
      
      // Initialize API
      console.log("Initializing API");
      const api = new SDK.ApiImpl();
      
      // Initialize DIDComm
      console.log("Initializing DIDComm");
      const didComm = new SDK.DIDCommWrapper(this.apollo, this.castor, this.storage);
      
      // Initialize Mercury for communication
      console.log("Initializing Mercury");
      this.mercury = new SDK.Mercury(this.castor, didComm, api);
      
      // Initialize Pollux for credential operations
      console.log("Initializing Pollux");
      this.pollux = new SDK.Pollux(this.apollo, this.castor, api);
      
      // Start Pollux
      try {
        console.log("Starting Pollux");
        await this.pollux.start();
        console.log("Pollux started successfully");
      } catch (e) {
        console.error("Failed to start Pollux:", e);
        // Continue even if Pollux fails
      }
      
      // Create peer DID for mediation
      console.log("Creating peer DID for mediation");
      let peerDID;
      try {
        peerDID = await this.castor.createPeerDID(
          [this.edKey, this.x25519Key],
          [{
            id: "didcomm",
            type: ["DIDCommMessaging"],
            serviceEndpoint: {
              uri: "http://localhost:8080",
              accept: ["didcomm/v2"],
              routingKeys: []
            },
            isDIDCommMessaging: true
          }]
        );
        console.log("Peer DID created successfully:", peerDID.toString());
      } catch (e) {
        console.error("Failed to create peer DID:", e);
        throw e;
      }
      
      // Set up mediator
      let mediatorDID;
      
      if (useOobUrl) {
        // Process OOB URL to extract mediator DID
        try {
          // This is a basic extraction - in a real implementation, you'd use proper
          // DIDComm OOB invitation parsing
          const url = new URL(mediatorInput);
          const oobParam = url.searchParams.get('_oob');
          
          if (!oobParam) {
            throw new Error('Invalid OOB URL: missing _oob parameter');
          }
          
          // Simple decoding of base64 string to get the invitation JSON
          const decodedInvitation = atob(oobParam);
          const invitation = JSON.parse(decodedInvitation);
          
          if (invitation && invitation.from) {
            mediatorDID = invitation.from;
            console.log("Extracted mediator DID from OOB:", mediatorDID);
          } else {
            throw new Error('Invalid invitation format: missing "from" field');
          }
        } catch (e) {
          console.error("Failed to parse OOB invitation:", e);
          throw new Error('Invalid OOB invitation URL');
        }
      } else {
        // Use the provided mediator DID directly
        mediatorDID = mediatorInput;
      }
      
      console.log("Parsing mediator DID");
      const mediatorDIDObj = SDK.Domain.DID.fromString(mediatorDID);
      
      console.log("Creating mediator store");
      const mediatorStore = new SDK.PublicMediatorStore(this.storage);
      
      console.log("Creating mediator handler");
      this.mediatorHandler = new SDK.BasicMediatorHandler(mediatorDIDObj, this.mercury, mediatorStore);
      
      console.log("Setting up connections manager");
      this.connectionsManager = new SDK.ConnectionsManager(
        this.castor,
        this.mercury,
        this.storage,
        this.pollux,
        this.mediatorHandler
      );
      
      // Create the agent
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
      
      // Start the agent
      console.log("Starting the agent");
      try {
        await this.agent.start();
        console.log("Agent started successfully");
        this.status = AgentStatus.INITIALIZED;
        
        // Store initialization state
        await this.storeInitializationState(true, mediatorDID);
        
        return true;
      } catch (e) {
        console.error("Failed to start agent:", e);
        
        // Special handling for X25519 key errors to allow limited functionality
        if (e instanceof Error && e.message.includes('X25519')) {
          console.log("Detected X25519 key issue - initializing with limited functionality");
          this.status = AgentStatus.INITIALIZED;
          
          // Store initialization state with note about limited functionality
          await this.storeInitializationState(true, mediatorDID, true);
          
          return true;
        }
        
        this.status = AgentStatus.FAILED;
        return false;
      }
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
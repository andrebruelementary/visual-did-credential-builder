import { Agent } from "../agent";
import { StorageService } from "./storageService";
import { ChromeStorage } from "../storage/ChromeStorage";
import { DIDManager, DIDType } from "../didManager";
import { Credential } from '../models/credential';
/**
 * A utility for verifying credentials on the blockchain
 */
export class CredentialVerifier {
    /**
     * Verifies a credential on the blockchain
     * @param credentialId The ID of the credential to verify
     */
    public static async verifyCredential(credentialId: string): Promise<{
      verified: boolean,
      message: string,
      details?: any
    }> {
      try {
        console.log(`Verifying credential ${credentialId}`);
        
        // Get the credential from storage
        const credentials = await StorageService.getCredentials();
        const credential = credentials.find(c => c.id === credentialId);
        
        if (!credential) {
          return { 
            verified: false, 
            message: 'Credential not found in storage' 
          };
        }
        
        // Get the necessary agent services
        const agent = new Agent();
        if (!agent.isInitialized()) {
          await agent.initialize();
        }
        
        // Get a reference to the issuer DID
        // We'll need to resolve the DIDs to check the credential linkage
        const storage = new ChromeStorage();
        const didManager = new DIDManager(agent, storage);
        
        // Get the issuer DID (should be one of our DIDs)
        const issuerDIDInfo = await didManager.getFirstDIDOfType(DIDType.ISSUER);
        if (!issuerDIDInfo) {
          return { 
            verified: false, 
            message: 'No issuer DID found to verify against' 
          };
        }
        
        // Get the castor service for DID resolution
        const castor = agent.getCastor();
        if (!castor) {
          return { 
            verified: false, 
            message: 'DID resolver service not available' 
          };
        }
        
        // Attempt to resolve both DIDs on the blockchain
        let holderDIDDoc = null;
        let issuerDIDDoc = null;
        
        try {
          console.log(`Resolving holder DID: ${credential.issuedTo}`);
          holderDIDDoc = await castor.resolveDID(credential.issuedTo);
        } catch (error) {
          console.warn(`Holder DID not found on blockchain: ${credential.issuedTo}`, error);
          // We'll continue anyway since the credential might be valid even if the holder DID isn't published
        }
        
        try {
          console.log(`Resolving issuer DID: ${issuerDIDInfo.id}`);
          issuerDIDDoc = await castor.resolveDID(issuerDIDInfo.id);
        } catch (error) {
          console.error(`Issuer DID not published to blockchain: ${issuerDIDInfo.id}`, error);
          return { 
            verified: false, 
            message: 'Issuer DID not published to blockchain - cannot verify credential',
            details: { 
              error: error instanceof Error ? error.message : String(error),
              credential
            }
          };
        }
        
        // Check if the credential can be verified cryptographically
        // Note: Without a formal verification service in Identus SDK, we're doing a basic check
        // that the DIDs exist on chain and the credential structure is valid
        
        const isStructureValid = this.validateCredentialStructure(credential);
        const issuerPublished = !!issuerDIDDoc;
        const holderPublished = !!holderDIDDoc;
        
        // Return the verification result
        if (issuerPublished && isStructureValid) {
          return {
            verified: true,
            message: holderPublished 
              ? 'Credential verified successfully' 
              : 'Credential structure is valid but holder DID is not published',
            details: {
              credential,
              issuerDIDDoc,
              holderDIDDoc,
              issuerPublished,
              holderPublished,
              isStructureValid
            }
          };
        } else {
          return {
            verified: false,
            message: !issuerPublished 
              ? 'Issuer DID not found on blockchain' 
              : 'Credential structure is invalid',
            details: {
              credential,
              issuerDIDDoc,
              holderDIDDoc,
              issuerPublished,
              holderPublished,
              isStructureValid
            }
          };
        }
      } catch (error) {
        console.error('Error verifying credential:', error);
        return {
          verified: false,
          message: `Verification error: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    }
    
    /**
     * Validates the structure of a credential
     * @param credential The credential to validate
     * @returns True if the structure is valid
     */
    private static validateCredentialStructure(credential: Credential): boolean {
      // Basic validation of the credential structure
      if (!credential) return false;
      if (!credential.id) return false;
      if (!credential.subject) return false;
      if (!credential.issuedTo) return false;
      if (!credential.issuedDate) return false;
      if (!Array.isArray(credential.properties)) return false;
      
      // Check that properties have required fields
      for (const prop of credential.properties) {
        if (!prop.id || !prop.label || prop.value === undefined) {
          return false;
        }
      }
      
      return true;
    }
  }
  
  /**
   * Add this to initializeApplication or anywhere appropriate
   * to make the verification available in the console for debugging
   */
  export function setupCredentialVerificationGlobal(): void {
    console.log('Setting up credential verification global function');
    
    window.verifyCredential = async function(credentialId?: string) {
      // If no credential ID is provided, get the most recent one
      if (!credentialId) {
        const credentials = await StorageService.getCredentials();
        if (credentials.length > 0) {
          credentialId = credentials[credentials.length - 1].id;
          console.log(`Using most recent credential: ${credentialId}`);
        } else {
          console.error('No credentials found to verify');
          return;
        }
      }
      
      // Verify the credential
      console.log(`Starting verification for credential: ${credentialId}`);
      const result = await CredentialVerifier.verifyCredential(credentialId);
      
      console.log('Verification result:', result);
      return result;
    };
  }
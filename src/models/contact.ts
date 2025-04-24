import { DIDType } from '../didManager';

export interface Contact {
  id: string;        // Unique identifier for the contact
  name: string;      // Display name/alias for the contact
  did: string;       // The DID string
  didType?: DIDType; // The type of DID (holder, issuer, verifier)
  avatarUrl?: string; // Optional avatar URL
  isLocal?: boolean;  // Flag to indicate if this is a local DID or imported
  createdAt: string;  // When the contact was created
}
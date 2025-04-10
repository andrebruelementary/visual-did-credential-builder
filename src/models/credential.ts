export interface CredentialProperty {
    id: string;
    label: string;
    value: string;
  }
  
  export interface Credential {
    id: string;
    subject: string; // Title/subject of the credential
    issuedTo: string; // DID of the recipient
    properties: CredentialProperty[];
    templateId?: string; // Reference to the template used
    issuedDate: string;
    expiryDate?: string;
  }
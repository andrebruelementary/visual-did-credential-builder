import { CredentialTemplate } from '../models/template';
import { Contact } from '../models/contact';
import { Credential } from '../models/credential';

export class StorageService {
  private static readonly TEMPLATES_KEY = 'credential_builder_demo_private_templates';
  private static readonly CONTACTS_KEY = 'credential_builder_demo_contacts';
  private static readonly CREDENTIALS_KEY = 'credential_builder_demo_credentials';

  // Template storage methods
  public static async getPrivateTemplates(): Promise<CredentialTemplate[]> {
    const result = await chrome.storage.local.get(this.TEMPLATES_KEY);
    return result[this.TEMPLATES_KEY] || [];
  }

  public static async savePrivateTemplate(template: CredentialTemplate): Promise<void> {
    const templates = await this.getPrivateTemplates();
    const existingIndex = templates.findIndex(t => t.id === template.id);
    
    if (existingIndex >= 0) {
      templates[existingIndex] = template;
    } else {
      templates.push({...template, isPublic: false});
    }
    
    await chrome.storage.local.set({ [this.TEMPLATES_KEY]: templates });
  }

  public static async deletePrivateTemplate(templateId: string): Promise<void> {
    const templates = await this.getPrivateTemplates();
    const filteredTemplates = templates.filter(t => t.id !== templateId);
    await chrome.storage.local.set({ [this.TEMPLATES_KEY]: filteredTemplates });
  }

  // Contact storage methods
  public static async getContacts(): Promise<Contact[]> {
    const result = await chrome.storage.local.get(this.CONTACTS_KEY);
    return result[this.CONTACTS_KEY] || [
      // Sample contacts for development
      { id: '1', name: 'Alice', did: 'did:example:alice' },
      { id: '2', name: 'Bob', did: 'did:example:bob' },
      { id: '3', name: 'Charlie', did: 'did:example:charlie' },
      { id: '4', name: 'University', did: 'did:example:university' },
      { id: '5', name: 'Work', did: 'did:example:work' },
      { id: '6', name: 'Doctor', did: 'did:example:doctor' }
    ];
  }

  // Credentials storage methods
  public static async getCredentials(): Promise<Credential[]> {
    const result = await chrome.storage.local.get(this.CREDENTIALS_KEY);
    return result[this.CREDENTIALS_KEY] || [];
  }

  public static async saveCredential(credential: Credential): Promise<void> {
    const credentials = await this.getCredentials();
    const existingIndex = credentials.findIndex(c => c.id === credential.id);
    
    if (existingIndex >= 0) {
      credentials[existingIndex] = credential;
    } else {
      credentials.push(credential);
    }
    
    await chrome.storage.local.set({ [this.CREDENTIALS_KEY]: credentials });
  }
}
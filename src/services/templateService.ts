import { CredentialTemplate } from '../models/template';
import { StorageService } from './storageService';
import { GitHubService } from './githubService';

export class TemplateService {
  public static async getAllTemplates(): Promise<{
    publicTemplates: CredentialTemplate[];
    privateTemplates: CredentialTemplate[];
  }> {
    const publicTemplatesPromise = GitHubService.getAllTemplates();
    const privateTemplatesPromise = StorageService.getPrivateTemplates();
    
    const [publicTemplates, privateTemplates] = await Promise.all([
      publicTemplatesPromise,
      privateTemplatesPromise
    ]);
    
    return {
      publicTemplates,
      privateTemplates
    };
  }
  
  public static async getTemplateById(templateId: string, isPublic: boolean): Promise<CredentialTemplate | null> {
    if (isPublic) {
      // Fetch from GitHub
      const templates = await GitHubService.getAllTemplates();
      return templates.find(t => t.id === templateId) || null;
    } else {
      // Fetch from local storage
      const templates = await StorageService.getPrivateTemplates();
      return templates.find(t => t.id === templateId) || null;
    }
  }
}
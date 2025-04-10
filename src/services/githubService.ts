import { CredentialTemplate } from '../models/template';

export class GitHubService {
  private static readonly GITHUB_REPO_URL = 'https://api.github.com/repos/andrebruelementary/verifiable-credential-templates/contents';
  private static readonly RAW_GITHUB_URL = 'https://raw.githubusercontent.com/andrebruelementary/verifiable-credential-templates/refs/heads/master';

  private static async fetchWithCache<T>(url: string, cacheDuration = 3600000): Promise<T> {
    const cacheKey = `github_cache_${url}`;
    const cacheTimeKey = `github_cache_time_${url}`;
    
    // Check if we have a valid cache
    const cachedData = localStorage.getItem(cacheKey);
    const cachedTime = localStorage.getItem(cacheTimeKey);
    
    if (cachedData && cachedTime) {
      const timeDiff = Date.now() - parseInt(cachedTime, 10);
      if (timeDiff < cacheDuration) {
        return JSON.parse(cachedData) as T;
      }
    }
    
    // Fetch fresh data
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Cache the data
    localStorage.setItem(cacheKey, JSON.stringify(data));
    localStorage.setItem(cacheTimeKey, Date.now().toString());
    
    return data as T;
  }

  public static async getFolderContents(path = ''): Promise<{type: string, name: string, path: string}[]> {
    const url = path ? `${this.GITHUB_REPO_URL}/${path}` : this.GITHUB_REPO_URL;
    return this.fetchWithCache(url);
  }

  public static async getTemplate(path: string): Promise<CredentialTemplate> {
    const url = `${this.RAW_GITHUB_URL}/${path}`;
    const template = await this.fetchWithCache<CredentialTemplate>(url);
    return { ...template, isPublic: true, path };
  }

  private static async getAllTemplatesRecursive(path = ''): Promise<CredentialTemplate[]> {
    console.log('Traversing directory:', path);
    const contents = await this.getFolderContents(path);
    console.log('Contents of', path, ':', contents);

    let templates: CredentialTemplate[] = [];

    for (const item of contents) {
      if (item.type === 'file' && item.name.endsWith('.json')) {
        try {
          const template = await this.getTemplate(item.path);
          templates.push(template);
        } catch (error) {
          console.error(`Error processing template ${item.path}:`, error);
        }
      } else if (item.type === 'dir') {
        const dirTemplates = await this.getAllTemplatesRecursive(item.path);
        templates = templates.concat(dirTemplates);
      }
    }

    return templates;
  }

  // And modify getAllTemplates to use it
  public static async getAllTemplates(): Promise<CredentialTemplate[]> {
    try {
      return await this.getAllTemplatesRecursive();
    } catch (error) {
      console.error('Error fetching templates from GitHub:', error);
      return [];
    }
  }
}
export interface TemplateProperty {
  id: string;
  label: string;
  type: string; // text, date, number, etc.
  required: boolean;
}

export interface CredentialTemplate {
  id: string;
  name: string;
  description?: string;
  properties: TemplateProperty[];
  isPublic: boolean; // Whether this is a public template from GitHub or private from local storage
  path?: string; // Path in the repository or storage
  source?: string; // Source of template: 'private', 'identus', 'w3c', etc.
}
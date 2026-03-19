import type { APIRequestContext } from '@playwright/test';
import * as fs from 'node:fs';

export type Organization = {
  id: string;
  name: string;
};

export type User = {
  id: string;
  email: string;
  password: string;
};

export type ApiKey = {
  id: string;
  key: string;
};

// Define a custom fixture to manage organization setup and cleanup
export interface AccessControlFixture {
  organization: Organization;
  headerOrgAgentId: string; //agent created in the default header org
  headerOrgRegularUser: User; // regular org member, in default header org
  newOrgAgentId: string; // agent created in the new org, with id organization
  newOrgRegularUser: User; // regular org member, created in new org
  request: APIRequestContext;
}

export interface AccessControlResources {
  organization: Organization;
  headerOrgAgentId: string; //agent created in the default header org
  headerOrgRegularUser: User; // regular org member, in default header org
  newOrgAgentId: string; // agent created in the new org, with id organization
  newOrgRegularUser: User; // regular org member, created in new org
}

export function readApiSetupJson(
  filePath: string,
): AccessControlResources | null {
  try {
    const fileData = fs.readFileSync(filePath, 'utf8');
    const accessControlResources: AccessControlResources = JSON.parse(fileData);
    return accessControlResources;
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return null;
  }
}
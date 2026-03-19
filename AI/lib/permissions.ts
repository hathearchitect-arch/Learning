import { createAccessControl } from 'better-auth/plugins/access';
import { defaultStatements, adminAc } from 'better-auth/plugins/admin/access';
import {
  defaultStatements as organizationDefaultStatement,
  adminAc as organizationAdminAc,
  ownerAc as organizationOwnerAc,
} from 'better-auth/plugins/organization/access';

//statement and access controls for use at app-level
const appStatement = {
  ...defaultStatements,
  agent: ['create', 'retrieve', 'update', 'delete'],
  chat: ['create', 'retrieve', 'impersonateUser'],
  apiKey: ['create', 'retrieve', 'update', 'delete'],
  organizationMembership: ['create', 'retrieve', 'update', 'delete'],
  document: ['create', 'retrieve', 'update', 'delete'],
  file: ['create', 'retrieve', 'update', 'delete'],
  folder: ['create', 'retrieve', 'update', 'delete'],
  dashboard: ['retrieve'],
  users: ['create', 'retrieve', 'update', 'delete'],
  organizationConfig: ['update'],
} as const;

export const appAc = createAccessControl(appStatement);

export const appAdminRole = appAc.newRole({
  ...adminAc.statements,
  agent: ['create', 'retrieve', 'update', 'delete'],
  chat: ['create', 'retrieve', 'impersonateUser'],
  apiKey: ['create', 'retrieve', 'update', 'delete'],
  organizationMembership: ['create', 'retrieve', 'update', 'delete'],
  document: ['create', 'retrieve', 'update', 'delete'],
  file: ['create', 'retrieve', 'update', 'delete'],
  folder: ['create', 'retrieve', 'update', 'delete'],
  dashboard: ['retrieve'],
  users: ['create', 'retrieve', 'update', 'delete'],
  organizationConfig: ['update'],
});

//statement and access controls for use at org-levels
const organizationStatement = {
  ...organizationDefaultStatement,
  agent: ['create', 'retrieve', 'update', 'delete'],
  chat: ['create', 'retrieve', 'impersonateUser'],
  apiKey: ['create', 'retrieve', 'update', 'delete'],
  organization: ['retrieve', 'update', 'delete'],
  organizationMembership: ['create', 'retrieve', 'update', 'delete'],
  document: ['create', 'retrieve', 'update', 'delete'],
  file: ['create', 'retrieve', 'update', 'delete'],
  folder: ['create', 'retrieve', 'update', 'delete'],
  users: ['create', 'retrieve', 'update', 'delete'],
  dashboard: ['retrieve'],
  organizationConfig: ['update'],
  database: ['create', 'retrieve', 'update', 'delete'],
} as const;

export const organizationAc = createAccessControl(organizationStatement);
export const organizationOwnerRole = organizationAc.newRole({
  ...organizationOwnerAc.statements,
  agent: ['create', 'retrieve', 'update', 'delete'],
  chat: ['create', 'retrieve', 'impersonateUser'],
  apiKey: ['create', 'retrieve', 'update', 'delete'],
  organizationMembership: ['create', 'retrieve', 'update', 'delete'],
  document: ['create', 'retrieve', 'update', 'delete'],
  file: ['create', 'retrieve', 'update', 'delete'],
  folder: ['create', 'retrieve', 'update', 'delete'],
  dashboard: ['retrieve'],
  users: ['create', 'retrieve', 'update', 'delete'],
  organizationConfig: ['update'],
});

export const organizationAdminRole = organizationAc.newRole({
  ...organizationAdminAc.statements,
  agent: ['create', 'retrieve', 'update', 'delete'],
  chat: ['create', 'retrieve', 'impersonateUser'],
  apiKey: ['create', 'retrieve', 'update', 'delete'],
  organizationMembership: ['create', 'retrieve', 'update', 'delete'],
  document: ['create', 'retrieve', 'update', 'delete'],
  file: ['create', 'retrieve', 'update', 'delete'],
  folder: ['create', 'retrieve', 'update', 'delete'],
  dashboard: ['retrieve'],
  users: ['create', 'retrieve', 'update', 'delete'],
});

export const organizationMemberRole = organizationAc.newRole({
  organization: ['retrieve'],
  organizationMembership: [],
  member: [],
  invitation: [],
  agent: ['retrieve'],
});

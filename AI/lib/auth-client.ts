import { createAuthClient } from 'better-auth/react';
import {
  organizationClient,
  adminClient,
  apiKeyClient,
} from 'better-auth/client/plugins';
import { userAc as appUserRole } from 'better-auth/plugins/admin/access';
import { ownerAc as organizationOwnerRole } from 'better-auth/plugins/organization/access';
import {
  appAc,
  appAdminRole,
  organizationAc,
  organizationAdminRole,
  organizationMemberRole,
} from './permissions';
import type { auth } from './auth';

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  organization,
  useListOrganizations,
  useActiveOrganization,
  useActiveMember,
  sendVerificationEmail,
  requestPasswordReset,
  resetPassword,
} = createAuthClient({
  plugins: [
    organizationClient({
      $inferAuth: {} as typeof auth,
      schema: {
        organization: {
          additionalFields: {
            logoS3Key: {
              type: 'string',
              required: false,
            },
          },
        },
      },
      ac: organizationAc,
      roles: {
        organizationOwnerRole,
        organizationAdminRole,
        organizationMemberRole,
      },
    }),
    adminClient({
      ac: appAc,
      roles: {
        appAdminRole,
        appUserRole,
      },
    }),
    apiKeyClient(),
  ],
});

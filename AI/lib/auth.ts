import { betterAuth, generateId } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { organization, admin, apiKey, openAPI } from 'better-auth/plugins';
import { headers } from 'next/headers';
import type { NextRequest } from 'next/server';
import {
  checkOrganizationMembership,
  getUser,
  getUserById,
} from './db/queries';
import { userAc as appUserRole } from 'better-auth/plugins/admin/access';
import { ownerAc as organizationOwnerRole } from 'better-auth/plugins/organization/access';
import {
  appAc,
  appAdminRole,
  organizationAc,
  organizationAdminRole,
  organizationMemberRole,
} from './permissions';
import {
  sendOrganizationInvitation,
  sendUserVerificationEmail,
} from '@/lib/email';
import { createAuthMiddleware, APIError } from 'better-auth/api';
import { sendPasswordResetEmail } from '@/lib/email';
import { generateUUID } from '@/lib/utils';
import assert from 'node:assert';

const additionalOrganizationFields = {};

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET as string,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: { ...schema },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url, token }, request) => {
      await sendPasswordResetEmail({
        email: user.email,
        url: url,
        token: token,
      });
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url, token }, request) => {
      await sendUserVerificationEmail({
        email: user.email,
        url: url,
        token: token,
      });
    },
  },
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path === '/sign-up/email') {
        // get the email from the request body
        if (!ctx.body?.email) {
          throw new APIError('BAD_REQUEST', {
            message: 'Email is required',
          });
        }

        const userEmail = ctx.body?.email;

        // get the user's id based on the email
        const userData = await db.query.user.findFirst({
          where: eq(schema.user.email, userEmail),
        });

        // Auto-Accept all agents provided to the user in the agent_user table.
        const userAgents = await db
          .update(schema.agentUser)
          .set({
            isActive: true,
            inviteStatus: 'accepted',
            userId: userData?.id,
          })
          .where(eq(schema.agentUser.inviteEmail, userEmail))
          .returning();

        // add user as member to all the organizations they have been provisioned agents in.
        const provisionedAgentOrganizations = await db.query.agent.findMany({
          where: inArray(
            schema.agent.id,
            userAgents.map((agentUser) => agentUser.agentId),
          ),
        });

        // Get unique organization IDs of the agents
        // This ensures the user is added only once to each organization
        const uniqueOrganizationIds = [
          ...new Set(
            provisionedAgentOrganizations.map((agent) => agent.organizationId),
          ),
        ];

        // Add user as member to all organizations (if not already a member)
        if (uniqueOrganizationIds.length > 0 && userData?.id) {
          const organizationMemberships = uniqueOrganizationIds.map(
            (orgId) => ({
              id: generateId(),
              userId: userData.id,
              organizationId: orgId,
              role: 'member', // or whatever the default role should be
              createdAt: new Date(),
            }),
          );

          await db
            .insert(schema.member)
            .values(organizationMemberships)
            .onConflictDoNothing(); // Prevents duplicate entries if user is already a member
        }

        console.log(
          `New user sign up ${ctx.body?.email} has access to ${userAgents.length} agents`,
        );
      }
    }),
  },
  plugins: [
    organization({
      // https://www.better-auth.com/docs/plugins/organization#restrict-who-can-create-an-organization
      // restricts the ability to create orgs to app-level admins
      allowUserToCreateOrganization: async (user) => {
        const userData = await getUser(user.email);
        if (userData.length === 0) {
          return false;
        }
        return userData[0].role === 'admin';
      },
      ac: organizationAc,
      roles: {
        owner: organizationOwnerRole,
        admin: organizationAdminRole,
        member: organizationMemberRole,
      },
      async sendInvitationEmail(data) {
        const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/signup?invitationId=${data.id}`;
        // @ts-ignore
        if (data.invitation.sendInvite === true) {
          sendOrganizationInvitation({
            email: data.email,
            invitedByUsername: data.inviter.user.name,
            invitedByEmail: data.inviter.user.email,
            organizationName: data.organization.name,
            inviteLink,
          });
        }
      },
      // https://www.better-auth.com/docs/plugins/organization#customizing-the-schema
      schema: {
        organization: {
          additionalFields: {
            plan: {
              type: 'string',
              input: true,
              defaultValue: 'free',
              required: false,
            },
            planExpiresAt: {
              type: 'date',
              input: false,
              required: false,
            },
            customMetadataFilterFunction: {
              type: 'string',
              input: true,
              defaultValue: 'generic',
              required: false,
            },
            customMetadataFilterConfig: {
              type: 'string',
              input: true,
              required: false,
            },
            theme: {
              type: 'string',
              input: true,
              required: false,
            },
            font: {
              type: 'string',
              input: true,
              defaultValue: 'Inter',
              required: false,
            },
            logoS3Key: {
              type: 'string',
              input: true,
              required: false,
            },
            chatHelpUrl: {
              type: 'string',
              input: true,
              required: false,
            },
          },
        },
        invitation: {
          additionalFields: {
            sendInvite: {
              type: 'boolean',
              input: true,
              required: false,
            },
          },
        },
      },
    }),
    admin({
      ac: appAc,
      roles: {
        admin: appAdminRole,
        user: appUserRole,
      },
    }),
    apiKey({
      rateLimit: {
        enabled: false,
      },
    }),
    openAPI(),
  ],
});

export async function getSession() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(), // you need to pass the headers object.
    });
    return session;
  } catch (error) {
    // return null session if unable to retrieve
    // ALL ENDPOINTS MUST REQUIRE A SESSION, AND THROW A 401 UNAUTHORIZED IF getSession() RETURNS NULL
    console.error('error retrieving session: ', error);
    return null;
  }
}

export async function getActiveOrganization(request: NextRequest | Request) {
  try {
    if (request.headers.get('X-API-KEY')) {
      // validate api key, getting user id

      //get full org for user-provided org id, assign to organization
      const activeOrganizationHeader = request.headers.get('X-Organization-ID');
      const activeOrganization = await auth.api.getFullOrganization({
        headers: await headers(),
        query: {
          organizationId: activeOrganizationHeader || 'no-org-provided',
        },
      });
      if (!activeOrganization) {
        throw new Error('No organization matches provided org id');
      }
      return activeOrganization;
    }

    //normal GUI interactions handled here, since no API key is provided
    const activeOrganization = await auth.api.getFullOrganization({
      headers: await headers(),
    });
    return activeOrganization;
  } catch (error) {
    console.error('encountered error on getActiveOrganization call: ', error);
    return null;
  }
}

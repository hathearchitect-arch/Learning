import {
  checkOrganizationMembership,
  getUser,
  getUserById,
} from '@/lib/db/queries';
import { generateUUID } from '@/lib/utils';
import { auth } from '@/lib/auth';
import assert from 'node:assert';
import { ChatSDKError } from '@/lib/errors';

export type ImpersonatedUserIdentifiers = {
  id: string | undefined;
  email: string | undefined;
};

export async function getImpersonatedUser(
  id: string | undefined,
  email: string | undefined,
) {
  let impersonatedUser = await getUserById(id || '');
  if (impersonatedUser.length > 0) {
    return impersonatedUser[0];
  }
  impersonatedUser = await getUser(email || '');
  if (impersonatedUser.length > 0) {
    return impersonatedUser[0];
  }
  return null;
}

export async function handleImpersonatedUser(
  impersonatedUserIdentifiers: ImpersonatedUserIdentifiers,
  activeOrganizationId: string,
) {
  const impersonatedUser = await getImpersonatedUser(
    impersonatedUserIdentifiers?.id,
    impersonatedUserIdentifiers?.email,
  );

  //if user doesn't already exist, create them and add to active org
  if (!impersonatedUser && !impersonatedUserIdentifiers.email) {
    return new ChatSDKError(
      'bad_request:chat',
      'To create a new user through impersonation, you must provide their email',
    ).toResponse();
  }
  if (!impersonatedUser) {
    const createImpersonatedUserResponse = await createImpersonatedUser(
      impersonatedUserIdentifiers.email,
      activeOrganizationId,
    );
    if (!createImpersonatedUserResponse?.ok) {
      return createImpersonatedUserResponse;
    }
    console.log(
      'created new user with email: ',
      impersonatedUserIdentifiers.email,
    );
  } else {
    //if user does already exist, ensure they belong to active org
    const userBelongsToActiveOrganization = await checkOrganizationMembership(
      impersonatedUser?.id || '',
      activeOrganizationId,
    );
    if (!userBelongsToActiveOrganization) {
      try {
        await auth.api.addMember({
          body: {
            userId: impersonatedUser.id,
            role: ['member'],
            organizationId: activeOrganizationId,
          },
        });
      } catch (error) {
        console.error(
          'failed to add impersonated user to active organization. error: ',
          error,
        );
        throw new Error(
          'failed to add impersonated user to active organization',
        );
      }
    }
  }
}

async function createImpersonatedUser(
  email: string | undefined,
  activeOrganizationId: string,
) {
  try {
    if (!email) {
      return new ChatSDKError(
        'bad_request:chat',
        'Must provide email of user when creating a new impersonated user',
      ).toResponse();
    }

    const newUser = await auth.api.createUser({
      body: {
        name: email,
        email,
        password: generateUUID(),
        role: 'user',
      },
    });

    //add new user to active organization
    const addUserResponse = await auth.api.addMember({
      body: {
        userId: newUser.user.id,
        organizationId: activeOrganizationId,
        role: 'member',
      },
    });
    assert.strictEqual(!addUserResponse, false); //assert that user was successfully added to org, raises error if not
  } catch (error) {
    console.log('error creating user and adding to active org: ', error);
    return new ChatSDKError(
      'bad_request:chat',
      'Failed to create new impersonated user',
    ).toResponse();
  }
}

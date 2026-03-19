'use server';

import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { Resource } from 'sst';

const sesClient = new SESv2Client({ region: process.env.AWS_REGION });

export async function sendUserVerificationEmail({
  email,
  url,
  token,
}: {
  email: string;
  url: string;
  token: string;
}) {
  if (!email || !url || !token) {
    throw new Error(
      'All parameters are required to send a verification email.',
    );
  }

  const fromEmailAddress = `no-reply@${Resource.CaddieEmail.sender}`;

  const command = new SendEmailCommand({
    FromEmailAddress: fromEmailAddress,
    Destination: {
      ToAddresses: [email],
    },
    Content: {
      Simple: {
        Subject: {
          Data: 'Verify your email address',
        },
        Body: {
          Text: {
            Data: `Click the link to verify your email: ${url}`,
          },
        },
      },
    },
  });

  try {
    const response = await sesClient.send(command);
    console.log(`Verification email sent successfully: ${response.MessageId}`);
  } catch (error) {
    console.error(`Error sending verification email: ${error}`);
  }
}

export async function sendOrganizationInvitation({
  email,
  invitedByUsername,
  invitedByEmail,
  organizationName,
  inviteLink,
}: {
  email: string;
  invitedByUsername: string;
  invitedByEmail: string;
  organizationName: string;
  inviteLink: string;
}) {
  if (
    !email ||
    !invitedByUsername ||
    !invitedByEmail ||
    !organizationName ||
    !inviteLink
  ) {
    throw new Error('All parameters are required to send an invitation.');
  }

  // email sender
  const fromEmailAddress = `no-reply@${Resource.CaddieEmail.sender}`;
  console.log(`Sending invitation to: ${email}`);
  console.log(`From: ${fromEmailAddress}`);

  const inviteUserCommand = new SendEmailCommand({
    FromEmailAddress: fromEmailAddress,
    Destination: {
      ToAddresses: [email],
    },
    Content: {
      Simple: {
        Subject: {
          Data: `Invitation to join ${organizationName}`,
        },
        Body: {
          Text: {
            Data: `
Hello,

You have been invited to join ${organizationName} by ${invitedByUsername} (${invitedByEmail}).

To accept the invitation, please use the link below to sign in or create an account:

${inviteLink}

Best regards,
The ${organizationName} Team

              `,
          },
        },
      },
    },
  });

  try {
    const response = await sesClient.send(inviteUserCommand);
    console.log(`Invitation sent successfully: ${response.MessageId}`);
  } catch (error) {
    console.error(`Error sending invitation: ${error}`);
  }
  console.log(`Organization Name: ${organizationName}`);
  console.log(`Invite Link: ${inviteLink}`);
}

export async function sendPasswordResetEmail({
  email,
  url,
  token,
}: {
  email: string;
  url: string;
  token: string;
}) {
  if (!email || !url || !token) {
    throw new Error(
      'All parameters are required to send a password reset email.',
    );
  }

  const fromEmailAddress = `no-reply@${Resource.CaddieEmail.sender}`;

  const command = new SendEmailCommand({
    FromEmailAddress: fromEmailAddress,
    Destination: {
      ToAddresses: [email],
    },
    Content: {
      Simple: {
        Subject: {
          Data: 'Reset your password',
        },
        Body: {
          Text: {
            Data: `Click the link to reset your password: ${url}`,
          },
        },
      },
    },
  });

  try {
    const response = await sesClient.send(command);
    console.log(`Verification email sent successfully: ${response.MessageId}`);
  } catch (error) {
    console.error(`Error sending verification email: ${error}`);
  }
}

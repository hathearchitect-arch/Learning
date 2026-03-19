import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Resource } from 'sst';
import type {
  ThemeColors,
  ThemeMode,
  FontSettings,
} from '@/lib/theme/defaults';
import { getAgent, getOrganizationById } from './db/queries';

const awsRegion = process.env.AWS_REGION;

const s3Client = new S3Client({
  region: awsRegion,
});

export async function getLogoUrl(logoS3Key: string): Promise<string | null> {
  if (!logoS3Key) {
    return null;
  }

  try {
    const command = new GetObjectCommand({
      Bucket: Resource.AppBucket.name,
      Key: logoS3Key,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 60 * 60, // 1 hour
    });

    return presignedUrl;
  } catch (error) {
    console.error('Error getting logo URL:', error);
    return null;
  }
}

type AgentTheme = {
  name: string | null;
  agentLogoUrl: string | null;
  theme: ThemeMode;
  themeAttributes: ThemeColors | undefined;
  fonts: FontSettings | undefined;
};

export async function getAgentTheme(
  agentId: string,
): Promise<AgentTheme | null> {
  if (!agentId) {
    return null;
  }

  const agentObj = await getAgent(agentId);

  // Get agent logo URL if logoS3Key exists
  const agentLogoUrl = agentObj?.logoS3Key
    ? await getLogoUrl(agentObj.logoS3Key)
    : null;

  const theme = (agentObj?.theme as ThemeMode) || 'light';
  const themeAttributes = agentObj?.themeAttributes as ThemeColors | undefined;

  // Extract font settings from the dedicated font field or themeAttributes as fallback
  const fonts: FontSettings | undefined =
    agentObj?.font || themeAttributes
      ? {
          headingFont:
            agentObj?.font || themeAttributes?.headingFont || 'Inter',
          bodyFont: agentObj?.font || themeAttributes?.bodyFont || 'Inter',
          fontSize: themeAttributes?.fontSize || '16px',
        }
      : undefined;

  return {
    name: agentObj.name,
    agentLogoUrl,
    theme,
    themeAttributes,
    fonts,
  };
}

type OrganizationTheme = {
  name: string | null;
  organizationLogoUrl: string | null;
  theme: ThemeMode;
  fonts: FontSettings | undefined;
};

export async function getOrganizationTheme(
  organizationId: string,
): Promise<OrganizationTheme | null> {
  try {
    const organization = await getOrganizationById(organizationId);
    if (!organization?.theme || !organization.font) {
      return null;
    }
    const fonts: FontSettings | undefined = organization?.font
      ? {
          headingFont: organization?.font || 'Inter',
          bodyFont: organization?.font || 'Inter',
          fontSize: '16px',
        }
      : undefined;
    const organizationLogoUrl = await getLogoUrl(
      organization?.logoS3Key || '',
    ).catch(() => null);
    return {
      name: organization?.name,
      organizationLogoUrl,
      theme: organization.theme,
      fonts: fonts,
    };
  } catch {
    return null;
  }
}

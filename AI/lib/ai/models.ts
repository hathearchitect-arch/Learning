import { SiAnthropic } from '@icons-pack/react-simple-icons';
import { IconBrandAws } from '@tabler/icons-react';

const awsRegion = process.env.AWS_REGION || 'us-east-1';
// split the region to get the prefix for inference profiles
const inferenceProfilePrefix = awsRegion.split('-')[0].toLowerCase();

export interface ModelOption {
  value: string;
  label: string;
  provider: string;
  description: string;
  isPremium: boolean;
}

export function getModelIcon(provider: string) {
  switch (provider.toLowerCase()) {
    case 'anthropic':
      return SiAnthropic;
    case 'amazon':
      return IconBrandAws;
    default:
      return SiAnthropic; // fallback
  }
}

// for the anthropic models, we use the inference profile prefix
const availableModels: ModelOption[] = [
  {
    value: `${inferenceProfilePrefix}.anthropic.claude-sonnet-4-20250514-v1:0`,
    label: 'Claude Sonnet 4',
    provider: 'anthropic',
    description: 'Best for complex analysis and creative tasks',
    isPremium: true,
  },
  {
    value: `${inferenceProfilePrefix}.anthropic.claude-3-7-sonnet-20250219-v1:0`,
    label: 'Claude 3.7 Sonnet',
    provider: 'anthropic',
    description: 'Balanced performance and speed',
    isPremium: true,
  },
  {
    value: `${inferenceProfilePrefix}.anthropic.claude-3-5-haiku-20241022-v1:0`,
    label: 'Claude 3.5 Haiku',
    provider: 'anthropic',
    description: 'Fastest Claude model for quick responses',
    isPremium: false,
  },
  {
    value: 'amazon.nova-pro-v1:0',
    label: 'Nova Pro',
    provider: 'amazon',
    description: 'High performance for enterprise applications',
    isPremium: true,
  },
  {
    value: 'amazon.nova-lite-v1:0',
    label: 'Nova Lite',
    provider: 'amazon',
    description: 'Fast multi-modal model for general use',
    isPremium: false,
  },
];

export { availableModels };

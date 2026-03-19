import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
  type LanguageModelV1Middleware,
} from 'ai';
import { isTestEnvironment } from '../constants';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test';
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';

const awsRegion = process.env.AWS_REGION || 'us-east-1';

const inferenceProfilePrefix = awsRegion.split('-')[0].toLowerCase();

export const bedrock = createAmazonBedrock({
  region: process.env.AWS_REGION || 'us-east-1',
  credentialProvider: fromNodeProviderChain(),
});

const middleware: LanguageModelV1Middleware = {
  transformParams: async ({ params }) => params,
  wrapStream: async ({ doStream }) => doStream(),
};

// language models
export function bedrockLanguageModel(modelId: string) {
  return wrapLanguageModel({
    model: bedrock.languageModel(modelId),
    middleware: middleware,
  });
}

// For Backwards compatibility with titleModel and artifactModel
const bedrockLanguageModelDefault = wrapLanguageModel({
  model: bedrock.languageModel(
    `${inferenceProfilePrefix}.anthropic.claude-sonnet-4-20250514-v1:0`,
  ),
  middleware: middleware,
});

export const myProvider = isTestEnvironment
  ? customProvider({
      languageModels: {
        'chat-model': chatModel,
        'chat-model-reasoning': reasoningModel,
        'title-model': titleModel,
        'artifact-model': artifactModel,
      },
    })
  : customProvider({
      languageModels: {
        'chat-model': bedrockLanguageModelDefault,
        'chat-model-reasoning': wrapLanguageModel({
          model: bedrockLanguageModelDefault,
          middleware: extractReasoningMiddleware({ tagName: 'think' }),
        }),
        'title-model': bedrockLanguageModelDefault,
        'artifact-model': bedrockLanguageModelDefault,
      },
      imageModels: {
        'small-model': bedrock.image(
          `${inferenceProfilePrefix}.anthropic.claude-sonnet-4-20250514-v1:0`,
        ),
      },
    });

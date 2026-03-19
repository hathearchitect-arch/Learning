import type { RetrievalFilter } from '@aws-sdk/client-bedrock-agent-runtime';
import crypto from 'node:crypto';
import { Resource } from 'sst';

export const customMetadataFilterFunctions = {
  generic: async (requestBody: any, config: any): Promise<any> => {
    const retrieveCommandFilters = await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        organizationId: requestBody.organizationId,
        userId: requestBody.userId,
        metadata: requestBody.metadata,
      }),
    });
    const retrieveCommandFiltersJson: RetrievalFilter =
      await retrieveCommandFilters.json();
    return retrieveCommandFiltersJson;
  },
  authenticated: async (requestBody: any, config: any): Promise<any> => {
    // compute x-signature request header
    const key = Resource.CustomMetadataEndpointKey;
    const secret = Resource.CustomMetadataEndpointSecret;
    const timestamp = new Date().toISOString();
    const message = `${key.value}${timestamp}${JSON.stringify(requestBody.metadata)}`;
    console.log(`message: ${message}`);
    const signature = crypto
      .createHmac('sha256', secret.value)
      .update(message)
      .digest('base64');

    const retrieveCommandFilters = await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': key.value,
        'X-TIMESTAMP': timestamp,
        'X-SIGNATURE': signature,
      },
      body: JSON.stringify({
        organizationId: requestBody.organizationId,
        userId: requestBody.userId,
        metadata: requestBody.metadata,
      }),
    });
    const retrieveCommandFiltersJson = await retrieveCommandFilters.json();
    return retrieveCommandFiltersJson;
  },
  test: async (requestBody: any, config: any): Promise<any> => {
    return {
      orAll: [
        {
          equals: {
            key: 'fileName',
            value: 'doc1.txt',
          },
        },
        {
          equals: {
            key: 'fileName',
            value: 'doc2.txt',
          },
        },
      ],
    };
  },
};

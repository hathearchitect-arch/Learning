import { test, expect } from '@playwright/test';

test('list api keys', async ({ request }) => {
  const apiKeyListResponse = await request.get('/api/auth/api-key/list', {
    headers: {
      Accept: 'application/json',
    },
  });

  expect(apiKeyListResponse.ok()).toBeTruthy(); //expect successful api response
  const apiKeyList = await apiKeyListResponse.json();
  expect(apiKeyList).toHaveProperty('keyList'); //expect a list of API keys
  expect(apiKeyList.keyList.length).toBeGreaterThan(0); //expect > 0 API keys
});

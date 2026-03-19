import { test, expect } from '@playwright/test';

test('get signin page', async ({ request }) => {
  const response = await request.get('/signin');

  expect(response.status()).toBe(200);
});

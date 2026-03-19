import { headers } from 'next/headers';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';

async function get(url: string, options?: RequestInit): Promise<any> {
  try {
    const response = await fetch(baseUrl + url, {
      method: 'GET',
      headers: await headers(),
      ...options,
    });

    if (!response.ok) {
      console.error(`GET request failed with status ${response.status}`);
      throw new Error(`GET request failed with status ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching data:', error);
    return null;
  }
}

export const caddieApi = {
  get,
};

'use server';

const caddieApiUrl = process.env.CADDIE_API_URL;

export async function confirmSignUp(
  email: string,
  confirmationCode: string,
): Promise<void> {
  const response = await fetch(`${caddieApiUrl}/user/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: email,
      confirmationCode: confirmationCode,
    }),
  });
  console.log('Confirm Sign Up Response:', response);

  if (!response.ok) {
    const error = await response.json();
    console.error('Error confirming sign up:', error);
    throw new Error(error.error.message.join(', '));
  }
  return response.json();
}

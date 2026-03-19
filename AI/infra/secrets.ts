// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../.sst/platform/config.d.ts" />

export const authSecret = new sst.Secret('AuthSecret');
export const customMetadataEndpointKey = new sst.Secret(
  'CustomMetadataEndpointKey',
);
export const customMetadataEndpointSecret = new sst.Secret(
  'CustomMetadataEndpointSecret',
);

new sst.x.DevCommand('SecretsList', {
  dev: {
    command: 'npx sst secret list',
    autostart: false,
  },
});

new sst.x.DevCommand('SecretsSet', {
  dev: {
    command: 'npx sst secret load .env.sst.secrets',
    autostart: false,
  },
});

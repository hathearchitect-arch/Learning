// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../.sst/platform/config.d.ts" />

import { database } from './database';
import { authSecret } from './secrets';

new sst.x.DevCommand('BetterAuthGenerate', {
  link: [database, authSecret],
  dev: {
    command: $interpolate`npx @better-auth/cli generate --output ./lib/db/schema-auth.ts --y`,
    autostart: false,
  },
});

// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../.sst/platform/config.d.ts" />

import { domain } from './variables';

export const caddieEmail = new sst.aws.Email('CaddieEmail', {
  sender: domain,
  dmarc: 'v=DMARC1; p=quarantine; adkim=s; aspf=s;',
});

export const caddieEmailSenderAddress = `no-reply@${domain}`;

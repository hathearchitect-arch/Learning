// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../.sst/platform/config.d.ts" />

export const vpc = new sst.aws.Vpc('CaddieVpc', {
  bastion: true,
  nat: {
    ec2: {
      instance: 't4g.nano',
    },
    type: 'ec2',
  },
  transform: {
    natInstance: {
      tags: {
        Name: `${$app.name}-${$app.stage}-vpc-nat-instance`,
      },
    },
    vpc: {
      tags: {
        Name: `${$app.name}-${$app.stage}-vpc`,
      },
    },
  },
});

export const vpcCidr = vpc.id.apply((vpcId) => aws.ec2.getVpc({ id: vpcId }));

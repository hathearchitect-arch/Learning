import { Card, CardContent } from '../ui/card';
import { Label } from '../ui/label';
import type { OrganizationConfigurationProps } from './organization-settings-tabs';

type OrganizationChatSettingsProps = {
  organization: OrganizationConfigurationProps['organization'];
};

export default function OrganizationAdvancedSettings({
  organization,
}: OrganizationChatSettingsProps) {
  return (
    <>
      <CardContent>
        <div className="mb-4">
          <Label className="text-sm font-medium">Chat UI Help URL</Label>
          <div>
            <span className="text-sm text-muted-foreground">
              {organization.chatHelpUrl
                ? organization.chatHelpUrl
                : 'https://gocaddie.ai/'}
            </span>
          </div>
        </div>
        <div>
          <Label className="text-sm font-medium">
            Custom Metadata Filtering Config
          </Label>
          <Card className="p-4">
            <div>
              <span>
                <pre>
                  <code className="text-sm text-muted-foreground">
                    {JSON.stringify(
                      JSON.parse(organization.customMetadataFilterConfig),
                      null,
                      4,
                    )}
                  </code>
                </pre>
              </span>
            </div>
          </Card>
        </div>
      </CardContent>
    </>
  );
}

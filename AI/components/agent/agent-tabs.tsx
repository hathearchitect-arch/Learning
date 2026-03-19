'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AgentConfiguration } from '@/components/agent/agent-configuration';
import { ToolsConfiguration } from '@/components/agent/agent-tools-configuration';
import { KnowledgebaseConfiguration } from '@/components/agent/agent-knowledgebase-configuration';
import { AccessControl } from '@/components/agent/agent-access-control';
import {
  Book,
  LayoutDashboard,
  Palette,
  Quote,
  Shield,
  Hammer,
} from 'lucide-react';
import { generateUUID } from '@/lib/utils';
import { AgentSuggestedActionsForm } from './agent-suggested-actions-form';
import { AgentThemeForm } from './agent-theme-form';
import { AgentThemePreview } from './agent-theme-preview';
import { AgentThemeFontForm } from './agent-theme-font-form';
import { AgentGreetingForm } from './agent-greeting-form';
import { AgentAvatarForm } from './agent-avatar-form';
import { AgentLogoForm } from './agent-logo-form';
import {
  type ThemeColors,
  type FontSettings,
  type ThemeMode,
  defaultLightThemeColors,
  defaultFontSettings,
} from '@/lib/theme/defaults';
import { useState, useEffect } from 'react';
import type { Session, User } from 'better-auth';

interface AgentTabsProps {
  agent: any; // TODO Replace with your actual agent type
  defaultTab: string;
  session: { session: Session; user: User }; // Replace with your actual session type
}

export function AgentTabs({ agent, defaultTab, session }: AgentTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = generateUUID();
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  const [themeColors, setThemeColors] = useState<ThemeColors>({
    ...(agent.themeAttributes || defaultLightThemeColors),
    // Ensure font settings are included with defaults
    headingFont: agent.font || agent.themeAttributes?.headingFont || 'Inter',
    bodyFont: agent.font || agent.themeAttributes?.bodyFont || 'Inter',
    fontSize: agent.themeAttributes?.fontSize || '16px',
  });
  const [fontSettings, setFontSettings] =
    useState<FontSettings>(defaultFontSettings);

  // Update form when organization changes
  useEffect(() => {
    if (agent) {
      if (agent.themeAttributes) {
        setThemeColors({
          ...agent.themeAttributes,
          // Ensure font settings are included with defaults if not present
          headingFont:
            agent.font || agent.themeAttributes.headingFont || 'Inter',
          bodyFont: agent.font || agent.themeAttributes.bodyFont || 'Inter',
          fontSize: agent.themeAttributes.fontSize || '16px',
        });
      }
    }
  }, [agent]);

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', value);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  return (
    <Tabs value={defaultTab} onValueChange={handleTabChange} className="mb-6">
      <TabsList>
        <TabsTrigger value="dashboard">
          <span className="flex items-center gap-2">
            <LayoutDashboard className="size-4" />
            Dashboard
          </span>
        </TabsTrigger>
        <TabsTrigger value="knowledgebase">
          <span className="flex items-center gap-2">
            <Book className="size-4" />
            Knowledgebase
          </span>
        </TabsTrigger>
        <TabsTrigger value="tools">
          <span className="flex items-center gap-2">
            <Hammer className="size-4" />
            Tools
          </span>
        </TabsTrigger>
        <TabsTrigger value="branding">
          <span className="flex items-center gap-2">
            <Palette className="size-4" />
            Branding
          </span>
        </TabsTrigger>
        <TabsTrigger value="suggested-actions">
          <span className="flex items-center gap-2">
            <Quote className="size-4" />
            Suggestions
          </span>
        </TabsTrigger>
        <TabsTrigger value="access-control">
          <span className="flex items-center gap-2">
            <Shield className="size-4" />
            Access Control
          </span>
        </TabsTrigger>
        {/* 
        <TabsTrigger value="access-control">
          <span className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Access Control
          </span>
        </TabsTrigger>
        <TabsTrigger value="tools">
          <span className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Tools
          </span>
        </TabsTrigger>        
        */}
      </TabsList>
      <div className="mt-6">
        <TabsContent value="dashboard">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-3 space-y-6">
              {/* Agent Configuration Component */}
              <AgentConfiguration agent={agent} />
            </div>
          </div>
        </TabsContent>

        {/* Knowledge Base Tab Content */}
        <TabsContent value="knowledgebase">
          <div className="lg:col-span-2 space-y-6">
            {/* Knowledge Base Configuration Component */}
            <KnowledgebaseConfiguration agent={agent} />
          </div>
        </TabsContent>

        {/* Tools Tabs Content */}
        <TabsContent value="tools">
          <div className="lg:col-span-2 space-y-6">
            {/* Knowledge Base Configuration Component */}
            <ToolsConfiguration agent={agent} />
          </div>
        </TabsContent>

        {/* Branding Tab Content */}
        <TabsContent value="branding">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Left column - Theme and Font Forms */}
            <div className="space-y-6">
              {/* Agent Theme Form Component */}
              <AgentThemeForm
                agent={agent}
                themeMode={themeMode}
                setThemeMode={setThemeMode}
                themeColors={themeColors}
                setThemeColors={setThemeColors}
              />

              {/* Agent Font Form Component */}
              <AgentThemeFontForm
                agent={agent}
                themeColors={themeColors}
                setThemeColors={setThemeColors}
              />

              {/* Agent Avatar Form Component */}
              <AgentAvatarForm agent={agent} />

              {/* Agent Logo Form Component */}
              <AgentLogoForm agent={agent} />

              {/* Agent Greeting Form Component */}
              <AgentGreetingForm agent={agent} />
            </div>

            {/* Right column - Preview */}
            <AgentThemePreview
              key={JSON.stringify(themeColors)}
              colors={themeColors}
              fonts={fontSettings}
              mode={themeMode}
            />
          </div>
        </TabsContent>

        {/* Suggested Actions Tab Content */}
        <TabsContent value="suggested-actions">
          <div className="lg:col-span-2 space-y-6">
            {/* Knowledge Base Configuration Component */}
            <AgentSuggestedActionsForm
              agentId={agent.id}
              agentSuggestedActions={agent.suggestedActions}
            />
          </div>
        </TabsContent>

        {/* Access Control Tab Content */}
        <TabsContent value="access-control">
          <AccessControl agent={agent} />
        </TabsContent>

        {/* 
        // Access Control Tab Content
        <TabsContent value="access-control">
          <AccessControl agent={agent} />
        </TabsContent>
        */}

        {/* Tools Tab Content 
        <TabsContent value="tools">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-2 pt-4">
              <Wrench className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Tools</h2>
            </div>
            <ToolsConfiguration agent={agent} />
          
          </div>
        </TabsContent>
        */}
      </div>
    </Tabs>
  );
}

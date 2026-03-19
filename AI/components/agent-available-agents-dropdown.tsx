'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Bot, Loader2, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { organization } from '@/lib/auth-client';

type Agent = {
  id: string;
  name: string;
  description: string | null;
  avatar: string | null;
  isPublic: boolean;
  slug: string;
  organizationId: string;
};

interface AvailableAgentsDropdownProps {
  agents: Agent[];
}

export function AvailableAgentsDropdown({
  agents,
}: AvailableAgentsDropdownProps) {
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [isNavigating, setIsNavigating] = useState(false);
  const router = useRouter();

  // Fetch available agents
  const handleAgentSelect = (agentId: string) => {
    setSelectedAgent(agentId);
  };

  const handleChatWithAgent = async () => {
    if (!selectedAgent) {
      toast.error('Please select an agent first');
      return;
    }

    const agent = agents.find((a) => a.id === selectedAgent);
    if (!agent) {
      toast.error('Selected agent not found');
      return;
    }

    try {
      setIsNavigating(true);

      // Set the active organization to match the agent's organization
      const result = await organization.setActive({
        organizationId: agent.organizationId,
      });

      if (result.error) {
        throw new Error(
          result.error.message || 'Failed to set active organization',
        );
      }

      toast.success(`${agent.name} is ready to chat!`);

      // Navigate to the agent chat page
      router.push(`/agent/${agent.id}/chat`);
    } catch (error) {
      console.error('Error setting active organization or navigating:', error);
      toast.error('Failed to navigate to agent chat', {
        description:
          error instanceof Error ? error.message : 'Please try again.',
      });
      setIsNavigating(false);
    }
  };

  const getAgentInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (agents.length === 0) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="size-5" />
            Available Agents
          </CardTitle>
          <CardDescription>Select an agent to start chatting</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            <Bot className="size-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No agents available</p>
            <p className="text-xs">
              You need to be invited by an organization to chat with an agent
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="size-5" />
          Available Agents
        </CardTitle>
        <CardDescription>Select an agent to start chatting</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Select value={selectedAgent} onValueChange={handleAgentSelect}>
            <SelectTrigger>
              {selectedAgent ? (
                <div className="flex items-center gap-2 justify-start">
                  <Avatar className="size-6">
                    <AvatarImage
                      src={
                        agents.find((a) => a.id === selectedAgent)?.avatar ||
                        undefined
                      }
                      alt={agents.find((a) => a.id === selectedAgent)?.name}
                    />
                    <AvatarFallback>
                      {getAgentInitials(
                        agents.find((a) => a.id === selectedAgent)?.name || '',
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">
                    {agents.find((a) => a.id === selectedAgent)?.name}
                  </span>
                </div>
              ) : (
                <SelectValue placeholder="Choose an agent to chat with..." />
              )}
            </SelectTrigger>
            <SelectContent>
              {agents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  <div className="flex items-center gap-3 py-2">
                    <Avatar className="size-8">
                      <AvatarImage
                        src={agent.avatar || undefined}
                        alt={agent.name}
                      />
                      <AvatarFallback>
                        {getAgentInitials(agent.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium">{agent.name}</span>
                      {agent.description && (
                        <span className="text-sm text-muted-foreground line-clamp-1">
                          {agent.description}
                        </span>
                      )}
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={handleChatWithAgent}
            disabled={!selectedAgent || isNavigating}
            className="w-full"
          >
            {isNavigating ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Starting chat...
              </>
            ) : (
              <>
                <MessageCircle className="size-4 mr-2" />
                Chat with Agent
              </>
            )}
          </Button>

          {agents.length > 0 && (
            <div className="text-sm text-muted-foreground">
              <p>
                {agents.length} agent{agents.length !== 1 ? 's' : ''} available
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

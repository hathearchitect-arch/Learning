import { getAvatarIcon } from '@/lib/avatar-icons';
import { cn } from '@/lib/utils';

interface AgentAvatarProps {
  agent: {
    avatar?: string | null;
    themeAttributes?: any;
  };
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

export function AgentAvatar({
  agent,
  className,
  size = 'md',
}: AgentAvatarProps) {
  const IconComponent = getAvatarIcon(
    agent.avatar || agent.themeAttributes?.avatar,
  );

  return <IconComponent className={cn(sizeClasses[size], className)} />;
}

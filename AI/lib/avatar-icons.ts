import {
  Bot,
  Brain,
  Cpu,
  Zap,
  Sparkles,
  Star,
  Atom,
  Globe,
  Eye,
  MessageCircle,
  Lightbulb,
  Puzzle,
  type LucideIcon,
} from 'lucide-react';

// Available avatar icons with their components and names
export const avatarIcons = [
  { name: 'bot', icon: Bot, label: 'Robot' },
  { name: 'brain', icon: Brain, label: 'Brain' },
  { name: 'cpu', icon: Cpu, label: 'Processor' },
  { name: 'zap', icon: Zap, label: 'Lightning' },
  { name: 'sparkles', icon: Sparkles, label: 'Sparkles' },
  { name: 'star', icon: Star, label: 'Star' },
  { name: 'atom', icon: Atom, label: 'Atom' },
  { name: 'globe', icon: Globe, label: 'Globe' },
  { name: 'eye', icon: Eye, label: 'Eye' },
  { name: 'message-circle', icon: MessageCircle, label: 'Message' },
  { name: 'lightbulb', icon: Lightbulb, label: 'Lightbulb' },
  { name: 'puzzle', icon: Puzzle, label: 'Puzzle' },
] as const;

export type AvatarIconName = (typeof avatarIcons)[number]['name'];

/**
 * Get the icon component for a given avatar name
 * @param avatarName - The name of the avatar icon
 * @returns The Lucide icon component
 */
export function getAvatarIcon(avatarName: string | undefined): LucideIcon {
  const avatarIcon = avatarIcons.find((icon) => icon.name === avatarName);
  return avatarIcon?.icon || Bot; // Default to Bot icon if not found
}

/**
 * Get the label for a given avatar name
 * @param avatarName - The name of the avatar icon
 * @returns The display label for the icon
 */
export function getAvatarLabel(avatarName: string | undefined): string {
  const avatarIcon = avatarIcons.find((icon) => icon.name === avatarName);
  return avatarIcon?.label || 'Robot'; // Default to Robot label if not found
}

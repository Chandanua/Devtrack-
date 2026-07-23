'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { initials, avatarGradient } from '@/lib/constants';
import type { Profile } from '@/lib/types/database';

interface AvatarStackProps {
  users: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>[];
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = { sm: 'h-6 w-6', md: 'h-8 w-8', lg: 'h-10 w-10' };
const textSizeMap = { sm: 'text-[10px]', md: 'text-xs', lg: 'text-sm' };

export function AvatarStack({ users, max = 4, size = 'sm', className }: AvatarStackProps) {
  const visible = users.slice(0, max);
  const overflow = users.length - max;
  if (users.length === 0) return null;

  return (
    <div className={cn('flex -space-x-2', className)}>
      {visible.map((user) => (
        <Avatar key={user.id} className={cn(sizeMap[size], 'ring-2 ring-background transition-transform hover:z-10 hover:scale-110')}>
          <AvatarImage src={user.avatar_url ?? undefined} alt={user.full_name} />
          <AvatarFallback className={cn('bg-gradient-to-br font-semibold text-white', avatarGradient(user.id), textSizeMap[size])}>
            {initials(user.full_name)}
          </AvatarFallback>
        </Avatar>
      ))}
      {overflow > 0 && (
        <div className={cn('flex items-center justify-center rounded-full bg-muted ring-2 ring-background font-semibold text-muted-foreground', sizeMap[size], textSizeMap[size])}>
          +{overflow}
        </div>
      )}
    </div>
  );
}

export function SingleAvatar({ user, size = 'md', className }: { user: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  return (
    <Avatar className={cn(sizeMap[size], className)}>
      <AvatarImage src={user.avatar_url ?? undefined} alt={user.full_name} />
      <AvatarFallback className={cn('bg-gradient-to-br font-semibold text-white', avatarGradient(user.id), textSizeMap[size])}>
        {initials(user.full_name)}
      </AvatarFallback>
    </Avatar>
  );
}

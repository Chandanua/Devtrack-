'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { LogOut, Settings, User as UserIcon, ChevronDown } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { initials, avatarGradient } from '@/lib/constants';

export function UserMenu() {
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  if (!profile) return null;

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    toast.success('Signed out');
    router.push('/login');
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-auto w-full justify-start gap-2.5 px-2 py-2 text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={profile.avatar_url ?? undefined} />
            <AvatarFallback className={`bg-gradient-to-br ${avatarGradient(profile.id)} text-white`}>
              {initials(profile.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col items-start overflow-hidden">
            <span className="truncate text-sm font-medium">{profile.full_name}</span>
            <span className="truncate text-xs text-sidebar-muted-foreground">{profile.email}</span>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-sidebar-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56" sideOffset={8}>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col">
            <span className="text-sm font-medium">{profile.full_name}</span>
            <span className="text-xs text-muted-foreground">{profile.email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/settings')}>
          <UserIcon className="mr-2 h-4 w-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push('/settings')}>
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          disabled={signingOut}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

'use client';

import { useSocket } from '@/components/providers/socket-provider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function PresenceIndicator() {
  const { onlineUsers, isConnected } = useSocket();

  if (!isConnected || onlineUsers.length === 0) return null;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/30 rounded-lg text-xs">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="text-muted-foreground font-medium">
          {onlineUsers.length} online
        </span>

        <div className="flex -space-x-1 ml-1 overflow-hidden">
          {onlineUsers.slice(0, 4).map((u) => (
            <Tooltip key={u.userId}>
              <TooltipTrigger asChild>
                <div className="inline-block h-5 w-5 rounded-full ring-2 ring-background bg-primary/10 flex items-center justify-center text-[10px] font-semibold text-primary overflow-hidden">
                  {u.avatarUrl ? (
                    <img src={u.avatarUrl} alt={u.fullName} className="h-full w-full object-cover" />
                  ) : (
                    u.fullName.charAt(0)
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {u.fullName} (Online)
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}

'use client';

import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, LogOut, User } from 'lucide-react';
import { getRoleBadgeColor } from '@/lib/utils';

export function DashboardHeader() {
  const { user, logout } = useAuth();

  return (
    <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <div className="flex flex-1" />

        <div className="flex items-center gap-x-4 lg:gap-x-6">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500"
          >
            <span className="sr-only">View notifications</span>
            <Bell className="h-6 w-6" aria-hidden="true" />
          </button>

          <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200" aria-hidden="true" />

          <div className="flex items-center gap-x-4">
            <div className="text-right">
              <div className="text-sm font-semibold leading-6 text-gray-900">
                {user?.name || 'User'}
              </div>
              <div className="flex items-center gap-2 justify-end">
                <span className="text-xs text-gray-500">{user?.email}</span>
                {user?.role && (
                  <Badge className={getRoleBadgeColor(user.role)}>
                    {user.role}
                  </Badge>
                )}
              </div>
            </div>

            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              <User className="h-5 w-5" />
            </div>

            <Button variant="ghost" size="icon" onClick={() => logout()}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { usePathname } from "next/navigation";
import { PermissionsProvider } from "@/components/PermissionsProvider";
import { Sidebar } from "@/components/Sidebar";
import { UserSessionBar } from "@/components/UserSessionBar";
import type { SessionUser } from "@/lib/session";
import type { Role } from "@/lib/roles";

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: SessionUser | null;
}) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <>
      <Sidebar user={user} />
      <div className="flex min-w-0 flex-1 flex-col pt-14 lg:pt-0">
        {user && (
          <header className="sticky top-14 z-30 border-b border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur-md lg:top-0 lg:px-8">
            <UserSessionBar user={user} />
          </header>
        )}
        <main className="app-bg flex-1 overflow-auto">
          <PermissionsProvider user={user}>
            <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
              {children}
            </div>
          </PermissionsProvider>
        </main>
      </div>
    </>
  );
}

export type { SessionUser, Role };

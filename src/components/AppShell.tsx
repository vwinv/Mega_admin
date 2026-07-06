"use client";

import { usePathname } from "next/navigation";
import { PermissionsProvider } from "@/components/PermissionsProvider";
import { Sidebar } from "@/components/Sidebar";
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
    <main className="app-bg flex-1 overflow-auto pt-14 lg:pt-0">
      <PermissionsProvider user={user}>
        <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          {children}
        </div>
      </PermissionsProvider>
    </main>
  </>
);
}

export type { SessionUser, Role };

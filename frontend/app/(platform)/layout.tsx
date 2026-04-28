import type { ReactNode } from "react";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { PlatformSidebar } from "@/components/layout/platform-sidebar";
import { PlatformTopbar } from "@/components/layout/platform-topbar";

export default function PlatformLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider defaultOpen>
      <PlatformSidebar />
      <SidebarInset className="bg-transparent">
        <PlatformTopbar />
        <main className="relative flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-6">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

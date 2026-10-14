import type { ReactNode } from "react";
import { MummFooter, MummHeader } from "@/components/mumm/Chrome";
import "@/components/mumm/mumm.css";

export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mb min-h-screen flex flex-col">
      <MummHeader />
      <main className="flex-1">{children}</main>
      <MummFooter />
    </div>
  );
}

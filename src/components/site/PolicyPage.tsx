import type { ReactNode } from "react";
import { SiteLayout } from "./Layout";

export function PolicyPage({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <SiteLayout>
      <div className="page">
        <h1>{title}</h1>
        <p>{intro}</p>
        {children}
      </div>
    </SiteLayout>
  );
}

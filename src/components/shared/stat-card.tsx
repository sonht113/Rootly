import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: string | number;
  hint: string;
  icon?: ReactNode;
}

export function StatCard({ label, value, hint, icon }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <p className="text-sm text-[color:var(--muted-foreground)]">{label}</p>
          <CardTitle className="text-3xl">{value}</CardTitle>
        </div>
        {icon ? <div className="rounded-[14px] bg-[color:var(--primary-soft)] p-3 text-[color:var(--primary-strong)]">{icon}</div> : null}
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-[color:var(--muted-foreground)]">{hint}</p>
      </CardContent>
    </Card>
  );
}


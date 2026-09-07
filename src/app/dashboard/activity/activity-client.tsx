"use client";

import * as React from "react";

import { ActivityList } from "@/components/activity-list";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useActivity } from "@/hooks/use-lead-data";
import type { ActivitySeverity } from "@/types";

const TABS: Array<{ value: string; label: string }> = [
  { value: "all", label: "All events" },
  { value: "error", label: "Errors" },
  { value: "warning", label: "Warnings" },
  { value: "success", label: "Completed" },
  { value: "info", label: "Information" },
];

export function ActivityClient() {
  const { data, isPending, isError, error, refetch, isFetching } = useActivity(200);
  const [tab, setTab] = React.useState("all");

  const events = (data ?? []).filter(
    (event) => tab === "all" || event.severity === (tab as ActivitySeverity),
  );

  return (
    <>
      <PageHeader
        title="Activity Logs"
        description="Every event recorded by the Opportunity Hunter and Outreach agents."
        actions={
          <Button variant="secondary" size="sm" loading={isFetching} onClick={() => void refetch()}>
            Refresh
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={setTab} className="mb-4">
        <TabsList>
          {TABS.map((item) => (
            <TabsTrigger key={item.value} value={item.value}>
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card>
        {isPending ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState
            title="Activity could not be loaded"
            description={error instanceof Error ? error.message : undefined}
            onRetry={() => void refetch()}
          />
        ) : (
          <ActivityList
            events={events}
            emptyTitle="No events in this category"
            emptyDescription="Agent events appear here as work is carried out."
          />
        )}
      </Card>
    </>
  );
}

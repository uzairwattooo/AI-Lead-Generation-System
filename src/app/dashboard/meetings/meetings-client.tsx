"use client";

import { CalendarCheck, ExternalLink } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { MeetingBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TableSkeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableWrapper,
} from "@/components/ui/table";
import { useMeetings } from "@/hooks/use-lead-data";
import { formatDateTime } from "@/lib/format";

export function MeetingsClient() {
  const { data, isPending, isError, error, refetch } = useMeetings();

  return (
    <>
      <PageHeader
        title="Meetings"
        description="Confirmed Calendly bookings with Google Meet details."
      />

      <Card>
        {isPending ? (
          <TableSkeleton rows={5} columns={5} />
        ) : isError ? (
          <ErrorState
            title="Meetings could not be loaded"
            description={error instanceof Error ? error.message : undefined}
            onRetry={() => void refetch()}
          />
        ) : data.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title="No meetings yet"
            description="Meetings appear here after the client confirms a booking."
          />
        ) : (
          <TableWrapper>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Scheduled for</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Link</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((meeting) => (
                  <TableRow key={meeting.id}>
                    <TableCell className="font-medium">{meeting.companyName}</TableCell>
                    <TableCell className="text-xs">
                      {meeting.contactName ?? <span className="text-[var(--app-text-subtle)]">—</span>}
                      {meeting.contactEmail ? (
                        <span className="block text-[11px] text-[var(--app-text-subtle)]">
                          {meeting.contactEmail}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {meeting.meetingTimezone && meeting.scheduledFor
                        ? new Date(meeting.scheduledFor).toLocaleString("en-GB", {timeZone: meeting.meetingTimezone})
                        : formatDateTime(meeting.scheduledFor)}
                      {meeting.meetingTimezone ? <span className="block text-[11px] text-[var(--app-text-subtle)]">{meeting.meetingTimezone}</span> : null}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs tabular-nums">
                      {meeting.durationMinutes} min
                    </TableCell>
                    <TableCell>
                      <MeetingBadge status={meeting.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {meeting.meetingUrl && meeting.status !== "cancelled" ? (
                        <Button asChild variant="ghost" size="sm">
                          <a href={meeting.meetingUrl} target="_blank" rel="noopener noreferrer">
                            Join
                            <ExternalLink aria-hidden />
                          </a>
                        </Button>
                      ) : (
                        <span className="text-xs text-[var(--app-text-subtle)]">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableWrapper>
        )}
      </Card>
    </>
  );
}

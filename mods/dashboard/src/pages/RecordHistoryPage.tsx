/**
 * Copyright (C) 2026 by Outlast.
 *
 * Conversation thread view for a record (getRecordHistory).
 */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/providers/AuthProvider";
import { Records } from "@outlast/sdk";
import type { GetRecordHistoryResponse } from "@outlast/sdk";
import { useParams, Link } from "react-router-dom";

export function RecordHistoryPage() {
  const { recordId } = useParams<{ recordId: string }>();
  const { client, logout } = useAuth();
  const [history, setHistory] = useState<GetRecordHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!recordId) return;
    let cancelled = false;
    const recordsApi = new Records(client);
    recordsApi
      .getRecordHistory({ recordId })
      .then((data) => {
        if (!cancelled) setHistory(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [client, recordId]);

  return (
    <div className="min-h-svh w-full p-6 md:p-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/">← Back</Link>
            </Button>
            <h1 className="text-2xl font-semibold">Conversation</h1>
          </div>
          <Button variant="outline" onClick={logout}>
            Logout
          </Button>
        </div>

        {recordId && <p className="text-sm text-muted-foreground">Record: {recordId}</p>}

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : history ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Thread</CardTitle>
              <CardDescription>
                {history.messages.length} messages · {history.attempts} attempts
                {history.lastChannel && ` · last channel: ${history.lastChannel}`}
                {history.workflowStatus && ` · status: ${history.workflowStatus}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {history.messages.map((msg, i) => (
                  <li
                    key={i}
                    className={`rounded-lg border p-3 ${
                      msg.role === "user"
                        ? "border-primary/30 bg-primary/5"
                        : "border-muted bg-muted/30"
                    }`}
                  >
                    <span className="text-xs font-medium text-muted-foreground">{msg.role}</span>
                    {msg.channel && (
                      <span className="ml-2 text-xs text-muted-foreground">({msg.channel})</span>
                    )}
                    <p className="mt-1 whitespace-pre-wrap text-sm">{msg.content}</p>
                  </li>
                ))}
              </ul>
              {history.messages.length === 0 && (
                <p className="text-muted-foreground">No messages yet.</p>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

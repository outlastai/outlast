/**
 * Copyright (C) 2026 by Outlast.
 *
 * Human review queue: list records with workflowStatus WAITING_HUMAN and submit decisions.
 */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/providers/AuthProvider";
import { Records } from "@outlast/sdk";
import type { RecordEntity } from "@outlast/sdk";

export function PendingReviewsPage() {
  const { client, logout } = useAuth();
  const [records, setRecords] = useState<RecordEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [nextAction, setNextAction] = useState<Record<string, "continue" | "escalate" | "close">>(
    {}
  );

  const recordsApi = new Records(client);

  useEffect(() => {
    let cancelled = false;
    recordsApi
      .listPendingReviews()
      .then((list: RecordEntity[]) => {
        if (!cancelled) setRecords(list);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [client]);

  const handleSubmit = async (recordId: string, approved: boolean) => {
    setSubmitting(recordId);
    setError(null);
    try {
      await recordsApi.submitHumanReview({
        recordId,
        decision: {
          approved,
          notes: notes[recordId] ?? "",
          nextAction: nextAction[recordId] ?? (approved ? "continue" : "escalate")
        }
      });
      setRecords((prev) => prev.filter((r) => r.id !== recordId));
      setNotes((prev) => ({ ...prev, [recordId]: "" }));
      setNextAction((prev) => ({ ...prev, [recordId]: "continue" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="min-h-svh w-full p-6 md:p-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Pending human reviews</h1>
          <Button variant="outline" onClick={logout}>
            Logout
          </Button>
        </div>

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : records.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">No records pending human review.</p>
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-4">
            {records.map((record) => (
              <li key={record.id}>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{record.title}</CardTitle>
                    <CardDescription>Record ID: {record.id}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Field>
                      <Label>Notes</Label>
                      <Input
                        value={notes[record.id] ?? ""}
                        onChange={(e) =>
                          setNotes((prev) => ({ ...prev, [record.id]: e.target.value }))
                        }
                        placeholder="Review notes..."
                      />
                    </Field>
                    <div className="flex flex-wrap gap-2">
                      <Label className="w-full shrink-0 text-xs text-muted-foreground">
                        Next action
                      </Label>
                      {(["continue", "escalate", "close"] as const).map((action) => (
                        <Button
                          key={action}
                          variant={nextAction[record.id] === action ? "default" : "outline"}
                          size="sm"
                          onClick={() =>
                            setNextAction((prev) => ({ ...prev, [record.id]: action }))
                          }
                        >
                          {action}
                        </Button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleSubmit(record.id, true)}
                        disabled={submitting === record.id}
                      >
                        {submitting === record.id ? "Submitting..." : "Approve"}
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleSubmit(record.id, false)}
                        disabled={submitting === record.id}
                      >
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

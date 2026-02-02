/**
 * Copyright (C) 2026 by Outlast.
 */
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/providers/AuthProvider";

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function SuccessPage() {
  const { logout } = useAuth();

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm space-y-4">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <CheckIcon className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Welcome!</CardTitle>
            <CardDescription>You have successfully logged in to your account.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-center text-sm text-muted-foreground">
              Your dashboard is being set up. More features coming soon.
            </p>
            <div className="flex flex-col gap-2">
              <Button variant="default" asChild className="w-full">
                <Link to="/pending-reviews">Pending human reviews</Link>
              </Button>
              <Button variant="outline" asChild className="w-full">
                <Link to="/records/demo-record-id/history">View conversation (demo)</Link>
              </Button>
            </div>
            <Button variant="outline" onClick={logout} className="w-full">
              Logout
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

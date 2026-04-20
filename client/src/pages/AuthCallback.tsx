import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Handles the redirect from Supabase Auth emails ("Confirm sign up") and
 * OAuth providers when `redirectTo` isn't a final destination. Exchanges the
 * `?code=` param for a session, then sends the user to /onboarding (new
 * users) or /dashboard (existing users).
 */
export default function AuthCallback() {
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setError("Auth is not configured.");
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const errParam = params.get("error_description") || params.get("error");

    if (errParam) {
      setError(errParam);
      return;
    }

    if (!code) {
      setLocation("/login");
      return;
    }

    supabase.auth
      .exchangeCodeForSession(code)
      .then(({ error }) => {
        if (error) {
          setError(error.message);
          return;
        }
        setLocation("/onboarding");
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Verification failed.");
      });
  }, [setLocation]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="mx-4 w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Verification link expired</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => setLocation("/login")}>
              Back to login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="text-sm">Confirming your account…</p>
      </div>
    </div>
  );
}

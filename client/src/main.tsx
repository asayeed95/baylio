import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from "@shared/const";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import "./index.css";
import posthog from "posthog-js";
import { PostHogProvider } from "@posthog/react";
import { supabase } from "@/lib/supabase";

const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
if (posthogKey && posthogKey.startsWith("phc_")) {
  try {
    posthog.init(posthogKey, {
      api_host: "https://us.i.posthog.com",
      person_profiles: "identified_only",
    });
  } catch (e) {
    console.warn("[PostHog] Init failed:", e);
  }
}

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  window.location.href = "/login";
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      async headers() {
        // Send Supabase access token if available (new auth)
        if (supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            return { Authorization: `Bearer ${session.access_token}` };
          }
        }
        return {};
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <PostHogProvider client={posthog}>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </trpc.Provider>
  </PostHogProvider>
);

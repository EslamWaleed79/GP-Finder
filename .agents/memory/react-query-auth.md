---
name: React Query 401 auth pattern
description: How to handle unauthenticated state cleanly with React Query + wouter.
---

When using session-cookie auth with React Query:

1. **Disable retries for 4xx** — by default React Query retries 3 times with backoff, causing a multi-second "Loading..." on every unauthenticated page load.

```ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        if (error?.status >= 400 && error?.status < 500) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
  },
});
```

2. **Don't block public routes** — if the Router component calls `useGetMe()` and returns `<Loading>` globally, the `/login` and `/signup` pages also block. Instead, use a dedicated `RootRedirect` component for the `/` route and let public routes render immediately.

3. **ProtectedRoute pattern** — individual protected routes call `useGetMe()` themselves; they show loading only for routes that require auth.

**Why:** React Query shared cache means all `useGetMe()` hooks share one request — there's no extra network cost from calling it in multiple components.

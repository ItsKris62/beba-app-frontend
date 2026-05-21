# Frontend Error Handling

The portal sanitizes backend errors in the frontend before they reach pages,
forms, toasts, or inline alerts.

## Files

- `lib/error-message-registry.ts` maps backend codes and HTTP statuses to safe user messages.
- `lib/error-sanitizer.ts` extracts request diagnostics, returns safe messages, and reports structured details to Sentry in production.
- `components/global-error-listener.tsx` catches unhandled promise rejections and window errors.
- `components/error-boundary.tsx` protects major member and admin route sections.

## Message Rules

User-facing messages must be:

- Clear and concise Kenyan English.
- Actionable where possible.
- Free of stack traces, database names, table names, internal paths, tokens, or raw backend payloads.

Default fallback:

```text
We encountered an unexpected issue. Please try again shortly. If it continues, contact support.
```

## Adding a New Mapping

Add a stable backend code or status fallback in `ERROR_MESSAGE_REGISTRY`:

```ts
export const ERROR_MESSAGE_REGISTRY = {
  MPESA_TIMEOUT: 'The M-Pesa request timed out. Check your phone, then try again if no prompt appears.',
  HTTP_422: 'Some details need correction before we can continue.',
};
```

If the backend returns only a generic exception name, add an alias in
`CODE_ALIASES`.

## Diagnostics

Development logs include the original response body in `console.warn('[api-error]', ...)`.

Production logs are sent to Sentry with:

- endpoint
- HTTP method
- status code
- backend code
- request or correlation ID when available

Raw payloads are not rendered in UI. They are kept on a non-enumerable `debug`
property for developer tooling and error boundaries.

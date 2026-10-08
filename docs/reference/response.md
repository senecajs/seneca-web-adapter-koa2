# Response reference

How the adapter turns an action's reply into the HTTP response. The
program [docs/examples/redirect-and-autoreply.js](../examples/redirect-and-autoreply.js)
produces the redirect and `autoreply: false` cases shown here.

## Status and content type

After the action replied without error, the handler sets the response
content type to `json` (`application/json; charset=utf-8`) and the
status to `200`, in that order, before it looks at `redirect` and
`autoreply`. Consequences:

* A status code or content type set by the action through
  `msg.response$` is overwritten. Headers set with
  `msg.response$.set()` are kept.
* To answer with another status code or content type, use route
  middleware that changes `ctx.status` or `ctx.type` after
  `await next()`; see [Add middleware per route](../how-to/add-route-middleware.md#4-act-after-the-action).
* Middleware that ends the request without calling `next()` decides the
  response entirely; the handler does not run.

## autoreply

Default `true`: the handler sets `ctx.body` to the action's reply. Koa
serializes objects and arrays as JSON. Seneca requires replies to be
objects or arrays (an action replying with a string fails with
`result_not_objarr`). When the action replies with nothing, `ctx.body`
becomes `undefined` and Koa answers `204 No Content`.

With `autoreply: false` the reply is discarded, and whatever the
action or middleware put on the response is sent. If nothing set a
body, Koa answers the status text `OK` as `text/plain`.

## redirect

A route with `redirect: '/url'` answers `302 Found` with a `Location`
header, through Koa's `ctx.redirect`, after the action replied. With
`autoreply` on (the default) the body is still the action's reply as
JSON; with `autoreply: false` the body is Koa's redirect text,
`Redirecting to /url.`, with content type `text/html` when the client
accepts HTML and `text/plain` otherwise.

## Result cases

| Route | Action | Response |
| ----- | ------ | -------- |
| defaults | replies with an object or array | `200`, `application/json`, the reply as JSON |
| defaults | replies with nothing | `204`, empty body |
| `redirect: '/url'` | replies with an object | `302`, `Location: /url`, the reply as JSON |
| `redirect: '/url', autoreply: false` | any reply | `302`, `Location: /url`, Koa's redirect text |
| `autoreply: false` | sets `msg.response$.body` | `200`, that body; content type JSON unless middleware changes it after `next()` |
| `autoreply: false` | sets nothing | `200`, `text/plain`, body `OK` |
| any | sets `msg.response$.status = 201` | status `200` (overwritten); use middleware instead |
| any | sets a header with `msg.response$.set()` | the header is sent |
| any | replies with an error, or throws | the error is thrown to Koa, see [Errors](#errors) |

Output of the example program (Seneca 4.0.0-rc5):

```
POST /login -> 302 {
  location: '/page',
  type: 'application/json; charset=utf-8',
  body: '{"user":"ada"}'
}
GET /page -> 200 {
  location: null,
  type: 'text/html; charset=utf-8',
  body: '<h1>Hello</h1>'
}
GET /empty -> 200 { location: null, type: 'text/plain; charset=utf-8', body: 'OK' }
```

`/page` is an `autoreply: false` route whose action set
`msg.response$.body` and whose route middleware set `ctx.type` after
`await next()`.

## Errors

When the action replies with an error or throws, or when Seneca itself
produces an error for the message (no matching action, `act_not_found`;
a reply that is not an object or array, `result_not_objarr`; a timeout,
`action_timeout`), the handler throws the error object exactly as the
`seneca.act` callback received it. Nothing is written to the response
first.

The error then follows Koa's rules: it is caught by the nearest error
middleware that wraps `await next()` in `try`/`catch`; without one,
Koa's default handler answers `500 Internal Server Error` as plain text
and emits the application's `error` event with the error.

What the error object looks like depends on the Seneca version:

| | Seneca 4 | Seneca 3 (default `legacy.error: true`) |
| --- | -------- | ---------------------------------------- |
| Action replied with or threw an `Error` | the same object: `message`, `code`, `details` as the action set them | a wrapper: `message` is `seneca: Action <pattern> failed: <message>.`, `code` is `act_execute`, the action's error is `err.orig` |
| Seneca's own errors (`act_not_found`, `result_not_objarr`, `action_timeout`, codes from `this.error`) | an error with that `code` and `details`; no `orig` | the same |

Reading `err.orig || err` works on both versions. See
[Handle errors and status codes](../how-to/handle-errors-and-status-codes.md).

Body parser errors (co-body) are thrown before the message is sent and
carry an HTTP `status`: `400` for invalid JSON, `413` for a body over
the limit, `415` for a missing or unsupported content type. Koa's
default handler uses that status.

## Requests the router answers itself

* `HEAD` requests to a `GET` route are answered by @koa/router with the
  `GET` handler and no body (status `200`), so the action runs.
* A path no route matches passes through the router; with no other
  middleware setting a body, Koa answers `404 Not Found`.

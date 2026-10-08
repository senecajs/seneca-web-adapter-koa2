# Examples

Runnable programs that accompany the tutorial and the how-to guides.
Each one starts a Koa server on a free port, makes a few requests with
`fetch`, prints the results, and then closes the server and the Seneca
instance. They require the adapter from this repository
(`require('../..')`); in your own project use
`require('@seneca/web-adapter-koa2')` instead.

| Program | Document |
| ------- | -------- |
| `getting-started.js` | [Getting started](../tutorials/getting-started.md) |
| `parse-bodies.js` | [Parse request bodies](../how-to/parse-request-bodies.md) |
| `route-middleware-and-state.js` | [Add middleware per route](../how-to/add-route-middleware.md), [Pass Koa state to actions](../how-to/pass-koa-state-to-actions.md) |
| `handle-errors.js` | [Handle errors and status codes](../how-to/handle-errors-and-status-codes.md) |
| `redirect-and-autoreply.js` | [Response](../reference/response.md) |

Run an example from the repository root with Node.js 22 or later, after
`npm install` (which provides seneca, seneca-web, koa and @koa/router as
development dependencies):

```sh
node docs/examples/getting-started.js
```

The outputs shown in the documents were produced with Node.js 24 and
Seneca 4.0.0-rc5.

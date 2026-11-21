# Handle errors and status codes

How to turn action errors into HTTP responses on Seneca 4, and how to
answer with status codes and headers of your choice. The
program used here is [docs/examples/handle-errors.js](../examples/handle-errors.js).

## 1. Add error middleware before the routes

When an action replies with an error, or throws, the adapter's handler
throws that error into Koa's middleware chain. Without error middleware
Koa answers `500 Internal Server Error` as plain text and emits its
`error` event. Catch the error in middleware registered before the
router:

```js
const STATUS = { not_found: 404, invalid: 400, act_not_found: 404 }

app.use(async (ctx, next) => {
  try {
    await next()
  } catch (err) {
    // Seneca 4 delivers the action's error object unchanged.
    ctx.status = STATUS[err.code] || 500
    ctx.body = {
      error: 500 === ctx.status ? 'internal error' : err.message,
      code: err.code || null
    }
  }
})

app.use(router.routes())
```

## 2. Know what you catch

The error is the one the `seneca.act` callback received, unchanged.

On Seneca 4 that is the error object the action produced: its
`message`, `code` and `details` are whatever the action set. Seneca 3
(with the default `legacy.error: true`) wrapped it: `message` was
`seneca: Action <pattern> failed: <message>.`, `code` was
`act_execute`, and the action's error was `err.orig`. Error middleware
written for Seneca 3 that reads `err.orig` reads `err` on Seneca 4.

Errors raised by Seneca itself arrive as errors with a `code`:

| Situation | `code` |
| --------- | ------ |
| No action matches the route's pattern | `act_not_found` |
| The action replied with something that is not an object or array | `result_not_objarr` |
| The action replied with `this.error(code, details)` or threw with `this.fail` | that `code`; the message is `seneca: <code>` unless the plugin defines a message for it |
| The action did not reply within the timeout | `action_timeout` |

Give your own errors a `code` and map codes to statuses, as above.
Keep `500` responses generic: Seneca's messages include the message
data.

## 3. Mind the Seneca error handler

Seneca logs every action error as an `act/ERR` entry at level `error`
and passes it to the handler set with `seneca.error(fn)`, if any. If
that handler returns a truthy value, Seneca treats the error as handled
and does not call the adapter's callback: the HTTP request then never
completes. Return nothing from such a handler.

## 4. Answer with other status codes and headers

The handler sets status `200` and the JSON content type after the
action replied, so a status set by the action on `msg.response$` is
overwritten. Use route middleware that runs after the handler instead:

```js
const middleware = {
  created: async (ctx, next) => {
    await next()
    ctx.status = 201
  }
}
```

Headers set by the action stay: `msg.response$.set('x-request-id', id)`
reaches the client. The action can also redirect by configuration
(`redirect` in the route map) or write the body itself (`autoreply:
false`); see [Response](../reference/response.md).

## 5. Run the example

The example maps `item` (replies with errors coded `invalid` and
`not_found`), `crash` (throws) and `missing` (no action exists). Seneca
4.0.0-rc5 output:

```
seneca 4.0.0-rc5
GET /shop/item/1 -> 200 { id: '1', name: 'kiwi' }
GET /shop/item/2 -> 404 { error: 'no item 2', code: 'not_found' }
GET /shop/item/x -> 400 { error: 'id must be a number', code: 'invalid' }
GET /shop/missing -> 404 {
  error: "seneca: No matching action pattern found for {  args: { body: {}, query: {}, params: {}, state: {} },  role: 'shop',  cmd: 'missing'}, and no default result provided (using a default$ property).",
  code: 'act_not_found'
}
GET /shop/crash -> 500 { error: 'internal error', code: null }
GET /shop/item/1 -> 200 { id: '1', name: 'kiwi' }
```

The last request shows that the service keeps running after the
failures. Before version 2.0.0 of this adapter that was not the case
for routes configured through the plugin options: an action error
closed the Seneca instance and exited the process. See [Seneca 3 and Seneca 4](../explanation/seneca-3-and-4.md#fatal-errors-and-the-root-instance).

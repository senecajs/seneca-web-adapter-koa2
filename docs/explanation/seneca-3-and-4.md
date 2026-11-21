# Seneca 3 and Seneca 4

Version 2 of this adapter runs on Seneca 4 only, with `@seneca/web` 3.
Seneca 3 users stay on `seneca-web-adapter-koa2@1` and `seneca-web@2`.
This page explains what changes for applications that use the adapter
when they move from Seneca 3, and why the adapter sends the request
messages from the root instance. For the step by step procedure see
[Migrate from Seneca 3](../how-to/migrate-from-seneca-3.md).

## What is the same

The route map, the adapter contract, the message an action receives
and the way the response is produced are unchanged. `seneca.add`,
`seneca.act`, `seneca.use`, `seneca.ready(callback)` and
`seneca.close(callback)` work as they did on Seneca 3.

## Error objects

Seneca 3 (with its default `legacy.error: true`) wrapped an action's
error before handing it to the `act` callback. The adapter passed that
wrapper to Koa: `err.message` was `seneca: Action <pattern> failed:
<message>.`, `err.code` was `act_execute` and the action's own error was
`err.orig`.

Seneca 4 does not wrap. The `act` callback, and therefore Koa's error
middleware, receives the error object the action produced, with the
`message`, `code` and `details` it set. There is no `err.orig`. (Seneca
4 attaches its own description of the failure to the error for its
error handler and log, but that property is removed before the
callback runs.)

Errors Seneca produces itself, such as `act_not_found` when no action
matches a route's pattern, were not wrapped by Seneca 3 either and carry
the same `code` (some messages differ, for example for timeouts). Error
middleware written for Seneca 3 that reads `err.orig` reads `err` on
Seneca 4; see [Handle errors and status codes](../how-to/handle-errors-and-status-codes.md).

## Fatal errors and the root instance

Seneca lets a message be marked fatal with `fatal$: true`: if the
action fails, Seneca calls `die`, which logs a fatal error, calls the
error handler, closes the instance and calls `system.exit`. Plugin
initialization uses this. The instance a plugin receives as `this` is
a delegate created with `fatal$: true` among its fixed arguments, and
fixed arguments are added to every message the delegate sends, and
inherited by delegates made from it. Because `init:web` runs on that
instance, and seneca-web 2.2.2 and earlier called the adapter from
`init:web` with the action's instance as `this`, every message the
adapter sent from `this` for a route configured through the plugin
options carried `fatal$: true`.

The effect was that an action error behind such a route killed the
service. The error still reached Koa first, so the client got a
response, but the Seneca instance then closed and the process exited.
Routes mapped with a `role:web` message sent from application code were
not affected, because that message carries no `fatal$`, which is why the
adapter's original tests never saw the problem.

Setting `fatal$: false` on the message does not help: Seneca's
`strict.fixedmsg` option (on by default) makes a delegate's fixed
arguments override the message's own properties. Since version 2.0.0
the adapter therefore sends request messages from the root instance,
`this.root`, which has no fixed arguments. Each request is an
independent transaction, the message carries no `plugin$` or `fatal$`,
and an action error is an ordinary error. `@seneca/web` 3.0.0 also calls
adapters with a delegate of the root instance without fixed arguments.
The test suite maps routes through `seneca.export('web/mapRoutes')`, as
the plugin options do, and asserts that `system.exit` is not called
after an action error. Because the adapter does not depend on the
instance the plugin passes, the fix holds whichever instance that is.

## Promises and `ready`

Seneca 4 has promises built in: `seneca.post`, `seneca.message`,
`await seneca.ready()` and `await seneca.close()`. Seneca 3 needed
seneca-promisify for them. The examples use `await seneca.ready()`; the
adapter itself uses callbacks (`seneca.act`).

## Closing

`seneca.close(callback)` and `await seneca.close()` both work. The
adapter registers no close hook: the Koa server is yours, so closing it
(`server.close()`) is also yours. Plugins that do need a close hook
register it with `this.destroy(fn)`; Seneca 4 closes through
`sys:seneca,cmd:close`.

## Transports

The adapter needs no Seneca transport: HTTP requests come in through
Koa, and messages are handled in the same process. If the actions
behind the routes live in other processes, the application uses
`seneca.client` to reach them; on Seneca 4 that requires loading
`@seneca/transport`, which is no longer part of the core. The `args`
part of the message travels; `request$` and `response$` do not.

## Compatibility

| | `seneca-web-adapter-koa2` 1.2.x | `@seneca/web-adapter-koa2` 2.x |
| --- | --- | --- |
| Seneca | 2.x and 3.x | 4.x |
| Plugin | `seneca-web` 1.x and 2.x | `@seneca/web` 3.x |
| Error object in Koa | wrapper with `err.orig` (Seneca 3) | the action's error |
| Route messages | sent from the instance the plugin passes | sent from the root instance |
| Node.js | not declared | 24 or later |

The 2.0.0 test suite runs on Seneca 4.0.0 with `@seneca/web` 3.0.0.

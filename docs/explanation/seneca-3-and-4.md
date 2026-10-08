# Seneca 3 and Seneca 4

The adapter runs on Seneca 3 and on the Seneca 4 prerelease (4.0.0-rc5
and later) with the same API. This page explains what differs between
the two versions for applications that use it, and why version 1.3.0
changed which instance sends the request messages.

## What is the same

The route map, the adapter contract, the message an action receives
and the way the response is produced are identical. `seneca.add`,
`seneca.act`, `seneca.use`, `seneca.ready(callback)` and
`seneca.close(callback)` work the same, which is why the examples in
this documentation run on both.

## Error objects

Seneca 3 (with its default `legacy.error: true`) wraps an action's
error before handing it to the `act` callback. The adapter passes that
wrapper to Koa: `err.message` is `seneca: Action <pattern> failed:
<message>.`, `err.code` is `act_execute` and the action's own error is
`err.orig`.

Seneca 4 does not wrap. The `act` callback, and therefore Koa's error
middleware, receives the error object the action produced, with the
`message`, `code` and `details` it set. There is no `err.orig`. (Seneca
4 attaches its own description of the failure to the error for its
error handler and log, but that property is removed before the
callback runs.)

Errors Seneca produces itself, such as `act_not_found` when no action
matches a route's pattern, are not wrapped on either version and carry
the same `code` (some messages differ, for example for timeouts). Error middleware that reads `err.orig || err` therefore works
everywhere; see [Handle errors and status codes](../how-to/handle-errors-and-status-codes.md).

## Fatal errors and the root instance

Seneca lets a message be marked fatal with `fatal$: true`: if the
action fails, Seneca calls `die`, which logs a fatal error, calls the
error handler, closes the instance and calls `system.exit`. Plugin
initialization uses this. The instance a plugin receives as `this` is
a delegate created with `fatal$: true` among its fixed arguments, and
fixed arguments are added to every message the delegate sends, and
inherited by delegates made from it. Because `init:web` runs on that
instance, and seneca-web 2.2.2 calls the adapter from `init:web` with
the action's instance as `this`, every message the adapter sent from
`this` for a route configured through the plugin options carried
`fatal$: true`.

The effect was that an action error behind such a route killed the
service. The error still reached Koa first, so the client got a
response, but the Seneca instance then closed and the process exited.
This is the same on Seneca 3.38 and Seneca 4.0.0 (exit code 1).
4.0.0-rc5 only prints `EXIT [ 1 ]` with a stack trace instead of
exiting; the instance is closed, and the next request crashes the
process with an uncaught `seneca: closed` error. Routes mapped with
a `role:web` message sent from application code were not affected,
because that message carries no `fatal$`, which is why the adapter's
original tests never saw the problem.

Setting `fatal$: false` on the message does not help: Seneca's
`strict.fixedargs` option (on by default) makes a delegate's fixed
arguments override the message's own properties. Version 1.3.0 of the
adapter therefore sends request messages from the root instance,
`this.root`, which has no fixed arguments. Each request is an
independent transaction, the message carries no `plugin$` or `fatal$`,
and an action error is an ordinary error. The test suite checks this by
mapping routes through `seneca.export('web/mapRoutes')`, which seneca-web
2.2.2 binds to the plugin instance, and asserting that `system.exit` is
not called after an action error. Because the adapter does not depend
on the instance seneca-web passes, the fix holds for any seneca-web
version.

## Promises and `ready`

Seneca 4 has promises built in: `seneca.post`, `seneca.message`,
`await seneca.ready()` and `await seneca.close()`. On Seneca 3 they
need seneca-promisify. In 4.0.0-rc5, `await seneca.ready()` never
resolves on an instance that is already idle (fixed in 4.0.0). The
examples use the callback form, `seneca.ready(callback)`, wrapped in a
promise, which behaves the same on every version.

## Closing

`seneca.close(callback)` works on both versions and is what the
examples and tests use. The adapter registers no close hook: the Koa
server is yours, so closing it (`server.close()`) is also yours.
Plugins that do need a close hook should know that Seneca 4 closes
through `sys:seneca,cmd:close`, and that 4.0.0-rc5 does not call hooks
on the Seneca 3 pattern `role:seneca,cmd:close` (4.0.0 does).

## Transports

The adapter needs no Seneca transport: HTTP requests come in through
Koa, and messages are handled in the same process. If the actions
behind the routes live in other processes, the application uses
`seneca.client` to reach them; on Seneca 4 that requires loading
`seneca-transport`, which is no longer part of the core. The `args`
part of the message travels; `request$` and `response$` do not.

## Compatibility

| | Seneca 3.38 | Seneca 4.0.0-rc5 | Seneca 4.0.0 |
| --- | ----------- | ---------------- | ------------ |
| Adapter test suite | passes | passes | passes |
| Error object in Koa | wrapper with `err.orig` | the action's error | the action's error |
| `await seneca.ready()` | needs seneca-promisify | hangs on an idle instance | works |
| Fatal error exit | `process.exit` | prints `EXIT`, does not exit | `process.exit` |
| Node.js (tested) | 22, 24 | 22, 24 | 22, 24 |

The suite was run on Node.js 24 and 22 with the Seneca 4 prerelease
from npm, with a build of Seneca 4.0.0 from its master branch, and with
Seneca 3.38.0; see [Migrate from Seneca 3](../how-to/migrate-from-seneca-3.md)
for how to run it against another version yourself.

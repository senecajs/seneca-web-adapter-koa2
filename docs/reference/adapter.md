# Adapter reference

The module exports one function: the adapter that seneca-web calls to
register routes. You do not call it yourself; you pass it to seneca-web
as the `adapter` option, and seneca-web calls it once per route mapping
(at plugin initialization for the `routes` option, and for every
`role:web,routes:*` message).

```js
const Adapter = require('@seneca/web-adapter-koa2')

seneca.use(SenecaWeb, { adapter: Adapter, context: router, routes })
```

## Signature

```js
function koa(options, context, auth, routes, done)
```

| Argument | What seneca-web passes | Used for |
| -------- | ---------------------- | -------- |
| `this` | A Seneca instance chosen by seneca-web. seneca-web 2.2.2 passes the instance of the action that maps the routes: the `init:web` action during plugin initialization, or the `role:web` action. | Finding the root instance (`this.root`), which sends the request messages. |
| `options` | The plugin's `options` (default `{ parseBody: true }`, with `middleware` added when that option is given), or the `options` property of the `role:web` message when present. | `parseBody` and `middleware`; other properties are ignored. |
| `context` | The plugin's `context` option, or the `context` property of the message. | The Koa router to register routes on. Required. |
| `auth` | The plugin's `auth` option, or the `auth` property of the message. | Not used. |
| `routes` | The list of routes built from the route map by seneca-web's mapper. | One route per map key; see [Route registration](#route-registration). |
| `done` | A callback `(err, result)`. | Called once, synchronously: with `{ routes }` when the routes are registered, or with an error when there is no context. An exception thrown while registering (see [Failure modes](#failure-modes)) propagates instead, and Seneca turns it into the error reply. |

The adapter has no options of its own; everything is configured through
seneca-web (see [Options](options.md)).

## Route registration

Each route in `routes` is an object produced by seneca-web. The adapter
reads these properties:

| Property | Type | Effect |
| -------- | ---- | ------ |
| `pattern` | string | The message pattern, for example `role:todo,cmd:list` (the pin with the map key in place of `*`). |
| `methods` | array of strings | HTTP methods; one Koa route is registered per method, with `context[method.toLowerCase()]`. |
| `path` | string | The Koa route path, for example `/todo/get/:id`, built by seneca-web from `prefix`, the part, `postfix`, `suffix` or `alias`. |
| `middleware` | `false` or array | Koa middleware for the route: strings are looked up in `options.middleware`, functions are used as they are. |
| `redirect` | `false` or string | Redirect the client to this URL after the action replied. |
| `autoreply` | boolean (default `true`) | Write the action's reply as the response body. |

`auth` and `secure` are ignored: routes with them are registered like
any other route, without authentication. The remaining properties
(`pin`, `part`, `prefix`, `postfix`, `suffix`, `alias`) were already
folded into `pattern` and `path` by seneca-web.

For every route and every method the adapter calls:

```js
context[method.toLowerCase()](path, ...middleware, handler)
```

so the router runs the route's middleware first (set level middleware,
then route level middleware, in the order seneca-web concatenated
them) and the adapter's handler last. The same handler code serves all
methods of a route.

## The request handler

For each request that reaches it, the handler:

1. Reads the body. For `POST` and `PUT` it is `await co-body(ctx)` when
   `options.parseBody` is not `false`, and `ctx.request.body` otherwise.
   For other methods the body is `{}`. A parser error is thrown to Koa
   (see [Parse request bodies](../how-to/parse-request-bodies.md)).
2. Builds the message and sends it from the root Seneca instance:

   ```js
   seneca.root.act(pattern, {
     request$: ctx.request,
     response$: ctx.response,
     args: {
       body,
       query: { ...ctx.request.query },
       params: { ...ctx.params },
       state: { ...ctx.state }
     }
   }, callback)
   ```

   See [Message](message.md) for what the action receives.
3. If the action replied with an error, throws that error object. Koa's
   error handling takes over; see [Response](response.md#errors).
4. Otherwise sets the content type to `json` and the status to `200`,
   then, if `redirect` is set, calls `ctx.redirect(redirect)`, and, if
   `autoreply` is true, sets `ctx.body` to the reply. See
   [Response](response.md) for the resulting responses.

The handler is an `async` function; it resolves when the response has
been prepared, so middleware code placed after `await next()` runs
after step 4.

## Reply

When registration succeeds, the adapter calls `done(null, { routes })`
with the list it was given. That object is the reply of the `role:web`
message:

```js
const routes = { pin: 'a:*', map: { b: { GET: true, POST: true, suffix: '/:id' } } }

seneca.act('role:web', { routes }, function (err, out) {
  if (err) return console.error(err)
  console.log(out.routes[0])
})
```

prints

```
{
  prefix: false,
  postfix: false,
  suffix: '/:id',
  part: 'b',
  pin: 'a:*',
  alias: false,
  methods: [ 'GET', 'POST' ],
  autoreply: true,
  redirect: false,
  auth: false,
  middleware: false,
  secure: false,
  pattern: 'a:b',
  path: '/b/:id'
}
```

## Failure modes

| Situation | What happens |
| --------- | ------------ |
| No `context` (neither the plugin option nor the message property) | `done(new Error('no context provided'))`. The `role:web` message replies with that error. |
| The Koa application passed as `context` | The application has no route methods, so registration throws a `TypeError` (`Function.prototype.apply was called on undefined, which is a undefined and not a function`). Pass a router. |
| A middleware name that is not in `options.middleware` | The router rejects the registration; with @koa/router 15 the error message is ``get `/path`: `middleware` must be a function, not `undefined` ``. |
| Middleware names without a `middleware` option | `TypeError: Cannot read properties of undefined (reading '<name>')`, where `<name>` is the first middleware name. |

Registration errors thrown inside the adapter are caught by Seneca and
delivered as the error reply of the `role:web` message.

When the routes come from the plugin options, any of these failures is
a plugin initialization failure, which Seneca treats as fatal: it logs
fatal entries, calls the error handler if one is set, never calls the
`ready` callback, and terminates the process with exit code 2 once its
`death_delay` (11111 milliseconds by default) has passed. Seneca
4.0.0-rc5 prints `EXIT [ 2 ]` with a stack trace instead of exiting,
and the process keeps running without a ready instance.

Errors at request time (parser errors, action errors, `act_not_found`)
are not registration failures; they are thrown into Koa's middleware
chain for the request, see [Response](response.md#errors).

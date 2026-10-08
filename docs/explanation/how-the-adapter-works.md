# How the adapter works

This page explains the design of the adapter: what seneca-web leaves to
an adapter, how this one maps that onto Koa, and the decisions and
limits that follow.

## seneca-web and its adapters

seneca-web separates two concerns. It owns the *route map*: the
declaration of which URL paths and methods lead to which action
patterns, with prefixes, aliases, redirects and middleware names. From
a route map it computes a flat list of routes, each with a `pattern`, a
`path` and `methods`. What it does not know is how a particular web
framework registers a route and reads a request. That is the adapter's
job, and there is one adapter per framework (Express, Hapi, Koa 1,
Koa 2, connect).

The contract is one function, `adapter(options, context, auth, routes,
done)`, called with the Seneca instance as `this`. seneca-web calls it
when the plugin initializes (for the `routes` option) and for every
`role:web,routes:*` message. The adapter registers the routes on the
`context` and reports back with `done`. Everything else, including
when the routes are mapped and which router is used, is decided by
the application.

## Why a router, not the Koa application

Koa itself has no routing: `app.use` takes middleware, and the
application object has no `get` or `post` method. A router such as
`@koa/router` provides `router.get(path, ...middleware)`, which is the
shape the adapter needs, so the `context` must be a router. The adapter
only calls those method functions, which is why any router with the
same shape works, and why mounting the router (`app.use(router.routes())`)
stays with the application: the adapter does not touch `app`.

## The handler is the last middleware

For each route and method, the adapter registers the route's middleware
followed by its own handler. In Koa terms the handler is simply the
last middleware of the route. Everything before it can prepare the
request (authentication, `ctx.state`, body parsing) or end it (a `401`
without calling `next()`), and code after `await next()` in any of
those middleware runs after the handler has prepared the response.
This is deliberate: the adapter does not add its own hooks for
"before" and "after", because Koa's middleware model already provides
them.

## Reading the request

The handler builds the message from four pieces of plain data and two
live objects.

The plain data is `args.body`, `args.query`, `args.params` and
`args.state`. Query, params and state are shallow copies, so the
message holds data, not references into Koa's context, and the same
`args` object can be sent over a Seneca transport to another process.
The body is parsed by the adapter for `POST` and `PUT` with co-body's
`any` parser, which handles the three common encodings (JSON, form,
text) without configuration. The `parseBody: false` option exists for
everything else: a different parser, different limits, other methods.
It makes the adapter use `ctx.request.body`, the property Koa body
parsers conventionally set.

The live objects are `request$` and `response$`, the Koa request and
response. They give actions full access when they need it, for
instance to read headers or to write a response themselves. The `$`
suffix marks them as Seneca directives rather than message data, and
seneca-transport drops such properties when it sends a message to
another process. An action therefore sees the same `args` wherever it
runs; it only has to avoid depending on `request$` when it might run
elsewhere.

## Writing the response

After the action replied, the handler sets the content type to JSON
and the status to `200`, then redirects if the route says so, then
writes the reply as the body if `autoreply` is on. The intent is that
an action can be exposed over HTTP without knowing about HTTP: it
replies with an object and the adapter does the rest.

The cost of that simplicity is that the action cannot choose the status
code through `response$`, because the handler overwrites it. The
adapter keeps this behaviour for compatibility; the supported way to
choose a status code is middleware after `await next()`, which also
keeps HTTP concerns out of the action. Headers set by the action are
left alone.

## Errors are Koa's business

When the action fails, the handler throws the error it received. It
does not translate errors into status codes, because the mapping from
application errors to HTTP statuses belongs to the application, and
Koa already has a place for it: error middleware. The adapter's only
promise is to pass the error object through unchanged, so that
`err.code` and `err.details` set by the action are available there.
Seneca 3 and Seneca 4 differ in what that object is; see
[Seneca 3 and Seneca 4](seneca-3-and-4.md).

## Which Seneca instance sends the message

seneca-web 2.2.2 calls the adapter from inside an action: `init:web`
when the routes come from the plugin options, or `role:web,routes:*`.
The instance it passes as `this` is therefore an action delegate, and a
delegate carries fixed arguments that are added to every message it
sends. For `init:web` those include `fatal$: true`, because plugin
initialization messages are fatal by design: if initialization fails,
the process should not continue.

Before version 1.3.0 the adapter sent the request messages from that
delegate, so every message for a route configured through the plugin
options was fatal: an action replying with an error closed the Seneca
instance and exited the process. Since 1.3.0 the adapter sends the
messages from the root instance (`this.root`). Each request becomes
its own transaction with no inherited arguments, and an action error
is an ordinary error that reaches Koa. This holds whichever instance
seneca-web passes to the adapter. One consequence: fixed arguments of a
delegate that mapped the routes (for example
`seneca.delegate({ zone: 'web' }).act('role:web', ...)`) are no longer
added to the request messages; put such values in the route's pattern
or in middleware instead. The details are in
[Seneca 3 and Seneca 4](seneca-3-and-4.md#fatal-errors-and-the-root-instance).

## Limits

* seneca-web keeps the current context, adapter and options in module
  level variables shared by all Seneca instances in a process, and
  merges the options of every `use()` into them, so a later instance
  also maps the routes given to an earlier one. Several instances with
  seneca-web in one process should map their routes with `role:web`
  messages and hold their routers themselves; see
  [Options](../reference/options.md#seneca-web-messages-and-exports).
* `auth` and `secure` in the route map are not implemented; use
  middleware.
* Only `POST` and `PUT` bodies reach `args.body`. Other methods need
  your own middleware and `msg.request$.body`.
* The body is parsed in full before the message is sent; there is no
  streaming of request bodies into actions.
* Seneca requires action replies to be objects or arrays. A route whose
  action replies with a string fails with `result_not_objarr`; wrap the
  value in an object, or use `autoreply: false` and write the response
  through `response$`.

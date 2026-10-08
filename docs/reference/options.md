# Options reference

The adapter has no options of its own. It is configured through the
options of [seneca-web](https://github.com/senecajs/seneca-web), which
passes the relevant ones to the adapter, and through the route map.
This page lists the seneca-web options the adapter reads, every route
map property and what the adapter does with it, and the seneca-web
messages and exports involved. The behaviour described here is that of
seneca-web 2.2.2.

```js
seneca.use(SenecaWeb, {
  adapter: Adapter,          // this module
  context: router,           // a Koa router
  routes: [...],             // the route map (object or array)
  middleware: { name: fn },  // named Koa middleware
  options: { parseBody: true },
  auth: null                 // not used by this adapter
})
```

## context

The Koa router that receives the routes. Required: without it the
adapter fails with `no context provided` (see
[Adapter](adapter.md#failure-modes)). Any object with lower case HTTP
method functions that accept `(path, ...middleware)` works; `@koa/router`
(also published as `koa-router`) is the usual choice. The Koa
application itself does not work because it has no route methods.

Mount the router on the application yourself:

```js
app.use(router.routes())
```

`seneca.export('web/context')()` returns the current context, so code
that does not hold the router can write
`app.use(seneca.export('web/context')().routes())`.

## adapter

The adapter function; set it to this module. seneca-web's default
adapter only logs the routes.

## routes

The route map: a route set, or an array of route sets. See
[Route map](#route-map). Routes given here are mapped when the plugin
initializes. Routes can also be mapped later with the `role:web`
message, see [seneca-web messages and exports](#seneca-web-messages-and-exports).

## middleware

An object of named Koa middleware functions. Route sets and routes
refer to them by name in their `middleware` properties. seneca-web
stores it as `options.middleware`, which is where the adapter reads
it. See [Add middleware per route](../how-to/add-route-middleware.md).

## options.parseBody

Default `true`: for `POST` and `PUT` requests the adapter parses the
body with co-body and passes the result as `msg.args.body`. Set it to
`false` to pass `ctx.request.body` instead, filled by your own
middleware. Other methods never get a body in `msg.args.body`. See
[Parse request bodies](../how-to/parse-request-bodies.md).

The `options` object given to the plugin applies to every mapping.
A `role:web` message that carries its own `options` property replaces
it for that mapping (including `middleware`).

## auth

Passed by seneca-web to adapters that implement authentication (the
Express adapter uses it for Passport). This adapter ignores it, and
also ignores the `auth` and `secure` route properties. Use Koa
middleware for authentication; see
[Add middleware per route](../how-to/add-route-middleware.md).

## Route map

A route set describes a group of routes that share a pattern pin:

```js
{
  pin: 'role:todo,cmd:*',
  prefix: '/todo',
  postfix: '',
  middleware: ['auth'],
  map: {
    list: true,
    get: { GET: true, suffix: '/:id' },
    add: { POST: true, PUT: true, middleware: ['created'] },
    home: { GET: true, alias: '/' },
    logout: { GET: true, redirect: '/' },
    page: { GET: true, autoreply: false }
  }
}
```

Route set properties:

| Property | Default | Effect |
| -------- | ------- | ------ |
| `pin` | required | The pattern with a `*` in place of the varying value, for example `role:todo,cmd:*`. Each map key replaces the `*` to form the route's pattern. A set without a pin produces no routes. |
| `map` | required | Object whose keys name the routes. The key is the URL part and the pattern value. |
| `prefix` | none | Path segment placed before the part. |
| `postfix` | none | Path segment placed after the part, before the suffix. |
| `middleware` | none | Middleware for every route in the set: a name, a function, or an array of them. |

Map values:

| Value or property | Default | Effect |
| ----------------- | ------- | ------ |
| `true`, or any other value that is not an object | | A `GET` route with the default path. `false` also creates one: leave the key out to have no route. |
| `GET`, `POST`, `PUT`, `HEAD`, `DELETE`, `OPTIONS`, `PATCH` (any letter case) | none | Each of these keys adds that HTTP method. The value is not checked: `GET: false` also adds `GET`, so leave out the methods you do not want. An object with no method key produces a route with no methods, which registers nothing. |
| `suffix` | none | Path segment placed after the part and the postfix, for example `/:id` for a path parameter. |
| `alias` | none | Replaces the whole path (`'/'` plus the alias); prefix, part, postfix and suffix are ignored. |
| `name` | the map key | Replaces the part in the path; may be the empty string. The pattern still uses the map key. |
| `autoreply` | `true` | `false` stops the adapter from writing the reply as the response body. See [Response](response.md#autoreply). |
| `redirect` | none | A URL to redirect to after the action replied. See [Response](response.md#redirect). |
| `middleware` | none | Middleware for this route only, appended after the set's middleware. |
| `auth` | none | Ignored by this adapter (seneca-web keeps it only when it has a `strategy`). |
| `secure` | none | Ignored by this adapter. |

The path is `'/' + prefix + part + postfix + suffix`, joined as path
segments, or `'/' + alias`. The pattern is the pin with the map key in
place of `*`.

## seneca-web messages and exports

The adapter adds no action patterns and no exports. These belong to
seneca-web and are how route mapping is triggered:

| Pattern | Message properties | Effect |
| ------- | ------------------ | ------ |
| `role:web,routes:*` | `routes` (required), and optionally `adapter`, `context`, `options`, `auth` for this mapping only | Maps the routes by calling the adapter. Replies with the adapter's result, `{ routes }`. |
| `role:web,set:server` | `context`, `adapter`, `options`, `auth` | Replaces the defaults (each property that is given) used by later mappings, and replies `{ ok: true }`. In seneca-web 2.2.2 a message that also carries `routes` is matched by `role:web,routes:*` instead: the routes are mapped onto the message's context, but the defaults are not replaced. |
| `init:web` | | Plugin initialization: runs the `set:server` logic with the plugin options, which maps the `routes` option. |

| Export | Value |
| ------ | ----- |
| `seneca.export('web/context')` | A function returning the current context (the router). |
| `seneca.export('web/mapRoutes')` | The mapping function, bound to the plugin instance. |
| `seneca.export('web/setServer')` | The `set:server` function, bound to the plugin instance. |

seneca-web keeps its options, and the current context, adapter and
options used for mapping, in module level variables, shared by every
Seneca instance in the process:

* The last `use()` or `set:server` sets the context, and `web/context`
  returns that router for every instance.
* The options given to `use()` are deep merged into the module level
  options, so an instance created later in the same process also maps
  the `routes` given to an earlier one, onto its own context.

Programs with more than one Seneca instance using seneca-web (tests,
for example) should pass `routes` in `role:web` messages rather than in
the plugin options, hold their routers themselves, and map with an
explicit `context` where it matters.

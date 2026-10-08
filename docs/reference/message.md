# Message reference

The message an action receives for an HTTP request handled by the
adapter. For a route with pattern `role:todo,cmd:add`:

```js
seneca.add('role:todo,cmd:add', function (msg, reply) {
  msg.role        // 'todo'   from the pattern
  msg.cmd         // 'add'    from the pattern
  msg.args.body   // the parsed request body
  msg.args.query  // the query string, as an object
  msg.args.params // path parameters from the router
  msg.args.state  // a copy of ctx.state
  msg.request$    // the Koa request (ctx.request)
  msg.response$   // the Koa response (ctx.response)
  reply({ ... })
})
```

The message is sent with `seneca.act` from the root Seneca instance,
so it carries no fixed arguments (such as `fatal$` or `plugin$`) of the
instance that mapped the routes, and each request is a new transaction.
The only properties ending in `$` that the action sees are `request$`
and `response$`.

| Property | Type | Content |
| -------- | ---- | ------- |
| pattern properties | | The pin with the map key, for example `role: 'todo', cmd: 'add'`. |
| `args.body` | object, string or `undefined` | See [args.body](#argsbody). |
| `args.query` | object | See [args.query](#argsquery). |
| `args.params` | object | See [args.params](#argsparams). |
| `args.state` | object | See [args.state](#argsstate). |
| `request$` | Koa request | See [request$ and response$](#request-and-response). |
| `response$` | Koa response | See [request$ and response$](#request-and-response). |

Not included: request headers, the HTTP method, cookies and the URL are
read from `msg.request$` (`msg.request$.headers`, `msg.request$.method`,
`msg.request$.url`). Unlike the Express adapter, this adapter adds no
`args.route` and no `args.user`; authentication results travel in
`args.state`.

## args.body

For `POST` and `PUT` requests, the body parsed by co-body: an object
for JSON and form bodies, a string for text bodies. With
`options.parseBody: false` it is `ctx.request.body` as set by your
middleware (`undefined` if nothing set it). For every other method it
is `{}`. Details and limits: [Parse request bodies](../how-to/parse-request-bodies.md).

## args.query

A shallow copy of Koa's `ctx.request.query`, which Koa builds with
Node's `querystring` module: values are strings, a repeated key gives
an array, and bracket syntax is not interpreted. The request
`/echo?a=1&a=2&b[c]=3` gives:

```js
{ a: ['1', '2'], 'b[c]': '3' }
```

## args.params

A shallow copy of `ctx.params`, the path parameters matched by the
router for the route's path. Values are strings. For the path
`/todo/get/:id` and the request `/todo/get/7`:

```js
{ id: '7' }
```

## args.state

A shallow copy of `ctx.state` taken when the handler runs, after all
middleware before it. Assigning to `msg.args.state` does not change
`ctx.state`; objects held in it are shared. See
[Pass Koa state to actions](../how-to/pass-koa-state-to-actions.md).

## request$ and response$

The live Koa request and response objects (`ctx.request` and
`ctx.response`, not the Node `req` and `res`, which are available as
`msg.request$.req` and `msg.response$.res`). `msg.request$.ctx` and
`msg.response$.ctx` are the Koa context. Use them to read headers,
set response headers (`msg.response$.set(name, value)`), or write the
response yourself for `autoreply: false` routes.

Status code and content type set through `response$` are overwritten
by the handler after the action replies; see
[Response](response.md#status-and-content-type).

Seneca treats properties whose names end in `$` as directives rather
than message data. seneca-transport removes them (with
`seneca.util.clean`) before it sends a message to another process, so
an action running remotely sees `args` but no `request$` or
`response$`. The Koa objects are also not serializable: do not log the
whole message or copy it into another message without removing them.

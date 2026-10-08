# Add middleware per route

How to run Koa middleware for some routes only: authentication, request
shaping, response shaping. Middleware for every request goes in
`app.use()` before the router as usual; this guide is about middleware
attached to routes through the route map. The program used here is
[docs/examples/route-middleware-and-state.js](../examples/route-middleware-and-state.js).

## 1. Name your middleware

Give seneca-web an object of named middleware functions with the
`middleware` option. Each one is an ordinary Koa middleware:

```js
const middleware = {
  auth: async (ctx, next) => {
    const user = users[ctx.get('authorization')]
    if (!user) {
      ctx.status = 401
      ctx.body = { error: 'unauthorized' }
      return
    }
    ctx.state.user = user
    await next()
  },

  created: async (ctx, next) => {
    await next()
    ctx.status = 201
    ctx.set('location', '/account/note/' + ctx.state.noteId)
  }
}

seneca.use(SenecaWeb, { adapter: Adapter, context: router, middleware, routes })
```

## 2. Refer to it in the route map

A route set's `middleware` applies to every route in the set; a route's
own `middleware` is added after it. Both accept a name, a function, or
an array of names and functions:

```js
const routes = {
  pin: 'role:account,cmd:*',
  prefix: '/account',
  middleware: ['auth'],
  map: {
    profile: { GET: true },
    note: { POST: true, middleware: ['created'] }
  }
}
```

For each route and method the adapter registers, in this order: the set
middleware, the route middleware, and finally its own handler, which
sends the message and writes the reply. So `POST /account/note` runs
`auth`, then `created`, then the handler.

## 3. Act before the action

Middleware that does not call `next()` ends the request: the handler
never runs and no message is sent. This is how `auth` above answers
`401` for requests without a valid token.

Middleware can also prepare data for the action. Anything put on
`ctx.state` reaches the action as `msg.args.state`; see
[Pass Koa state to actions](pass-koa-state-to-actions.md).

## 4. Act after the action

Code after `await next()` runs once the handler has written the reply.
At that point `ctx.status` is `200`, the content type is JSON and, for
`autoreply` routes, `ctx.body` is the action's reply. Change what you
need: the status code, headers, the content type, or the body itself.
This is the way to answer with a status other than 200, because a
status set by the action on `msg.response$` is overwritten by the
handler (see [Response](../reference/response.md#status-and-content-type)).

## 5. Map routes later

Routes mapped after start with the `role:web` message resolve names
against the same `middleware` option. If the message carries its own
`options` object, that object replaces the plugin options for the
mapping, so include the middleware in it:

```js
seneca.act('role:web', {
  routes: { pin: 'role:account,cmd:*', middleware: ['auth'], map: { ... } },
  options: { parseBody: true, middleware }
}, callback)
```

## 6. Avoid these failures

* A name that is not in the `middleware` object makes route registration
  fail; with @koa/router the error is ``get `/path`: `middleware` must be
  a function, not `undefined` ``. The `role:web` message replies with that
  error. When the routes come from the plugin options, the failure
  happens during plugin initialization, which Seneca treats as fatal:
  the `ready` callback is never called and the process exits (see
  [Adapter](../reference/adapter.md#failure-modes)).
* Using names without a `middleware` option at all fails with a
  `TypeError` (`Cannot read properties of undefined`).

## 7. Run the example

```
GET /account/profile, no token
  -> 401 { error: 'unauthorized' }
GET /account/profile
  -> 200 { profile: { id: 'u1', name: 'Ada' } }
POST /account/note
  -> 201 /account/note/7 { id: 7, saved: 'ship it', by: 'u1' }
```

The first request was stopped by `auth`. The third shows `created` at
work after the action: status 201 and a `Location` header, printed
between the status and the body.

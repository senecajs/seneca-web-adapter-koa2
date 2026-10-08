# Pass Koa state to actions

How to give actions per request data computed by middleware, such as
the authenticated user, and how to pass data back. The program used
here is [docs/examples/route-middleware-and-state.js](../examples/route-middleware-and-state.js).

## 1. Put the data on `ctx.state`

Koa's `ctx.state` is the conventional place for per request data. Set
it in any middleware that runs before the route handler, at the
application level or as route middleware:

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
  }
}
```

## 2. Read it as `msg.args.state`

When the handler sends the message, it copies `ctx.state` into
`msg.args.state`:

```js
seneca.add('role:account,cmd:profile', function (msg, reply) {
  reply({ profile: msg.args.state.user })
})
```

The copy is shallow and is taken when the handler runs, after all
earlier middleware. Assigning to `msg.args.state` inside the action does
not change `ctx.state`; changing an object held in it (such as
`msg.args.state.user`) does, because the object is shared.

`msg.args` is plain data, so `args.state` also survives when the message
is sent to another process over a Seneca transport, as long as its
values can be serialized to JSON; `request$` and `response$` do not.

## 3. Pass data back to middleware

Middleware that runs after the action (code after `await next()`) sees
the response the handler wrote, but not the action's reply object
unless `autoreply` placed it in `ctx.body`. To hand other values back,
use the live Koa objects the action receives: set a header with
`msg.response$.set(name, value)`, or set a property on the live state,
`msg.response$.ctx.state`:

```js
seneca.add('role:account,cmd:note', function (msg, reply) {
  msg.response$.ctx.state.noteId = 7
  reply({ id: 7, saved: msg.args.body.text, by: msg.args.state.user.id })
})

const middleware = {
  created: async (ctx, next) => {
    await next()
    ctx.status = 201
    ctx.set('location', '/account/note/' + ctx.state.noteId)
  }
}
```

## 4. Run the example

```
GET /account/profile, no token
  -> 401 { error: 'unauthorized' }
GET /account/profile
  -> 200 { profile: { id: 'u1', name: 'Ada' } }
POST /account/note
  -> 201 /account/note/7 { id: 7, saved: 'ship it', by: 'u1' }
```

The profile comes from `msg.args.state.user`; the `Location` header of
the third response was built by the `created` middleware from the
`noteId` the action put on the live state.

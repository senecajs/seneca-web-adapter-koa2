# Parse request bodies

How to control what arrives in `msg.args.body`: the built in parsing,
parser errors, your own parser, size limits, and the bodies of methods
other than POST and PUT. The program used here is
[docs/examples/parse-bodies.js](../examples/parse-bodies.js).

## What is parsed by default

For `POST` and `PUT` requests the adapter parses the body with
[co-body](https://github.com/cojs/co-body) (its `any` parser, with the
default options) before it sends the message:

| Request | `msg.args.body` |
| ------- | --------------- |
| `application/json`, `application/*+json` | the parsed JSON value |
| `application/x-www-form-urlencoded` | an object; every value is a string |
| `text/*` | the body as a string |
| no content type, or any other content type | the request fails with status 415 |
| invalid JSON | the request fails with status 400 |
| body larger than the limit (1mb for JSON and text, 56kb for forms) | the request fails with status 413 |

For every other method (`GET`, `DELETE`, `PATCH`, `HEAD`, `OPTIONS`)
`msg.args.body` is `{}`, whatever the request carries.

## 1. Handle parser errors

A parser failure is thrown inside Koa's middleware chain before the
message is sent. Without error middleware, Koa answers with the status
text (`Bad Request`, `Unsupported Media Type`) and emits its `error`
event. The thrown error carries the status, so error middleware placed
before the routes can report it:

```js
app.use(async (ctx, next) => {
  try {
    await next()
  } catch (err) {
    ctx.status = err.status || 500
    ctx.body = { error: err.message }
  }
})

app.use(router.routes())
```

## 2. Use your own parser

Set `parseBody: false` to make the adapter skip co-body and use
`ctx.request.body` instead. Middleware that runs before the route
handler must then set `ctx.request.body`: any Koa body parser that does
so works, and so does co-body called with your own options.

For all routes, pass the option to seneca-web:

```js
seneca.use(SenecaWeb, {
  adapter: Adapter,
  context: router,
  routes,
  options: { parseBody: false }
})

app.use(bodyParser()) // sets ctx.request.body
app.use(router.routes())
```

For one set of routes, pass `options` in the `role:web` message that
maps them, and attach the parser as route middleware so that it only
runs for those routes:

```js
const parseText = async (ctx, next) => {
  ctx.request.body = await CoBody.text(ctx, { limit: '1kb' })
  await next()
}

seneca.act('role:web', {
  routes: {
    pin: 'role:echo,cmd:*',
    prefix: '/own',
    middleware: [parseText],
    map: { body: { POST: true, PATCH: true } }
  },
  options: { parseBody: false }
}, callback)
```

Note that `options` in the message replaces the plugin's options for
that mapping: if the routes refer to named middleware, include the
`middleware` object in it too.

With `parseBody: false` and no parser, `msg.args.body` is `undefined`
for POST and PUT requests.

## 3. Read the bodies of PATCH and DELETE requests

The adapter only fills `msg.args.body` for POST and PUT, with either
parser. For other methods, parse the body in middleware and read it
from the Koa request, which the action receives as `msg.request$`:

```js
seneca.add('role:echo,cmd:body', function (msg, reply) {
  const body = msg.request$.body // set by your middleware
  reply({ body })
})
```

`request$` is the live Koa request object, so this works for every
method. It is not available when the message travels over a Seneca
transport to another process; see the
[Message reference](../reference/message.md#request-and-response).

## 4. Run the example

[docs/examples/parse-bodies.js](../examples/parse-bodies.js) maps the
same action twice: under `/default` with the built in parsing and under
`/own` with `parseBody: false` and the `parseText` middleware above. The
action replies with the type and value of `msg.args.body` and with
`msg.request$.body`:

```
POST /default/body application/json
  -> 200 {"type":"object","body":{"n":1,"ok":true}}
POST /default/body application/x-www-form-urlencoded
  -> 200 {"type":"object","body":{"n":"1","ok":"true"}}
POST /default/body text/plain
  -> 200 {"type":"string","body":"hello"}
POST /default/body application/json
  -> 400 {"error":"Expected property name or '}' in JSON at position 1 (line 1 column 2)"}
POST /default/body (no body)
  -> 415 {"error":"Missing content-type"}
PATCH /default/body application/json
  -> 200 {"type":"object","body":{}}
POST /own/body application/json
  -> 200 {"type":"string","body":"{\"n\":1}","requestBody":"{\"n\":1}"}
PATCH /own/body application/json
  -> 200 {"type":"object","body":{},"requestBody":"{\"n\":1}"}
```

The fourth request sent `{bad json`; the fifth sent no body and no
content type. Under `/own`, the text parser gives a string even for a
JSON content type, and the PATCH body is only visible through
`msg.request$.body`.

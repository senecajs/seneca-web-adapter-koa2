# Getting started

In this tutorial you build a small todo service: three Seneca actions,
made available over HTTP through Koa, seneca-web and this adapter. You
then call it with `fetch`. It takes about fifteen minutes. The finished
program is [docs/examples/getting-started.js](../examples/getting-started.js).

## 1. Install

You need Node.js 22 or later (the versions this was tested with are
22 and 24). In a new directory:

```sh
npm init -y
npm install seneca@^4.0.0-rc5 seneca-web @seneca/web-adapter-koa2 koa @koa/router
```

`seneca@^4.0.0-rc5` selects the Seneca 4 prerelease; plain `seneca`
installs the current Seneca 3 release, which runs this tutorial
unchanged. Versions of the adapter up to 1.2.1 were published as
`seneca-web-adapter-koa2`; from 1.3.0 the package is
`@seneca/web-adapter-koa2`.

`seneca`, `seneca-web` and `koa` are peer dependencies of the adapter,
so they are installed next to it. `@koa/router` provides the router the
adapter registers its routes on.

## 2. The service

Create `todo.js` with the following program. It is complete; the parts
are explained below.

```js
const Seneca = require('seneca')
const SenecaWeb = require('seneca-web')
const Koa = require('koa')
const Router = require('@koa/router')
const Adapter = require('@seneca/web-adapter-koa2')

async function main() {
  const seneca = Seneca({ log: 'warn' })
  let server = null

  try {
    // A small todo service, written as ordinary Seneca actions.
    const todos = []

    seneca.add('role:todo,cmd:list', function (msg, reply) {
      reply({ todos })
    })

    seneca.add('role:todo,cmd:add', function (msg, reply) {
      const todo = { id: todos.length + 1, text: msg.args.body.text }
      todos.push(todo)
      reply(todo)
    })

    seneca.add('role:todo,cmd:get', function (msg, reply) {
      const todo = todos.find(t => String(t.id) === msg.args.params.id)
      reply({ todo: todo || null })
    })

    // The route map: URL paths to action patterns.
    const routes = {
      pin: 'role:todo,cmd:*',
      prefix: '/todo',
      map: {
        list: { GET: true },
        add: { POST: true },
        get: { GET: true, suffix: '/:id' }
      }
    }

    // The adapter registers the routes on this router.
    const router = new Router()
    seneca.use(SenecaWeb, { adapter: Adapter, context: router, routes })
    await ready(seneca)

    const app = new Koa()
    app.use(router.routes())

    // Port 0 asks the operating system for a free port; a real service
    // would use a fixed port such as 3000.
    server = app.listen(0, '127.0.0.1')
    await new Promise(resolve => server.once('listening', resolve))
    const base = 'http://127.0.0.1:' + server.address().port

    let res = await fetch(base + '/todo/add', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'write the docs' })
    })
    console.log('POST /todo/add ->', res.status, await res.json())

    res = await fetch(base + '/todo/list')
    console.log('GET /todo/list ->', res.status, await res.json())

    res = await fetch(base + '/todo/get/1')
    console.log('GET /todo/get/1 ->', res.status, await res.json())

    res = await fetch(base + '/todo/get/2')
    console.log('GET /todo/get/2 ->', res.status, await res.json())
  } finally {
    // Close the server and the Seneca instance, also when something failed.
    if (server) server.close()
    await new Promise(resolve => seneca.close(resolve))
  }
}

// Callback form of ready: it also works on Seneca 3 and on 4.0.0-rc5.
function ready(seneca) {
  return new Promise((resolve, reject) =>
    seneca.ready(err => (err ? reject(err) : resolve()))
  )
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
```

## 3. Run it

```sh
node todo.js
```

The output:

```
POST /todo/add -> 200 { id: 1, text: 'write the docs' }
GET /todo/list -> 200 { todos: [ { id: 1, text: 'write the docs' } ] }
GET /todo/get/1 -> 200 { todo: { id: 1, text: 'write the docs' } }
GET /todo/get/2 -> 200 { todo: null }
```

The program exits after the last request because it closes the server
and the Seneca instance. The `log: 'warn'` option keeps Seneca's own
log quiet; without it Seneca prints a JSON log line for each notable
event.

## 4. What happened

**The actions** are plain Seneca actions. Nothing in them knows about
HTTP, except that the data they need arrives under `msg.args`:
`msg.args.body` is the parsed request body and `msg.args.params` holds
the path parameters (`msg.args.query` and `msg.args.state` are there
too). The [Message reference](../reference/message.md) lists all of it.

**The route map** says how URLs become messages. `pin: 'role:todo,cmd:*'`
is the pattern with a wildcard; each key of `map` replaces the `*`, so
`list` becomes `role:todo,cmd:list`. The same key is also the URL part:
with `prefix: '/todo'`, `list` is served at `/todo/list`. The value says
which HTTP methods to accept (`GET: true`, `POST: true`), and `suffix:
'/:id'` adds a path parameter to `/todo/get`. The route map is a
seneca-web feature; the [Options reference](../reference/options.md#route-map)
lists every property.

**The adapter** is handed to seneca-web as the `adapter` option, and
the router as the `context`. When seneca-web initializes, it turns the
route map into a list of routes and calls the adapter, which registers
each one on the router:

```
GET  /todo/list      -> role:todo,cmd:list
POST /todo/add       -> role:todo,cmd:add
GET  /todo/get/:id   -> role:todo,cmd:get
```

`await ready(seneca)` waits for that initialization. It uses the
callback form of `seneca.ready` because the promise form hangs on
Seneca 4.0.0-rc5 when the instance is already idle, and does not exist
on Seneca 3 without seneca-promisify.

**A request** such as `POST /todo/add` reaches the route handler the
adapter registered. The handler parses the JSON body (POST and PUT
bodies are parsed with co-body), builds the message with `args` and the
Koa request and response objects (`request$`, `response$`), sends it
with `seneca.act`, and writes the reply as the JSON response body with
status 200. That is why `GET /todo/get/2` is a 200 with `{ todo: null }`:
the action replied with an object, and the adapter does not interpret
it. To answer with another status code, or to deal with errors, see
[Handle errors and status codes](../how-to/handle-errors-and-status-codes.md).

**Koa** only sees a router. `app.use(router.routes())` mounts it, and
any other Koa middleware can run before it, for example an error handler
or a logger.

## 5. Run it as a server

To keep the service running instead of calling it from the same
program, end `main` once the router is mounted and listen on a fixed
port. The `try`/`finally` is then not needed: it is only there so that
the program closes Seneca when a request fails. The end of `main`
becomes:

```js
  const app = new Koa()
  app.use(router.routes())
  app.listen(3000)
  console.log('listening on http://127.0.0.1:3000')
}
```

Then, from another terminal:

```sh
curl -X POST -H 'content-type: application/json' \
  -d '{"text":"write the docs"}' http://127.0.0.1:3000/todo/add
curl http://127.0.0.1:3000/todo/list
```

curl prints the JSON bodies:

```
{"id":1,"text":"write the docs"}
{"todos":[{"id":1,"text":"write the docs"}]}
```

Stop the server with Ctrl-C.

## Next steps

* [Parse request bodies](../how-to/parse-request-bodies.md) when the
  defaults (JSON, form and text bodies for POST and PUT) are not enough.
* [Add middleware per route](../how-to/add-route-middleware.md) for
  authentication, logging or response shaping.
* [Handle errors and status codes](../how-to/handle-errors-and-status-codes.md)
  to turn action errors into proper HTTP responses.
* [How the adapter works](../explanation/how-the-adapter-works.md) for
  the design behind all this.

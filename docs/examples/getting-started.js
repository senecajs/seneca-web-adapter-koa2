// Tutorial: Getting started. Run with: node docs/examples/getting-started.js
const Seneca = require('seneca')
const SenecaWeb = require('seneca-web')
const Koa = require('koa')
const Router = require('@koa/router')

// In your own project: require('@seneca/web-adapter-koa2')
const Adapter = require('../..')

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

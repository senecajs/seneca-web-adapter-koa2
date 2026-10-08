// How-to: Add middleware per route, pass Koa state to actions.
// Run with: node docs/examples/route-middleware-and-state.js
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
    const users = { 'token-123': { id: 'u1', name: 'Ada' } }

    // Named middleware, referenced by name in the route map.
    const middleware = {
      // Authenticate, or end the request before the action runs.
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

      // Code after next() runs after the action: here it turns the
      // reply into a 201 Created with a Location header.
      created: async (ctx, next) => {
        await next()
        ctx.status = 201
        ctx.set('location', '/account/note/' + ctx.state.noteId)
      }
    }

    seneca.add('role:account,cmd:profile', function (msg, reply) {
      // ctx.state arrives as msg.args.state
      reply({ profile: msg.args.state.user })
    })

    seneca.add('role:account,cmd:note', function (msg, reply) {
      // args.state is a copy; the live Koa state is msg.response$.ctx.state
      msg.response$.ctx.state.noteId = 7
      reply({ id: 7, saved: msg.args.body.text, by: msg.args.state.user.id })
    })

    const router = new Router()
    seneca.use(SenecaWeb, {
      adapter: Adapter,
      context: router,
      middleware,
      routes: {
        pin: 'role:account,cmd:*',
        prefix: '/account',
        // applies to every route in this set
        middleware: ['auth'],
        map: {
          profile: { GET: true },
          // extra middleware for one route, as a name or a function
          note: { POST: true, middleware: ['created'] }
        }
      }
    })
    await ready(seneca)

    const app = new Koa()
    app.use(router.routes())
    server = app.listen(0, '127.0.0.1')
    await new Promise(resolve => server.once('listening', resolve))
    const base = 'http://127.0.0.1:' + server.address().port

    let res = await fetch(base + '/account/profile')
    console.log('GET /account/profile, no token')
    console.log('  ->', res.status, await res.json())

    res = await fetch(base + '/account/profile', {
      headers: { authorization: 'token-123' }
    })
    console.log('GET /account/profile')
    console.log('  ->', res.status, await res.json())

    res = await fetch(base + '/account/note', {
      method: 'POST',
      headers: {
        authorization: 'token-123',
        'content-type': 'application/json'
      },
      body: JSON.stringify({ text: 'ship it' })
    })
    console.log('POST /account/note')
    console.log(
      '  ->',
      res.status,
      res.headers.get('location'),
      await res.json()
    )
  } finally {
    if (server) server.close()
    await new Promise(resolve => seneca.close(resolve))
  }
}

function ready(seneca) {
  return new Promise((resolve, reject) =>
    seneca.ready(err => (err ? reject(err) : resolve()))
  )
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})

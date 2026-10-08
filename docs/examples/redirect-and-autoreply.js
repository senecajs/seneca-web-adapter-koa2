// Reference: redirect and autoreply behaviour.
// Run with: node docs/examples/redirect-and-autoreply.js
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
    seneca.add('role:site,cmd:login', function (msg, reply) {
      reply({ user: msg.args.body.user })
    })

    // autoreply:false routes write the response themselves.
    seneca.add('role:site,cmd:page', function (msg, reply) {
      msg.response$.body = '<h1>Hello</h1>'
      reply({})
    })

    seneca.add('role:site,cmd:empty', function (msg, reply) {
      reply({ ignored: true })
    })

    const middleware = {
      html: async (ctx, next) => {
        await next()
        ctx.type = 'text/html'
      }
    }

    const router = new Router()
    seneca.use(SenecaWeb, {
      adapter: Adapter,
      context: router,
      middleware,
      routes: {
        pin: 'role:site,cmd:*',
        map: {
          login: { POST: true, redirect: '/page' },
          page: { GET: true, autoreply: false, middleware: ['html'] },
          empty: { GET: true, autoreply: false }
        }
      }
    })
    await ready(seneca)

    const app = new Koa()
    app.use(router.routes())
    server = app.listen(0, '127.0.0.1')
    await new Promise(resolve => server.once('listening', resolve))
    const base = 'http://127.0.0.1:' + server.address().port

    async function show(method, path, body) {
      const res = await fetch(base + path, {
        method,
        headers: body ? { 'content-type': 'application/json' } : {},
        body,
        redirect: 'manual'
      })
      console.log(method, path, '->', res.status, {
        location: res.headers.get('location'),
        type: res.headers.get('content-type'),
        body: await res.text()
      })
    }

    await show('POST', '/login', JSON.stringify({ user: 'ada' }))
    await show('GET', '/page')
    await show('GET', '/empty')
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

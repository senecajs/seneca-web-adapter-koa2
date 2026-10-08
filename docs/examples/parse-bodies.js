// How-to: Parse request bodies. Run with: node docs/examples/parse-bodies.js
const Seneca = require('seneca')
const SenecaWeb = require('seneca-web')
const Koa = require('koa')
const Router = require('@koa/router')
const CoBody = require('co-body')

// In your own project: require('@seneca/web-adapter-koa2')
const Adapter = require('../..')

async function main() {
  const seneca = Seneca({ log: 'warn' })
  let server = null

  try {
    seneca.add('role:echo,cmd:body', function (msg, reply) {
      reply({
        type: typeof msg.args.body,
        body: msg.args.body,
        // ctx.request.body as set by your own middleware, if any
        requestBody: msg.request$.body
      })
    })

    const router = new Router()

    // Default: the adapter parses POST and PUT bodies with co-body.
    seneca.use(SenecaWeb, {
      adapter: Adapter,
      context: router,
      routes: {
        pin: 'role:echo,cmd:*',
        prefix: '/default',
        map: { body: { POST: true, PATCH: true } }
      }
    })
    await ready(seneca)

    // Your own parser: parseBody:false makes the adapter use
    // ctx.request.body, which middleware before the handler must fill.
    const parseText = async (ctx, next) => {
      ctx.request.body = await CoBody.text(ctx, { limit: '1kb' })
      await next()
    }

    await new Promise((resolve, reject) =>
      seneca.act(
        'role:web',
        {
          routes: {
            pin: 'role:echo,cmd:*',
            prefix: '/own',
            middleware: [parseText],
            map: { body: { POST: true, PATCH: true } }
          },
          options: { parseBody: false }
        },
        err => (err ? reject(err) : resolve())
      )
    )

    const app = new Koa()

    // Parser errors are HTTP errors: 400 for bad JSON, 413 when the body
    // is over the limit, 415 for a missing or unsupported content type.
    app.use(async (ctx, next) => {
      try {
        await next()
      } catch (err) {
        ctx.status = err.status || 500
        ctx.body = { error: err.message }
      }
    })

    app.use(router.routes())
    server = app.listen(0, '127.0.0.1')
    await new Promise(resolve => server.once('listening', resolve))
    const base = 'http://127.0.0.1:' + server.address().port

    async function send(method, path, type, body) {
      const res = await fetch(base + path, {
        method,
        headers: type ? { 'content-type': type } : {},
        body
      })
      console.log(method, path, type || '(no body)')
      console.log('  ->', res.status, await res.text())
    }

    await send('POST', '/default/body', 'application/json', '{"n":1,"ok":true}')
    await send(
      'POST',
      '/default/body',
      'application/x-www-form-urlencoded',
      'n=1&ok=true'
    )
    await send('POST', '/default/body', 'text/plain', 'hello')
    await send('POST', '/default/body', 'application/json', '{bad json')
    await send('POST', '/default/body')
    await send('PATCH', '/default/body', 'application/json', '{"n":1}')

    await send('POST', '/own/body', 'application/json', '{"n":1}')
    await send('PATCH', '/own/body', 'application/json', '{"n":1}')
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

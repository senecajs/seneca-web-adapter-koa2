// How-to: Handle action errors and status codes.
// Run with: node docs/examples/handle-errors.js
const Seneca = require('seneca')
const SenecaWeb = require('seneca-web')
const Koa = require('koa')
const Router = require('@koa/router')

// In your own project: require('@seneca/web-adapter-koa2')
const Adapter = require('../..')

// HTTP status for application error codes.
const STATUS = { not_found: 404, invalid: 400, act_not_found: 404 }

async function main() {
  // Seneca logs every action error as an act/ERR entry; silent keeps the
  // output below to the HTTP results.
  const seneca = Seneca({ log: 'silent' })
  let server = null

  try {
    seneca.add('role:shop,cmd:item', function (msg, reply) {
      const id = msg.args.params.id
      if (!/^\d+$/.test(id)) {
        const err = new Error('id must be a number')
        err.code = 'invalid'
        return reply(err)
      }
      if ('1' !== id) {
        const err = new Error('no item ' + id)
        err.code = 'not_found'
        return reply(err)
      }
      reply({ id, name: 'kiwi' })
    })

    seneca.add('role:shop,cmd:crash', function () {
      throw new Error('database is down')
    })

    const router = new Router()
    seneca.use(SenecaWeb, {
      adapter: Adapter,
      context: router,
      routes: {
        pin: 'role:shop,cmd:*',
        prefix: '/shop',
        map: {
          item: { GET: true, suffix: '/:id' },
          crash: { GET: true },
          // no action is defined for role:shop,cmd:missing
          missing: { GET: true }
        }
      }
    })
    await ready(seneca)

    const app = new Koa()

    // Error middleware, placed before the routes.
    app.use(async (ctx, next) => {
      try {
        await next()
      } catch (err) {
        // Seneca 3 wraps action errors (the original is err.orig);
        // Seneca 4 delivers the original error object.
        const cause = err.orig || err
        ctx.status = STATUS[cause.code] || 500
        ctx.body = {
          error: 500 === ctx.status ? 'internal error' : cause.message,
          code: cause.code || null
        }
      }
    })

    app.use(router.routes())
    server = app.listen(0, '127.0.0.1')
    await new Promise(resolve => server.once('listening', resolve))
    const base = 'http://127.0.0.1:' + server.address().port

    console.log('seneca', seneca.version)
    for (const path of [
      '/shop/item/1',
      '/shop/item/2',
      '/shop/item/x',
      '/shop/missing',
      '/shop/crash',
      '/shop/item/1'
    ]) {
      const res = await fetch(base + path)
      console.log('GET', path, '->', res.status, await res.json())
    }
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

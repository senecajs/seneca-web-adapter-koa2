'use strict'

const Assert = require('assert')
const Seneca = require('seneca')
const Web = require('seneca-web')
const Koa = require('koa')
const Router = require('@koa/router')
const Adapter = require('../seneca-web-adapter-koa2')
const Parse = require('co-body')

// Promise wrapper around seneca.act, so the tests also run on Seneca 3,
// which has no seneca.post without seneca-promisify.
function act(si, pattern, msg) {
  return new Promise((resolve, reject) =>
    si.act(pattern, msg, (err, res) => (err ? reject(err) : resolve(res)))
  )
}

function postJSON(url, data, method = 'POST') {
  return fetch(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(data),
    redirect: 'manual'
  })
}

describe('koa', () => {
  let si = null
  let app = null
  let server = null
  let base = null

  const middleware = {
    head: async (ctx, next) => {
      ctx.type = 'application/json'
      ctx.status = 200
      await next()
    },
    res: async function (ctx) {
      ctx.body = { success: true }
    }
  }

  beforeEach(done => {
    app = new Koa()
    server = app.listen(0, '127.0.0.1', () => {
      base = 'http://127.0.0.1:' + server.address().port
      si = Seneca({ log: 'silent' })
      si.use(Web, { adapter: Adapter, context: new Router(), middleware })
      si.ready(done)
    })
  })

  afterEach(done => {
    server.close(() => si.close(err => done(err)))
  })

  it('by default routes autoreply', async () => {
    const config = {
      routes: {
        pin: 'role:test,cmd:*',
        map: {
          ping: true
        }
      }
    }

    await act(si, 'role:web', config)

    si.add('role:test,cmd:ping', (msg, reply) => {
      reply(null, { res: 'pong!' })
    })

    app.use(si.export('web/context')().routes())

    const res = await fetch(base + '/ping')
    Assert.equal(res.status, 200)
    Assert.equal(
      res.headers.get('content-type'),
      'application/json; charset=utf-8'
    )
    Assert.deepEqual(await res.json(), { res: 'pong!' })
  })

  it('redirects properly', async () => {
    const config = {
      routes: {
        pin: 'role:test,cmd:*',
        map: {
          redirect: { redirect: '/', POST: true }
        }
      }
    }

    si.add('role:test,cmd:redirect', (msg, reply) => {
      reply(null, msg.args.body)
    })

    await act(si, 'role:web', config)

    app.use(si.export('web/context')().routes())

    const res = await postJSON(base + '/redirect', { foo: 'bar' })
    Assert.equal(res.status, 302)
    Assert.equal(res.headers.get('location'), '/')
  })

  it('querystring', async () => {
    const config = {
      routes: {
        pin: 'role:test,cmd:*',
        map: {
          echo: { GET: true }
        }
      }
    }

    si.add('role:test,cmd:echo', (msg, reply) => {
      reply(null, msg.args.query)
    })

    await act(si, 'role:web', config)

    app.use(si.export('web/context')().routes())

    const res = await fetch(base + '/echo?foo=bar')
    Assert.deepEqual(await res.json(), { foo: 'bar' })
  })

  it('params', async () => {
    const config = {
      routes: {
        pin: 'role:test,cmd:*',
        map: {
          echo: {
            suffix: '/:foo',
            GET: true
          }
        }
      }
    }

    si.add('role:test,cmd:echo', (msg, reply) => {
      reply(null, msg.args.params)
    })

    await act(si, 'role:web', config)

    app.use(si.export('web/context')().routes())

    const res = await fetch(base + '/echo/bar')
    Assert.deepEqual(await res.json(), { foo: 'bar' })
  })

  it('post requests', async () => {
    const config = {
      routes: {
        pin: 'role:test,cmd:*',
        map: {
          echo: { POST: true }
        }
      }
    }

    si.add('role:test,cmd:echo', (msg, reply) => {
      reply(null, msg.args.body)
    })

    await act(si, 'role:web', config)

    app.use(si.export('web/context')().routes())

    const res = await postJSON(base + '/echo', { foo: 'bar' })
    Assert.deepEqual(await res.json(), { foo: 'bar' })
  })

  it('post requests - no body parser', async () => {
    const config = {
      routes: {
        pin: 'role:test,cmd:*',
        map: {
          echo: { POST: true }
        }
      },
      options: {
        parseBody: false
      }
    }

    si.use(Web, { adapter: Adapter, context: new Router() })

    si.add('role:test,cmd:echo', (msg, reply) => {
      reply(null, msg.args.body)
    })

    await act(si, 'role:web', config)

    app.use(async (ctx, next) => {
      ctx.request.body = await Parse(ctx)
      await next()
    })

    app.use(si.export('web/context')().routes())

    const res = await postJSON(base + '/echo', { foo: 'bar' })
    Assert.deepEqual(await res.json(), { foo: 'bar' })
  })

  it('put requests', async () => {
    const config = {
      routes: {
        pin: 'role:test,cmd:*',
        map: {
          echo: { PUT: true }
        }
      }
    }

    si.add('role:test,cmd:echo', (msg, reply) => {
      reply(null, msg.args.body)
    })

    await act(si, 'role:web', config)

    app.use(si.export('web/context')().routes())

    const res = await postJSON(base + '/echo', { foo: 'bar' }, 'PUT')
    Assert.deepEqual(await res.json(), { foo: 'bar' })
  })

  it('put requests - no body parser', async () => {
    const config = {
      routes: {
        pin: 'role:test,cmd:*',
        map: {
          echo: { PUT: true }
        }
      },
      options: {
        parseBody: false
      }
    }

    si.use(Web, { adapter: Adapter, context: new Router() })

    si.add('role:test,cmd:echo', (msg, reply) => {
      reply(null, msg.args.body)
    })

    await act(si, 'role:web', config)

    app.use(async (ctx, next) => {
      ctx.request.body = await Parse(ctx)
      await next()
    })

    app.use(si.export('web/context')().routes())

    const res = await postJSON(base + '/echo', { foo: 'bar' }, 'PUT')
    Assert.deepEqual(await res.json(), { foo: 'bar' })
  })

  it('handles errors', async () => {
    const config = {
      routes: {
        pin: 'role:test,cmd:*',
        map: {
          error: true
        }
      }
    }

    app.use(async (ctx, next) => {
      try {
        await next()
      } catch (err) {
        // Seneca 3 wraps action errors (the original is err.orig);
        // Seneca 4 passes the original error through unchanged.
        ctx.status = 400
        ctx.body = (err.orig || err).message
      }
    })

    si.add('role:test,cmd:error', (msg, reply) => {
      reply(new Error('aw snap!'))
    })

    await act(si, 'role:web', config)

    app.use(si.export('web/context')().routes())

    const res = await fetch(base + '/error')
    Assert.equal(res.status, 400)
    Assert.equal(await res.text(), 'aw snap!')
  })

  it('passes koa state to the action', async () => {
    const config = {
      routes: {
        pin: 'role:test,cmd:*',
        map: {
          state: { GET: true }
        }
      }
    }

    si.add('role:test,cmd:state', (msg, reply) => {
      reply(null, msg.args.state)
    })

    await act(si, 'role:web', config)

    app.use(async (ctx, next) => {
      ctx.state.user = { id: 'u1' }
      await next()
    })

    app.use(si.export('web/context')().routes())

    const res = await fetch(base + '/state')
    Assert.deepEqual(await res.json(), { user: { id: 'u1' } })
  })

  it('exposes the koa request and response to the action', async () => {
    const config = {
      routes: {
        pin: 'role:test,cmd:*',
        map: {
          header: { GET: true }
        }
      }
    }

    si.add('role:test,cmd:header', (msg, reply) => {
      msg.response$.set('x-request-method', msg.request$.method)
      reply(null, { ok: true })
    })

    await act(si, 'role:web', config)

    app.use(si.export('web/context')().routes())

    const res = await fetch(base + '/header')
    Assert.equal(res.status, 200)
    Assert.equal(res.headers.get('x-request-method'), 'GET')
    Assert.deepEqual(await res.json(), { ok: true })
  })

  it('propagates the action error object unchanged to koa', async () => {
    const config = {
      routes: {
        pin: 'role:test,cmd:*',
        map: {
          error: true
        }
      }
    }

    const original = new Error('aw snap!')
    original.code = 'snap'
    let caught = null

    app.use(async (ctx, next) => {
      try {
        await next()
      } catch (err) {
        caught = err
        ctx.status = 400
        ctx.body = { code: (err.orig || err).code }
      }
    })

    si.add('role:test,cmd:error', (msg, reply) => {
      reply(original)
    })

    await act(si, 'role:web', config)

    app.use(si.export('web/context')().routes())

    const res = await fetch(base + '/error')
    Assert.equal(res.status, 400)
    Assert.deepEqual(await res.json(), { code: 'snap' })

    // Seneca 4 delivers the original error; Seneca 3 wraps it as err.orig.
    Assert.ok(caught === original || caught.orig === original)
  })

  it('does not make action errors fatal for routes mapped by the plugin instance', async () => {
    let exited = null
    const app2 = new Koa()
    const router = new Router()
    const si2 = Seneca({
      log: 'silent',
      system: {
        exit: code => {
          exited = code
        }
      }
    })

    app2.use(async (ctx, next) => {
      try {
        await next()
      } catch (err) {
        ctx.status = 400
        ctx.body = (err.orig || err).message
      }
    })

    si2.add('role:test,cmd:error', (msg, reply) => {
      reply(new Error('aw snap!'))
    })
    si2.add('role:test,cmd:ping', (msg, reply) => {
      reply(null, { res: 'pong!' })
    })

    si2.use(Web, { adapter: Adapter, context: router, middleware })

    await new Promise((resolve, reject) =>
      si2.ready(err => (err ? reject(err) : resolve()))
    )

    // seneca-web 2.2.2 maps routes given as plugin options from the
    // plugin instance (init:web), whose messages carry fatal$:true, and
    // binds the exported mapRoutes function to that same instance. Using
    // the export reproduces that case while leaving the module level
    // route configuration of seneca-web untouched for the other tests.
    await new Promise((resolve, reject) =>
      si2.export('web/mapRoutes')(
        {
          routes: { pin: 'role:test,cmd:*', map: { error: true, ping: true } }
        },
        err => (err ? reject(err) : resolve())
      )
    )

    app2.use(router.routes())
    const server2 = app2.listen(0, '127.0.0.1')
    await new Promise(resolve => server2.once('listening', resolve))
    const base2 = 'http://127.0.0.1:' + server2.address().port

    try {
      const res = await fetch(base2 + '/error')
      Assert.equal(res.status, 400)
      Assert.equal(await res.text(), 'aw snap!')

      // A fatal error closes the instance and calls system.exit shortly
      // after the reply; give it time to show up.
      await new Promise(resolve => setTimeout(resolve, 250))
      Assert.equal(exited, null)

      // The instance is still alive and answers the next request.
      const res2 = await fetch(base2 + '/ping')
      Assert.equal(res2.status, 200)
      Assert.deepEqual(await res2.json(), { res: 'pong!' })
    } finally {
      server2.close()
      await new Promise(resolve => si2.close(resolve))
    }
  })

  describe('middleware', () => {
    it('should call middleware routes properly - passing as strings', async () => {
      const config = {
        routes: {
          pin: 'role:test,cmd:*',
          middleware: ['head', 'res'],
          map: {
            ping: true
          }
        }
      }

      si.add('role:test,cmd:ping', (msg, reply) => {
        reply(null, { res: 'ping!' })
      })

      await act(si, 'role:web', config)

      app.use(si.export('web/context')().routes())

      const res = await fetch(base + '/ping')
      Assert.equal(res.status, 200)
      Assert.deepEqual(await res.json(), { success: true })
    })

    it('should call middleware routes properly - passing as functions', async () => {
      const config = {
        routes: {
          pin: 'role:test,cmd:*',
          map: {
            ping: true
          }
        }
      }

      si.add('role:test,cmd:ping', (msg, reply) => {
        reply(null, { res: 'ping!' })
      })

      si.add('role:web,routes:*', function (msg, cb) {
        msg.routes.middleware = [
          async function (ctx, next) {
            ctx.status = 200
            ctx.type = 'application/json'
            await next()
          },
          async function (ctx) {
            ctx.body = { success: true }
          }
        ]
        this.prior(msg, cb)
      })

      await act(si, 'role:web', config)

      app.use(si.export('web/context')().routes())

      const res = await fetch(base + '/ping')
      Assert.equal(res.status, 200)
      Assert.deepEqual(await res.json(), { success: true })
    })
  })
})

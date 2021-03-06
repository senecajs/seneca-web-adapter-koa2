'use strict'

const Assert = require('assert')
const Request = require('request')
const Seneca = require('seneca')
const Web = require('seneca-web')
const Koa = require('koa')
const Router = require('koa-router')
const Adapter = require('../seneca-web-adapter-koa2')
const Parse = require('co-body')

describe('koa', () => {
  let si = null
  let app = null
  let server = null

  const middleware = {
    head: async (ctx, next) => {
      ctx.type = 'application/json'
      ctx.status = 200
      await next()
    },
    res: async function(ctx) {
      ctx.body = { success: true }
    }
  }

  beforeEach(done => {
    app = new Koa()
    server = app.listen(3000, () => {
      si = Seneca({ log: 'silent' })
      si.use(Web, { adapter: Adapter, context: new Router(), middleware })
      si.ready(done)
    })
  })

  afterEach(done => {
    server.close(done)
  })

  it('by default routes autoreply', done => {
    var config = {
      routes: {
        pin: 'role:test,cmd:*',
        map: {
          ping: true
        }
      }
    }

    si.act('role:web', config, err => {
      if (err) return done(err)

      si.add('role:test,cmd:ping', (msg, reply) => {
        reply(null, { res: 'pong!' })
      })

      app.use(
        si
          .export('web/context')()
          .routes()
      )

      Request('http://127.0.0.1:3000/ping', (err, res, body) => {
        if (err) return done(err)

        body = JSON.parse(body)

        Assert.deepEqual(body, { res: 'pong!' })
        done()
      })
    })
  })

  it('redirects properly', done => {
    var config = {
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

    si.act('role:web', config, err => {
      if (err) return done(err)

      app.use(
        si
          .export('web/context')()
          .routes()
      )

      Request.post(
        'http://127.0.0.1:3000/redirect',
        { json: { foo: 'bar' } },
        (err, res) => {
          if (err) return done(err)
          Assert.equal(res.headers.location, '/')
          done()
        }
      )
    })
  })

  it('querystring', done => {
    var config = {
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

    si.act('role:web', config, err => {
      if (err) return done(err)

      app.use(
        si
          .export('web/context')()
          .routes()
      )

      Request.get(
        'http://127.0.0.1:3000/echo?foo=bar',
        {
          json: true
        },
        (err, res, body) => {
          if (err) return done(err)
          Assert.deepEqual(body, { foo: 'bar' })
          done()
        }
      )
    })
  })

  it('params', done => {
    var config = {
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

    si.act('role:web', config, err => {
      if (err) return done(err)

      app.use(
        si
          .export('web/context')()
          .routes()
      )

      Request.get(
        'http://127.0.0.1:3000/echo/bar',
        {
          json: true
        },
        (err, res, body) => {
          if (err) return done(err)
          Assert.deepEqual(body, { foo: 'bar' })
          done()
        }
      )
    })
  })

  it('post requests', done => {
    var config = {
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

    si.act('role:web', config, err => {
      if (err) return done(err)

      app.use(
        si
          .export('web/context')()
          .routes()
      )

      Request.post(
        'http://127.0.0.1:3000/echo',
        { json: { foo: 'bar' } },
        (err, res, body) => {
          if (err) return done(err)

          Assert.deepEqual(body, { foo: 'bar' })
          done()
        }
      )
    })
  })

  it('post requests - no body parser', done => {
    var config = {
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

    si.use(Web, { adapter: Adapter, context: Router() })

    si.add('role:test,cmd:echo', (msg, reply) => {
      reply(null, msg.args.body)
    })

    si.act('role:web', config, err => {
      if (err) return done(err)

      app.use(async (ctx, next) => {
        ctx.request.body = await Parse(ctx)
        await next()
      })

      app.use(
        si
          .export('web/context')()
          .routes()
      )

      Request.post(
        'http://127.0.0.1:3000/echo',
        { json: { foo: 'bar' } },
        (err, res, body) => {
          if (err) return done(err)

          Assert.deepEqual(body, { foo: 'bar' })
          done()
        }
      )
    })
  })

  it('put requests', done => {
    var config = {
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

    si.act('role:web', config, err => {
      if (err) return done(err)

      app.use(
        si
          .export('web/context')()
          .routes()
      )

      Request.put(
        'http://127.0.0.1:3000/echo',
        { json: { foo: 'bar' } },
        (err, res, body) => {
          if (err) return done(err)
          Assert.deepEqual(body, { foo: 'bar' })
          done()
        }
      )
    })
  })

  it('put requests - no body parser', done => {
    var config = {
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

    si.use(Web, { adapter: Adapter, context: Router() })

    si.add('role:test,cmd:echo', (msg, reply) => {
      reply(null, msg.args.body)
    })

    si.act('role:web', config, err => {
      if (err) return done(err)

      app.use(async (ctx, next) => {
        ctx.request.body = await Parse(ctx)
        await next()
      })

      app.use(
        si
          .export('web/context')()
          .routes()
      )

      Request.put(
        'http://127.0.0.1:3000/echo',
        { json: { foo: 'bar' } },
        (err, res, body) => {
          if (err) return done(err)
          Assert.deepEqual(body, { foo: 'bar' })
          done()
        }
      )
    })
  })

  it('handles errors', done => {
    var config = {
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
        ctx.status = 400
        ctx.body = err.orig.message.replace('gate-executor: ', '')
      }
    })

    si.add('role:test,cmd:error', (msg, reply) => {
      reply(new Error('aw snap!'))
    })

    si.act('role:web', config, err => {
      if (err) return done(err)

      app.use(
        si
          .export('web/context')()
          .routes()
      )

      Request.get('http://127.0.0.1:3000/error', (err, res, body) => {
        if (err) return done(err)

        Assert.equal(res.statusCode, 400)
        Assert.equal(body, 'aw snap!')
        done()
      })
    })
  })

  describe('middleware', () => {
    it('should call middleware routes properly - passing as strings', done => {
      var config = {
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

      si.act('role:web', config, err => {
        if (err) return done(err)

        app.use(
          si
            .export('web/context')()
            .routes()
        )

        Request('http://127.0.0.1:3000/ping', (err, res, body) => {
          if (err) return done(err)
          body = JSON.parse(body)
          Assert.equal(res.statusCode, 200)
          Assert.deepEqual(body, { success: true })
          done()
        })
      })
    })
    it('should call middleware routes properly - passing as functions', done => {
      var config = {
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

      si.add('role:web,routes:*', function(msg, cb) {
        msg.routes.middleware = [
          async function(ctx, next) {
            ctx.status = 200
            ctx.type = 'application/json'
            await next()
          },
          async function(ctx) {
            ctx.body = { success: true }
          }
        ]
        this.prior(msg, cb)
      })

      si.act('role:web', config, err => {
        if (err) return done(err)

        app.use(
          si
            .export('web/context')()
            .routes()
        )

        Request('http://127.0.0.1:3000/ping', (err, res, body) => {
          if (err) return done(err)
          body = JSON.parse(body)
          Assert.equal(res.statusCode, 200)
          Assert.deepEqual(body, { success: true })
          done()
        })
      })
    })
  })
})

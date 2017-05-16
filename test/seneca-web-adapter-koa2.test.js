

'use strict'

const Code = require('code')
const Lab = require('lab')
const Request = require('request')
const Seneca = require('seneca')
const Web = require('seneca-web')
const Koa = require('koa')
const Router = require('koa-router')
const Adapter = require('../seneca-web-adapter-koa2')
const BodyParser = require('koa-bodyparser')

const expect = Code.expect
const lab = exports.lab = Lab.script()
const describe = lab.describe
const beforeEach = lab.beforeEach
const afterEach = lab.afterEach
const it = lab.it

describe('koa', () => {
  let si = null
  let app = null
  let server = null

  beforeEach((done) => {
    si = Seneca({log: 'silent'})
    app = new Koa()
    server = app.listen(3000)
    done()
  })

  afterEach((done) => {
    server.close(done)
  })

  it('by default routes autoreply', (done) => {
    var config = {
      routes: {
        pin: 'role:test,cmd:*',
        map: {
          ping: true
        }
      }
    }

    si.use(Web, {adapter: Adapter, context: Router()})

    si.act('role:web', config, (err, reply) => {
      if (err) return done(err)

      si.add('role:test,cmd:ping', (msg, reply) => {
        reply(null, {res: 'pong!'})
      })

      app.use(si.export('web/context')().routes())

      Request('http://127.0.0.1:3000/ping', (err, res, body) => {
        if (err) return done(err)

        body = JSON.parse(body)

        expect(body).to.be.equal({res: 'pong!'})
        done()
      })
    })
  })

  it('redirects properly', (done) => {
    var config = {
      routes: {
        pin: 'role:test,cmd:*',
        map: {
          redirect: {redirect: '/', POST: true}
        }
      }
    }

    si.use(Web, {adapter: Adapter, context: Router()})

    si.add('role:test,cmd:redirect', (msg, reply) => {
      reply(null, msg.args.body)
    })

    si.act('role:web', config, (err, reply) => {
      if (err) return done(err)

      app.use(si.export('web/context')().routes())

      Request.post('http://127.0.0.1:3000/redirect', {json: {foo: 'bar'}}, (err, res, body) => {
        if (err) return done(err)
        expect(res.headers.location).to.be.equal('/')
        done()
      })
    })
  })

  it('querystring', (done) => {
    var config = {
      routes: {
        pin: 'role:test,cmd:*',
        map: {
          echo: {GET: true}
        }
      }
    }

    si.use(Web, {adapter: Adapter, context: Router()})

    si.add('role:test,cmd:echo', (msg, reply) => {
      reply(null, msg.args.query)
    })

    si.act('role:web', config, (err, reply) => {
      if (err) return done(err)

      app.use(si.export('web/context')().routes())

      Request.get('http://127.0.0.1:3000/echo?foo=bar', {
        json: true
      }, (err, res, body) => {
        if (err) return done(err)
        expect(body).to.be.equal({foo: 'bar'})
        done()
      })
    })
  })

  it('post requests', (done) => {
    var config = {
      routes: {
        pin: 'role:test,cmd:*',
        map: {
          echo: {POST: true}
        }
      }
    }

    si.use(Web, {adapter: Adapter, context: Router()})

    si.add('role:test,cmd:echo', (msg, reply) => {
      reply(null, msg.args.body)
    })

    si.act('role:web', config, (err, reply) => {
      if (err) return done(err)

      app.use(si.export('web/context')().routes())

      Request.post('http://127.0.0.1:3000/echo', {json: {foo: 'bar'}}, (err, res, body) => {
        if (err) return done(err)

        expect(body).to.be.equal({foo: 'bar'})
        done()
      })
    })
  })

  it('post requests - no body parser', (done) => {
    var config = {
      routes: {
        pin: 'role:test,cmd:*',
        map: {
          echo: {POST: true}
        }
      },
      options: {
        parseBody: false
      }
    }

    si.use(Web, {adapter: Adapter, context: Router()})

    si.add('role:test,cmd:echo', (msg, reply) => {
      reply(null, msg.args.body)
    })

    si.act('role:web', config, (err, reply) => {
      if (err) return done(err)

      app.use(BodyParser())
      app.use(si.export('web/context')().routes())

      Request.post('http://127.0.0.1:3000/echo', {json: {foo: 'bar'}}, (err, res, body) => {
        if (err) return done(err)

        expect(body).to.be.equal({foo: 'bar'})
        done()
      })
    })
  })

  it('put requests', (done) => {
    var config = {
      routes: {
        pin: 'role:test,cmd:*',
        map: {
          echo: {PUT: true}
        }
      }
    }

    si.use(Web, {adapter: Adapter, context: Router()})

    si.add('role:test,cmd:echo', (msg, reply) => {
      reply(null, msg.args.body)
    })

    si.act('role:web', config, (err, reply) => {
      if (err) return done(err)

      app.use(si.export('web/context')().routes())

      Request.put('http://127.0.0.1:3000/echo', {json: {foo: 'bar'}}, (err, res, body) => {
        if (err) return done(err)
        expect(body).to.be.equal({foo: 'bar'})
        done()
      })
    })
  })

  it('put requests - no body parser', (done) => {
    var config = {
      routes: {
        pin: 'role:test,cmd:*',
        map: {
          echo: {PUT: true}
        }
      },
      options: {
        parseBody: false
      }
    }

    si.use(Web, {adapter: Adapter, context: Router()})

    si.add('role:test,cmd:echo', (msg, reply) => {
      reply(null, msg.args.body)
    })

    si.act('role:web', config, (err, reply) => {
      if (err) return done(err)

      app.use(BodyParser())
      app.use(si.export('web/context')().routes())

      Request.put('http://127.0.0.1:3000/echo', {json: {foo: 'bar'}}, (err, res, body) => {
        if (err) return done(err)
        expect(body).to.be.equal({foo: 'bar'})
        done()
      })
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
      }
      catch (err) {
        ctx.status = 400
        ctx.body = err.orig.message.replace('gate-executor: ', '')
      }
    })

    si.use(Web, {adapter: Adapter, context: Router()})

    si.add('role:test,cmd:error', (msg, reply) => {
      reply(new Error('aw snap!'))
    })

    si.act('role:web', config, (err, reply) => {
      if (err) return done(err)

      app.use(si.export('web/context')().routes())

      Request.get('http://127.0.0.1:3000/error', (err, res, body) => {
        if (err) return done(err)

        expect(res.statusCode).to.equal(400)
        expect(body).to.be.equal('aw snap!')
        done()
      })
    })
  })
})

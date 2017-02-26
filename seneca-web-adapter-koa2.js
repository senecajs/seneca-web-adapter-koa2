'use strict'

const _ = require('lodash')
const Parse = require('co-body')

module.exports = function koa (options, context, auth, routes, done) {
  const seneca = this

  if (!context) {
    return done(new Error('no context provided'))
  }

  _.each(routes, route => {
    _.each(route.methods, method => {
      context[method.toLowerCase()](route.path, async (ctx, next) => {
        let body = {}

        if (['POST', 'PUT'].indexOf(ctx.req.method) > -1) {
          body = await Parse(ctx)
        }

        const query = Object.assign({}, ctx.request.query)

        const payload = {
          request$: ctx.request,
          response$: ctx.response,
          args: {body, query}
        }

        ctx.response.type = 'json'

        await new Promise((resolve, reject) => {
          seneca.act(route.pattern, payload, (err, res) => {
            if (err) {
              return reject(err)
            }

            ctx.status = 200

            if (route.redirect) {
              ctx.redirect(route.redirect)
            }

            if (route.autoreply) {
              ctx.body = res
            }
            return resolve()
          })
        })
      })
    })
  })

  done(null, {routes})
}

'use strict'

const Parse = require('co-body')

module.exports = function koa(
  { middleware: definedMiddleware, parseBody },
  context,
  auth,
  routes,
  done
) {
  // seneca-web (2.2.2) calls the adapter from inside an action (init:web
  // when the routes come from the plugin options), so `this` can be a
  // delegate with fixed arguments, in particular fatal$:true during plugin
  // initialization. Messages sent from it would inherit them and turn
  // every action error into a fatal error that closes the process.
  // Requests are therefore sent from the root instance, whichever
  // instance seneca-web passes, and each one is its own transaction.
  const seneca = this.root || this

  if (!context) {
    return done(new Error('no context provided'))
  }

  routes.forEach(
    ({ autoreply, redirect, pattern, methods, path, middleware }) => {
      const routeMiddleware = (middleware || []).map(_m =>
        typeof _m === 'string' ? definedMiddleware[_m] : _m
      )
      methods.forEach(method =>
        context[method.toLowerCase()](path, ...routeMiddleware, async ctx => {
          let body = {}

          if (['POST', 'PUT'].indexOf(ctx.req.method) > -1) {
            body = parseBody === false ? ctx.request.body : await Parse(ctx)
          }

          const res = await new Promise((resolve, reject) =>
            seneca.act(
              pattern,
              {
                request$: ctx.request,
                response$: ctx.response,
                args: {
                  body,
                  query: { ...ctx.request.query },
                  params: { ...ctx.params },
                  state: { ...ctx.state }
                }
              },
              (err, res) => (err ? reject(err) : resolve(res))
            )
          )

          ctx.response.type = 'json'
          ctx.status = 200

          if (redirect) {
            ctx.redirect(redirect)
          }

          if (autoreply) {
            ctx.body = res
          }
        })
      )
    }
  )

  done(null, { routes })
}

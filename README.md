![Seneca](http://senecajs.org/files/assets/seneca-logo.png)
> A [Seneca.js][] plugin

# @seneca/web-adapter-koa2

[![npm version][npm-badge]][npm-url]
[![build][build-badge]][build-url]

| ![Voxgig](https://www.voxgig.com/res/img/vgt01r.png) | This open source module is sponsored and supported by [Voxgig](https://www.voxgig.com). |
|---|---|

The [Koa](https://koajs.com) adapter for [seneca-web](https://github.com/senecajs/seneca-web).
seneca-web turns a route map into a list of routes; this adapter registers
each route on a Koa router and, for every request, sends a Seneca message
with the request body, query, path parameters and Koa state, then writes
the action's reply as the JSON response. It works with Seneca 3 and with
the Seneca 4 prerelease (4.0.0-rc5 or later) and Koa 2, and is tested on
Node.js 22 and 24.

The documentation lives in [docs/](docs/README.md): a
[tutorial](docs/tutorials/getting-started.md), [how-to guides](docs/README.md#how-to-guides),
the [reference](docs/README.md#reference) and [explanations](docs/README.md#explanation).

## Install

```sh
npm install seneca seneca-web @seneca/web-adapter-koa2 koa @koa/router
```

Versions up to 1.2.1 were published as `seneca-web-adapter-koa2`; from
the next version (1.3.0) the package is `@seneca/web-adapter-koa2`.
Until 1.3.0 is on npm, install `seneca-web-adapter-koa2` for the
released version.

`npm install seneca` installs the current Seneca 3 release; for the
Seneca 4 prerelease, install `seneca@^4.0.0-rc5`.

`seneca`, `seneca-web` and `koa` are peer dependencies. Any router with
Koa style `router.get(path, ...middleware)` methods works as the
context; `@koa/router` (also published under its old name `koa-router`)
is the usual choice.

## Quick Example

```js
const Seneca = require('seneca')
const SenecaWeb = require('seneca-web')
const Koa = require('koa')
const Router = require('@koa/router')
const Adapter = require('@seneca/web-adapter-koa2')

const seneca = Seneca({ log: 'warn' })

seneca.add('role:todo,cmd:list', function (msg, reply) {
  reply({ todos: [] })
})

seneca.add('role:todo,cmd:add', function (msg, reply) {
  reply({ added: msg.args.body.text })
})

const router = new Router()

seneca.use(SenecaWeb, {
  adapter: Adapter,
  context: router,
  routes: {
    pin: 'role:todo,cmd:*',
    prefix: '/todo',
    map: {
      list: { GET: true },
      add: { POST: true }
    }
  }
})

seneca.ready(function (err) {
  if (err) {
    console.error(err)
    return seneca.close()
  }
  const app = new Koa()
  app.use(router.routes())
  app.listen(3000)
})
```

`GET /todo/list` now sends `role:todo,cmd:list` and answers with
`{"todos":[]}`; `POST /todo/add` with a JSON body `{"text":"x"}` sends
`role:todo,cmd:add` with `msg.args.body.text` set to `"x"`.

## More Examples

* [Getting started](docs/tutorials/getting-started.md): a complete,
  runnable program with its output.
* [Parse request bodies](docs/how-to/parse-request-bodies.md): the
  built in co-body parsing, your own parser, size limits, PATCH bodies.
* [Add middleware per route](docs/how-to/add-route-middleware.md): named
  and inline Koa middleware, before and after the action.
* [Pass Koa state to actions](docs/how-to/pass-koa-state-to-actions.md):
  authentication results and other per request data.
* [Handle errors and status codes](docs/how-to/handle-errors-and-status-codes.md):
  error middleware for Seneca 3 and 4, status codes, headers.
* [Migrate from Seneca 3](docs/how-to/migrate-from-seneca-3.md).

The programs are in [docs/examples](docs/examples/README.md).

## Motivation

seneca-web keeps the HTTP mapping out of your actions: actions receive
plain messages and reply with plain objects, and a route map says which
URL leads to which pattern. Each web framework needs a small adapter
that knows how to register routes and read requests; this is the one for
Koa. See [How the adapter works](docs/explanation/how-the-adapter-works.md).

## Support

* Post a [GitHub issue][github issue] for bugs and questions about this
  adapter.
* The route map and the `role:web` messages are documented by
  [seneca-web](https://github.com/senecajs/seneca-web); Seneca itself at
  [senecajs.org](https://senecajs.org).
* Commercial support is available from [Voxgig](https://www.voxgig.com).

## API

The module exports one function, the adapter, which seneca-web calls;
you pass it as the `adapter` option of seneca-web and configure
everything else through seneca-web's options and route map.

| Reference | Describes |
| --------- | --------- |
| [Adapter](docs/reference/adapter.md) | The adapter function, how routes are registered, the reply of `role:web`, failure modes. |
| [Options](docs/reference/options.md) | `context`, `adapter`, `routes`, `middleware`, `options.parseBody`, `auth`, and every route map property. |
| [Message](docs/reference/message.md) | The message an action receives: `args.body`, `args.query`, `args.params`, `args.state`, `request$`, `response$`. |
| [Response](docs/reference/response.md) | Status code, content type, `autoreply`, `redirect`, what happens on an error. |

| Option (seneca-web) | Default | Used by the adapter for |
| ------------------- | ------- | ----------------------- |
| `context` | none (required) | The Koa router to register routes on. |
| `middleware` | none | Named middleware that routes refer to by name. |
| `options.parseBody` | `true` | Parse POST and PUT bodies with co-body, or read `ctx.request.body`. |
| `auth` | none | Not used by this adapter. |

## Contributing

The [Senecajs org][] encourages open participation. If you feel you can
help in any way, be it with documentation, examples, extra testing, or
new features please get in touch.

To run the tests you need Node.js 22 or 24:

```sh
npm install
npm test
```

The tests run against the Seneca 4 prerelease (the `seneca`
development dependency). To run them against another Seneca version:

```sh
npm install --no-save seneca@3
npm test
npm install
```

`npm run lint` runs ESLint, `npm run prettier` formats the code and
`npm run coverage` writes an HTML coverage report to `coverage/`.

The CI workflow for GitHub Actions is kept as a patch in
[.patches](.patches/README.md); apply it with `git am .patches/*.patch`.

## Background

Written by Tyler Waters in 2016 as one of the seneca-web adapter
family, next to the adapters for Express, Hapi and Koa 1. Versions up to
1.2.1 were published as `seneca-web-adapter-koa2`; from the next version
(1.3.0) the package is `@seneca/web-adapter-koa2`. Version 1.3.0 adds
support for the Seneca 4 prerelease, stops action errors from being
fatal when routes come from the plugin options, drops the Babel build,
and reorganizes the documentation.

| | Supported | Tested with |
| --- | --------- | ----------- |
| Seneca | 3.x, 4.0.0-rc5 and later | 3.38.0, 4.0.0-rc5, 4.0.0 (master) |
| seneca-web | 1.x, 2.x | 2.2.2, and 2.3.0 from its development branch |
| Koa | 2.x | 2.16.4 |
| Router | any Koa style router | @koa/router 15 |
| Node.js | 22 or later | 22.22.0, 24.21.0 |

Licensed under the [MIT license](LICENSE). See the [change log](CHANGES.md).

[Seneca.js]: https://www.npmjs.com/package/seneca
[npm-badge]: https://badge.fury.io/js/seneca-web-adapter-koa2.svg
[npm-url]: https://badge.fury.io/js/seneca-web-adapter-koa2
[build-badge]: https://github.com/senecajs/seneca-web-adapter-koa2/actions/workflows/build.yml/badge.svg
[build-url]: https://github.com/senecajs/seneca-web-adapter-koa2/actions/workflows/build.yml
[Senecajs org]: https://github.com/senecajs/
[github issue]: https://github.com/senecajs/seneca-web-adapter-koa2/issues

# Migrate from Seneca 3

How to move an application that uses seneca-web and this adapter from
Seneca 3 to Seneca 4. The adapter's API is the same; the changes are in
the package names and in your application code. For Seneca itself, see
the Seneca 4 change log and its own migration guide.

## 1. Update the dependencies

Seneca 4 requires Node.js 24 or later. Then:

```sh
npm uninstall seneca-web seneca-web-adapter-koa2
npm install seneca@^4 @seneca/web @seneca/web-adapter-koa2
```

Version 2.0.0 of the adapter declares the peer dependencies
`seneca: "^4.0.0"` and `@seneca/web: "^3.0.0"`. Both packages have new
names: versions of the adapter up to 1.2.1 were published as
`seneca-web-adapter-koa2`, and versions of the plugin up to 2.2.2 as
`seneca-web`. Require the new names:

```js
const SenecaWeb = require('@seneca/web')
const Adapter = require('@seneca/web-adapter-koa2')
```

Seneca 3 users stay on `seneca-web-adapter-koa2@1` and `seneca-web@2`.

## 2. Update error handling

Seneca 4 no longer wraps action errors: the error that reaches your Koa
error middleware is the object the action replied with or threw. Code
that read `err.orig.message` or `err.details.message` breaks, because
`err.orig` does not exist. Read the error itself:

| Seneca 3 code | Seneca 4 code |
| --- | --- |
| `err.orig.message` | `err.message` |
| `err.details.message` | `err.message` |
| `err.orig.code` | `err.code` |
| `'act_execute' === err.code` | not needed; test `err.code` or `err.message` directly |

```js
app.use(async (ctx, next) => {
  try {
    await next()
  } catch (err) {
    ctx.status = STATUS[err.code] || 500
    ctx.body = { error: err.message }
  }
})
```

Errors raised by Seneca itself (`act_not_found`, `result_not_objarr`,
`action_timeout`) were not wrapped by Seneca 3 either and carry the same
`code`. See
[Handle errors and status codes](handle-errors-and-status-codes.md).

## 3. Use the built in promises

Seneca 4 has promises built in: `await seneca.ready()`, `seneca.post`,
`seneca.message` and `await seneca.close()` work without
seneca-promisify. Remove `seneca-promisify` and its `use` call. The
examples in this documentation use `await seneca.ready()`.

## 4. Check the rest of the application

These Seneca 4 changes are not about the adapter, but applications that
use it commonly meet them:

* Network transports are not built in. Install `@seneca/transport` and
  load it with `seneca.use('@seneca/transport')` wherever
  `seneca.listen` or `seneca.client` is used.
* The `legacy` option accepts `true`, `false` or the booleans `error`,
  `meta` and `builtin_actions`. The Seneca 3 flags that Seneca 4
  removed, such as `legacy.transport`, are ignored with a
  `SENECA_DEP_LEGACY_FLAG` warning; any other flag is rejected at
  startup.
* Plugin options come from `use()` and `options.plugin.<name>` only; a
  top level option such as `web` is rejected.
* Plugin definition functions take one argument, `options`, and use
  `this`.
* Plugin `defaults` are validated with the `valid` builders that Seneca
  provides; Gubu and Joi schemas are not understood.
* `seneca.close()` runs `sys:seneca,cmd:close`. Register close hooks
  with `this.destroy(fn)` in a plugin.
* Seneca 4 does not depend on `optioner`, `@hapi/joi`, `norma`,
  `eraro@2` or `lodash`; add them explicitly if your code requires them.

## 5. Run your tests

The adapter's own tests run on Seneca 4.0.0 with `@seneca/web` 3.0.0:

```sh
npm test
```

Run your application's tests on Seneca 4 in the same way.

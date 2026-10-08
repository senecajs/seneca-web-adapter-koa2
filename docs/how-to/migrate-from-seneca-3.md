# Migrate from Seneca 3

How to move an application that uses seneca-web and this adapter from
Seneca 3 to the Seneca 4 prerelease. The adapter's API is the same on
both; the changes are in your application code. For Seneca itself, see
the Seneca 4 change log and its own migration guide.

## 1. Update the dependencies

Seneca 4 requires Node.js 22 or later. Then:

```sh
npm install seneca@^4.0.0-rc5 seneca-web@^2.2.2 @seneca/web-adapter-koa2@^1.3.0
```

Version 1.3.0 of the adapter declares a peer dependency on
`seneca >=3 || >=4.0.0-rc5`, so npm accepts the prerelease. seneca-web
2.2.2 has no peer dependency on Seneca and works unchanged.

## 2. Update error handling

Seneca 4 no longer wraps action errors: the error that reaches your Koa
error middleware is the object the action replied with or threw. Code
that read `err.orig.message` or `err.details.message` breaks, because
`err.orig` does not exist. Read the error itself, or `err.orig || err`
while both versions must be supported:

```js
app.use(async (ctx, next) => {
  try {
    await next()
  } catch (err) {
    const cause = err.orig || err
    ctx.status = STATUS[cause.code] || 500
    ctx.body = { error: cause.message }
  }
})
```

Errors raised by Seneca itself (`act_not_found`, `result_not_objarr`,
`action_timeout`) are not wrapped on either version and carry the same
`code`. See
[Handle errors and status codes](handle-errors-and-status-codes.md).

## 3. Use the callback form of `ready` where it matters

Seneca 4 has promises built in: `await seneca.ready()`, `seneca.post`,
`seneca.message` and `await seneca.close()` work without
seneca-promisify. In 4.0.0-rc5, however, `await seneca.ready()` never
resolves when the instance is already idle (fixed in 4.0.0). Code that
must run on rc5 should use the callback form:

```js
await new Promise((resolve, reject) =>
  seneca.ready(err => (err ? reject(err) : resolve()))
)
```

The examples in this documentation do that, which also keeps them
working on Seneca 3.

## 4. Check the rest of the application

These Seneca 4 changes are not about the adapter, but applications that
use it commonly meet them:

* Network transports are not built in. Load `seneca-transport` wherever
  `seneca.listen` or `seneca.client` is used.
* The `legacy` option only accepts `true`, `false` or the booleans
  `error`, `meta` and `builtin_actions`; other `legacy.*` flags are
  rejected.
* Plugin options come from `use()` and `options.plugin.<name>` only; top
  level `options.<pluginname>` is no longer merged.
* Plugin definition functions take one argument, `options`, and use
  `this`.
* Plugin `defaults` are validated as Gubu shapes; Joi schemas are not
  understood.
* `seneca.close()` runs `sys:seneca,cmd:close`; in 4.0.0-rc5 hooks on
  the Seneca 3 pattern `role:seneca,cmd:close` are not called (4.0.0
  calls them again).
* Seneca 4 does not depend on `optioner`, `@hapi/joi`, `norma`,
  `eraro@2` or `lodash`; add them explicitly if your code requires them.

## 5. Run your tests on both

The adapter's own tests run on Seneca 4 by default and also pass on
Seneca 3.38:

```sh
npm test
npm install --no-save seneca@3
npm test
npm install
```

Do the same for your application while it has to support both.

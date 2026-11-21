# Changes

## 2.0.0 2026-11-21

First release under the name `@seneca/web-adapter-koa2`. Versions up to
1.2.1 were published as `seneca-web-adapter-koa2`. Version 1.3.0 was
prepared but never published; its changes are part of this release.

- Seneca 4: the peer dependency is `seneca` `^4.0.0`. Seneca 3 users
  stay on `seneca-web-adapter-koa2@1`.
- Renamed from `seneca-web-adapter-koa2` to `@seneca/web-adapter-koa2`.
- The peer dependency on the plugin is `@seneca/web` `^3.0.0`, the new
  name of `seneca-web` (it replaces `seneca-web` `^1.0.0 || ^2.0.0`).
  The `koa` peer stays `^2.0.0`.
- Node.js 24 or later (`engines.node` `>=24`).
- Behaviour change: request messages are sent from the root Seneca
  instance. Routes configured through the plugin options were mapped by
  `init:web` from the plugin instance, whose messages carry
  `fatal$:true`, so an action error closed the Seneca instance and
  exited the process. Each request is now its own transaction. Fixed
  arguments of the instance that mapped the routes (the delegate's
  fixed message, `fixedmsg`, such as `fatal$` or `plugin$`) are no
  longer added to request messages.
- The Babel build is gone: `main` points at the source file and `lib/`
  is no longer published. The npm package now includes `docs/`.
- Tests: mocha 11 without transpiling, `fetch` instead of `request`,
  servers on an ephemeral port, every Seneca instance closed; new tests
  for Koa state, `request$`/`response$`, error propagation and the
  fatal case. The tests read the action's error directly
  (`err.message`), without the Seneca 3 `err.orig` fallback. Tested
  with Seneca 4.0.0 and `@seneca/web` 3.0.0 on Node.js 26.
- Tooling: ESLint 10 (flat config), Prettier 3, nyc 17 (`npm run coverage`
  writes to `coverage/`); removed Babel, coveralls, pre-commit, rimraf and
  `.travis.yml`. The GitHub Actions workflow is provided as a patch in
  `.patches/`. The `koa-router` dev dependency is replaced by `@koa/router`.
- Documentation reorganized (Diátaxis) in `docs/`: a tutorial, how-to
  guides, reference pages and explanations, with runnable programs in
  `docs/examples/`. The duplicate `README.MD` is removed. The documents
  describe Seneca 4 only, use the new package names, and the examples
  use `await seneca.ready()`.
- `package.json`: `repository.url` in the `git+https` form,
  `publishConfig.access` `public`; `package-lock.json` is no longer
  committed.

## 1.2.0 2019-11-02

- Update dependencies (remove lodash)
- Pass state with seneca action (thanks @zsirfs)

## 1.1.0 2017-12-03

- Adds support for middleware (#19)
- Adds payload to seneca payload (#18)
- Respect parseBody option from seneca-web (#15)

## 1.0.5 2017-02-25

- Querystring now parsed properly as JSON.

## 1.0.4 2017-02-25

- Body parser now runs on PUT requests

## 1.0.3 2017-02-21

- Fixed the npm package, transpiling into ./lib and updating main/files in package.json

## 1.0.1 2016-10-02

- Update peerDependency to work with seneca-web@2.x (thanks @gknedo)

## 1.0.0 2016-09-25

- It's alive!

## 1.3.0 2026-10-08

- Support the Seneca 4 prerelease (4.0.0-rc5 and later) next to Seneca 3.
  The `seneca` peer dependency is `>=3 || >=4.0.0-rc5`; the tests run on
  seneca 4.0.0-rc5, a build of 4.0.0 from master, and 3.38.0.
- Request messages are sent from the root Seneca instance. Routes
  configured through the plugin options were mapped by `init:web` from
  the plugin instance, whose messages carry `fatal$:true`, so an action
  error closed the Seneca instance and exited the process (on Seneca 3
  and 4). Each request is now its own transaction. Behaviour change:
  fixed arguments of the instance that mapped the routes (delegate
  `fixedargs`, such as `fatal$` or `plugin$`) are no longer added to
  request messages.
- Tested on Node.js 22 and 24. The Babel build is gone: `main` points at
  the source file and `lib/` is no longer published. The npm package
  now includes `docs/`.
- The package is published as `@seneca/web-adapter-koa2` from this
  version; versions up to 1.2.1 were published as
  `seneca-web-adapter-koa2`.
- Tests: mocha 11 without transpiling, `fetch` instead of `request`,
  servers on an ephemeral port, every Seneca instance closed; new tests
  for Koa state, `request$`/`response$`, error propagation and the
  fatal case.
- Tooling: ESLint 10 (flat config), Prettier 3, nyc 17 (`npm run coverage`
  writes to `coverage/`); removed Babel, coveralls, pre-commit, rimraf and
  `.travis.yml`. The GitHub Actions workflow is provided as a patch in
  `.patches/`. The `koa-router` dev dependency is replaced by `@koa/router`.
- Documentation reorganized (Diátaxis) in `docs/`: a tutorial, how-to
  guides, reference pages and explanations, with runnable programs in
  `docs/examples/`. The duplicate `README.MD` is removed.

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

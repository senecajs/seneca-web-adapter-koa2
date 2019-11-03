![Seneca][logo]

# seneca-web-adapter-koa2

[![npm version][npm-badge]][npm-url]
[![Build Status][travis-badge]][travis-url]
[![Coverage Status][coveralls-badge]][coveralls-url]
[![Dependency Status][david-badge]][david-url]

- **Node:** 6.x, 8.x
- **Seneca:** 1.x - 3.x

This is an adapter for [seneca-web](https://github.com/senecajs/seneca-web/) using koa/koa-routes.

## Installation

Peer dependencies have been specified for `koa`, `koa-router` and `seneca-web`
They need to be present for this to work at all.

```
npm install --save koa@2
npm install --save koa-router@7
npm install --save seneca
npm install --save seneca-web
npm install --save seneca-web-adapter-koa2
```

## Usage

Please refer to the seneca-web documentation on how to load routes.

You can require this module as the adapter when using the SenecaWeb plugin

```js
const Seneca = require('seneca')
const SenecaWeb = require('seneca-web')
const Koa = require('koa')
const Router = require('koa-router')
const app = Koa()
const seneca = Seneca()
seneca.use(SenecaWeb, {
  context: Router(),
  adapter: require('seneca-web-adapter-koa2')
})
seneca.ready(() => {
  app.use(
    seneca
      .export('web/context')()
      .routes()
  )
})
```

### Note

Most of the seneca-web documents refer to passing the application as the `context` parameter.
Doing this with koa will result in unexpected explosions. Koa Router must be used.

## Contributing

The [Senecajs org][] encourage open participation. If you feel you can help in any way,
be it with documentation, examples, extra testing, or new features please get in touch.

## License

Copyright (c) 2016-2017, Tyler Waters.
Licensed under [MIT][].

[logo]: http://senecajs.org/files/assets/seneca-logo.png
[npm-badge]: https://badge.fury.io/js/seneca-web-adapter-koa2.svg
[npm-url]: https://badge.fury.io/js/seneca-web-adapter-koa2
[travis-badge]: https://travis-ci.org/senecajs/seneca-web-adapter-koa2.svg?branch=master
[travis-url]: https://travis-ci.org/senecajs/seneca-web-adapter-koa2
[coveralls-badge]: https://coveralls.io/repos/github/senecajs/seneca-web-adapter-koa2/badge.svg?branch=master
[coveralls-url]: https://coveralls.io/github/senecajs/seneca-web-adapter-koa2?branch=master
[david-badge]: https://david-dm.org/senecajs/seneca-web-adapter-koa2.svg
[david-url]: https://david-dm.org/senecajs/seneca-web-adapter-koa2
[senecajs org]: https://github.com/senecajs/
[mit]: ./LICENSE

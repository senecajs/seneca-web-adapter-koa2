![Seneca](http://senecajs.org/files/assets/seneca-logo.png)
> A [Seneca.js][] plugin

# @seneca/web-adapter-koa2

| ![Voxgig](https://www.voxgig.com/res/img/vgt01r.png) | This open source module is sponsored and supported by [Voxgig](https://www.voxgig.com). |
|---|---|

## Install

```sh
npm install seneca-web-adapter-koa2
```

## Quick Example

```js
var SenecaWeb = require('seneca-web')
var Router = require('koa-router')
var context = new Router()
require('seneca')()
  .use(SenecaWeb, { context: context, adapter: require('seneca-web-adapter-koa2') })
```

## More Examples

See [test/](test/) for usage examples.

## Motivation

Koa2 adapter for [seneca-web](https://github.com/senecajs/seneca-web).

## Support

If you're using this module and need help, you can:

- Post a [github issue][]
- Tweet to [@senecajs][]

## API

Configured via [seneca-web](https://github.com/senecajs/seneca-web) options.

## Contributing

The [Senecajs org][] encourages open participation. If you feel you can help in any way, be it with documentation, examples, extra testing, or new features please get in touch.

### Running tests

```sh
npm run test
```

## Background

Part of the [seneca-web](https://github.com/senecajs/seneca-web) adapter family.

[![npm version][npm-badge]][npm-url]
[![Build Status][travis-badge]][travis-url]
[![Coverage Status][coveralls-badge]][coveralls-url]
[![Dependency Status][david-badge]][david-url]
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

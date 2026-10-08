# @seneca/web-adapter-koa2 documentation

The documentation follows the [Diátaxis](https://diataxis.fr/) structure:
four sections with four different jobs. Start with the tutorial if you
are new to seneca-web; use the how-to guides for specific tasks; look
things up in the reference; read the explanations to understand the
design.

This adapter is small: it registers routes on a Koa router and turns
requests into Seneca messages. The route map itself, and the `role:web`
messages that load it, belong to [seneca-web](https://github.com/senecajs/seneca-web).
Seneca itself is documented at [senecajs.org](https://senecajs.org).

## Tutorials

Learning oriented lessons that take you through building something,
step by step.

| Tutorial | What you build |
| -------- | -------------- |
| [Getting started](tutorials/getting-started.md) | A todo service: Seneca actions behind Koa routes, called over HTTP with `fetch`. |

The program from the tutorial, and the programs from the how-to guides,
are in [examples](examples/README.md).

## How-to guides

Task oriented recipes for people who already know the basics.

| Guide | Covers |
| ----- | ------ |
| [Parse request bodies](how-to/parse-request-bodies.md) | What co-body parses by default, parser errors, your own parser with `parseBody: false`, size limits, PATCH and DELETE bodies. |
| [Add middleware per route](how-to/add-route-middleware.md) | Named and inline Koa middleware, order, ending a request early, running code after the action. |
| [Pass Koa state to actions](how-to/pass-koa-state-to-actions.md) | `ctx.state` to `msg.args.state`, what is copied, passing data back to middleware. |
| [Handle errors and status codes](how-to/handle-errors-and-status-codes.md) | Error middleware that works on Seneca 3 and 4, mapping error codes to statuses, status codes and headers on success. |
| [Migrate from Seneca 3](how-to/migrate-from-seneca-3.md) | What to change in an application that uses this adapter when moving to Seneca 4. |

## Reference

Information oriented descriptions of every part of the adapter.

| Reference | Describes |
| --------- | --------- |
| [Adapter](reference/adapter.md) | The exported function: arguments, route registration, the request handler, the reply of `role:web`, failure modes. |
| [Options](reference/options.md) | The seneca-web options the adapter reads, every route map property, the seneca-web messages and exports. |
| [Message](reference/message.md) | The message an action receives: `args.body`, `args.query`, `args.params`, `args.state`, `request$`, `response$`. |
| [Response](reference/response.md) | How the HTTP response is produced: status, content type, `autoreply`, `redirect`, errors. |

## Explanation

Understanding oriented discussions of how the adapter works and why.

| Explanation | Topic |
| ----------- | ----- |
| [How the adapter works](explanation/how-the-adapter-works.md) | The seneca-web adapter model, the Koa specifics, design decisions and limits. |
| [Seneca 3 and Seneca 4](explanation/seneca-3-and-4.md) | What differs between the two Seneca versions for this adapter, and why requests are sent from the root instance. |

## Feature index

Every option, route property, message field, behaviour and error of the
adapter, with the page that documents it. The adapter adds no action
patterns, exports, error codes or command line flags of its own.

| Feature | Kind | Documented in |
| ------- | ---- | ------------- |
| `koa(options, context, auth, routes, done)` | exported adapter function | [Adapter](reference/adapter.md) |
| `context` | seneca-web option, required: the Koa router | [Options](reference/options.md#context) |
| `adapter` | seneca-web option: this module | [Options](reference/options.md#adapter) |
| `routes` | seneca-web option: the route map | [Options](reference/options.md#routes) |
| `middleware` | seneca-web option: named Koa middleware | [Options](reference/options.md#middleware), [Add middleware per route](how-to/add-route-middleware.md) |
| `options.parseBody` | seneca-web option, default `true` | [Options](reference/options.md#optionsparsebody), [Parse request bodies](how-to/parse-request-bodies.md) |
| `auth` | seneca-web option, not used by this adapter | [Options](reference/options.md#auth) |
| Route `pin` and map key, `name`, `alias`, `prefix`, `postfix`, `suffix` | route map properties that produce the pattern and the path | [Options](reference/options.md#route-map) |
| Route methods `GET`, `POST`, `PUT`, `HEAD`, `DELETE`, `OPTIONS`, `PATCH` | route map properties | [Options](reference/options.md#route-map), [Adapter](reference/adapter.md#route-registration) |
| Route `middleware` | route map property | [Options](reference/options.md#route-map), [Add middleware per route](how-to/add-route-middleware.md) |
| Route `autoreply` | route map property, default `true` | [Response](reference/response.md#autoreply) |
| Route `redirect` | route map property | [Response](reference/response.md#redirect) |
| Route `auth`, `secure` | route map properties, not used by this adapter | [Options](reference/options.md#route-map) |
| `msg.args.body` | message field: the parsed request body | [Message](reference/message.md#argsbody) |
| `msg.args.query` | message field: the query string | [Message](reference/message.md#argsquery) |
| `msg.args.params` | message field: path parameters | [Message](reference/message.md#argsparams) |
| `msg.args.state` | message field: a copy of `ctx.state` | [Message](reference/message.md#argsstate), [Pass Koa state to actions](how-to/pass-koa-state-to-actions.md) |
| `msg.request$`, `msg.response$` | message fields: the Koa request and response | [Message](reference/message.md#request-and-response) |
| Status 200 and `application/json` | response behaviour | [Response](reference/response.md#status-and-content-type) |
| Action errors handed to Koa | response behaviour | [Response](reference/response.md#errors), [Handle errors and status codes](how-to/handle-errors-and-status-codes.md) |
| Body parser errors: status 400, 413, 415 | behaviour | [Parse request bodies](how-to/parse-request-bodies.md#1-handle-parser-errors), [Response](reference/response.md#errors) |
| Request messages sent from the root instance, so action errors are not fatal | behaviour, since 1.3.0 | [Seneca 3 and Seneca 4](explanation/seneca-3-and-4.md#fatal-errors-and-the-root-instance), [Message](reference/message.md) |
| Reply of `role:web,routes:*`: `{ routes }` | adapter reply | [Adapter](reference/adapter.md#reply) |
| Error `no context provided` | error | [Adapter](reference/adapter.md#failure-modes) |
| Unknown middleware name, missing `middleware` option, Koa application as `context` | errors | [Adapter](reference/adapter.md#failure-modes) |
| Registration failure while the plugin initializes (fatal) | behaviour | [Adapter](reference/adapter.md#failure-modes) |
| seneca-web module level state shared by all instances | limit | [Options](reference/options.md#seneca-web-messages-and-exports) |
| `role:web,routes:*`, `role:web,set:server`, `init:web` | seneca-web action patterns (none are added by the adapter) | [Options](reference/options.md#seneca-web-messages-and-exports) |
| `web/context`, `web/mapRoutes`, `web/setServer` | seneca-web exports (none are added by the adapter) | [Options](reference/options.md#seneca-web-messages-and-exports) |

## Other documents

* [Change log](../CHANGES.md)
* [Code of conduct](../CODE_OF_CONDUCT.md)
* [License](../LICENSE)

const yo = require('yo-yo')
const fs = require('fs')
const path = require('path')
const mkdirp = require('mkdirp')

const config = require('../lib/config')
const router = require('../lib/router')
const metadata = require('../lib/metadata')
const pages = require('../lib/pages')
const sanitizePath = require('../lib/util').sanitizePath

const docType = '<!DOCTYPE html>\n'
const scriptTag = yo`<script src="/bundle.js"></script>`

module.exports = function buildPages (argv, cb) {
  const errors = []
  console.time('build pages')

  const routes = metadata.asArray.map(m => m.permalink).map(sanitizePath)
  Array.prototype.push.apply(routes, Object.keys(pages).map(sanitizePath))

  // Add trailing slash to missing routes and try again
  router.on('error', function (route, err) {
    if (route.length > 1 && !/\/$/.test(route)) {
      return router.transitionTo(route + '/')
    }
    console.error(router, err)
    errors.push(err)
    router.transitionTo(routes.shift())
  })

  // On transition, render the app with the page
  router.on('transition', function (route, page) {
    const filename = path.join(config.site_dir, route.replace(/\/$/, '/index.html'))
    mkdirp(path.dirname(filename))
    page.getElementsByTagName('body')[0].appendChild(scriptTag)
    fs.writeFile(filename, docType + page.toString(), function () {
      if (routes.length) {
        router.transitionTo(routes.shift())
      } else {
        console.timeEnd('build pages')
        if (cb) return cb(errors.length ? errors : null)
      }
    })
  })

  router.transitionTo(routes.shift())
}

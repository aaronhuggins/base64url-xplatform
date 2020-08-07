# Managed Service Daemon

A wrapper for spawning child processes as managed daemons in Node, with typescript definitions included.

## Usage

Install via [NPM](https://www.npmjs.com/package/managed-service-daemon) and require in your project.

```js
const gulp = require('gulp')
const shell = require('gulp-shell')
const { Service } = require('managed-service-daemon')
const workingDir = './.azurite'
const azuriteBlob = new Service({
  name: 'azuriteBlob',
  command: 'node',
  args: [path.normalize('./node_modules/azurite/dist/src/blob/main'), '-s', '-l', workingDir],
  startWait: 500,
  onStart: () => fs.mkdirSync(workingDir),
  onStop: () => fs.rmdirSync(workingDir, { recursive: true })
})

exports.mocha = async function mocha () {
  return shell.task(['mocha'], { ignoreErrors: true })()
}

exports.test = gulp.series(azuriteBlob.start, exports.mocha, azuriteBlob.stop)
```

# Base64Url Cross-Platform

A cross-platform implementation of base64 URL, with typescript definitions included.

## Usage

Install via [NPM](https://www.npmjs.com/package/base64url-xplatform) and require in your project. There is also an ESM export, for use with browser or Deno.

```js
const { Base64Url } = require('base64url-xplatform')
const header = { alg: 'RS256' }
const claimsSet = {
  iss: 'iss',
  sub: 'sub',
  aud: 'aud',
  exp: Math.floor(Date.now() / 1000) + 60 * 5
}
const encodedJWTHeader = Base64Url.encode(JSON.stringify(header))
const encodedJWTClaimsSet = Base64Url.encode(JSON.stringify(claimsSet))
const existingString = encodedJWTHeader + '.' + encodedJWTClaimsSet
```

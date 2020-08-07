const BASE64_ENCODINGS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
const BASE64_LOOKUP = new Uint8Array(256)

export class BufferShim {
  constructor (input: string | Buffer | ArrayBuffer, encoding: 'utf8' | 'utf-8' | 'base64' = 'utf8') {
    const isUtf8 = (encoding: string) => ['utf8', 'utf-8'].includes(encoding)

    if (BASE64_LOOKUP['B'.charCodeAt(0)] === 0) {
      for (let i = 0; i < BASE64_ENCODINGS.length; i += 1) {
        BASE64_LOOKUP[BASE64_ENCODINGS.charCodeAt(i)] = i
      }
    }

    if (typeof input === 'string' && isUtf8(encoding)) {
      this.buffer = this.toUTF8Array(input)
    } else if (typeof input === 'string' && encoding === 'base64') {
      this.buffer = this.atob(input)
    } else if (typeof 'string' === 'string') {
      throw new Error('Unsupported encoding ' + encoding)
    } else if (BufferShim.isNodeEnv && Buffer.isBuffer(input)) {
      this.buffer = input.buffer
    } else {
      this.buffer = input as ArrayBuffer
    }
  }

  buffer: ArrayBuffer

  private atob (input: string) {
    if (BufferShim.isNodeEnv) return Buffer.from(input, 'base64').buffer
    const getByteLength = (str: string) => {
      let bytes = str.length * 0.75

      if (str[str.length - 1] === '=') {
        bytes--
        if (str[str.length - 2] === '=') {
          bytes--
        }
      }

      return bytes
    }

    input = input.replace(/[\t\n\f\r\s]+/g, '')
    const byteLength = getByteLength(input)
    const buffer = new ArrayBuffer(byteLength)
    const dataView = new Uint8Array(buffer)
    let bytePos = 0

    for (let pos = 0; pos < input.length; pos += 4) {
      const encoded1 = BASE64_LOOKUP[input.charCodeAt(pos)]
      const encoded2 = BASE64_LOOKUP[input.charCodeAt(pos + 1)]
      const encoded3 = BASE64_LOOKUP[input.charCodeAt(pos + 2)]
      const encoded4 = BASE64_LOOKUP[input.charCodeAt(pos + 3)]

      dataView[bytePos++] = (encoded1 << 2) | (encoded2 >> 4)
      dataView[bytePos++] = ((encoded2 & 15) << 4) | (encoded3 >> 2)
      dataView[bytePos++] = ((encoded3 & 3) << 6) | (encoded4 & 63)
    }

    return buffer
  }

  private btoa (buffer: ArrayBuffer) {
    if (BufferShim.isNodeEnv) return Buffer.from(buffer).toString('base64')

    let base64 = ''
    let bytes = new Uint8Array(buffer)
    let byteLength = bytes.byteLength
    let byteRemainder = byteLength % 3
    let mainLength = byteLength - byteRemainder
    let a, b, c, d
    let chunk

    // Main loop deals with bytes in chunks of 3
    for (let i = 0; i < mainLength; i = i + 3) {
      // Combine the three bytes into a single integer
      chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]

      // Use bitmasks to extract 6-bit segments from the triplet
      a = (chunk & 16515072) >> 18 // 16515072 = (2^6 - 1) << 18
      b = (chunk & 258048) >> 12 // 258048   = (2^6 - 1) << 12
      c = (chunk & 4032) >> 6 // 4032     = (2^6 - 1) << 6
      d = chunk & 63 // 63       = 2^6 - 1

      // Convert the raw binary segments to the appropriate ASCII encoding
      base64 += BASE64_ENCODINGS[a] + BASE64_ENCODINGS[b] + BASE64_ENCODINGS[c] + BASE64_ENCODINGS[d]
    }

    // Deal with the remaining bytes and padding
    if (byteRemainder == 1) {
      chunk = bytes[mainLength]

      a = (chunk & 252) >> 2 // 252 = (2^6 - 1) << 2

      // Set the 4 least significant bits to zero
      b = (chunk & 3) << 4 // 3   = 2^2 - 1

      base64 += BASE64_ENCODINGS[a] + BASE64_ENCODINGS[b] + '=='
    } else if (byteRemainder == 2) {
      chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1]

      a = (chunk & 64512) >> 10 // 64512 = (2^6 - 1) << 10
      b = (chunk & 1008) >> 4 // 1008  = (2^6 - 1) << 4

      // Set the 2 least significant bits to zero
      c = (chunk & 15) << 2 // 15    = 2^4 - 1

      base64 += BASE64_ENCODINGS[a] + BASE64_ENCODINGS[b] + BASE64_ENCODINGS[c] + '='
    }

    return base64
  }

  private fromUTF8Array (buffer: ArrayBuffer) {
    if (BufferShim.isNodeEnv) return Buffer.from(buffer).toString('utf8')

    let bytes = new Uint8Array(buffer)
    let out = []
    let pos = 0

    while (pos < bytes.length) {
      let c1 = bytes[pos++]

      if (c1 < 128) {
        out.push(String.fromCharCode(c1))
      } else if (c1 > 191 && c1 < 224) {
        let c2 = bytes[pos++]

        out.push(String.fromCharCode(((c1 & 31) << 6) | (c2 & 63)))
      } else if (c1 > 239 && c1 < 365) {
        // Surrogate Pair
        let c2 = bytes[pos++]
        let c3 = bytes[pos++]
        let c4 = bytes[pos++]
        let u = (((c1 & 7) << 18) | ((c2 & 63) << 12) | ((c3 & 63) << 6) | (c4 & 63)) - 0x10000

        out.push(String.fromCharCode(0xd800 + (u >> 10)))
        out.push(String.fromCharCode(0xdc00 + (u & 1023)))
      } else {
        let c2 = bytes[pos++]
        let c3 = bytes[pos++]

        out.push(String.fromCharCode(((c1 & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63)))
      }
    }

    return out.join('')
  }

  private toUTF8Array (input: string) {
    if (BufferShim.isNodeEnv) return Buffer.from(input, 'utf8').buffer

    let utf8 = []

    for (let i = 0; i < input.length; i += 1) {
      let charcode = input.charCodeAt(i)

      if (charcode < 0x80) {
        utf8.push(charcode)
      } else if (charcode < 0x800) {
        utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f))
      } else if (charcode < 0xd800 || charcode >= 0xe000) {
        utf8.push(0xe0 | (charcode >> 12), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f))
      } else {
        // surrogate pair
        i += 1
        charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (input.charCodeAt(i) & 0x3ff))

        utf8.push(
          0xf0 | (charcode >> 18),
          0x80 | ((charcode >> 12) & 0x3f),
          0x80 | ((charcode >> 6) & 0x3f),
          0x80 | (charcode & 0x3f)
        )
      }
    }

    return new Uint8Array(utf8).buffer
  }

  toUint8Array () {
    return new Uint8Array(this.buffer)
  }

  toBuffer () {
    if (BufferShim.isNodeEnv) return Buffer.from(this.buffer)

    return this.toUint8Array()
  }

  inspect () {
    return this.toBuffer()
  }

  toString (encoding: 'utf8' | 'utf-8' | 'base64' = 'utf8') {
    switch (encoding) {
      case 'utf-8':
      case 'utf8':
        return this.fromUTF8Array(this.buffer)
      case 'base64':
        return this.btoa(this.buffer)
      default:
        return new Uint8Array(this.buffer).toString()
    }
  }

  static get isNodeEnv () {
    return typeof Buffer === 'function' && typeof Buffer.from === 'function'
  }

  static from (input: string | Buffer | ArrayBuffer, encoding?: 'utf8' | 'utf-8' | 'base64') {
    return new BufferShim(input, encoding)
  }
}

export class Base64Url {
  static encode (input: string | Buffer | ArrayBuffer, encoding: 'utf8' | 'utf-8' = 'utf8') {
    if (typeof input === 'string') return Base64Url.fromBase64(Buffer.from(input, encoding).toString('base64'))
    if (BufferShim.isNodeEnv && Buffer.isBuffer(input)) return Base64Url.fromBase64(input.toString('base64'))

    return Base64Url.fromBase64(BufferShim.from(input).toString('base64'))
  }

  static decode (base64url: string, encoding: 'utf8' | 'utf-8' = 'utf8') {
    return Base64Url.toBuffer(base64url).toString(encoding)
  }

  static toBase64 (base64url: string | Buffer | ArrayBuffer) {
    return Base64Url.padBase64(BufferShim.from(base64url).toString('utf8'))
      .replace(/-/g, '+')
      .replace(/_/g, '/')
  }

  static fromBase64 (base64 = '') {
    return base64
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
  }

  static padBase64 (input = '') {
    const SEGMENT_LENGTH = 4
    let padding = ''

    for (let i = input.length % SEGMENT_LENGTH; i < SEGMENT_LENGTH; i += 1) {
      padding += '='
    }

    return input + padding
  }

  static toBuffer (base64url: string) {
    return BufferShim.from(Base64Url.toBase64(base64url), 'base64')
  }
}

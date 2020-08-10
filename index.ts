import { BufferShim } from 'buffer-esm'

export class Base64Url {
  static encode (input: string | Buffer | ArrayBuffer, encoding: 'utf8' | 'utf-8' = 'utf8') {
    if (typeof input === 'string') return Base64Url.fromBase64(Buffer.from(input, encoding).toString('base64'))
    if (BufferShim.isBuffer(input)) return Base64Url.fromBase64(input.toString('base64'))

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

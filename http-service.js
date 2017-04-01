// Copyright (c) 2017 Buchanan & Edwards
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
// IN THE SOFTWARE.

'use strict'

//------------------------------------------------------------------------------
// Dependencies
//------------------------------------------------------------------------------

const http = require('http')
const https = require('https')
const url = require('url')
const util = require('util')
const querystring = require('querystring')
const HttpStatus = require('@be/http-status')

//------------------------------------------------------------------------------
// Initialization
//------------------------------------------------------------------------------

const JSON_MEDIA_TYPE = 'application/json'
const FORM_MEDIA_TYPE = 'application/x-www-form-urlencoded'

const CONTENT_TYPE_HEADER = 'content-type'
const CONTENT_LENGTH_HEADER = 'content-length'

const slice = Array.prototype.slice

//------------------------------------------------------------------------------
// Private
//------------------------------------------------------------------------------

function httpError(code, opt, msg) {
    msg = `[${opt.method} ${opt.protocol}//${opt.host}:${opt.port}${opt.path}] ${msg}`
    return new HttpError(code, msg)
}

function _appendQuery(path, query) {
    if (util.isObject(query)) {
        query = querystring.stringify(query)
    }
    if (util.isString(query)) {
        let sep = (path.indexOf('?') < 0) ? '?' : '&'
        return path + sep + query
    }
    return path
}

function _headerValue(headers, name) {
    if (util.isObject(headers)) {
        let keys = Object.keys(headers)
        for (let i = 0, n = keys.length; i < n; i++) {
            let key = keys[i]
            if (key.toLowerCase() === name) {
                return headers[key]
            }
        }
    }
    return null
}

function _removeParams(value) {
    if (value) {
        let semi = value.indexOf(';')
        if (semi > 0) {
            return value.substring(0, semi)
        }
    }
    return value
}

function _parseBody(type, body) {
    if (type === JSON_MEDIA_TYPE) {
        return JSON.parse(body.toString())
    } else if (type && (type.startsWith('text/') || type.endsWith('+xml'))) {
        return body.toString()
    } else {
        return body
    }
}

function _parseError(type, body) {
    if (type !== JSON_MEDIA_TYPE) {
        return null
    }
    // Sometimes Microsoft returns an error description.
    if (body.error_description) {
        let message = body.error_description.split(/\r?\n/)[0]
        return callback(httpError(code, options, message))
    }
    // Other times Microsoft returns an error object.
    if (body.error && body.error.message) {
        let message = body.error.message
        return callback(httpError(code, options, message))
    }
    // It could be an odata error.
    if (body['odata.error'] && body['odata.error'].message) {
        let message = body['odata.error'].message.value
        return callback(httpError(code, options, message))
    }
    return null
}

function _makeMessage(opt, txt) {
    let msg = `[${opt.method} ${opt.protocol}//${opt.host}:${opt.port}${opt.path}]`
    return txt ? `${msg} ${txt}` : msg
}

//------------------------------------------------------------------------------
// Public
//------------------------------------------------------------------------------

class HttpService {

    /**
     * Accepts an HTTP or HTTPS URI (e.g., https://example.com:443).
     */
    constructor(uri, options) {
        const parsed = url.parse(uri)
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            throw new URIError(`'${uri}' invalid protocol (expected http or https)`)
        }
        this.protocol = parsed.protocol
        this.hostname = parsed.hostname
        this.pathname = parsed.pathname
        this.port = parseInt(parsed.port)
        if (!this.port) {
            this.port = this.protocol === 'http:' ? 80 : 443
        }
        this.options = options || {}
    }

    // get(path, [query,] callback)
    // callback(err, body, type)
    get(path, query, callback) {
        if (typeof query === 'function') {
            callback = query
            query = null
        } else {
            path = _appendQuery(path, query)
        }
        this.request('GET', path, null, null, callback)
    }

    head(path, query, callback) {
        if (typeof query === 'function') {
            callback = query
            query = null
        } else {
            path = _appendQuery(path, query)
        }
        this.request('HEAD', path, null, null, callback)
    }

    post(path, data, callback) {
        this.request('POST', path, null, data, callback)
    }

    put(path, data, callback) {
        this.request('PUT', path, null, data, callback)
    }

    patch(path, data, callback) {
        this.request('PATCH', path, null, data, callback)
    }

    delete(path, callback) {
        this.request('DELETE', path, null, null, callback)
    }

    request(method, path, headers, data, callback) {
        const client = this.protocol === 'http:' ? http : https
        method = method.toUpperCase()
        headers = headers || {}
        if (data !== null) {
            if (util.isObject(data) && !Buffer.isBuffer(data)) {
                let type = _headerValue(headers, CONTENT_TYPE_HEADER)
                switch (type) {
                    case JSON_MEDIA_TYPE:
                        data = JSON.stringify(data)
                        break
                    case FORM_MEDIA_TYPE:
                        data = querystring.stringify(data)
                        break
                    case null:
                        headers[CONTENT_TYPE_HEADER] = JSON_MEDIA_TYPE
                        data = JSON.stringify(data)
                        break
                    default:
                        throw new TypeError(`Unsuported media type: ${type}. Cannot serialize object.`)
                }
            }
            if (util.isString(data) && _headerValue(headers, CONTENT_LENGTH_HEADER) === null) {
                headers[CONTENT_LENGTH_HEADER] = Buffer.byteLength(data)
            }
        }
        let options = Object.assign({}, this.options) // copy
        Object.assign(options, { // override
            method: method,
            protocol: this.protocol,
            host: this.hostname,
            port: this.port,
            path: this.pathname + (path || ''),
            headers: headers
        })
        let chunks = []
        let request = client.request(options, response => {
            response.on('data', chunk => {
                chunks.push(chunk)
            })
            response.on('end', _ => {
                let status = new HttpStatus(response.statusCode)
                let type = _removeParams(_headerValue(response.headers, CONTENT_TYPE_HEADER))
                let body = status.noContent ? null : Buffer.concat(chunks)
                let err = null
                try {
                    body = _parseBody(type, body)
                    if (status.isError()) {
                        let message = _makeMessage(options, _parseError(type, body))
                        err = status.error(message)
                    }
                } catch (e) {
                    err = new Error(_makeMessage(options, 'Parse Error: ' + e.message))
                }
                return callback(err, {
                    status: status,
                    headers: response.headers,
                    type: type,
                    body: body
                })
            })
        })
        request.on('error', err => {
            callback(err)
        })
        if (data !== null) {
            if (util.isString(data) || Buffer.isBuffer(data)) {
                request.write(data)
            } else {
                throw new TypeError(`Expected a string or Buffer for the data (got ${typeof data} instead).`)
            }
        }
        request.end()
    }
}

HttpService.JSON_MEDIA_TYPE = JSON_MEDIA_TYPE
HttpService.FORM_MEDIA_TYPE = FORM_MEDIA_TYPE

//------------------------------------------------------------------------------
// Exports
//------------------------------------------------------------------------------

module.exports = HttpService
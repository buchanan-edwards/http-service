# http-service

A wrapper around the node http or https request method.

Version 1.0.1

## 1. Installation

```bash
$ npm install --save @be/http-service
```

## 2. Usage

```javascript
const HttpService = require('@be/http-service');

const service = new HttpService('http://httpbin.org', options);

service.get('get', (err, body) => {
    console.log(body);
}
```

## 3. API

The package exports the `HttpService` class. This class provides the `request` method and various convenience methods that call the `request` method. The `request` method can be overridden in a subclass. One reason, for example, is adding header values. Be sure to call `super.request(...)` when overriding this method.

### 3.1 constructor

```javascript
HttpService(uri [, options])
```

Creates a new `HttpService` instance for the specified `uri`. The `uri` is parsed and the protocol, hostname, port, and pathname are extracted. The protocol is required and must be either `http` or `https`. If the port is not specified, it will default to port 80 for `http` requests and port 443 for `https` requests. The pathname is prepended to all requests and will be a `/` if not specified. Therefore, do not prefix any request path with an additional `/` if the URI does not have a path.

The `options` argument provides for additional options that are passed to the `http.request` or `https.request` methods.

**Examples:**

```javascript
const service = new HttpService('http://example.com');
```

```javascript
const service = new HttpService('https://example.com:9000');
```

### 3.2 request

```javascript
service.request(method, path, headers, data, callback)
```

Sends an HTTP or an HTTPS request to the host specified in the constructor.

- The `method` should be one of `GET`, `HEAD`, `OPTIONS`, `TRACE`, `POST`, `PUT`, `PATCH` or `DELETE`. The method is converted to upper case.
- The `path` identifies the resource with respect to the URI specified in the constructor. Do not prefix this path with a `/` if the URI does not have a path component (the Node.js `url.parse` method automatically adds the slash for empty paths).
- The `headers` must be an object or `null`.
- The `data` specifies the message body and can be a `Buffer`, a string, or an object. If the `data` parameter is an object, then it is processed as follows:
    - If the `Content-Type` header is `application/json`, then the data is serialized by calling `JSON.stringify`.
    - If the `Content-Type` header is `application/x-www-form-urlencoded`, then the data is serialized by calling `querystring.stringify`.
    - If the `Content-Type` header is not set, then the data is serialized by calling `JSON.stringify` and the `Content-Type` header is set to  `application/json`.
- The `callback` is called upon completion of the request. On error, it is called as `callback(err)`. On success, it is called as `callback(null, data, type, headers)`.
    - The `data` is the response message body. It will be a string if the `type` begins with `text` or ends with `+xml`. It will be an object if the `type` is `application/json`. Otherwise, the `data` will be a `Buffer`.
    - The `type` is the value of the `Content-Type` header with all parameters removed. For example, if the `Content-Type` is `text/html; charset=utf-8`, then the `type` argument in the callback will simply be `text/html`.
    - The `headers` are the full, unmodified headers from the response.

### 3.3 get, head

```javascript
service.get(path, [query,] callback)
service.head(path, [query,] callback)
```

Convenience methods for `GET` and `HEAD` requests. If the optional `query` object is specified, it is serialized and appended to the `path` preceded by a `?`. If the `path` already contains a query, then it is appended with a `&`.

### 3.4 post, put, patch

```javascript
service.post(path, data, callback)
service.put(path, data, callback)
service.patch(path, data, callback)
```

Convenience methods for the `POST`, `PUT`, and `PATCH` requests.

### 3.5 delete

```javascript
service.delete(path, callback)
```

Convenience method for the `DELETE` request.

### 3.6 Media Types

There are two static media type constants on the HttpService class:

```javascript
HttpService.JSON_MEDIA_TYPE = 'application/json';
HttpService.FORM_MEDIA_TYPE = 'application/x-www-form-urlencoded';
```

## 4. License

MIT License

Copyright (c) 2017 Buchanan & Edwards

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

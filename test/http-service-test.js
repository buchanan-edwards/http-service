const HttpService = require('../http-service')

const service = new HttpService('http://httpbin.org')

service.get('get', (err, response) => {
    console.log(err, response)
})

service.get('status/418', (err, response) => {
    console.log(err.toString(), response.body.toString())
})
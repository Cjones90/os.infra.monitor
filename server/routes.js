'use strict';

const health = require("./health.js");
const service = require("./service.js");

const routes = function (req, res) {

    const respond = (response) => {
        response = response || "";
        res.writeHead(200, {'Access-Control-Allow-Origin' : '*'} );
        "err" === response && res.end("err") // TODO: We should really send a more explicit msg in future
        "err" !== response && res.end(JSON.stringify(response));
    }

    //Convert post data to string
    let input = '';
    req.on('data', (buffer) => { input += buffer.toString(); })

    req.on('end', () => {
        let parsed = input ? JSON.parse(input) : "";

        switch(req.url) {
            case "/api/put/deregisterService": service.deregister(parsed.service, parsed.ip, respond);
            break;
            default: respond();
        }

    })

}

module.exports = routes;

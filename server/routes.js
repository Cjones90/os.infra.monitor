'use strict';

const health = require("./health.js");
const service = require("./service.js");
const auth = require("./auth.js");

const url = require("url");

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

        let requrl = url.parse(req.url).pathname
        let headers = req.headers;

        switch(requrl) {
            case "/api/put/deregisterService": service.deregister(parsed.service, parsed.ip, respond);
            break;

            case "/api/get/username": getUser(headers, "guest", respond) //username / key
            break;

            case "/api/post/logout": sendLogout(headers, respond) //username / key
            break;
            default: respond();
        }

    })

}

function getUser(headers, accessReq, respond) {
    auth.checkAccess({headers, app: "monitor", accessReq: accessReq})
    .then(({ status, hasPermissions }) => {
        if(!status) {
            console.log("User has incorrect authentication credentials");
            return respond({status: false, data: "Incorrect credentials"})
        }
        if(!hasPermissions) {
            console.log("User does not have required access for action");
            return respond({status: false, data: "Insufficient priveleges"})
        }
        let email = headers["auth-email"]
        respond({status: true, data: email})
    })
    .catch((e) => {
        console.log("Bad:", e);
        respond({status: false, data: "Server error"})
    })
}

function sendLogout(headers, respond) {

    auth.logout({headers, app: "monitor"})
    .then(({ status }) => {
        if(!status) {
            console.log("User has incorrect authentication credentials");
            return respond({status: false, data: "Incorrect credentials"})
        }
        respond({status: true, data: "Success"})
    })
    .catch((e) => {
        console.log("Bad:", e);
        respond({status: false, data: "Server error"})
    })

}

module.exports = routes;

"use strict";

const request = require("request");
const SERVICE_NAME = process.env.SERVICE_NAME
const SERVICE_PORT = process.env.SERVICE_PORT

module.exports = {

    register: () => {
        let serviceToRegister = {
            "ID": SERVICE_NAME,
            "Name": SERVICE_NAME,
            "Tags": [
                "primary",
                "v1"
            ],
            "Address": "127.0.0.1",
            "Port": SERVICE_PORT,
            "EnableTagOverride": false,
            "Check": {
                "DeregisterCriticalServiceAfter": "1m",
                "HTTP": `http://localhost:${SERVICE_PORT}`,
                "Interval": "10s",
                "TTL": "15s"
            }
        }

        request({
            url: "http://172.17.0.1:8500/v1/agent/service/register",
            method: "PUT",
            body: JSON.stringify(serviceToRegister)
        }, (err, res, body) => {
            if(err) { return console.log(err); }
            console.log(body);
        })
    }
}

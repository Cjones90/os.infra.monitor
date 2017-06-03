"use strict";

const http = require("http");
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
            "Address": "",
            "Port": +SERVICE_PORT,
            "EnableTagOverride": false,
            "Checks": [
                {
                    "ID": "Http",
                    "DeregisterCriticalServiceAfter": "30m",
                    "HTTP": `http://localhost:${SERVICE_PORT}`,
                    "Interval": "20s"
                },
                {
                    "ID": "Count",
                    "DeregisterCriticalServiceAfter": "30m",
                    "Script": `docker ps -f "name=${SERVICE_NAME}" -f status=running | wc -l | awk '{lines=$0-1; print lines}' `,
                    "Interval": "20s"
                },
            ]
        }

        let opts = {
            method: "PUT",
            port: "8500",
            path: `/v1/agent/service/register`,
            hostname: "172.17.0.1"
        }
        let response = "";
        let req = http.request(opts, (res) => {
            res.setEncoding('utf8');
            res.on('data', (chunk) => { response += chunk.toString(); });
            res.on('end', () => { console.log(response); });
        })
        req.on("error", (e) => { console.log("ERR:", e) })
        req.end(JSON.stringify(serviceToRegister))
    }
}

"use strict";

const http = require("http");
const https = require("https");
const url = require("url");
const fs = require("fs");

const USE_AUTH = JSON.parse(process.env.USE_AUTH);

const DOMAIN = fs.existsSync(`${process.cwd()}/domain/name.json`)
    ? require(`${process.cwd()}/domain/name.json`).domain
    : "localhost"

const AUTH_URL = DOMAIN === "localhost"
    ? "http://localhost:4030/api/get/access"
    : `https://auth.${DOMAIN}/api/get/access`

const PROTO = url.parse(AUTH_URL).protocol
const HOST = url.parse(AUTH_URL).hostname
const PATH = url.parse(AUTH_URL).pathname

module.exports = {
    checkAccess({headers = {}, app, accessReq }) {
        let customHeaders = {
            "auth-email": headers["auth-email"],
            "auth-key": headers["auth-key"]
        }
        return new Promise((resolve, reject) => {
            if(!USE_AUTH) { return resolve({status: true, hasPermissions: true})}
            let options = {
                hostname: HOST,
                path: PATH,
                method: "GET",
                headers: customHeaders
            }
            let respondCallback = (res) => {
                let raw = ""
                res.on("data", (data) => raw += data.toString())
                res.on("err", (err) => { reject(err) })
                res.on("end", () => {
                    let res = JSON.parse(raw)
                    let hasPermissions = res.status && res.access[app] >= res.access["levels"][accessReq]
                    resolve({status: res.status, hasPermissions})
                })
            }
            let req = PROTO === "http:"
                ? http.request(options, respondCallback)
                : https.request(options, respondCallback)
            req.end();
        })
    }
}


// // Example
// auth.checkAccess({headers, app: "auth", accessReq: "admin"})
// .then(({ status, hasPermissions }) => {
//     if(!status) {
//         console.log("User has incorrect authentication credentials");
//         return respond({status: false, data: "Incorrect credentials"})
//     }
//     if(!hasPermissions) {
//         console.log("User does not have required access for action");
//         return respond({status: false, data: "Insufficient priveleges"})
//     }
// })

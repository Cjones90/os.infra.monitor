"use strict";

const http = require("http");
const https = require("https");
const os = require("os");
const fs = require("fs");
const url = require("url");
const path = require("path");

const { service } = require("os-npm-util");
const routes = require("./routes.js");
const serverState = require("./serverState.js");

const BIN = process.env.BIN;
const PUB_FILES = process.env.PUB_FILES;
const OUTPUT_FILES = process.env.OUTPUT_FILES;
const DEV_ENV = process.env.DEV_ENV ? JSON.parse(process.env.DEV_ENV) : ""
const REGISTER_SERVICE = process.env.REGISTER_SERVICE
    ? JSON.parse(process.env.REGISTER_SERVICE)
    : false;

const ws = require("./ws.js");

serverState.registerConnection("http")
serverState.registerConnection("ws")




const server = {
    startServer: function() {
        console.log("======= Starting server =======");
        let options = {};
        let keyExists = fs.existsSync("/run/secrets/privkey")

        // Ensure we dont attempt to start httpsserver without certs
        if(keyExists) {
            options = {
                key: fs.readFileSync("/run/secrets/privkey", "utf8"),
                cert: fs.readFileSync("/run/secrets/fullchain", "utf8"),
                ca: fs.readFileSync("/run/secrets/chain", "utf8")
            }
        }

        let server = keyExists && options.key !== ""
            ? https.createServer(options, this.serverListener.bind(this))
            : http.createServer(this.serverListener.bind(this))

        // Not sure how having this before server.listen affects it, just noting it here
        ws.init(server)
        serverState.registerSigHandler(server, "http", REGISTER_SERVICE)
        if(REGISTER_SERVICE) { service.register(DEV_ENV); }

        let serverType = keyExists && options.key !== "" ? "https" : "http"
        let serverPort = serverType === "https" ? 443 : 80

        server.listen(serverPort, () => {
            console.log(`${serverType} server running on port ${serverPort}`)
            serverState.changeServerState("http", true)
            serverState.startIfAllReady()
        });
    },

    serverListener: function (req, res) {

        let isDockerHealthCheck = req.headers.host === "localhost" && req.url === "/healthcheck"

        if(req.url.indexOf('/api/') > -1) { routes(req, res); }
        else if (isDockerHealthCheck) {
            serverState.handleHealthCheck(res)
        }
        else {
            let extname = path.extname(url.parse(req.url).pathname);
            let file = (url.parse(req.url).pathname).slice(1, this.length);
            let contentTypes = {
                ".datagz": "text/javascript",
                ".memgz": "text/javascript",
                ".jsgz": "text/javascript",
                ".json": "text/javascript",
                ".js": "text/javascript",
                ".ico": "text/x-icon",
                ".png": "text/png",
                ".css": "text/css",
                ".html": "text/html",
                ".xls": "application/vnd.ms-excel",
                ".xlsx": "application/vnd.ms-excel",
                ".xlsm": "application/vnd.ms-excel"
            }
            let filePath = contentTypes[extname] ? PUB_FILES+file : PUB_FILES+"index.html"
            let contentType = contentTypes[extname] ? contentTypes[extname] : 'text/html';

            extname.indexOf("gz") > -1 && res.setHeader("Content-Encoding", "gzip");

            if(req.url.indexOf("/download/") > -1) {
                res.setHeader('Content-Disposition', 'attachment; filename='+path.basename(OUTPUT_FILES+file));
                filePath = OUTPUT_FILES+file.replace("download/", "");
            }

            res.setHeader('Cache-Control', 'public, max-age=' + (1000 * 60 * 60 * 24 * 30))
            res.writeHead(200, {"Content-Type": contentType});
            fs.readFile(filePath, "utf8", (err, data) => {
                if(filePath.match(`${PUB_FILES}index.html`)) {
                    data = data.replace(/%%VERSION%%/, service.IMAGE_VER)
                }
                res.end(data)
            })
        }
    }
}

module.exports = server;

if(!module.parent) {
    module.exports.startServer();
}

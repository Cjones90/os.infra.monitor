"use strict";

const http = require("http");
const https = require("https");
const fs = require("fs");
const url = require("url");
const path = require("path");
const qs = require('querystring');

const { service } = require("os-npm-util");
const routes = require("./routes.js");
const serverState = require("./serverState.js");

const BIN = process.env.BIN;
const PUB_FILES = process.env.PUB_FILES;
const STATIC_FILES = process.env.STATIC_FILES;
const OUTPUT_FILES = process.env.OUTPUT_FILES;
const DEV_ENV = process.env.DEV_ENV === "true"
const REGISTER_SERVICE = process.env.REGISTER_SERVICE === "true";
const SERVICE_NAME = process.env.SERVICE_NAME ? process.env.SERVICE_NAME : ""
const SERVE_FROM_PUB_DIR = ["app.bundle.js"]

service.setConfig({
    register: REGISTER_SERVICE,
    devEvn: DEV_ENV,
    serviceName: SERVICE_NAME
})

const ws = require("./ws.js");

serverState.registerConnection("http")
serverState.registerConnection("ws")




const server = {
    startServer: function() {
        console.log("======= Starting server =======");
        let options = {};
        let keyExists = fs.existsSync("/run/secrets/privkey")

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
            let exts = {
                ".datagz": { mime: "text/javascript", encoding: "utf8" },
                ".memgz": { mime: "text/javascript", encoding: "utf8" },
                ".jsgz": { mime: "text/javascript", encoding: "utf8" },
                ".json": { mime: "text/javascript", encoding: "utf8" },
                ".js": { mime: "text/javascript", encoding: "utf8" },
                ".ico": { mime: "text/x-icon", encoding: null },
                ".png": { mime: "text/png", encoding: null },
                ".jpg": { mime: "text/jpeg", encoding: null },
                ".jpeg": { mime: "text/jpeg", encoding: null },
                ".css": { mime: "text/css", encoding: "utf8" },
                ".html": { mime: "text/html", encoding: "utf8" },
                ".xls": { mime: "application/vnd.ms-excel", encoding: "utf8" },
                ".xlsx": { mime: "application/vnd.ms-excel", encoding: "utf8" },
                ".xlsm": { mime: "application/vnd.ms-excel", encoding: "utf8" },
                ".pdf": { mime: "application/pdf", encoding: "utf8" },
                ".sh": { mime: "text/plain", encoding: "utf8" }
            }
            let filePath = exts[extname] ? PUB_FILES+file : PUB_FILES+"index.html";
            let contentType = exts[extname] ? exts[extname].mime : 'text/html';
            let encoding = exts[extname] ? exts[extname].encoding : "utf8";

            SERVE_FROM_PUB_DIR.forEach((pubFile) => file.match(pubFile) && (filePath = PUB_FILES+pubFile) )
            extname.indexOf("gz") > -1 && res.setHeader("Content-Encoding", "gzip");

            if(req.url.indexOf("/download/") > -1) {
                res.setHeader('Content-Disposition', 'attachment; filename='+path.basename(OUTPUT_FILES+file));
                filePath = OUTPUT_FILES+file.replace("download/", "");
            }

            res.setHeader('Cache-Control', 'public, max-age=' + (60 * 60 * 24 * 30))
            res.writeHead(200, {"Content-Type": contentType});
            fs.readFile(filePath, encoding, (err, data) => {
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

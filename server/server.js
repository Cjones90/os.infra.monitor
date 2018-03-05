"use strict";

const http = require("http");
const https = require("https");
const fs = require("fs");
const url = require("url");
const path = require("path");

const { service } = require("os-npm-util");

const routes = require("./routes.js");
const ws = require("./ws.js");

const PUB_FILES = process.env.PUB_FILES;
const OUTPUT_FILES = process.env.OUTPUT_FILES;
const REGISTER_SERVICE = JSON.parse(process.env.REGISTER_SERVICE);
const BIN = process.env.BIN;
const PORT = 4000;

const server = {
    startServer: function() {
        let options = {};
        let keyExists = fs.existsSync("creds/privkey.pem")

        // Ensure we dont attempt to start httpsserver without certs
        // TODO: Stop reading in volume mounted files/certs, use docker secrets/config
        //   or serve up http since its posible to be behind a reverse proxy
        if(keyExists) {
            options = {
                key: fs.readFileSync("creds/privkey.pem", "utf8"),
                cert: fs.readFileSync("creds/fullchain.pem", "utf8"),
                ca: fs.readFileSync("creds/chain.pem", "utf8")
            }
        }

        let server = keyExists && options.key !== ""
            ? https.createServer(options, this.serverListener.bind(this))
            : http.createServer(this.serverListener.bind(this))
        let serverType = keyExists && options.key !== "" ? "https" : "http"
        server.listen(PORT, console.log(`${serverType} server running`));
        ws.init(server)
        this.registerGracefulShutdown(server)
        if(REGISTER_SERVICE) { service.register(); }
    },

    registerGracefulShutdown: function(server) {
        let close = () => {
            console.log("Received SIG signal, shutting down");
            server.close(() => {
                console.log("Closed out all connections successfully");
                process.exit();
            })
        }
        process.on("SIGTERM", close)
        process.on("SIGHUP", close)
        process.on("SIGINT", close)
        process.on("SIGQUIT", close)
        process.on("SIGABRT", close)
    },

    serverListener: function (req, res) {
        if(req.url.indexOf('/api/') > -1) { routes(req, res); }
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

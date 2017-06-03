'use strict';

const http = require("http");
const fs = require("fs");
const url = require("url");
const path = require("path");

const routes = require("./routes.js");
const ws = require("./ws.js");
const service = require("./service.js");

const PUB_FILES = process.env.PUB_FILES;
const OUTPUT_FILES = process.env.OUTPUT_FILES
const BIN = process.env.BIN;
const PORT = 4000;

const server = {
    startServer: function () {
        let httpServer = http.createServer((req, res) => {
            if(req.url.indexOf('/api/') > -1) { routes(req, res); }
            else {
                let extname = path.extname(url.parse(req.url).pathname);
                let file = (url.parse(req.url).pathname).slice(1, this.length);
                let contentType = 'text/html';
                let filePath = PUB_FILES+"index.html"

                if(extname === ".datagz") { contentType = "text/javascript"; filePath = PUB_FILES+file }
                if(extname === ".memgz") { contentType = "text/javascript"; filePath = PUB_FILES+file }
                if(extname === ".jsgz") { contentType = "text/javascript"; filePath = PUB_FILES+file }
                if(extname === ".js") { contentType = "text/javascript"; filePath = PUB_FILES+file }
                if(extname === ".ico") { contentType = "image/x-icon"; filePath = PUB_FILES+file }
                if(extname === ".png") { contentType = "image/png"; filePath = PUB_FILES+file }
                if(extname === ".css") { contentType = "text/css"; filePath = PUB_FILES+file }
                if(extname === ".tsv") { contentType = "text/tsv"; filePath = BIN+file }
                if(extname === ".xls") { contentType = "application/vnd.ms-excel"; filePath = OUTPUT_FILES+file }

                extname.indexOf("gz") > -1 && res.setHeader("Content-Encoding", "gzip");
                extname.indexOf("xls") > -1 && res.setHeader('Content-Disposition', 'attachment; filename='+path.basename(OUTPUT_FILES+file));

                res.writeHead(200, {"Content-Type": contentType});
                fs.readFile(filePath, (err, data) => res.end(data))
            }
        }).listen(PORT);
        console.log("Server running")
        // TODO: Should look into having only one WSS server running, seperating out
        // web clients and apps
        ws.init(httpServer);
        service.register()
    }

}

module.exports = server;

if(!module.parent) {
    module.exports.startServer();
}

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
            let extname = path.extname(url.parse(req.url).pathname);
            let file = (url.parse(req.url).pathname).slice(1, this.length);
            if(req.url.indexOf('/api/') > -1) {
                //     CHECK HERE IF USER IS AUTHENTICATED
                routes(req, res);
            }
            else if(extname === '.xls') {
                let stream = fs.readFileSync(OUTPUT_FILES+file, 'binary');
                let stat = fs.statSync(OUTPUT_FILES+file)
                res.setHeader('Content-Length', stat.size);
                res.setHeader('Content-Type', 'application/vnd.ms-excel');
                res.setHeader('Content-Disposition', 'attachment; filename='+path.basename(OUTPUT_FILES+file));
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.write(stream, 'binary')
                res.end('');
            }
            else {
                let contentType = '';
                file = PUB_FILES+file;
                switch(extname) {
                    case ".js": contentType = "text/javascript";
                    break;
                    case ".ico": contentType = "image/x-icon";
                    break;
                    case ".html": contentType = "text/html";
                    break;
                    case ".tsv": contentType = "text/tsv";
                        file = BIN+file;
                    break;
                    default: contentType = "text/html";
                        file = PUB_FILES+"index.html";
                }

                res.writeHead(200, {"Content-Type": contentType});
                res.end(fs.readFileSync(file));
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

'use strict';

const url = require("url");
const fs = require("fs");
const http = require("http");
const https = require("https");
const { fork, spawn } = require("child_process");

const health = require("./health.js");
const service = require("./service.js");
const auth = require("./auth.js");

let keyExists = fs.existsSync("serverkey")
let key = keyExists ? fs.readFileSync("serverkey", "utf8") : "";

let apps = {
    services: [],
    serviceToRepo: {},
    repos: {},
    dockerOrg: ""
}

const docker_creds = require("/root/.docker/config.json").auths["https://index.docker.io/v1/"].auth

const LATEST_NUM_OF_TAGS = 10;

const REFRESH_TOKEN_INTERVAL = 1000 * 60 * 5;
setTimeout(refreshRepos, 1000)                    // Initially populate
setInterval(refreshRepos, REFRESH_TOKEN_INTERVAL) // Refresh every 5 minutes

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

            case "/api/get/username": getUser(headers, "user", respond) //username / key
            break;
            case "/api/get/repos": getRepos(headers, "user", respond) //username / key
            break;

            case "/api/post/logout": sendLogout(headers, respond) //username / key
            break;
            case "/api/post/launchservice": launchService(headers, parsed, respond) //username / key
            break;
            default: respond();
        }

    })

}

// TODO: Temporary solution storing apps on auth server
// We do NOT want all this bloat
const DOMAIN = fs.existsSync(`${process.cwd()}/domain/name.json`)
    ? require(`${process.cwd()}/domain/name.json`).domain
    : "localhost"
const AUTH_URL = DOMAIN === "localhost"
    ? "http://localmachine:4030"
    : `https://auth.${DOMAIN}:443`
const PORT = url.parse(AUTH_URL).port
const HOST = url.parse(AUTH_URL).hostname
const PROTO = url.parse(AUTH_URL).protocol

let getServices = (() => {
    let options = {
        hostname: HOST,
        port: PORT,
        path: "/api/post/monitor",
        method: "POST"
    }
    let respondCallback = (res) => {
        let raw = ""
        res.on("data", (data) => raw += data.toString())
        res.on("err", (err) => { console.log(err) })
        res.on("end", () => {
            let res = JSON.parse(raw)
            apps = res.data
            apps && apps.services.forEach((name) => {
                apps.repos[name] = {
                    token: "",
                    exp: new Date(),
                    tags: []
                }
            })
        })
    }
    let req = PROTO === "http:"
        ? http.request(options, respondCallback)
        : https.request(options, respondCallback)
    req.write(JSON.stringify({key: key}));
    req.end();
})()

function checkAccess(headers, app, accessReq, callback) {
    auth.checkAccess({headers, app, accessReq})
    .then(({ status, hasPermissions }) => {
        if(!status) {
            console.log("User has incorrect authentication credentials");
            return callback({status: false, data: "Incorrect credentials"})
        }
        if(!hasPermissions) {
            console.log("User does not have required access for action");
            return callback({status: false, data: "Insufficient priveleges"})
        }
        callback({status: true})
    })
    .catch((e) => {
        console.log("Bad:", e);
        callback({status: false, data: "Server error"})
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

function getUser(headers, accessReq, respond) {
    checkAccess(headers, "monitor", accessReq, ({status}) => {
        if(status) {
            let email = headers["auth-email"]
            respond({status: true, data: email})
        }
        else {
            respond({status: false, data: "Server error"})
        }
    })
}

function getToken(reponame) {
    return new Promise((resolve, reject) => {
        let customHeaders = {
            "Accept": "application/json",
            "Authorization": `Basic ${docker_creds}`
        }
        let options = {
            hostname: "auth.docker.io",
            port: 443,
            path: `/token?service=registry.docker.io&scope=repository:${apps.dockerOrg}/${reponame}:pull`,
            method: "GET",
            headers: customHeaders
        }
        let respondCallback = (res) => {
            let raw = ""
            res.on("data", (data) => raw += data.toString())
            res.on("err", (err) => { reject(err) })
            res.on("end", () => {
                let res = JSON.parse(raw)
                apps.repos[reponame].exp = new Date(res.issued_at)
                apps.repos[reponame].exp.setMinutes(apps.repos[reponame].exp.getMinutes() + 5);
                apps.repos[reponame].token = res.token
                resolve({token: res.token, reponame})
            })
        }
        let req = https.request(options, respondCallback)
        req.end();
    })
}

function getTags({token, reponame}) {
    return new Promise((resolve, reject) => {
        let customHeaders = {
            "Accept": "application/json",
            "Authorization": `Bearer ${token}`
        }
        let options = {
            hostname: "index.docker.io",
            port: 443,
            path: `/v2/${apps.dockerOrg}/${reponame}/tags/list`,
            method: "GET",
            headers: customHeaders
        }
        let respondCallback = (res) => {
            let raw = ""
            res.on("data", (data) => raw += data.toString())
            res.on("err", (err) => { reject(err) })
            res.on("end", () => {
                let res = JSON.parse(raw)
                apps.repos[reponame].tags = res.tags.reverse().splice(0, LATEST_NUM_OF_TAGS)
                resolve()
            })
        }
        let req = https.request(options, respondCallback)
        req.end();
    })
}

function refreshRepos(callback) {
    let allPromises = []
    Object.keys(apps.repos).forEach((reponame) => {
        // If token expired, get token, otherwise just get tags
        if(apps.repos[reponame].exp < new Date()) {
            allPromises.push(getToken(reponame).then(getTags))
        }
        else {
            allPromises.push(getTags({token: apps.repos[reponame].token, reponame}))
        }
    })
    Promise.all(allPromises).then(() => {
        console.log("Refreshed Repo Tags");
        callback && callback(apps.repos)
    })
}

function getRepos(headers, accessReq, respond) {
    checkAccess(headers, "monitor", accessReq, ({status}) => {
        if(status) {
            refreshRepos((repos) => {
                let tags = Object.keys(repos).map((reponame) => ({name: reponame, versions: repos[reponame].tags}))
                respond({status: true, data: tags})
            })
        }
        else {
            respond({status: false, data: "Server error"})
        }
    })
}

function launchService(headers, options, respond) {
    checkAccess(headers, "monitor", "user", ({status}) => {
        if(status) {
            let repo = apps.serviceToRepo[options.service];
            let version = options.version;
            version = version === "latest" ? apps.repos[options.service].tags[1] : version;

            let bash = spawn(`bash`, {cwd: `/home/app/repos/${repo}`});
            bash.stdin.write(`git fetch`);
            bash.stdin.write(`git pull origin master --force`);
            bash.stdin.write(`git checkout ${version}\n`);
            bash.stdin.write(`docker stack deploy --compose-file docker-compose.yml ${options.service} --with-registry-auth`);
            bash.stdin.end()

            bash.stdout.on('data', (data) => { console.log(`stdout: ${data}`); });
            bash.stderr.on('data', (data) => { console.log(`stderr: ${data}`); });

            bash.on('close', (code) => {
                console.log(`Exited with code ${code}`);
                code === 0 && respond({status: true})
                code !== 0 && respond({status: false, data: "Server error"})
            });
        }
        else {
            respond({status: false, data: "Server error"})
        }
    })
}

module.exports = routes;

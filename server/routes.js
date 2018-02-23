'use strict';

const url = require("url");
const fs = require("fs");
const http = require("http");
const https = require("https");
const { fork, spawn } = require("child_process");

const { service, auth } = require("os-npm-util");

const health = require("./health.js");

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

const REFRESH_REPO_INTERVAL = 1000 * 60 * 2.6;

getServices()                                   // Initially populate
setTimeout(refreshRepos, 1000)                    // Initially populate
setInterval(refreshRepos, REFRESH_REPO_INTERVAL) // Refresh every 2.6 minutes

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
            case "/api/get/menu": auth.getMenu(headers, respond) //username / key
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
function getServices() {
    let options = {
        hostname: auth.HOST,
        port: auth.PORT,
        path: "/api/post/monitor",
        method: "POST"
    }
    let respondCallback = (res) => {
        let raw = ""
        res.on("data", (data) => raw += data.toString())
        res.on("err", (err) => { console.log("ERR - ROUTES.GETSERVICES\n", err) })
        res.on("end", () => {
            let res = raw ? JSON.parse(raw) : ""
            apps = res.status ? res.data : ""
            apps && apps.services.forEach((name) => {
                apps.repos[name] = {
                    token: "",
                    exp: new Date(),
                    tags: []
                }
            })
        })
    }
    let req = auth.PROTO === "http:"
        ? http.request(options, respondCallback)
        : https.request(options, respondCallback)
    req.on("error", (e) => console.log("ERR - ROUTES.GETSERVICES\n", e))
    req.write(JSON.stringify({key: key}));
    req.end();
}

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
        console.log("ERR - ROUTES.CHECKACCESS:\n", e);
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
        console.log("ERR - ROUTES.LOGOUT:\n", e);
        respond({status: false, data: "Server error"})
    })
}

function getUser(headers, accessReq, respond) {
    checkAccess(headers, "monitor", accessReq, ({status, data}) => {
        if(status) {
            let email = headers["auth-email"]
            respond({status: true, data: email})
        }
        else {
            respond({status: false, data})
        }
    })
}

function getToken(reponame) {
    return new Promise((resolve, reject) => {
        if(!apps || !apps.dockerOrg || !docker_creds) {
            return reject("No docker credentials or incorrect docker org")
        }
        if(apps.repos[reponame].token && apps.repos[reponame].exp < new Date()) {
            resolve({token: apps.repos[reponame].token, reponame})
        }

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
                let res = raw ? JSON.parse(raw) : ""
                if(res) {
                    apps.repos[reponame].exp = new Date(res.issued_at)
                    apps.repos[reponame].exp.setMinutes(apps.repos[reponame].exp.getMinutes() + 5)
                    apps.repos[reponame].token = res.token
                    resolve({token: res.token, reponame})
                }
                else {
                    reject("Empty response from docker.io")
                }
            })
        }
        let req = https.request(options, respondCallback)
        req.on("error", (e) => console.log("ERR - ROUTES.GETTOKEN\n", e))
        req.end();
    })
}

function getTags({token, reponame}) {
    return new Promise((resolve, reject) => {
        if(!token) { return reject("No token") }
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
                if(!res.tags) { return reject("Unable to retrieve tags") }
                // Remove latest tag
                res.tags.splice(res.tags.findIndex((t)=>t==="latest"), 1)
                // Sort by 0.X.X -> X.0.X -> X.X.0
                let sort = (splitA, splitB) => {
                    for(let i = 0; i < splitA.length; i++) {
                        if(Number(splitA[i]) > Number(splitB[i])) { return 1 }
                        if(Number(splitA[i]) < Number(splitB[i])) { return -1 }
                    }
                    return 0
                }
                res.tags.sort((a, b) => sort(a.split("."), b.split(".")))
                // Reverse and return LATEST_NUM_OF_TAGS
                res.tags = res.tags.reverse().splice(0, LATEST_NUM_OF_TAGS)
                // Insert latest back at front
                res.tags.unshift("latest")
                apps.repos[reponame].tags = res.tags;
                resolve()
            })
        }
        let req = https.request(options, respondCallback)
        req.on("error", (e) => console.log("ERR - ROUTES.GETTAGS\n", e))
        req.end();
    })
}

function refreshRepos() {
    let allPromises = []
    if(!apps || !apps.repos) {
        return console.log("No repos available to get tags for")
    }
    Object.keys(apps.repos).forEach((reponame) => {
        allPromises.push(getToken(reponame).then(getTags))
    })
    Promise.all(allPromises).then(() => console.log("Refreshed Repos") )
    .catch((e) => console.log("ERR - ROUTES.REFRESHREPO:", e))
}

function getRepos(headers, accessReq, respond) {
    checkAccess(headers, "monitor", accessReq, ({status}) => {
        if(status) {
            let tags = apps.repos
                ? Object.keys(apps.repos).map((reponame) => ({name: reponame, versions: apps.repos[reponame].tags}))
                : [{name: "", versions: []}]
            respond({status: true, data: tags})
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
            bash.stdin.write(`git fetch\n`);
            bash.stdin.write(`git pull origin master --force\n`);
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

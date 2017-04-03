"use strict";

const request = require("request");
const logErrs = false;
let apps = [];

module.exports = {

    attachWSConnection: function(connection) {
        this.wss = connection
    },

    registerListeners: function (Teacher) {
        Teacher.on("connection", (info) => {
            let appKey = info.name+info.env
            !apps[appKey] && (apps[appKey] = {})
            apps[appKey].name = info.name;
            apps[appKey].status = "ok";
            apps[appKey].port = info.port;
            apps[appKey].env = info.env;
            apps[appKey].isInternal = info.isInternal;
            apps[appKey].serverCount = info.serverCount;
            if(info.isIntenal) { console.log(info); }
            console.log("Added app: ", info);
            info.type = "connection"
            info.status = "ok"
            this.wss.broadcast(JSON.stringify(info))
        })
        Teacher.on("disconnection", (name, env) => {
            console.log("Disconnect: ", name);
            let appKey = name+env
            apps[appKey].serverCount -= 1;
            if(apps[appKey].serverCount <= 0) { apps[appKey].status = "offline"; }
            this.wss.broadcast(JSON.stringify({
                type: "disconnection",
                name: name,
                status: apps[appKey].status,
                serverCount: apps[appKey].serverCount
            }))
        })
    },

    getServerStatus: function(callback) {
        let allApps = [];
        for(let app in apps) {
            allApps.push(apps[app])
        }
        callback(allApps)
    },

    getHeader: function(respond) {
        let allApps = [];
        for(let app in apps) {
            allApps.push(apps[app])
        }
        let returnThese = ["NH-Interface", "RER"];
        let applications = allApps.filter((app) => returnThese.indexOf(app.name) !== -1)
        let feedback = allApps.filter((app) => app.name === "Feedback")
        let returnApps = applications.concat(feedback)
        respond(returnApps)
    }
}

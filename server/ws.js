"use strict";

const WebSocket = require("ws");
const http = require("http");
const RosterServer = require("roster").Server;
const health = require("./health.js")

const CONSUL_LEADER = process.env.CONSUL_LEADER;
const consul = require("consul")({host: CONSUL_LEADER})

let root = {
    name: "Root",
    children: []
}

let watchers = {}

// GENERAL NOTES:
// Connections are stored in this.wss.clients
// ws.upgradeReq.url === CLIENT "ROOM"

// Setup
let connectedPeers = [];
// More aggressive at start for testing purposes
const KEEP_ALIVE_INTERVAL = 1000 * 120 //120 seconds
const TTL = 3 // 3 sets of pings and no pong, you dead
const ROSTER_WS_PORT = 4001;

// TODO: Make functional, expose only necessary functions

module.exports = {
    init: function(opts) {
        let serverInit = typeof(opts) === "number"
            ? { port: opts }
            : { server: opts }
        this.wss = new WebSocket.Server(serverInit);
        this.wss.broadcast = (data) => {
            this.wss.clients.forEach((client) => {
                client.readyState === WebSocket.OPEN && client.send(data);
            });
        };
        this.registerEventHandlers();
        setInterval(this.startKeepAliveChecks.bind(this), KEEP_ALIVE_INTERVAL)
        console.log("WSS running");
        RosterServer.init(ROSTER_WS_PORT);
        health.registerListeners(RosterServer);
        health.attachWSConnection(this.wss)
        // Also watch for data centers coming online too
        consul.catalog.datacenters((err, res) => {
            // console.log(res);
            this.attachWatchers(res)
        })
    },

    attachWatchers: function (dcs) {
        dcs.forEach((dc) => {
            let watch = consul.watch({method: consul.catalog.node.list, options: {dc: dc} })
            watch.on("change", (data, res) => {
                // console.log(data);
                this.broadcastDataCenters()
            })
            watchers[dc] = watch
        })
    },

    startKeepAliveChecks: function () {
        this.wss.clients.forEach((client) => {
            let clientId = client.upgradeReq.headers['sec-websocket-key'];
            this.canSend(client) && client.send(JSON.stringify({type: "ping"}))
            let peerInd = connectedPeers.findIndex((masterPeer) => masterPeer.wsId === clientId)
            let peer = connectedPeers[peerInd];
            ++peer.pings && peer.pings > TTL && connectedPeers.splice(peerInd, 1)
        })
    },

    stilAlive: function (chatroom, evt, ws) {
        let wsId = ws.upgradeReq.headers['sec-websocket-key'];
        let peerInd = connectedPeers.findIndex((masterPeer) => masterPeer.wsId === wsId)
        connectedPeers[peerInd] && (connectedPeers[peerInd].pings = 0);
        // Inflates logs -- Good for testing
        // console.log(wsId+" sent pong");
    },

    registerEventHandlers: function() {
        this.wss.on("connection", (ws) => {
            let wsId = ws.upgradeReq.headers['sec-websocket-key'];
            ws.send(JSON.stringify({type: "id", msg: wsId}))
            connectedPeers.push({wsId: wsId, pings: 0});
            console.log("Client Connected");

            ws.on('message', (evt) => {
                evt = JSON.parse(evt);
                let chatroom = ws.upgradeReq.url
                evt.type === "pong" && this.stilAlive(chatroom, evt, ws);
                evt.type === "status" && this.getServerStatus(chatroom, evt, ws);
                evt.type === "services" && this.checkDataCenters(chatroom, evt, ws);
                // TODO: Create a "getLeader" call to get current consul leader for client
            })
            ws.on("close", (evt) => {
                let peerInd = connectedPeers.findIndex((masterPeer) => masterPeer.wsId === wsId)
                peerInd > -1 && connectedPeers.splice(peerInd, 1);
                console.log("Client closed. Clients in room after close evt: ", connectedPeers.length);
            })
        });
    },

    getServerStatus: function (chatroom, evt, ws) {
        health.getServerStatus((apps) => {
            let response = { type: "status", apps: apps }
            ws.send(JSON.stringify(response))
        })
    },

    canSend: function (ws) { return ws.readyState === 1 },

    checkDataCenters: function (chatroom, evt, ws) {
        let children = []
        this.sendGet("/v1/catalog/datacenters", (dcs) => {
            let lastDC = dcs.length
            dcs.forEach((dc, ind) => {
                let dcJson = { name: dc, children: [] }
                this.sendGet(`/v1/catalog/nodes?dc=${dc}`, (nodes) => {
                    let lastNode = nodes.length
                    nodes.forEach((node, ind) => {
                        this.sendGet(`/v1/catalog/node/${node.Node}?dc=${dc}`, (services) => {
                            let nodeJson = {
                                name: services.Node.Node,
                                children: Object.keys(services.Services).map((key) => {
                                    return { name: key, size: 1 }
                                })
                            }

                            let nodePushed = dcJson.children.filter((node) => nodeJson.name === node.name)
                            if(nodePushed.length === 0) { dcJson.children.push(nodeJson) }
                            if(--lastNode === 0) {
                                let dcPushed = children.filter((dc) => dcJson.name === dc.name)
                                if(dcPushed.length === 0) { children.push(dcJson) }
                                if(--lastDC === 0) {
                                    root.children = children;
                                    let response = { type: "services", root: root }
                                    ws.send(JSON.stringify(response))
                                }
                            }
                        })
                    })
                })
            })
        })
    },

    broadcastDataCenters: function () {
        let children = []
        this.sendGet("/v1/catalog/datacenters", (dcs) => {
            let lastDC = dcs.length
            dcs.forEach((dc, ind) => {
                let dcJson = { name: dc, children: [] }
                this.sendGet(`/v1/catalog/nodes?dc=${dc}`, (nodes) => {
                    let lastNode = nodes.length
                    nodes.forEach((node, ind) => {
                        this.sendGet(`/v1/catalog/node/${node.Node}?dc=${dc}`, (services) => {
                            let nodeJson = {
                                name: services.Node.Node,
                                children: Object.keys(services.Services).map((key) => {
                                    return { name: key, size: 1 }
                                })
                            }

                            let nodePushed = dcJson.children.filter((node) => nodeJson.name === node.name)
                            if(nodePushed.length === 0) { dcJson.children.push(nodeJson) }
                            if(--lastNode === 0) {
                                let dcPushed = children.filter((dc) => dcJson.name === dc.name)
                                if(dcPushed.length === 0) { children.push(dcJson) }
                                if(--lastDC === 0) {
                                    root.children = children;
                                    let response = { type: "services", root: root }
                                    this.wss.broadcast(JSON.stringify(response))
                                }
                            }
                        })
                    })
                })
            })
        })
    },

    // checkNodes: function () {
    //     this.sendGet("/v1/catalog/nodes", (res) => {
    //         console.log("Nodes:", res);
    //     })
    // },
    //
    // checkServices: function () {
    //     this.sendGet("/v1/catalog/services", (res) => {
    //         console.log("Services:", res);
    //     })
    // },

    sendGet: function (url, callback) {
        let opts = {
            method: "GET",
            port: "8500",
            path: `${url}`,
            hostname: CONSUL_LEADER
        }
        let response = "";
        let req = http.get(opts, (res) => {
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
                response += chunk.toString();
            });
            res.on('end', () => { callback(JSON.parse(response)) });
        })

        req.on("error", (e) => { console.log("ERR:", e) })
    },


}

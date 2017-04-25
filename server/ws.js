"use strict";

const WebSocket = require("ws");
const RosterServer = require("roster").Server;
const health = require("./health.js")

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


}

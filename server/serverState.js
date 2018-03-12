"use strict";

module.exports = {
    ws_is_healthy: false,
    server_is_healthy: false,
    changeWebSocketState: function (webSocketIsOnline) {
        this.ws_is_healthy = webSocketIsOnline
        console.log("WebSocket is now: ", webSocketIsOnline?"Online":"Offline");
    },
    changeServerState: function (serverIsOnline) {
        this.server_is_healthy = serverIsOnline
        console.log("Server is now: ", serverIsOnline?"Online":"Offline");
    },
}

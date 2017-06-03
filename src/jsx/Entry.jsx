"use strict";

import React from 'react';
import DOM from 'react-dom';
import Header from "./Header.jsx";
import Graph from "./Graph.jsx";

import WS from "../js/wsclient.js"
window.ws = new WS();

require("../style/Entry.less")

const Entry = React.createClass({

    getInitialState() {
        return {
            servers: []
        };
    },

    componentWillMount() {
        window.ws.on("open", this.checkServerStatus)
        window.ws.on("message", this.handleWsMsg)
    },

    componentDidMount() {},
    componentWillUnmount() {},

    handleWsMsg(msg) {
        let parsed = JSON.parse(msg.data);
        parsed.type === "status" && this.renderServers(parsed.apps)
        parsed.type === "disconnection" && this.handleAppDisconnection(parsed)
        parsed.type === "connection" && this.handleAppConnection(parsed)
    },

    checkServerStatus() {
        // window.ws.send({type: "status"})
    },

    sortByPort(servers) { return servers.sort((a, b) => a.port - b.port) },

    handleAppDisconnection(app) {
        this.state.servers.forEach((server) =>
            server.name === app.name && (server.status = app.status) && (server.serverCount = app.serverCount)
        )
        this.sortByPort(this.state.servers)
        this.setState({ })
    },

    handleAppConnection(app) {
        let servers = this.state.servers
        let serverIndex = servers.findIndex((server) => app.name === server.name)
        if(serverIndex === -1) { servers.push(app) }
        if(serverIndex > -1) { servers.splice(serverIndex, 1) && servers.push(app) }
        this.setState({ servers: this.sortByPort(servers) })
    },

    renderServers(servers) {
        this.setState({ servers: this.sortByPort(servers) })
    },

    render() {

        let servers = this.state.servers.map((server, ind) => {
            return (
                <div className={`server ${server.status}`} key={server.name + ind}>
                    <span className={`serverName`}>{server.name}</span>
                    <span className={`serverPort`}>Port: {server.port}</span>
                    <span className={`serverEnv`}>Env: {server.env}</span>
                    <span className={`serverStatus`}>Status: {server.status}</span>
                    <span className={`serverCount`}>Count: {server.serverCount}</span>
                </div>
            )
        })

        return (
            <div id="component-entry">
                <Header url={`${DOMAIN}:4040`}/>

                <h2>App Health</h2>

                <div id="serverContainer">
                    <Graph />
                    {servers}
                </div>

            </div>
        );
    }

});

DOM.render(<Entry />, document.getElementById("main"))

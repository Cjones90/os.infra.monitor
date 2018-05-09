"use strict";

import React from 'react';
import DOM from 'react-dom';

import Graph from "./Graph.jsx";
import SidePanel from "./SidePanel.jsx";
import Adminbar from "./Adminbar.jsx";
import { Menu } from "os-npm-util";
import { ErrorHandler } from "os-npm-util";

import WS from "../js/wsclient.js"
window.ws = new WS();

require("../style/Entry.less")

let emptyMachine = {
    name: "",
    address: "",
    services: [],
    checks: []
}

class Entry extends React.Component {

    constructor(props) {
        super(props)
        this.state = {
            servers: [],
            machine: Object.assign({}, emptyMachine),
            selectedMachine: Object.assign({}, emptyMachine)
        }
        this.handleWsMsg = this.handleWsMsg.bind(this)
        this.checkServerStatus = this.checkServerStatus.bind(this)
        this.sortByPort = this.sortByPort.bind(this)
        this.handleAppDisconnection = this.handleAppDisconnection.bind(this)
        this.handleAppConnection = this.handleAppConnection.bind(this)
        this.renderServers = this.renderServers.bind(this)
        // this.passMachine = this.passMachine.bind(this)
    }


    componentWillMount() {
        window.ws.on("open", this.checkServerStatus)
        window.ws.on("message", this.handleWsMsg)
    }

    componentDidMount() {}
    componentWillUnmount() {}

    handleWsMsg(msg) {
        let parsed = JSON.parse(msg.data);
        parsed.type === "status" && this.renderServers(parsed.apps)
        parsed.type === "disconnection" && this.handleAppDisconnection(parsed)
        parsed.type === "connection" && this.handleAppConnection(parsed)
    }

    checkServerStatus() {
        // window.ws.send({type: "status"})
    }

    sortByPort(servers) { return servers.sort((a, b) => a.port - b.port) }

    handleAppDisconnection(app) {
        this.state.servers.forEach((server) =>
            server.name === app.name && (server.status = app.status) && (server.serverCount = app.serverCount)
        )
        this.sortByPort(this.state.servers)
        this.setState({ })
    }

    handleAppConnection(app) {
        let servers = this.state.servers
        let serverIndex = servers.findIndex((server) => app.name === server.name)
        if(serverIndex === -1) { servers.push(app) }
        if(serverIndex > -1) { servers.splice(serverIndex, 1) && servers.push(app) }
        this.setState({ servers: this.sortByPort(servers) })
    }

    renderServers(servers) {
        this.setState({ servers: this.sortByPort(servers) })
    }


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
                <Menu />
                <Adminbar />
                <ErrorHandler />
                <h2>App Health</h2>

                <div id="serverContainer">
                    <Graph passMachine={(e) => this.setState({machine: e})}
                        removeMachine={(e) => this.setState({machine: emptyMachine})}
                        selectMachine={(e) => this.setState({selectedMachine: e})}/>
                    <SidePanel machine={this.state.machine}
                        selectedMachine={this.state.selectedMachine}/>
                    {servers}
                </div>

            </div>
        );
    }

}

DOM.render(<Entry />, document.getElementById("main"))

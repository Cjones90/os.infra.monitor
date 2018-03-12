"use strict";

import React, { PropTypes } from 'react'

import { api } from "os-npm-util";

require("../style/SidePanel.less")

class SidePanel extends React.Component {

    constructor(props) {
        super(props)
        this.state = {
            machine: props.machine
        }
        this.deregisterCheck = this.deregisterCheck.bind(this);
    }

    componentWillReceiveProps(nextProps) {
        nextProps.machine.checks.sort((a, b) => a.Name > b.Name)
        this.setState({ machine: nextProps.machine })
    }

    deregisterCheck(e) {
        let req = { check: e.check.CheckID, }
        api.put("/deregistercheck", req, (res) => {
            window.ws.send({type: "updateCenters"})
        })
    }

    render () {

        let services = this.state.machine.services.map((service, ind) => {
            return (<div className={`service`} key={ind}>{service.name}{service.version && ": v"+service.version}</div>)
        })

        let checks = this.state.machine.checks.map((check, ind) => {
            let status = check.CheckID.match(/service:/)
                ? check.Output
                : check.Status
            return (
                <div className={`check ${check.Status}`}
                key={ind}
                onClick={this.deregisterCheck.bind(this, {check: check, ip: this.state.machine.address})}>
                    {check.Name}: {status}
                </div>
            )
        })

        let machineStatus = this.state.machine.checks.every((check) => check.Status === "passing")
        let machineHealth = machineStatus ? "passing" : "critical"

        return (
            <div id="component-sidepanel">
                <div className={"header"}>
                    <div>Name: {this.state.machine.name}</div>
                    <div>IP: {this.state.machine.address}</div>
                </div>
                <div className={"body"}>
                    <div className={"services"}>
                        <div>Services:</div>
                        <div>{services}</div>
                    </div>
                    <div className={"checks"}>
                        <div>Checks:</div>
                        <div>{checks}</div>
                    </div>
                </div>

            </div>
        )
    }
}

export default SidePanel

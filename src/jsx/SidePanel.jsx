"use strict";

import React, { PropTypes } from 'react'
import api from "../js/api.js"

require("../style/SidePanel.less")

class SidePanel extends React.Component {

    constructor(props) {
        super(props)
        this.state = {
            machine: props.machine
        }
        this.deregisterService = this.deregisterService.bind(this);
    }

    componentWillReceiveProps(nextProps) {
        this.setState({
            machine: nextProps.machine
        })
    }

    deregisterService(e) {
        let req = {
            service: e.check.CheckID.replace("service:", ""),
            ip: e.ip
        }
        api.put("/deregisterService", req, (res) => {
            window.ws.send({type: "updateCenters"})
        })
    }

    render () {

        let services = this.state.machine.services.map((service, ind) => {
            return (<div className={`service`} key={ind}>{service.name}</div>)
        })

        let checks = this.state.machine.checks.map((check, ind) => {
            let status = check.CheckID.match(/service:/)
                ? check.Output
                : check.Status
            return (
                <div className={`check ${check.Status}`} key={ind} onClick={this.deregisterService.bind(this, {check: check, ip: this.state.machine.address})}>
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

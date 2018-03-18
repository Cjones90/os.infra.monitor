"use strict";

import React, { PropTypes } from 'react'

import { api } from "os-npm-util";

require("../style/SidePanel.less")

class SidePanel extends React.Component {

    constructor(props) {
        super(props)
        this.state = {
            machine: props.machine,
            selectedMachine: props.selectedMachine
        }
        this.deregisterCheck = this.deregisterCheck.bind(this);
    }

    componentWillReceiveProps(nextProps) {
        let sort = (a, b) => {
            if(a.Name < b.Name) return -1;
            if(a.Name > b.Name) return 1;
            return 0;
        }
        nextProps.machine && nextProps.machine.checks.sort(sort)
        nextProps.selectedMachine && nextProps.selectedMachine.checks.sort(sort)

        this.setState({ machine: nextProps.machine, selectedMachine: nextProps.selectedMachine })
    }

    deregisterCheck(e) {
        let req = { check: e.check.CheckID, }
        api.put("/deregistercheck", req, (res) => {
            window.ws.send({type: "updateCenters"})
        })
    }

    render () {

        let activeMachine = this.state.machine.name ? this.state.machine : this.state.selectedMachine

        let services = activeMachine.services.map((service, ind) => {
            return (<div className={`service`} key={ind}>{service.name}{service.version && ": v"+service.version}</div>)
        })

        let checks = activeMachine.checks.map((check, ind) => {
            let status = check.CheckID.match(/service:/)
                ? check.Output
                : check.Status
            return (
                <div className={`check ${check.Status}`}
                key={ind}
                onClick={this.deregisterCheck.bind(this, {check: check, ip: activeMachine.address})}>
                    {check.Name}: {status}
                </div>
            )
        })

        let machineStatus = activeMachine.checks.every((check) => check.Status === "passing")
        let machineHealth = machineStatus ? "passing" : "critical"

        return (
            <div id="component-sidepanel">
                <div className={"header"}>
                    <div>Name: {activeMachine.name}</div>
                    <div>IP: {activeMachine.address}</div>
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

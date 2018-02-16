"use strict";

import React, { PropTypes } from 'react'

import { api } from "os-npm-util";

require("../style/Launcher.less")

class Launcher extends React.Component {

    constructor(props) {
        super(props)
        this.state = {
            services: [],
            selectedServiceIndex: 0,
            selectedVersionIndex: 0,
            launching: false
        }
        this.changeSelectedIndex = this.changeSelectedIndex.bind(this);
        this.changeSelectedVersion = this.changeSelectedVersion.bind(this);
        this.launchService = this.launchService.bind(this);
    }

    componentDidMount() {
        api.get("/repos", (res) => {
            if(res.status) {
                this.setState({services: res.data})
            }
            else {
                console.log("Oops");
            }
        })
    }

    componentWillReceiveProps(nextProps) {
    }

    changeSelectedIndex(e) {
        this.setState({
            selectedServiceIndex: +e.target.value,
            selectedVersionIndex: 0
        })
    }

    changeSelectedVersion(e) {
        this.setState({ selectedVersionIndex: +e.target.value })
    }

    launchService() {
        let service = {
            service: this.state.services[this.state.selectedServiceIndex].name,
            version: this.state.services[this.state.selectedServiceIndex].versions[this.state.selectedVersionIndex]
        }
        this.setState({ launching: true })
        api.post("/launchservice", service, (res) => {
            if(res.status) {
                this.setState({ launching: false })
            }
            if(!res.status) {
                alert("Failed to launch service")
                this.setState({ launching: false })
            }
        })
    }

    render () {

        let createServices = this.state.services.map((service, ind) =>
            <option key={ind} value={ind}>{service.name}</option>
        )

        let createVersions = this.state.services.length
            ? this.state.services[this.state.selectedServiceIndex].versions.map((ver, ind) =>
                <option key={ind} value={ind}>{ver}</option>
              )
            : null

        return (
            <div id={`component-launcher`} className={`serviceContainer`}>
                <div className={"header"}>
                    <span>Service:</span>
                    <span>Version:</span>
                </div>
                <div className={`service`}>
                    <select onChange={this.changeSelectedIndex} className={"name"}
                        value={this.state.selectedServiceIndex}>{createServices}
                    </select>
                    <select onChange={this.changeSelectedVersion} className={"version"}
                        value={this.state.selectedVersionIndex}>{createVersions}
                    </select>
                    <button disabled={this.state.launching} onClick={this.launchService}>Launch</button>
                </div>

            </div>
        )
    }
}

export default Launcher

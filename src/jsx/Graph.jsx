"use strict";

import React, { PropTypes } from 'react';
import * as d3 from "d3";

require("../style/Graph.less")

const myjson = require("../js/sample.js")

class Graph extends React.Component {

    constructor(props) {
        super(props)
        this.state = {
            root: {
                children: []
            },
            leader: ""
            // root: myjson
        }
        this.checkDataCenters = this.checkDataCenters.bind(this);
        this.handleWsMsg = this.handleWsMsg.bind(this);
        this.createTidyTree = this.createTidyTree.bind(this);
        this.adjustToolTip = this.adjustToolTip.bind(this);
        this.selectMachine = this.selectMachine.bind(this);
        this.passMachine = props.passMachine.bind(this);

        this.selectedMachine = "";
    }

    componentDidMount() {
        window.ws.on("message", this.handleWsMsg)
        window.ws.on("open", this.checkDataCenters)
        // this.state.root && this.createTidyTree(this.state.root)
    }

    checkDataCenters() {
        window.ws.send({type: "auth"})
        window.ws.send({type: "services"})
        window.ws.send({type: "getLeader"})
    }

    handleWsMsg(msg) {
        let parsed = JSON.parse(msg.data);
        // parsed.type === "services" && this.createTidyTree(parsed.root)
        parsed.type === "services" && this.handleServices(parsed.root)
        parsed.type === "getLeader" && this.setState({leader: parsed.msg})
    }

    handleServices(root) {
        if(!root.children.length) { return console.log("No services"); }
        let updatedMachine = root.children[0].children.filter((machine) => {
            return machine.name === this.selectedMachine
        })
        updatedMachine.length && this.selectMachine(updatedMachine[0])
        this.setState({root: root})

    }

    createTidyTree(rootJson) {
        d3.select("#tidytree").selectAll("*").remove();

        var svg = d3.select("#tidytree"),
            width = +svg.attr("width"),
            height = +svg.attr("height"),
            g = svg.append("g").attr("transform", "translate(-100,0)");

        // d3.select("#tidytree").remove();

        var tree = d3.tree()
        .size([height - 50, width - 150]);

          var root = d3.hierarchy(rootJson)
          tree(root);

          var link = g.selectAll(".link")
              .data(root.descendants().slice(1))
            .enter().append("path")
              .attr("class", "link")
              .attr("d", diagonal);

          var node = g.selectAll(".node")
              .data(root.descendants())
            .enter().append("g")
              .attr("class", function(d) { return "node" + (d.children ? " node--internal" : " node--leaf"); })
              .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; });

          node.append("circle")
              .attr("r", 2.5);

          node.append("text")
              .attr("dy", 3)
              .attr("x", function(d) { return d.children ? -8 : 8; })
              .style("text-anchor", function(d) { return d.children ? "end" : "start"; })
              .text(function(d) { return d.data.name;  });


        function diagonal(d) {
          return "M" + d.y + "," + d.x
              + "C" + (d.parent.y + 100) + "," + d.x
              + " " + (d.parent.y + 100) + "," + d.parent.x
              + " " + d.parent.y + "," + d.parent.x;
        }
    }

    adjustToolTip(e) {
        let tooltips = document.querySelectorAll('.hiddenServices');
        let x = (e.clientX + -200) + 'px',
            y = (e.clientY + 20) + 'px';
        for (let i = 0; i < tooltips.length; i++) {
            tooltips[i].style.top = y;
            tooltips[i].style.left = x;
        }
    }

    selectMachine(e) {
        this.selectedMachine = e.name
        this.passMachine(e)
    }

    render () {

        // <svg id="tidytree" width="900" height="670"></svg>
        let allServices = [];
        let dataCenters = this.state.root.children.map((dc, ind) => {
            let machines = dc.children.map((machine, ind) => {
                machine.services.forEach((s) => allServices.push(s))
                let services = machine.services.map((service, ind) => {
                    return (<div className="service" key={ind}>{service.name}{service.version && ": v"+service.version}</div>)
                })
                let numServices = machine.services.length;
                let checks = machine.checks.map((check, ind) => {
                    let status = check.CheckID.match(/service:/)
                        ? check.Output
                        : check.Status
                    return (<div className={`check ${check.Status}` } key={ind}>{check.Name}: {status}</div>)
                })
                let machineStatus = machine.checks.every((check) => check.Status === "passing")
                let machineHealth = machineStatus ? "passing" : "critical"

                return (
                    <div className={`machine ${machineHealth}`} key={ind} onMouseMove={this.adjustToolTip}
                        onClick={this.selectMachine.bind(this, machine)}>
                        <div className="machineName">
                            Node: <strong>{machine.name}</strong>
                            <br />
                            Addr: <strong>{machine.address}</strong>
                            <br />
                            Services: <strong>{numServices}</strong>
                        </div>
                        <div className="hiddenServices">
                            <div className="services">Services: {services}</div>
                            <div className="checks">Checks: {checks}</div>
                        </div>
                    </div>
                )
            })
            return (
                <div className="dataCenter" key={ind}>
                    <div className="dcName">{dc.name}</div>
                    <div className="machineList">
                        {machines}
                    </div>

                </div>
            )
        })

        let uniqueServices = allServices.filter((service, ind) => {
            let indexOfFirstOccurance = allServices.findIndex((s) => service.name === s.name)
            return indexOfFirstOccurance === ind
        }).sort((a, b) => a.port > b.port)

        let displayServices = uniqueServices.map((service, ind) => {
            return (
                <div className={`service`} key={ind}>
                    <span className={"name"}>{service.name}:</span>
                    <span className={"version"}>{service.version}</span>
                    <span className={"port"}>{service.port}</span>
                </div>
            )
        })

        // <svg id="tidytree" width="900" height="670"></svg>
        return (
            <div id="component-graphs">
                <div className={`serviceContainer`}>
                    <a href={`http://${this.state.leader}:8500/ui`} target="_blank">Consul UI</a>
                    <br/>
                    <div className={"header"}>
                        <span>Service:</span>
                        <span>Version:</span>
                        <span>Port:</span>
                    </div>
                    {displayServices}
                </div>
                {dataCenters}

            </div>
        )
    }
}

export default Graph

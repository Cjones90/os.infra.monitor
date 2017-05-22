"use strict";

import React, { PropTypes } from 'react';
import * as d3 from "d3";

require("../style/Graph.less")

const myjson = require("../js/sample.js")

const CONSUL_LEADER = "192.34.59.186"

const Graph = React.createClass({

    getInitialState() {
        return {
            // root: {
            //     children: []
            // }
            root: myjson
        };
    },

    componentDidMount() {
        window.ws.addEventListener("open", this.checkDataCenters)
        window.ws.addEventListener("message", this.handleWsMsg)
        this.state.root && this.createTidyTree(this.state.root)
    },

    checkDataCenters() {
        window.ws.send(JSON.stringify({type: "services"}))
    },

    handleWsMsg(msg) {
        let parsed = JSON.parse(msg.data);
        parsed.type === "services" && this.createTidyTree(parsed.root)
        parsed.type === "services" && this.setState({root: parsed.root})
    },

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
    },

    adjustToolTip(e) {
        let tooltips = document.querySelectorAll('.hiddenServices');
        let x = (e.clientX + 10) + 'px',
            y = (e.clientY + 10) + 'px';
        for (let i = 0; i < tooltips.length; i++) {
            tooltips[i].style.top = y;
            tooltips[i].style.left = x;
        }
    },

    render () {

        // <svg id="tidytree" width="900" height="670"></svg>
        // console.log(this.state.root);
        let dataCenters = this.state.root.children.map((dc, ind) => {
            // console.log("dc", dc);
            let machines = dc.children.map((machine, ind) => {
                // console.log("machine", machine);
                let services = machine.children.map((service, ind) => {
                    // console.log("service:", service);
                    return (<div className="service" key={ind}>{service.name}</div>)
                })
                return (
                    <div className="machine"key={ind} onMouseMove={this.adjustToolTip}>
                        <div className="machineName">{machine.name}</div>
                        <div className="hiddenServices">{services}</div>
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

        return (
            <div id="component-graphs">
                <a href={`http://${CONSUL_LEADER}:8500/ui`} target="_blank">Consul UI</a>
                {dataCenters}
                <svg id="tidytree" width="900" height="670"></svg>
            </div>
        )
    }
})

export default Graph

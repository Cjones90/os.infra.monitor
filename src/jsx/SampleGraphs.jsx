"use strict";

import React, { PropTypes } from 'react'
import * as d3 from "d3";

require("../style/SampleGraphs.less")

const myjson = require("../js/sample.json")

const SampleGraphs = React.createClass({

    componentDidMount() {
        // this.createGraph();
        // this.createTreeMap();
        // this.createRadialTree();
        // this.createDendogram();
        // this.createForceDirectedTree();
        this.createForceTree();
    },

    createGraph() {
        var svg = d3.select("#circlepacker"),
        diameter = +svg.attr("width"),
        g = svg.append("g").attr("transform", "translate(2,2)"),
        format = d3.format(",d");

        var pack = d3.pack()
            .size([diameter - 4, diameter - 4]);

        // d3.json(myjson, function(error, root) {
        //   if (error) throw error;

          var root = d3.hierarchy(myjson)
              .sum(function(d) { return d.size; })
              .sort(function(a, b) { return b.value - a.value; });

          var node = g.selectAll(".node")
            .data(pack(root).descendants())
            .enter().append("g")
              .attr("class", function(d) { return d.children ? "node" : "leaf node"; })
              .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });

          node.append("title")
              .text(function(d) { return d.data.name + "\n" + format(d.value); });

          node.append("circle")
              .attr("r", function(d) { return d.r; });

          node.filter(function(d) { return !d.children; }).append("text")
              .attr("dy", "0.3em")
              .text(function(d) { return d.data.name.substring(0, d.r / 3); });
        // });

    },

    createTreeMap(){
        var svg = d3.select("#treemap"),
            width = +svg.attr("width"),
            height = +svg.attr("height");

        var fader = function(color) { return d3.interpolateRgb(color, "#fff")(0.2); },
            color = d3.scaleOrdinal(d3.schemeCategory20.map(fader)),
            format = d3.format(",d");

        var treemap = d3.treemap()
            .tile(d3.treemapResquarify)
            .size([width, height])
            .round(true)
            .paddingInner(1);

        // d3.json("flare.json", function(error, data) {
        //   if (error) throw error;

          var root = d3.hierarchy(myjson)
              .eachBefore(function(d) { d.data.id = (d.parent ? d.parent.data.id + "." : "") + d.data.name; })
              .sum(sumBySize)
              .sort(function(a, b) { return b.height - a.height || b.value - a.value; });

          treemap(root);

          var cell = svg.selectAll("g")
            .data(root.leaves())
            .enter().append("g")
              .attr("transform", function(d) { return "translate(" + d.x0 + "," + d.y0 + ")"; });

          cell.append("rect")
              .attr("id", function(d) { return d.data.id; })
              .attr("width", function(d) { return d.x1 - d.x0; })
              .attr("height", function(d) { return d.y1 - d.y0; })
              .attr("fill", function(d) { return color(d.parent.data.id); });

          cell.append("clipPath")
              .attr("id", function(d) { return "clip-" + d.data.id; })
            .append("use")
              .attr("xlink:href", function(d) { return "#" + d.data.id; });

          cell.append("text")
              .attr("clip-path", function(d) { return "url(#clip-" + d.data.id + ")"; })
            .selectAll("tspan")
              .data(function(d) { return d.data.name.split(/(?=[A-Z][^A-Z])/g); })
            .enter().append("tspan")
              .attr("x", 4)
              .attr("y", function(d, i) { return 13 + i * 10; })
              .text(function(d) { return d; });

          cell.append("title")
              .text(function(d) { return d.data.id + "\n" + format(d.value); });

          d3.selectAll("input")
              .data([sumBySize, sumByCount], function(d) { return d ? d.name : this.value; })
              .on("change", changed);

          var timeout = d3.timeout(function() {
            d3.select("input[value=\"sumByCount\"]")
                .property("checked", true)
                .dispatch("change");
          }, 2000);

          function changed(sum) {
            timeout.stop();

            treemap(root.sum(sum));

            cell.transition()
                .duration(750)
                .attr("transform", function(d) { return "translate(" + d.x0 + "," + d.y0 + ")"; })
              .select("rect")
                .attr("width", function(d) { return d.x1 - d.x0; })
                .attr("height", function(d) { return d.y1 - d.y0; });
          }
        // });

        function sumByCount(d) {
          return d.children ? 0 : 1;
        }

        function sumBySize(d) {
          return d.size;
        }
    },

    createRadialTree() {
        var svg = d3.select("#radialTree"),
            width = +svg.attr("width"),
            height = +svg.attr("height"),
            g = svg.append("g").attr("transform", "translate(" + (width / 2 + 40) + "," + (height / 2 + 90) + ")");

        var stratify = d3.stratify()
            .parentId(function(d) { return d.id.substring(0, d.id.lastIndexOf(".")); });

        var tree = d3.tree()
            .size([360, 500])
            .separation(function(a, b) { return (a.parent == b.parent ? 1 : 2) / a.depth; });

        // d3.csv("flare.csv", function(error, data) {
        //   if (error) throw error;

        //   var root = tree(stratify(myjson));
          var root = d3.hierarchy(myjson)

          tree(root)

          var link = g.selectAll(".link")
            .data(root.descendants().slice(1))
            .enter().append("path")
              .attr("class", "link")
              .attr("d", function(d) {
                return "M" + project(d.x, d.y)
                    + "C" + project(d.x, (d.y + d.parent.y) / 2)
                    + " " + project(d.parent.x, (d.y + d.parent.y) / 2)
                    + " " + project(d.parent.x, d.parent.y);
              });

          var node = g.selectAll(".node")
            .data(root.descendants())
            .enter().append("g")
              .attr("class", function(d) { return "node" + (d.children ? " node--internal" : " node--leaf"); })
              .attr("transform", function(d) { return "translate(" + project(d.x, d.y) + ")"; });

          node.append("circle")
              .attr("r", 2.5);

          node.append("text")
              .attr("dy", ".31em")
              .attr("x", function(d) { return d.x < 180 === !d.children ? 6 : -6; })
              .style("text-anchor", function(d) { return d.x < 180 === !d.children ? "start" : "end"; })
              .attr("transform", function(d) { return "rotate(" + (d.x < 180 ? d.x - 90 : d.x + 90) + ")"; })
              .text(function(d) {
                  return d.data.name;
              });
        // });

        function project(x, y) {
          var angle = (x - 90) / 180 * Math.PI, radius = y;
          return [radius * Math.cos(angle), radius * Math.sin(angle)];
        }
    },


    createDendogram() {
        var svg = d3.select("svg"),
            width = +svg.attr("width"),
            height = +svg.attr("height"),
            g = svg.append("g").attr("transform", "translate(40,0)");

        var tree = d3.cluster()
            .size([height, width - 160]);

        // var stratify = d3.stratify()
        //     .parentId(function(d) { return d.id.substring(0, d.id.lastIndexOf(".")); });

        // d3.csv("flare.csv", function(error, data) {
        //   if (error) throw error;

          var root = d3.hierarchy(myjson)
            // .sort(function(a, b) { return (a.height - b.height) || a.id.localeCompare(b.id); });

          tree(root)

        //   var root = stratify(data)
        //       .sort(function(a, b) { return (a.height - b.height) || a.id.localeCompare(b.id); });
          //
        //   tree(root);

          var link = g.selectAll(".link")
              .data(root.descendants().slice(1))
            .enter().append("path")
              .attr("class", "link")
              .attr("d", function(d) {
                return "M" + d.y + "," + d.x
                    + "C" + (d.parent.y + 100) + "," + d.x
                    + " " + (d.parent.y + 100) + "," + d.parent.x
                    + " " + d.parent.y + "," + d.parent.x;
              });

          var node = g.selectAll(".node")
              .data(root.descendants())
            .enter().append("g")
              .attr("class", function(d) { return "node" + (d.children ? " node--internal" : " node--leaf"); })
              .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; })

          node.append("circle")
              .attr("r", 2.5);

          node.append("text")
              .attr("dy", 3)
              .attr("x", function(d) { return d.children ? -8 : 8; })
              .style("text-anchor", function(d) { return d.children ? "end" : "start"; })
              .text(function(d) {
                  return d.data.name;
              });
            //   .text(function(d) { return d.id.substring(d.id.lastIndexOf(".") + 1); });
        // });
    },

    createForceDirectedTree() {
        var canvas = document.querySelector("#forcetree")
        var context = canvas.getContext("2d")
        var width = canvas.width
        var height = canvas.height;

        var root = d3.hierarchy(myjson)

          var nodes = root.descendants(),
              links = root.links();

          var simulation = d3.forceSimulation(nodes)
              .force("charge", d3.forceManyBody())
              .force("link", d3.forceLink(links).strength(2).distance(50))
              .force("x", d3.forceX())
              .force("y", d3.forceY())
              .on("tick", ticked);

          d3.select(canvas)
              .call(d3.drag()
                  .container(canvas)
                  .subject(dragsubject)
                  .on("start", dragstarted)
                  .on("drag", dragged)
                  .on("end", dragended));

          function ticked(e) {
            context.clearRect(0, 0, width, height);
            context.save();
            context.translate(width / 2, height / 2);

            context.beginPath();
            links.forEach(drawLink);
            context.strokeStyle = "#aaa";
            context.stroke();

            context.beginPath();
            nodes.forEach(drawNode);
            context.fill();
            context.strokeStyle = "#fff";
            context.stroke();

            context.restore();
          }

          function dragsubject() {
            return simulation.find(d3.event.x - width / 2, d3.event.y - height / 2);
          }

          function dragstarted() {
            if (!d3.event.active) simulation.alphaTarget(0.3).restart();
            d3.event.subject.fx = d3.event.subject.x;
            d3.event.subject.fy = d3.event.subject.y;
          }

          function dragged() {
            d3.event.subject.fx = d3.event.x;
            d3.event.subject.fy = d3.event.y;
          }

          function dragended() {
            if (!d3.event.active) simulation.alphaTarget(0);
            d3.event.subject.fx = null;
            d3.event.subject.fy = null;
          }

          function drawLink(d) {
            context.moveTo(d.source.x, d.source.y);
            context.lineTo(d.target.x, d.target.y);
          }

          function drawNode(d) {
            context.moveTo(d.x + 3, d.y);
            context.arc(d.x, d.y, 3, 0, 2 * Math.PI);
            context.font ="10px Arial";
            context.fillText(d.data.name, d.x, d.y)
          }
    },

    createForceTree() {
        var width = 900,
            height = 600,
            radius = 3;

        var fill = d3.scale.category20();

        // var force = d3.layout.force()
        //     .gravity(.05)
        //     .charge(-240)
        //     .linkDistance(30)
        //     .size([width, height]);

        var force = d3.layout.force()
            .gravity(.05)
            .distance(20)
            // .linkDistance(20)
            .charge(-100)
            .size([width, height]);


        var svg = d3.select("#forcetree2")

        // WORK
        var root = d3.layout.tree(myjson)
        var nodes = root.nodes(myjson);
        var links = root.links(nodes);


          var link = svg.selectAll(".link")
              .data(links)
            .enter().append("line")
            .attr("class", "link");

          var node = svg.selectAll(".node")
              .data(nodes)
            .enter().append("g")
              .attr("class", "node")
              .call(force.drag)

         node.append("circle")
             .attr("r", radius - .75)
             .style("fill", function(d) { return fill(d.group); })
             .style("stroke", function(d) { return d3.rgb(fill(d.group)).darker(); })


          node.append("text")
              .attr("dx", 12)
              .attr("dy", ".35em")
              .text(function(d) { return d.name })

          force
              .nodes(nodes)
              .links(links)
              .on("tick", tick)
              .start();

          function tick(e) {
            var k = 6 * e.alpha;
            // Push sources up and targets down to form a weak tree.
            link
                // .each(function(d) { d.source.y -= k, d.target.y += k; })
                .attr("x1", function(d) { return d.source.x; })
                .attr("y1", function(d) { return d.source.y; })
                .attr("x2", function(d) { return d.target.x; })
                .attr("y2", function(d) { return d.target.y; });

            node
                .attr("cx", function(d) { return d.x = Math.max(radius, Math.min(width - radius, d.x)); })
                .attr("cy", function(d) { return d.y = Math.max(radius, Math.min(height - radius, d.y)); });
                // .attr("cx", function(d) { return d.x; })
                // .attr("cy", function(d) { return d.y; });
                node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });

          }
        // });
    },

    render () {
        // <svg id="radialTree" width="900" height="900"></svg>
        // <svg id="dendogram" width="900" height="900"></svg>
        // <form>
        //   <label><input type="radio" name="mode" value="cluster" checked /> Dendrogram </label>
        //   <label><input type="radio" name="mode" value="tree" /> Tree </label>
        // </form>
        //
        // <svg id="forcetree" width="1300" height="1200"></svg>

        return (
            <div id="component-samplegraphs">
                <svg id="circlepacker" width="900" height="850"></svg>
                <svg id="treemap" width="900" height="850"></svg>

                <canvas id="forcetree" width="960" height="640"></canvas>
                <svg id="forcetree2" width="1300" height="1200"></svg>
            </div>
        )
    }
})

export default SampleGraphs

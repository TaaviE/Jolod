// Copyright: Taavi Eomäe 2017-2020
// SPDX-License-Identifier: AGPL-3.0-only

let svgelement = document.getElementById("viz");
let computedsvgelementstyle = getComputedStyle(svgelement);
let width = parseInt(computedsvgelementstyle.width.match(/\d+/), 10);
let height = parseInt(computedsvgelementstyle.height.match(/\d+/), 10) + 100;
let color = d3.scaleOrdinal(d3.schemeCategory10);

d3.json("graph/{{ graph_id }}/{{ unhide }}").then(function (graph) {
    let label = {
        "nodes": [],
        "links": []
    };
    graph.nodes.forEach(function (d, i) {
        label.nodes.push({node: d});
        label.nodes.push({node: d});
        label.links.push({
            source: i * 2,
            target: i * 2 + 1
        });
    });
    let labelLayout = d3.forceSimulation(label.nodes)
        .force("charge", d3.forceManyBody().strength(-300))
        .force("link", d3.forceLink(label.links).distance(5).strength(1));

    let graphLayout = d3.forceSimulation(graph.nodes)
        .force("charge", d3.forceManyBody().strength(-6000))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("x", d3.forceX(width / 2).strength(1))
        .force("y", d3.forceY(height / 2).strength(1))
        .force("link", d3.forceLink(graph.links).id(function (d) {
            return d.id;
        }).distance(100).strength(1))
        .on("tick", ticked);

    let adjlist = [];
    graph.links.forEach(function (d) {
        adjlist[d.source.index + "-" + d.target.index] = true;
        adjlist[d.target.index + "-" + d.source.index] = true;
    });

    function neigh(a, b) {
        return a === b || adjlist[a + "-" + b];
    }

    let svg = d3.select("#viz").attr("width", width).attr("height", height);
    let container = svg.append("g");
    svg.call(
        d3.zoom()
            .scaleExtent([.1, 4])
            .on("zoom", function () {
                container.attr("transform", d3.event.transform);
            })
    );

    svg.append("svg:defs")
        .selectAll("marker")
        .data(["end"])      // Different link/path types can be defined here
        .enter().append("svg:marker")    // This section adds in the arrows
        .attr("id", String)
        .attr("viewBox", "0 -5 10 10")
        .attr("stroke", "#aaa")
        .attr("refX", 20)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("svg:path")
        .attr("d", "M0,-5L10,0L0,5");

    let link = container.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(graph.links)
        .enter()
        .append("line")
        .attr("stroke", "#aaa")
        .attr("stroke-width", "2px")
        .attr("marker-end", "url(#end)"); // add the arrow to the link end

    let node = container.append("g").attr("class", "nodes")
        .selectAll("g")
        .data(graph.nodes)
        .enter()
        .append("circle")
        .attr("r", 15)
        .attr("fill", function (d) {
            return color(d.group);
        });

    node.on("mouseover", focus).on("mouseout", unfocus);
    node.call(
        d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended)
    );
    let labelNode = container.append("g").attr("class", "labelNodes")
        .selectAll("text")
        .data(label.nodes)
        .enter()
        .append("text")
        .text(function (d, i) {
            return i % 2 === 0 ? "" : d.node.id;
        })
        .style("fill", "#555")
        .style("font-family", "Arial")
        .style("font-size", 40)
        .style("pointer-events", "none"); // to prevent mouseover/drag capture
    node.on("mouseover", focus).on("mouseout", unfocus);


    function ticked() {
        node.call(updateNode);
        link.call(updateLink);
        labelLayout.alphaTarget(0.3).restart();
        labelNode.each(function (d, i) {
            if (i % 2 === 0) {
                d.x = d.node.x;
                d.y = d.node.y;
            } else {
                let b = this.getBBox();
                let diffX = d.x - d.node.x;
                let diffY = d.y - d.node.y;
                let dist = Math.sqrt(diffX * diffX + diffY * diffY);
                let shiftX = b.width * (diffX - dist) / (dist * 2);
                shiftX = Math.max(-b.width, Math.min(0, shiftX));
                let shiftY = 16;
                this.setAttribute("transform", "translate(" + shiftX + "," + shiftY + ")");
            }
        });
        labelNode.call(updateNode);
    }

    function fixna(x) {
        if (isFinite(x)) return x;
        return 0;
    }

    function focus(d) {
        let index = d3.select(d3.event.target).datum().index;
        node.style("opacity", function (o) {
            return neigh(index, o.index) ? 1 : 1;
        });
        labelNode.attr("display", function (o) {
            return neigh(index, o.node.index) ? "block" : "block";
        });
        link.style("opacity", function (o) {
            return o.source.index === index || o.target.index === index ? 1 : 1;
        });
    }

    function unfocus() {
        labelNode.attr("display", "block");
        node.style("opacity", 1);
        link.style("opacity", 1);
    }

    function updateLink(link) {
        link.attr("x1", function (d) {
            return fixna(d.source.x);
        })
            .attr("y1", function (d) {
                // noinspection JSSuspiciousNameCombination
                return fixna(d.source.y);
            })
            .attr("x2", function (d) {
                return fixna(d.target.x);
            })
            .attr("y2", function (d) {
                // noinspection JSSuspiciousNameCombination
                return fixna(d.target.y);
            });
    }

    function updateNode(node) {
        node.attr("transform", function (d) {
            // noinspection JSSuspiciousNameCombination
            return "translate(" + fixna(d.x) + "," + fixna(d.y) + ")";
        });
    }

    function dragstarted(d) {
        d3.event.sourceEvent.stopPropagation();
        if (!d3.event.active) graphLayout.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(d) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
    }

    function dragended(d) {
        if (!d3.event.active) graphLayout.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }
}); // d3.json
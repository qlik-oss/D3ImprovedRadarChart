////////////////////////////////////////////////////////////
/////////////// The Radar Chart Function ///////////////////
////////////////// Written by Nadieh Bremer ////////////////
///////////////////// VisualCinnamon.com ///////////////////
////////////// Inspired by the code of alangrafu ///////////
// Adapted to Qlik Sense by Brian Booden & Matthieu Burel //
////////////////////////////////////////////////////////////
import $ from "jquery";
import d3 from "d3";
import "d3-svg-legend";

const invalidMessageClassName = "invalid-visualisation-message";

function displayRADAR(className, options, $element, layout, inputData, self) {
  const isInvalidVisualisation = !inputData;
  if (isInvalidVisualisation) {
    renderInvalidMessage($element);
    return;
  }

  var cfg = {
    size: { width: 450, height: 450 }, //Width and Height of the circle
    margin: { top: 100, right: 100, bottom: 100, left: 100 }, //The margins around the circle
    legendPosition: { x: 20, y: 20 }, //The position of the legend, from the top-left corner of the svg
    color: d3.scale.category10(), //Color function
    colorOpacity: { circle: 0.1, area_low: 0.1, area_med: 0.1, area_high: 0.6 }, //The opacity of the area of the blob
    roundStrokes: false, //If true the area and stroke will follow a round path (cardinal-closed)
    maxValue: 1, //What is the value that the biggest circle will represent
    levels: 5, //How many levels or inner circles should there be drawn
    dotRadius: 4, //The size of the colored circles of each blob
    labelFactor: 1.25, //How much farther than the radius of the outer circle should the labels be placed
    wrapWidth: 100, //The number of pixels after which a label needs to be given a new line
    strokeWidth: 1.5, //The width of the stroke around each blob
    legendDisplay: true, //Display the legend
  };

  // Convert the nested data passed in into an array of values arrays
  var data = inputData.map(function(d) {
    return d.definition;
  });

  // Put all of the options into a variable called cfg
  if ("undefined" !== typeof options) {
    for (var i in options) {
      if ("undefined" !== typeof options[i]) {
        cfg[i] = options[i];
      }
    }
  }

  //If the supplied maxValue is smaller than the actual one, replace by the max in the data
  var maxValue = Math.max(
    cfg.maxValue,
    d3.max(data, function(i) {
      return d3.max(
        i.map(function(o) {
          return o.value;
        })
      );
    })
  );
  var minValue = Math.min(
    0,
    d3.min(data, function(i) {
      return d3.min(
        i.map(function(o) {
          return o.value;
        })
      );
    })
  );

  if (layout.range === false) {
    maxValue = isNaN(layout.maxValue) ? 1 : layout.maxValue;
    minValue = isNaN(layout.minValue) ? 0 : layout.minValue;
  }

  let graphH;
  let graphW;

  if (cfg.size.width < cfg.size.height) {
    graphH = cfg.size.width;
    graphW = cfg.size.width;
  } else {
    graphH = cfg.size.height;
    graphW = cfg.size.height;
  }

  var allAxis = data[0].map(function(i) {
    return i.axis;
  }); //Names of each axis
  var axisTheshHold = 100;
  if (allAxis.length > axisTheshHold) {
    allAxis = allAxis.slice(0, axisTheshHold);
  }
  var total = allAxis.length; //The number of different axes
  var radius = Math.abs(
    Math.min(
      graphW / 2 - cfg.margin.left - cfg.margin.right,
      graphH / 2 - cfg.margin.top - cfg.margin.bottom
    )
  ); //Radius of the outermost circle
  var angleSlice = (Math.PI * 2) / total; //The width in radians of each "slice"

  const rScale = d3.scale
    .linear()
    .range([0, radius])
    .domain([minValue, maxValue]);

  const rScaleRangeChecked = (value) =>
    Number.isFinite(value) ? rScale(value) : 0;

  /////////////////////////////////////////////////////////
  //////////// Create the container SVG and g /////////////
  /////////////////////////////////////////////////////////

  //Remove whatever chart with the same id/class was present before
  d3.select(className).select("svg").remove();

  const chartContainerElementId = "container_" + layout.qInfo.qId;

  $element
    .empty()
    .append(
      $("<div />")
        .attr("id", chartContainerElementId)
        .width(cfg.size.width)
        .height(cfg.size.height)
    );

  var svg = d3
    .select(`#${chartContainerElementId}`)
    .append("svg")
    .attr("width", cfg.size.width)
    .attr("height", cfg.size.height)
    .classed("in-edit-mode", self._inEditState);

  //Append a g element
  var wTraslation = cfg.legendDisplay
    ? cfg.size.width / 1.8
    : cfg.size.width / 2;
  var g = svg
    .append("g")
    .attr(
      "transform",
      "translate(" + wTraslation + "," + cfg.size.height / 2 + ")"
    );

  /////////////////////////////////////////////////////////
  /////////////// Draw the Circular grid //////////////////
  /////////////////////////////////////////////////////////

  //Wrapper for the grid & axes
  var axisGrid = g.append("g").attr("class", "axisWrapper");
  var axisContainer = g.append("g").attr("class", "axisContainer");
  var blobWrapper = g
    .selectAll(".radarWrapper")
    .data(data)
    .enter()
    .append("g")
    .attr("class", "radarWrapper");
  // var axisLabelWrapper = g.append('g').attr('class', 'axsisLabelWrapper');

  //Draw the background circles
  axisGrid
    .selectAll(".levels")
    .data(d3.range(1, cfg.levels + 1).reverse())
    .enter()
    .append("circle")
    .attr("class", "gridCircle")
    .attr("r", function(d) {
      return (radius / cfg.levels) * d;
    })
    .style("fill", "#CDCDCD")
    .style("stroke", "#CDCDCD")
    .style("fill-opacity", cfg.colorOpacity.circle);

  /////////////////////////////////////////////////////////
  //////////////////// Draw the axes //////////////////////
  /////////////////////////////////////////////////////////

  //Create the straight lines radiating outward from the center
  var axis = axisContainer
    .selectAll(".axis")
    .data(allAxis)
    .enter()
    .append("g")
    .attr("class", "axis");
  //Append the lines
  axis
    .append("line")
    .attr("x1", 0)
    .attr("y1", 0)
    .attr("x2", function(d, i) {
      return (
        rScaleRangeChecked(maxValue * 1.1)
        * Math.cos(angleSlice * i - Math.PI / 2)
      );
    })
    .attr("y2", function(d, i) {
      return (
        rScaleRangeChecked(maxValue * 1.1)
        * Math.sin(angleSlice * i - Math.PI / 2)
      );
    })
    .attr("class", "line")
    .style("stroke", "white")
    .style("stroke-width", "2px");

  //Append the labels at each axis
  axis
    .append("text")
    .attr("class", "legend")
    .style("font-size", "14px")
    .attr("text-anchor", "middle")
    .attr("dy", "0.35em")
    .attr("x", function(d, i) {
      return (
        rScaleRangeChecked(maxValue * cfg.labelFactor)
        * Math.cos(angleSlice * i - Math.PI / 2)
      );
    })
    .attr("y", function(d, i) {
      return (
        rScaleRangeChecked(maxValue * cfg.labelFactor)
        * Math.sin(angleSlice * i - Math.PI / 2)
      );
    })
    .text(function(d) {
      return d;
    })
    .call(wrap, cfg.wrapWidth);

  /////////////////////////////////////////////////////////
  ///////////// Draw the radar chart blobs ////////////////
  /////////////////////////////////////////////////////////

  //The radial line function
  var radarLine = d3.svg.line
    .radial()
    .interpolate("linear-closed")
    .radius((d) => (Number.isFinite(d.value) ? rScaleRangeChecked(d.value) : 1))
    .angle(function(d, i) {
      return i * angleSlice;
    });

  if (cfg.roundStrokes) {
    radarLine.interpolate("cardinal-closed");
  }

  //Append the backgrounds
  blobWrapper
    .append("path")
    .attr("class", function(d) {
      return "radarArea" + " c" + getValidCssClassName(d[0].radar_area);
    })
    .attr("d", function(d) {
      return radarLine(d);
    })
    .style("fill", function(d, i) {
      return cfg.color(i);
    })
    .style("fill-opacity", cfg.colorOpacity.area)
    .on("mouseover", function() {
      // Make cursor pointer when hovering over blob
      $(`#${chartContainerElementId}`).css("cursor", "pointer");

      //Dim all blobs
      d3.selectAll(`#${chartContainerElementId} .radarArea`)
        .transition()
        .duration(200)
        .style("fill-opacity", cfg.colorOpacity.area_out);
      //Bring back the hovered over blob
      d3.select(this)
        .transition()
        .duration(200)
        .style("fill-opacity", cfg.colorOpacity.area_over);
    })
    .on("click", function(d) {
      var isNull = false;
      d.find((e) => {
        if (e.dim1IsNull === true) {
          isNull = true;
        }
      });
      if (!isNull && self.options.noInteraction !== true) {
        // Select Value
        self.backendApi.selectValues(0, [d[0].radar_area_id], true);
      }
    })
    .on("mouseout", function() {
      // keep mouse cursor arrow instead of text select (auto)
      $("#" + chartContainerElementId).css("cursor", "default");

      //Bring back all blobs
      d3.selectAll(`#${chartContainerElementId} .radarArea`)
        .transition()
        .duration(200)
        .style("fill-opacity", cfg.colorOpacity.area);
    });

  //Create the outlines
  blobWrapper
    .append("path")
    .attr("class", "radarStroke")
    .attr("d", function(d) {
      return radarLine(d);
    })
    .style("stroke-width", cfg.strokeWidth + "px")
    .style("stroke", function(d, i) {
      return cfg.color(i);
    })
    .style("fill", "none");

  //Append the circles
  blobWrapper
    .selectAll(".radarCircle")
    .data(function(d) {
      return d;
    })
    .enter()
    .append("circle")
    .attr("class", "radarCircle")
    .attr("r", cfg.dotRadius)
    .attr("cx", function(d, i) {
      return (
        rScaleRangeChecked(d.value) * Math.cos(angleSlice * i - Math.PI / 2)
      );
    })
    .attr("cy", function(d, i) {
      return (
        rScaleRangeChecked(d.value) * Math.sin(angleSlice * i - Math.PI / 2)
      );
    })
    .style("fill", function(d, i, j) {
      return cfg.color(j);
    })
    .style("fill-opacity", 0.8);

  /////////////////////////////////////////////////////////
  //////// Append invisible circles for tooltip ///////////
  /////////////////////////////////////////////////////////

  //Wrapper for the invisible circles on top
  var blobCircleWrapper = g
    .selectAll(".radarCircleWrapper")
    .data(data)
    .enter()
    .append("g")
    .attr("class", "radarCircleWrapper");

  //Append a set of invisible circles on top for the mouseover pop-up
  blobCircleWrapper
    .selectAll(".radarInvisibleCircle")
    .data(function(d) {
      return d;
    })
    .enter()
    .append("circle")
    .attr("class", "radarInvisibleCircle")
    .attr("r", cfg.dotRadius * 1.5)
    .attr("cx", function(d, i) {
      return (
        rScaleRangeChecked(d.value) * Math.cos(angleSlice * i - Math.PI / 2)
      );
    })
    .attr("cy", function(d, i) {
      return (
        rScaleRangeChecked(d.value) * Math.sin(angleSlice * i - Math.PI / 2)
      );
    })
    .style("fill", "none")
    .style("pointer-events", "all")
    .on("mouseover", function(d) {
      if (!self._inEditState) {
        /// adding a css class to the parent SVG to prevent pointer events on edit mode was'nt enough for this interaction
        const newX = parseFloat(d3.select(this).attr("cx")) - 10;
        const newY = parseFloat(d3.select(this).attr("cy")) - 10;

        // Tooltip to show value on circle mouseover
        tooltip
          .attr("x", newX)
          .attr("y", newY)
          .text(
            d.radar_area
            + " : "
            + format(
              options.numberFormat[0],
              d.value * options.numberFormat[1]
            )
            + options.numberFormat[2]
          )
          .transition()
          .duration(200)
          .style("opacity", 1);
      }
    })
    .on("mouseout", function() {
      if (!self._inEditState) {
        tooltip.transition().duration(200).style("opacity", 0);
      }
    });

  //Set up the small tooltip for when you hover over a circle
  var tooltip = g.append("text").attr("class", "tooltip").style("opacity", 0);

  g.selectAll(".axisLabel")
    .data(d3.range(1, cfg.levels + 1).reverse())
    .enter()
    .append("text")
    .attr("class", "axisLabel")
    .attr("x", 4)
    .attr("y", function(d) {
      return (-d * radius) / cfg.levels;
    })
    .attr("dy", "0.4em")
    .style("font-size", "12px")
    .attr("fill", "#000000")
    .text(function(d) {
      return (
        format(
          options.numberFormat[0],
          (minValue + ((maxValue - minValue) * d) / cfg.levels)
          * options.numberFormat[1]
        ) + options.numberFormat[2]
      );
    });

  /////////////////////////////////////////////////////////
  /////////////////// Helper Functions /////////////////////
  /////////////////////////////////////////////////////////

  //Taken from http://bl.ocks.org/mbostock/7555321
  //Wraps SVG text
  function wrap(text, width) {
    text.each(function() {
      var text = d3.select(this),
        words = text.text().split(/\s+/).reverse(),
        word,
        line = [],
        lineNumber = 0,
        lineHeight = 1.1, // ems
        y = text.attr("y"),
        x = text.attr("x"),
        dy = parseFloat(text.attr("dy")),
        tspan = text
          .text(null)
          .append("tspan")
          .attr("x", x)
          .attr("y", y)
          .attr("dy", dy + "em");

      while ((word = words.pop())) {
        line.push(word);
        tspan.text(line.join(" "));
        if (tspan.node().getComputedTextLength() > width) {
          line.pop();
          tspan.text(line.join(" "));
          line = [word];
          tspan = text
            .append("tspan")
            .attr("x", x)
            .attr("y", y)
            .attr("dy", ++lineNumber * lineHeight + dy + "em")
            .text(word);
        }
      }
    });
  } //wrap

  function renderInvalidMessage($element) {
    let errorMessage
      = "The chart is not displayed because there might be an error with the data or the measure.";
    let invalidMessageElement = document.createElement("div");
    invalidMessageElement.className = invalidMessageClassName;
    invalidMessageElement.innerText = errorMessage;
    $element.empty().append(invalidMessageElement);
  }

  // on mouseover for the legend symbol
  function cellover(d) {
    $(`#${chartContainerElementId}`).css("cursor", "pointer");

    //Dim all blobs
    d3.selectAll(`#${chartContainerElementId} .radarArea`)
      .transition()
      .duration(200)
      .style("fill-opacity", cfg.colorOpacity.area_out);

    //Bring back the hovered over blob
    d3.select(
      `#${chartContainerElementId} .c`
      + getValidCssClassName(data[d][0].radar_area)
    )
      .transition()
      .duration(200)
      .style("fill-opacity", cfg.colorOpacity.area_over);
  }

  // on mouseclick for the legend symbol
  function cellclick(d) {
    $("#" + chartContainerElementId).css("cursor", "default");

    //Bring back all blobs
    var isNull = false;
    data[d].find((e) => {
      if (e.dim1IsNull === true) {
        isNull = true;
      }
    });
    if (!isNull && self.options.noInteraction !== true) {
      d3.selectAll(`#${chartContainerElementId} .radarArea`)
        .transition()
        .duration(200)
        .style("fill-opacity", 0.9);

      // Select Value
      self.backendApi.selectValues(0, [data[d][0].radar_area_id], true);
    }
  }

  // on mouseout for the legend symbol
  function cellout() {
    $("#" + chartContainerElementId).css("cursor", "default");

    //Bring back all blobs
    d3.selectAll(`#${chartContainerElementId} .radarArea`)
      .transition()
      .duration(200)
      .style("fill-opacity", cfg.colorOpacity.area);
  }

  /////////////////////////////////////////////////////////
  /////////////////// Draw the Legend /////////////////////
  /////////////////////////////////////////////////////////
  var aspectRatio = cfg.size.width / cfg.size.height;
  if (aspectRatio < 1.5 && cfg.size.height < 380) {
    return;
  }

  svg
    .append("g")
    .attr("class", "legendOrdinal")
    .attr(
      "transform",
      "translate("
      + cfg["legendPosition"]["x"]
      + ","
      + cfg["legendPosition"]["y"]
      + ")"
    );

  var legendOrdinal = d3.legend
    .color()
    .shape("path", d3.svg.symbol().type("circle").size(40)())
    .shapePadding(10)
    .scale(cfg.color)
    .labels(
      cfg.color.domain().map(function(d) {
        return data[d][0].radar_area;
      })
    )
    .on("cellover", function(d) {
      cellover(d);
    })
    .on("cellclick", function(d) {
      cellclick(d);
    })
    .on("cellout", function() {
      cellout();
    });

  if (
    layout.qHyperCube.qDimensionInfo.length !== 1
    && cfg.legendDisplay == true
  ) {
    svg.select(".legendOrdinal").call(legendOrdinal);
  }

  /*
  IntegraXor Web SCADA - JavaScript Number Formatter
  http://www.integraxor.com/
  author: KPL, KHL
  (c)2011 ecava
  Dual licensed under the MIT or GPL Version 2 licenses.
  */

  function format(m, v) {
    if (!m || isNaN(+v)) {
      return v; //return as it is.
    }
    //convert any string to number according to formation sign.
    v = m.charAt(0) == "-" ? -v : +v;
    var isNegative = v < 0 ? (v = -v) : 0; //process only abs(), and turn on flag.

    //search for separator for grp & decimal, anything not digit, not +/- sign, not #.
    var result = m.match(/[^\d\-\+#]/g);
    var Decimal = (result && result[result.length - 1]) || "."; //treat the right most symbol as decimal
    var Group = (result && result[1] && result[0]) || ","; //treat the left most symbol as group separator

    //split the decimal for the format string if any.
    m = m.split(Decimal);
    //Fix the decimal first, toFixed will auto fill trailing zero.
    v = v.toFixed(m[1] && m[1].length);
    v = +v + ""; //convert number to string to trim off *all* trailing decimal zero(es)

    //fill back any trailing zero according to format
    var pos_trail_zero = m[1] && m[1].lastIndexOf("0"); //look for last zero in format
    var part = v.split(".");
    //integer will get !part[1]
    if (!part[1] || (part[1] && part[1].length <= pos_trail_zero)) {
      v = (+v).toFixed(pos_trail_zero + 1);
    }
    var szSep = m[0].split(Group); //look for separator
    m[0] = szSep.join(""); //join back without separator for counting the pos of any leading 0.

    var pos_lead_zero = m[0] && m[0].indexOf("0");
    if (pos_lead_zero > -1) {
      while (part[0].length < m[0].length - pos_lead_zero) {
        part[0] = "0" + part[0];
      }
    } else if (+part[0] == 0) {
      part[0] = "";
    }

    v = v.split(".");
    v[0] = part[0];

    //process the first group separator from decimal (.) only, the rest ignore.
    //get the length of the last slice of split result.
    var pos_separator = szSep[1] && szSep[szSep.length - 1].length;
    if (pos_separator) {
      var integer = v[0];
      var str = "";
      var offset = integer.length % pos_separator;
      for (var i = 0, l = integer.length; i < l; i++) {
        str += integer.charAt(i); //ie6 only support charAt for sz.
        //-pos_separator so that won't trail separator on full length
        if (!((i - offset + 1) % pos_separator) && i < l - pos_separator) {
          str += Group;
        }
      }
      v[0] = str;
    }

    v[1] = m[1] && v[1] ? Decimal + v[1] : "";
    return (isNegative ? "-" : "") + v[0] + v[1]; //put back any negation and combine integer and fraction.
  }
}

export default displayRADAR;

export function getValidCssClassName(input) {
  if (!input) {
    return "";
  }
  return input.replace(/\s|\/|:|'|\.|\(|\)|#|@|\*|\[|\]|!|%|&|{|}|,|;|\?|`|\^|\<|\||\=|\$|"|\+|\>|\\|~/g, "");
}

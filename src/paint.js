import d3 from "d3";
import displayRADAR from "./radarChart";

function paint($element, layout) {
  const component = this;
  //////////////////////////////////////////////////////////////
  ////////////////////////// Data //////////////////////////////
  //////////////////////////////////////////////////////////////
  var json = convertHYPERCUBEtoJSON(layout);

  var colorpalette = layout.ColorSchema;

  //////////////////////////////////////////////////////////////
  ////////////////////// Set-Up display ////////////////////////
  //////////////////////////////////////////////////////////////

  var options = {
    size: { width: $element.width(), height: $element.height() }, //Width and Height of the circle
    margin: { top: 0, right: 10, bottom: 40, left: 10 }, //The margins around the circle
    legendPosition: { x: 10, y: 10 }, //The position of the legend, from the top-left corner of the svg
    color: d3.scale.ordinal().range(colorpalette), //Color function
    colorOpacity: {
      circle: 0.1,
      area: 0.2,
      area_out: 0.1,
      area_over: 0.6,
      area_click: 0.8
    }, //The opacity of the area of the blob
    roundStrokes: layout.strokeStyle, //If true the area and stroke will follow a round path (cardinal-closed)
    maxValue: 0.6, //What is the value that the biggest circle will represent
    levels: 6, //How many levels or inner circles should there be drawn
    dotRadius: 4, //The size of the colored circles of each blob
    labelFactor: 1.22, //How much farther than the radius of the outer circle should the labels be placed
    wrapWidth: 50, //The number of pixels after which a label needs to be given a new line
    strokeWidth: 2.8, //The width of the stroke around each blob
    legendDisplay: layout.showLegend, //Display the legend
    numberFormat: getFORMAT(layout) //Format for number
  };

  //////////////////////////////////////////////////////////////
  //////////////////// Draw the Chart //////////////////////////
  //////////////////////////////////////////////////////////////
  displayRADAR(".radarChart", options, $element, layout, json, component);
}

function getFORMAT(layout) {
  var result = [];
  result[0] = "# ##0,00";
  result[1] = 1;
  result[2] = "";

  if (typeof layout.qHyperCube.qMeasureInfo[0].qNumFormat.qFmt != "undefined") {
    var formatType = layout.qHyperCube.qMeasureInfo[0].qNumFormat.qType;
    var formatDefinition = layout.qHyperCube.qMeasureInfo[0].qNumFormat.qFmt;
    var formatPrecision = layout.qHyperCube.qMeasureInfo[0].qNumFormat.qFmt
      .replace(/%/g, "")
      .trim();

    if (formatType == "F") {
      // Format "Number"
      switch (formatDefinition) {
        case "# ##0":
          result[0] = "# ##0,";
          break;
        default:
          result[0] = formatPrecision;
          break;
      }
    }

    var symbole = formatDefinition.replace(formatPrecision, "").trim();

    if (symbole == "%") {
      result[1] = 100;
      result[2] = "%";
    }
  }

  return result;
}

function convertHYPERCUBEtoJSON(layout) {
  var qMatrix = layout.qHyperCube.qDataPages[0].qMatrix;

  var structure = [];
  var dim1Indecies = {};
  var dim2Indecies = {};
  var uniqueDim2Labels = [];
  var uniqueDim2Ids = [];

  qMatrix.forEach(function(row) {
    if (uniqueDim2Ids.indexOf(row[1].qElemNumber) === -1) {
      dim2Indecies[row[1].qElemNumber] = uniqueDim2Ids.length;
      uniqueDim2Ids.push(row[1].qElemNumber);
      uniqueDim2Labels.push(row[1].qText);
    }
  });

  qMatrix.forEach(function(row) {
    if (dim1Indecies[row[0].qElemNumber] === undefined) {
      // create first dim
      dim1Indecies[row[0].qElemNumber] = structure.length;
      structure.push({
        dim: row[0].qText,
        dim_id: row[0].qElemNumber,
        definition: uniqueDim2Ids.map(function(qEle, index) {
          return {
            axis_id: qEle,
            axis: uniqueDim2Labels[index],
            radar_area_id: row[0].qElemNumber,
            radar_area: row[0].qText,
            value: NaN
          };
        })
      });
    }
    // add to second dim
    structure[dim1Indecies[row[0].qElemNumber]].definition[
      dim2Indecies[row[1].qElemNumber]
    ].value = row[2].qNum;

    // Check if null
    if (row[0].qIsNull) {
      structure[dim1Indecies[row[0].qElemNumber]].definition[
        dim2Indecies[row[1].qElemNumber]
      ].dim1IsNull = true;
    }
  });

  var metric1Values = qMatrix.map(function(d) {
    return d[2].qNum;
  });

  const hasOnlyInvalidMetricValue = metric1Values.every(metricValue =>
    isNaNOrStringNaN(metricValue)
  );
  if (hasOnlyInvalidMetricValue) {
    return null;
  }

  return structure;
}

export default paint;

function isNaNOrStringNaN(input) {
  if (!input) {
    return false;
  }
  return isNaN(input) || input === "NaN";
}

import Graph from "./Graph.js";
import createForceLayout from 'ngraph.forcelayout';
import { visualConfig } from "./visualConfig.js";

const Settings = function(divId, classId, timelineId, layout) {
    var settings={};

    _.each(visualConfig.icons, function (icon) {
        icon.texture = PIXI.Texture.fromImage(icon.url);
    });

    // var canvas = document.getElementById("visPixijs"),
    //     w2 = $('.full-screen-container').width(),
    //     h2 = $('.full-screen-container').height();
    // canvas.width = w2;
    // canvas.height = h2;
    // settings.container = canvas;
    // console.log("w2 " + w2);
    // console.log("h2 " + h2);

    var divDoc = document.getElementById(divId);
    console.log(divId + " " + divDoc);

	var canvasDoc =  document.createElement("canvas");
	canvasDoc.setAttribute("id", "visPixijs");
    canvasDoc.setAttribute("style", "border-width: 0;");
    
	divDoc.appendChild(canvasDoc);

    var w = $(classId).width();
    var h = $(classId).height();
    canvasDoc.width = w;
    canvasDoc.height = h;
    settings.container = canvasDoc;

    console.log("w" + w);
    console.log("h" + h);
   
    settings.timelineContainer = timelineId;
    let ngraph = Graph();
    settings.graph = ngraph;
    settings.layout = createForceLayout(ngraph, layout);
    settings.mode = "picking";
    settings.background = 0x000000;
    settings.physics = {
        springLength: 30,
        springCoeff: 0.0008,
        dragCoeff: 0.01,
        gravity: -1.2,
        theta: 1
    };
    return settings 
}

export default Settings
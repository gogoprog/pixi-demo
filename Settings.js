import Graph from "./Graph.js";
import createForceLayout from 'ngraph.forcelayout';
import { visualConfig } from "./visualConfig.js";

class Settings {
    constructor(divId, classId, timelineId, visConfig) {
        var divDoc = document.getElementById(divId);
        var canvasDoc = document.createElement("canvas");
        canvasDoc.setAttribute("id", "visPixijs");
        canvasDoc.setAttribute("style", "border-width: 0;");

        divDoc.appendChild(canvasDoc);

        var w = $(classId).width();
        var h = $(classId).height();
        canvasDoc.width = w;
        canvasDoc.height = h;
        this.container = canvasDoc;
        let ngraph = Graph();
        this.graph = ngraph;
        if (visConfig) {
            if (data) {
                for (var i = 0; i < data.length; i++) {
                    if (!data[i].texture) {
                        data[i].texture = PIXI.Texture.fromImage(data[i].url);
                        console.log('33333', data[i]);
                        console.log(visConfig);
                    }
                }
            }
            this.visualConfig = visConfig;
            this.layout = createForceLayout(ngraph, visConfig.forceLayout);
            // Settings.visualization = visConfig;
        } else {
            _.each(visualConfig.icons, function(icon) {
                icon.texture = PIXI.Texture.fromImage(icon.url);
            });
            this.visualConfig = visualConfig;
            this.layout = createForceLayout(ngraph, visualConfig.forceLayout);
        }

        this.timelineContainer = timelineId;
        this.mode = "picking";
        this.background = 0x000000;
        this.physics = {
            springLength: 30,
            springCoeff: 0.0008,
            dragCoeff: 0.01,
            gravity: -1.2,
            theta: 1
        };

    }

}
export default Settings;

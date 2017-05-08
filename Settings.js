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
            let data = visConfig.icons || [];
            for (var i = 0; i < data.length; i++) {
                if (!data[i].texture) {
                    data[i].texture = PIXI.Texture.fromImage(data[i].url);
                }
            }

            var graphCollIcons = visConfig.graphCollIcons || [];
            for (var j = 1; j < 11; j++) {
                var iconUrl = "/static/32/GraphColl/graph_coll" + j + ".png";
                var texture = PIXI.Texture.fromImage(iconUrl);
                graphCollIcons.push(texture);
            }

            this.visualConfig = visConfig;
            this.visualConfig.graphCollIcons = graphCollIcons;
            this.layout = createForceLayout(ngraph, visConfig.forceLayout);
        } else {
            _.each(visualConfig.icons, function(icon) {
                icon.texture = PIXI.Texture.fromImage(icon.url);
            });

            var graphCollIcons = visualConfig.graphCollIcons || [];
            for (var j = 1; j < 11; j++) {
                var iconUrl = "/static/32/GraphColl/graph_coll" + j + ".png";
                var texture = PIXI.Texture.fromImage(iconUrl);
                graphCollIcons.push(texture);
            }

            this.visualConfig = visualConfig;
            this.visualConfig.graphCollIcons = graphCollIcons;
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

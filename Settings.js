import Graph from "./Graph.js";
import createForceLayout from 'ngraph.forcelayout';
import { visualConfig } from "./visualConfig.js";

class Settings {
    constructor(divId, classId, timelineId, visConfig) {
        let divDoc = document.getElementById(divId);
        let canvasDoc = document.createElement("canvas");
        canvasDoc.setAttribute("id", "visPixijs");
        canvasDoc.setAttribute("style", "border-width: 0;");
        canvasDoc.setAttribute("tabindex", '1');

        divDoc.appendChild(canvasDoc);

        let w = $(classId).width();
        let h = $(classId).height();
        canvasDoc.width = w;
        canvasDoc.height = h;
        this.container = canvasDoc;
        let ngraph = Graph();
        this.graph = ngraph;

        this.updateVisualConfig(visConfig);
        this.layout = createForceLayout(ngraph, this.visualConfig.forceLayout);

        this.timelineContainer = timelineId;
        this.mode = "picking";
        this.physics = {
            springLength: 30,
            springCoeff: 0.0008,
            dragCoeff: 0.01,
            gravity: -1.2,
            theta: 1
        };

    }

    updateVisualConfig(visConfig) {
        if (visConfig) {
            let data = visConfig.icons || [];
            for (let i = 0; i < data.length; i++) {
                if (!data[i].texture) {
                    data[i].texture = PIXI.Texture.fromImage(data[i].url);
                }
            }

            let graphCollIcons = visConfig.graphCollIcons || [];
            for (let j = 1; j < 11; j++) {
                let iconUrl = "/static/32/GraphColl/graph_coll" + j + ".png";
                let texture = PIXI.Texture.fromImage(iconUrl);
                graphCollIcons.push(texture);
            }

            this.visualConfig = visConfig;
            this.visualConfig.graphCollIcons = graphCollIcons;
        } else {
            _.each(visualConfig.icons, function(icon) {
                icon.texture = PIXI.Texture.fromImage(icon.url);
            });

            let graphCollIcons = visualConfig.graphCollIcons || [];
            for (let j = 1; j < 11; j++) {
                let iconUrl = "/static/32/GraphColl/graph_coll" + j + ".png";
                let texture = PIXI.Texture.fromImage(iconUrl);
                graphCollIcons.push(texture);
            }

            this.visualConfig = visualConfig;
            this.visualConfig.graphCollIcons = graphCollIcons;
        }
    }

}
export default Settings;

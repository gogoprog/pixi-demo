import moment from "moment";
import vis from "vis";

let alineTimeline = function (zoomFactor) {
    if (zoomFactor) {
        this.msPerPix /= (1 + zoomFactor);
    }
    if (this.stage.isTimelineLayout) {
        let leftSpan = this.stage.contentRoot.position.x;
        let leftTimeSpan = leftSpan * this.msPerPix;
        let start = this.originSpotTime - leftTimeSpan;
        let end = start + this.msPerPix * this.timelineWidth;
        this.timeline.setWindow(
            start,
            end, {animation: false},
        );
    }
    // console.log(stage.contentRoot.position);
    let pRoot = this.stage.contentRoot.position;
    // reposition the nodes;
    if (pRoot.x > 160) {
        _.each(this.nodeSprites, function (ns) {
            ns.updateNodePosition({x: -40, y: ns.position.y});
        });
    } else {
        let newX = 200 - pRoot.x / this.stage.contentRoot.scale.x;
        _.each(this.nodeSprites, function (ns) {
            ns.updateNodePosition({x: newX, y: ns.position.y})
        });
    }
    this.stage.isDirty = true;
};

let zoomTimeFunction = function(config) {
    this.timeline.setWindow(
        config.start,
        config.end,
        config.option,
    );
    this.timeline.redraw();
    // calculate the position of root layer and each lines;
    let timelineStartMs = config.start,
        timelineEndMs = config.end;
    let interval = timelineEndMs - timelineStartMs;
    this.msPerPix = Math.floor(interval / this.timelineWidth);
    this.timelineWindow = this.timeline.getWindow();
    let rootOriginTimeDiff = this.originSpotTime - timelineStartMs;
    this.stage.contentRoot.position.x = rootOriginTimeDiff * this.timelineWidth / interval;
    this.positionLinksByTime(this.linkSprites, timelineStartMs);
    let pRoot = this.stage.contentRoot.position;
    if (pRoot.x > 160) {
        _.each(this.nodeSprites, function (ns) {
            ns.updateNodePosition({x: -40, y: ns.position.y});
        });
    } else {
        let newX = 200 - pRoot.x / this.stage.contentRoot.scale.x;
        _.each(nodeSprites, function (ns) {
            ns.updateNodePosition({x: newX, y: ns.position.y})
        });
    }
    this.stage.isDirty = true;
}

//var timeline, timelineWindow, msPerPix, originSpotTime, timelineWidth; // the timeline object.
export default class TimelineLayout {
    constructor(nodeSprites, nodeContainer, linkSprites, lineGraphics, visualConfig, stage, layoutType, settings) {
        this.nodeSprites = nodeSprites;
        this.nodeContainer = nodeContainer;
        this.linkSprites = linkSprites;
        this.lineGraphics = lineGraphics;
        this.visualConfig = visualConfig;
        this.stage = stage;
        this.layoutType = layoutType;
        this.settings = settings;

        this.timeline = null;
        this.timelineWindow = null;
        this.msPerPix = 0;
        this.originSpotTime = 0;
        this.timelineWidth = 0; // the timeline object.

        this.stage.contentRootMoved = _.throttle(alineTimeline.bind(this), 25);

        this.zoomTimelineThrottled = _.throttle(zoomTimeFunction.bind(this), 200);
    }
    
    /**
     * draw timline layout
     * @param {*} leftSpacing 
     */
    drawTimelineLayout(leftSpacing) {
        this.stage.isDirty = true;
        this.nodeContainer.positionDirty = true;
        this.layoutType = "TimelineScale";
        let timelineItems = [];
        let now = moment().format('YYYY-MM-DDTHH:mm:ss');
        _.each(this.linkSprites, function (l) {
            if (!l.visible) {
                return;
            }
            timelineItems.push({
                id: l.data.id,
                content: l.data.label,
                start: l.data.datetime || now,
                // type: 'point'
            });
        });
        if (!this.timeline) {
            let container = document.getElementById(this.settings.timelineContainer);
            if (!container) {
                throw "时间标尺容器未指定";
            }
            let items = new vis.DataSet(timelineItems);
            let options = {
                height: "100px",
                locales: {
                    "zh-cn": {
                        current: 'current',
                        time: 'time',
                    },
                },
                stack: false,
                locale: 'zh-cn',
                zoomMin: 1000 * 60 * 15,
                moveable: false,
                zoomable: false,
                showCurrentTime: false,
                // throttleRedraw: 100
            };
            // Create a Timeline
            this.timeline = new vis.Timeline(container, items, options);
            this.timelineWindow = this.timeline.getWindow();
            let interval = this.timelineWindow.end - this.timelineWindow.start;
            this.timelineWidth = $("#" + this.settings.timelineContainer).width();
            this.msPerPix = Math.floor(interval / this.timelineWidth);
        }
    
        this.stage.contentRoot.scale.x = 1;
        this.stage.contentRoot.scale.y = 1;
        this.stage.contentRoot.position.x = 0;
        this.stage.contentRoot.position.y = 120; // 与时间标尺高度保持一致
        this.stage.contentRoot.scalable = false;
        let posX = 50, // local position in root;
            posY = 50; //starting point to layout nodes.
        let iconSize = this.visualConfig.NODE_WIDTH,
            marginY = 30;
        _.each(this.nodeSprites, function (ns) {
            ns.updateNodePosition({
                x: posX,
                y: posY,
            });
            ns.timelineMode = true;
            // layout.setNodePosition(ns.id, posX, posY);
            posY += (iconSize + marginY);
        });
        // var sortedLinkSprites = sortLinksByDateTime();
        let timelineStartMs = this.timelineWindow.start.valueOf();
        this.originSpotTime = timelineStartMs;
        let minX = 10000;
        this.positionLinksByTime(this.linkSprites, timelineStartMs);
        let nodeX = -40;
        _.each(this.nodeSprites, function (ns) {
            ns.updateNodePosition({
                x: nodeX,
                y: ns.position.y,
            });
        });
        // if nodeX is too much left, try to move it to center
        this.stage.isTimelineLayout = true;
        this.stage.contentRoot.position.x = leftSpacing || this.visualConfig.timelineLayout['margin-left'] + 60;
        this.stage.contentRootMoved();
    };
    
    /**
     * draw lines between nodes
     */
    drawNodeTimelines() {
        let nodeTimelineStyle = this.visualConfig.ui.timeline;
        let endX = (this.timelineWidth - this.stage.contentRoot.position.x) / this.stage.contentRoot.scale.x + 200;
        this.lineGraphics.lineStyle(nodeTimelineStyle.width, nodeTimelineStyle.color, 1);
        const layout = this;
        _.each(this.nodeSprites, function (ns) {
            if (ns.visible) {
                layout.lineGraphics.beginFill(nodeTimelineStyle.color, 1);
                layout.lineGraphics.drawCircle(-100, ns.position.y, 5);
                layout.lineGraphics.endFill();
                layout.lineGraphics.moveTo(-100, ns.position.y);
                layout.lineGraphics.lineTo(endX, ns.position.y);
                layout.lineGraphics.beginFill(nodeTimelineStyle.color, 1);
                layout.lineGraphics.drawCircle(endX, ns.position.y, 5);
                layout.lineGraphics.endFill();
            }
        });
    }
    
    /**
     * disable timeline layout
     */
    disableTimelineLayout() {
        this.timeline.destroy();
        this.timeline = null;
        this.stage.isTimelineLayout = false;
        _.each(this.nodeSprites, function (ns) {
            ns.timelineMode = false;
        });
        _.each(this.linkSprites, function (ls) {
            ls.forceStraightLine = false;
        });
    }
    
    /**
     * zoom timeline layout
     * @param {*} percentage 
     */
    zoomTimeline(percentage) {
        let range = this.timeline.getWindow();
        let interval = range.end - range.start;
        this.zoomTimelineThrottled({
            start: range.start.valueOf() - interval * percentage,
            end: range.end.valueOf() + interval * percentage,
            option: {
                animation: false,
            },
        })
    }
    
    positionLinksByTime(linkSprites, screenStartTime) {
        const layout = this;
        _.each(linkSprites, function (ls) {
            if (!ls.visible) {
                return;
            }

            let linkDatetime = ls.data.datetime;
            let ms = moment(linkDatetime).valueOf();
            let viewX = Math.floor((ms - screenStartTime) / layout.msPerPix);
            let x = (viewX - layout.stage.contentRoot.position.x) / layout.stage.contentRoot.scale.x; // FIXME, assuming root is not scaled.
            // console.log(linkDatetime + "@ " + x + "(" + viewX + ")");
            let srcNodeSprite = layout.nodeSprites[ls.data.sourceEntity];
            let tgtNodeSprite = layout.nodeSprites[ls.data.targetEntity];
            let fromX = x,
                fromY = srcNodeSprite.position.y;
            let toX = x,
                toY = tgtNodeSprite.position.y;
            ls.forceStraightLine = true;
            ls.setFrom({
                x: fromX,
                y: fromY,
            });
            ls.setTo({
                x: toX,
                y: toY,
            });
        });
    }
}
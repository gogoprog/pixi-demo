import renderer from './render/PixiRenderer';
import visualConfig from "./render/visualConfig";

import EntityStatistics from './chart/statistics/EntityStatistics';
import LinkStatistics from "./chart/statistics/LinkStatistics";
import StatisticsList from "./chart/statistics/StatisticsList";

import LinkMergeFilter from "./chart/graph/linkMerging/LinkMergeFilter";
import Constant from "./chart/Constant";
import Chart from "./chart/Chart";
import AnalyticConfig from "./chart/AnalyticConfig";
import Graph from "./chart/graph/Graph";
// import GraphEngine from "./chart/GraphEngine";
import EntityData from "./chart/elp/EntityData";
import LinkData from "./chart/elp/LinkData";
import Command from "./chart/undoredo/Command";

// function GraphZ() {
//
// }
//
// GraphZ.renderer = renderer;

export default {
    renderer,
    visualConfig,

    EntityStatistics,
    LinkStatistics,
    StatisticsList,

    LinkMergeFilter,
    Constant,
    Chart,
    AnalyticConfig,
    Graph,
    // GraphEngine,
    EntityData,
    LinkData,
    Command,
};

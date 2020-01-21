<template>
    <div class="main">
        <div class="title">GraphZ渲染模块示例</div>
        <div class="example-container">
            <div class="canvas-container">
              <div class="action-container"></div>
              <div id="renderArea" class="render-area"></div>
            </div>
        </div>
    </div>
</template>

<script>

import graphz from "graphz";

export default {
  data() {
    return {};
  },
  created() {},
  mounted() {
    this.init();
  },
  methods: {
    async init() {
      const globalELPModelResponse = await fetch(
        "/static/data/globalELPModel.json"
      );
      const globalELPModel = await globalELPModelResponse.json();

      this.chart = new graphz.Chart({
        elpData: globalELPModel,
        container: "renderArea"
      });

      this.chart.initAssets({ font: "/static/font/noto.fnt" }).then(() => {
        this.loadChart();
      });
    },

    async loadChart() {
      await this.chart.clearGraph();

      let chartData = {
        entities: [
          {
            type: "people",
            id: "people~`#321284198702201103",
            label: "321284198702201103",
            style: null,
            properties: {
              _$x: -288.04855570159026,
              _$y: -363.5339239270416
            }
          }
        ],
        links: []
      };

      this.chart.execute("addSubGraph", chartData).then(() => {
      });
    }
  }
};
</script>

<style lang="scss">
    html, body {
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
    }

    .main {
        width: 100%;
        height: 100%;

        .title {
            height: 50px;
            line-height: 50px;
            font-size: 20px;
            font-weight: bold;
        }
    }

    .example-container {
        height: calc(100% - 100px);

        display: flex;
        flex-direction: row;
    }

    .canvas-container {
      position: relative;
      width: 100%;
      height: 100%;

      .render-area {
        width: 100%;
        height: 100%;
      }
    }

    .action-container {
      position: absolute;
      top: 0;
      left: 0;
    }
    
</style>

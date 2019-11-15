<template>
    <div class="canvas-container">
        <!-- 分析画布 -->
        <div class="action-container">
            <button class="btn" @click.prevent.stop="forceLayout"> 网络</button>
            <button class="btn" @click.prevent.stop="forceLayoutWASM"> 网络(WASM)</button>
            <button class="btn" @click.prevent.stop="setLayoutType('Structural')"> 结构</button>
            <button class="btn" @click.prevent.stop="circleLayout"> 圆形</button>
            <button class="btn" @click.prevent.stop="setLayoutType('Layered')"> 层次</button>
            <button class="btn" @click.prevent.stop="setLayoutType('Radiate')"> 辐射</button>
            <span> / </span>
            <button class="btn" @click.prevent.stop="toggleMode"> 拖动/选中</button>
            <span>(36490 x 42625)</span>
        </div>
        <div id="renderArea" class="render-area"></div>
    </div>
</template>

<script>
    import graphz from 'graphz';

    import globalELPModel from './data/globalELPModel';
    import bigChartData from './data/bigChartData';

    export default {
        data() {
            return {

            };
        },
        created() {

        },
        mounted() {
            this.init();
        },
        methods: {
            async init() {
                const globalELPModelResponse = await fetch('/static/data/globalELPModel.json');
                const globalELPModel = await globalELPModelResponse.json();
                const chartDataResponse = await fetch('/static/data/bigChartData.json');
                const chartData = await chartDataResponse.json();
                this.chart = new graphz.Chart({
                    elpData: globalELPModel,
                    container: 'renderArea'
                });

                this.chart.initAssets().then(() => {
                    this.chart.execute('addSubGraph', chartData).then(() => {
                        console.log('add data success!');
                        this.chart.renderer.setNodesToFullScreen();
                    });
                });
            },

            setLayoutType(layoutType) {
                this.chart.execute('setLayoutType', layoutType);
            },

            forceLayout() {
                this.chart.renderer.force().then(() => {
                    this.chart.renderer.setNodesToFullScreen();
                });
            },

            forceLayoutWASM() {
                this.chart.renderer.forceWASM().then(() => {
                    this.chart.renderer.setNodesToFullScreen();
                });
            },

            circleLayout() {
                this.chart.renderer.circle().then(() => {
                    this.chart.renderer.setNodesToFullScreen();
                });
            },

            toggleMode() {
                this.chart.renderer.toggleMode();
            },
        },
    }
</script>

<style lang="scss">
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

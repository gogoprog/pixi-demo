<template>
    <div class="canvas-container">
        <!-- 分析画布 -->
        <div class="action-container">
            <button class="btn" @click.prevent.stop="forceLayout"> 网络</button>
            <button class="btn" @click.prevent.stop="forceLayoutWASM"> 网络(WASM)</button>
            <button class="btn" @click.prevent.stop="circleLayout"> 圆形</button>
            <button class="btn" @click.prevent.stop="circleLayoutWASM"> 圆形(WASM)</button>
            <button class="btn" @click.prevent.stop="setLayoutType('Radiate')"> 辐射</button>
            <button class="btn" @click.prevent.stop="rotateLayoutWASM"> 旋转(WASM)</button>
            <button class="btn" @click.prevent.stop="setLayoutType('Structural')"> 结构</button>
            <button class="btn" @click.prevent.stop="setLayoutType('Layered')"> 层次</button>
            <button class="btn" @click.prevent.stop="spreadLayoutWASM"> 放大(WASM)</button>
            <button class="btn" @click.prevent.stop="shrinkLayoutWASM"> 缩小(WASM)</button>

            <span> / </span>

            <button class="btn" @click.prevent.stop="toggleMode"> 拖动/选中</button>

            <span> / </span>

            <select v-model="dataSource" @change="loadChart">
                <option disabled value="">Please select one</option>
                <option>smallChartData</option>
                <option>chartData</option>
                <option>bigChartData</option>
                <option>airRoutes</option>
            </select>
            <span>Selected: {{ dataSource }}</span>
        </div>
        <div id="renderArea" class="render-area"></div>
    </div>
</template>

<script>
    import graphz from 'graphz';
    import loadAirRoutes from "./loadAirRoutes";

    export default {
        data() {
            return {
                dataSource: 'smallChartData',
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

                this.chart = new graphz.Chart({
                    elpData: globalELPModel,
                    container: 'renderArea'
                });

                this.chart.initAssets({ font: '/static/font/noto.fnt' }).then(() => {
                    this.loadChart();
                });
            },

            async loadChart() {
                let chartData;
                if (this.dataSource === 'airRoutes') {
                    chartData = await loadAirRoutes();
                } else {
                    const chartDataResponse = await fetch(`/static/data/${this.dataSource}.json`);
                    chartData = await chartDataResponse.json();
                }

                this.chart.execute('addSubGraph', chartData).then(() => {
                    console.log('add data success!')
                    this.chart.renderer.setNodesToFullScreen();
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

            circleLayout() {
                this.chart.renderer.circle().then(() => {
                    this.chart.renderer.setNodesToFullScreen();
                });
            },

            forceLayoutWASM() {
                this.chart.renderer.WASMLayout('force').then(() => {
                    this.chart.renderer.setNodesToFullScreen();
                });
            },

            circleLayoutWASM() {
                this.chart.renderer.WASMLayout('circle').then(() => {
                    this.chart.renderer.setNodesToFullScreen();
                });
            },

            rotateLayoutWASM() {
                this.chart.renderer.WASMLayout('rotate').then(() => {
                    this.chart.renderer.setNodesToFullScreen();
                });
            },

            spreadLayoutWASM() {
                this.chart.renderer.WASMLayout('spread').then(() => {
                    this.chart.renderer.setNodesToFullScreen();
                });
            },

            shrinkLayoutWASM() {
                this.chart.renderer.WASMLayout('shrink').then(() => {
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

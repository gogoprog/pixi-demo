<template>
    <div class="canvas-container">
        <!-- 分析画布 -->
        <div class="action-container">
            <button class="btn" @click.prevent.stop="setLayoutType('Network')"> 网络</button>
            <button class="btn" @click.prevent.stop="setLayoutType('Structural')"> 结构</button>
            <button class="btn" @click.prevent.stop="setLayoutType('Circular')"> 圆形</button>
            <button class="btn" @click.prevent.stop="setLayoutType('Layered')"> 层次</button>
            <button class="btn" @click.prevent.stop="setLayoutType('BrokenLineLayered')"> 折线</button>
            <button class="btn" @click.prevent.stop="setLayoutType('Radiate')"> 辐射</button>
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
            init() {
                this.chart = new graphz.Chart({
                    elpData: globalELPModel,
                    container: 'renderArea'
                });

                this.chart.initAssets().then(() => {
                    this.chart.execute('addSubGraph', bigChartData).then(() => {
                        console.log('add data success!')
                    });
                });
            },

            setLayoutType(layoutType) {
                this.chart.execute('setLayoutType', layoutType);
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

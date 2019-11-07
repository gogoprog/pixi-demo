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
        </div>
        <div id="renderArea" class="render-area"></div>
    </div>
</template>

<script>
    import graphz from 'graphz';

    import globalELPModel from './data/globalELPModel';
    import chartData from './data/chartData';

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
                this.chart = graphz.Chart.createTemporaryChart("aaa", "bbb", `临时分析`, null, globalELPModel, 'renderArea');

                this.chart.initAssets().then(() => {
                    this.chart.execute('addSubGraph', chartData).then(() => {
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

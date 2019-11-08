<template>
    <div class="canvas-container">
        <!-- 分析画布 -->
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
                this.chart = new graphz.Chart({
                    elpData: globalELPModel,
                    container: 'renderArea'
                });

                this.chart.initAssets().then(() => {
                    this.chart.execute('addSubGraph', chartData).then(() => {
                        console.log('add data success!')
                    });
                });
            },
        },
    }
</script>

<style lang="css">
.canvas-container {
    width: 100%;
    height: 100%;
}

.render-area {
    width: 100%;
    height: 100%;
}

</style>

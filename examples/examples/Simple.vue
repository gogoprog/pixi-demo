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
                const temporaryChart = graphz.Chart.createTemporaryChart("aaa", "bbb", `临时分析`, null, globalELPModel, 'renderArea');

                temporaryChart.execute('addSubGraph', chartData).then(() => {
                    console.log('add data success!')
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

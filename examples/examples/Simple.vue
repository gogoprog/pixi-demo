<template>
    <div class="canvas-container">
        <!-- 分析画布 -->
        <div id="renderArea" class="render-area"></div>
    </div>
</template>

<script>
    import graphz from 'graphz';

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

                this.chart = new graphz.Chart({
                    elpData: globalELPModel,
                    container: 'renderArea'
                });

                const chartDataResponse = await fetch('/static/data/chartData.json');
                const chartData = await chartDataResponse.json();

                this.chart.execute('addSubGraph', chartData).then(() => {
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

<template>
    <div class="main">
        <!-- 分析画布 -->
        <div id="renderArea" class="render-area"></div>
    </div>
</template>

<script>
    import graphz from 'graphz';

    import globalELPModel from './globalELPModel';
    import chartData from './chartData';

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

                // temporaryChart.execute('addSubGraph', chartData).then(() => {
                //     console.log('add data success!')
                // });

                temporaryChart.initAssets().then(() => {
                    temporaryChart.execute('addSubGraph', chartData).then(() => {
                        console.log('add data success!')
                    });
                });
            },
        },
    }
</script>

<style lang="css">
html, body {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
}

.main {
    width: 100%;
    height: 100%;
}

.render-area {
    width: 100%;
    height: 100%;
}

</style>

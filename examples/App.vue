<template>
    <div class="main">
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
            init() {
                const self = this;
                const settings = new graphz.Settings('renderArea', 'visTimeline', graphz.visualConfig);
                settings.loadResources().then(() => {
                    console.log('1111');

                    self.pixiRenderer = graphz.renderer(settings);

                    self.pixiRenderer.run();

                    console.log('2222');
                });
            },
        },
    }

</script>

<style lang="css">
html, body {
    width: 100%;
    height: 100%;
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

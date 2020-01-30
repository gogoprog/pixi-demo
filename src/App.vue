<template>
  <div id="renderArea" class="render-area"></div>
</template>

<script>
import PixiRenderer from "./render/PixiRenderer";
import constructOptions from "./render/constructOptions";

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
      const rendererOptions = constructOptions("renderArea");
      this.renderer = PixiRenderer(rendererOptions);
      this.renderer.addNode();
      this.renderer.run();
    },
  }
};
</script>

<style lang="css">
  html, body {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
  }

  .render-area {
      width: 100%;
      height: 100%;
  }
    
</style>

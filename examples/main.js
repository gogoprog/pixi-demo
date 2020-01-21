import "core-js/stable";
import "regenerator-runtime/runtime";

import Vue from 'vue';
import App from './App.vue';

// 开启debug模式
Vue.config.debug = true;

const app = new Vue({
    render: (h) => h(App),
}).$mount('#app');

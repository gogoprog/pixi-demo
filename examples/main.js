import "core-js/stable";
import "regenerator-runtime/runtime";

import Vue from 'vue';
import VueRouter from 'vue-router';
import App from './App.vue';

import Layout from "./Layout.vue";

Vue.use(VueRouter);

// 开启debug模式
Vue.config.debug = true;

const routes = [
    {
        path: '/layout',
        component: Layout,
    },
];

const router = new VueRouter({
    // mode: 'history',
    linkActiveClass: 'active',
    routes // short for `routes: routes`
});

const app = new Vue({
    render: (h) => h(App),
    router,
}).$mount('#app');

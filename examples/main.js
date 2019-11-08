import "core-js/stable";
import "regenerator-runtime/runtime";

import Vue from 'vue';
import VueRouter from 'vue-router';
import App from './App.vue';

import Simple from "./examples/Simple.vue";
import SimpleResource from "./examples/SimpleResource.vue";
import Layout from "./examples/Layout.vue";
import Performance from "./examples/Performance.vue";

Vue.use(VueRouter);

// 开启debug模式
Vue.config.debug = true;

const routes = [
    {
        path: '/simple',
        component: Simple,
    },
    {
        path: '/simple-resource',
        component: SimpleResource,
    },
    {
        path: '/layout',
        component: Layout,
    },
    {
        path: '/performance',
        component: Performance,
    }
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

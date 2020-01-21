<template>
    <div class="main">
        <div class="title">GraphZ渲染模块示例</div>
        <div class="menu-bar-horizontal">
            <a class="active">Examples</a>
        </div>
        <div class="example-container">
            <router-view class="main-content"></router-view>
        </div>
    </div>
</template>

<script>
    export default {
        data() {
            return {

            };
        },
        created() {
        },
        mounted() {
        },
        methods: {
        },
    }
</script>

<style lang="scss">
    html, body {
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
    }

    .main {
        width: 100%;
        height: 100%;

        .title {
            height: 50px;
            line-height: 50px;
            font-size: 20px;
            font-weight: bold;
        }

        .menu-bar-horizontal {
            height: 50px;
            background-color: #5f5f5f;
            overflow: hidden;
        }
        .menu-bar-horizontal a {
            float: left;
            color: #f2f2f2;
            text-align: center;
            padding: 14px 16px;
            text-decoration: none;
            font-size: 17px;
        }
        .menu-bar-horizontal a:hover {
            background-color: #ddd;
            color: black;
        }
        .menu-bar-horizontal a.active {
            background-color: #37af57;
            color: white;
        }
    }

    .example-container {
        height: calc(100% - 100px);

        display: flex;
        flex-direction: row;

        .menu-bar-vertical {
            background-color: #f1f1f1;
            overflow: hidden;
            width: 180px;

            display: flex;
            flex-direction: column;
        }
        .menu-bar-vertical a {
            float: left;
            color: #000;
            text-align: center;
            padding: 14px 16px;
            text-decoration: none;
            font-size: 17px;

            display: block;
        }
        .menu-bar-vertical a:hover {
            background-color: #ddd;
            color: black;
        }
        .menu-bar-vertical a.active {
            background-color: #5abf40;
            color: white;
        }
    }

    /* Style buttons */
    .btn {
        background-color: #5abf30; /* Blue background */
        border: none; /* Remove borders */
        color: white; /* White text */
        padding: 12px 16px; /* Some padding */
        font-size: 16px; /* Set a font size */
        cursor: pointer; /* Mouse pointer on hover */
    }

    /* Darker background on mouse-over */
    .btn:hover {
        background-color: #5a7f30;
    }

</style>

# 前端图库（包含图渲染与图分析）


## 说明
1. 本仓库是前端图库的代码，图渲染与图分析，须加载在目标项目的/src/assets/js/render，后期重构为npm方式使用

2. 为了使用本代码，需要安装 
    
    a.  "d3-force"
    
    b.  "eventemitter3"
    
    c.  "ngraph.events"
    
    d.  "ngraph.forcelayout"
    
    e.  "ngraph.generators"
    
    f.  "pixi-gl-core"
    
    g.  "pixi.js"
    
    h.  "raw-loader"
    
    i.  @babel/plugin-transform-modules-commonjs
    
    j.  @babel/plugin-transform-modules-amd
    
3. 需要在babel.config.js中添加一下配置

``````
module.exports = {
    presets: ['@vue/app'],
    plugins: [
        '@babel/plugin-transform-modules-commonjs',
        '@babel/plugin-transform-modules-amd',
        'lodash',
    ]
};

``````

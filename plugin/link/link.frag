varying float vSelected;
varying float vVertexID;
varying vec3 vColor;
varying float vHasArrow;

void main(void){
    if (vVertexID >= 18.0 && vHasArrow < 0.5) {
        discard;
    } else if (vSelected < 0.5) {
        gl_FragColor = vec4(vColor.rgb / vec3(256, 256, 256), 1.0);
    } else {
        // lineStyle.highlight.color : 0x3663ce
        gl_FragColor = vec4(0.2109375,0.38671875,0.8046875,1);
    }
}

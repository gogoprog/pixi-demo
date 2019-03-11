varying vec2 vTextureCoord;
varying float vIsUnknown;
varying float vSelected;
varying float vVertexID;

uniform sampler2D uSampler;
uniform sampler2D uSelectedSampler;

void main(void){
    if (vVertexID < 6.0) {
        if (vSelected < 0.5) {
            discard;
        } else {
            gl_FragColor = texture2D(uSelectedSampler, vTextureCoord);
        }
    } else {
        gl_FragColor = texture2D(uSampler, vTextureCoord);
    }

    // If the node is unknown type, we only show the grey color;
    if (vIsUnknown > 0.5) {
        float grayscale = dot(gl_FragColor.rgb, vec3(0.3,0.59,0.11));
        gl_FragColor = vec4(grayscale, grayscale, grayscale, gl_FragColor.a);
    }
}

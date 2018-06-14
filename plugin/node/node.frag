varying vec2 vTextureCoord;
varying float vIsUnknown;

uniform sampler2D uSampler;

void main(void){
    gl_FragColor = texture2D(uSampler, vTextureCoord);

    // If the node is unknown type, we only show the grey color;
    if (vIsUnknown > 0.5) {
        float grayscale = dot(gl_FragColor.rgb, vec3(0.3,0.59,0.11));
        gl_FragColor = vec4(grayscale, grayscale, grayscale, gl_FragColor.a);
    }
}

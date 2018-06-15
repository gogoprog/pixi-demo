attribute vec2 aVertexPosition;
attribute float aVertexID;

attribute vec2 aOffset;
attribute float aScale;
attribute float aIconIndex;
attribute float aIsUnknown;

uniform mat3 projectionMatrix;

varying vec2 vTextureCoord;
varying float vIsUnknown;

void main(void){
    vec2 position = aScale * aVertexPosition + aOffset;

    gl_Position = vec4((projectionMatrix * vec3(position, 1.0)).xy, 0.0, 1.0);


    float row = floor(aIconIndex / 10.0);
    float column = aIconIndex - row * 10.0;
    float x0 = column * 0.1;  // 0.1: width of every icon
    float y0 = row * 0.1; // 0.083: height of every icon

    if(aVertexID == 0.0){
      vTextureCoord = vec2(x0, y0);
    } else if(aVertexID == 1.0) {
      vTextureCoord = vec2(x0 + 0.1, y0);
    } else if(aVertexID == 2.0) {
      vTextureCoord = vec2(x0 + 0.1, y0 + 0.1);
    } else if(aVertexID == 3.0) {
      vTextureCoord = vec2(x0, y0);
    } else if(aVertexID == 4.0) {
      vTextureCoord = vec2(x0 + 0.1, y0 + 0.1);
    } else if(aVertexID == 5.0) {
      vTextureCoord = vec2(x0, y0 + 0.1);
    }

    vIsUnknown = aIsUnknown;
}

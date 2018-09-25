attribute vec2 aVertexPosition;
attribute float aVertexID;

attribute vec2 aOffset;
attribute float aScale;
attribute float aIconIndex;
attribute float aIsUnknown;
attribute float aSelected;

uniform mat3 projectionMatrix;
uniform mat3 transformMatrix;

varying vec2 vTextureCoord;
varying float vIsUnknown;
varying float vSelected;
varying float vVertexID;

void main(void){
    vec2 position = aScale * aVertexPosition + aOffset;

    gl_Position = vec4((projectionMatrix * transformMatrix * vec3(position, 1.0)).xy, 0.0, 1.0);

    float row = floor(aIconIndex / 20.0);
    float column = aIconIndex - row * 20.0;
    float x0 = column * 0.05;  // 0.1: width of every icon
    float y0 = row * 0.05; // 0.083: height of every icon

    // first draw selected frame
    if(aVertexID == 0.0){
        vTextureCoord = vec2(0.0, 0.0);
    } else if(aVertexID == 1.0) {
        vTextureCoord = vec2(1.0, 0.0);
    } else if(aVertexID == 2.0) {
        vTextureCoord = vec2(1.0, 1.0);
    } else if(aVertexID == 3.0) {
        vTextureCoord = vec2(0.0, 0.0);
    } else if(aVertexID == 4.0) {
        vTextureCoord = vec2(1.0, 1.0);
    } else if(aVertexID == 5.0) {
        vTextureCoord = vec2(0.0, 1.0);
    // second draw the entity icon
    } else if(aVertexID == 6.0){
        vTextureCoord = vec2(x0, y0);
    } else if(aVertexID == 7.0) {
        vTextureCoord = vec2(x0 + 0.1, y0);
    } else if(aVertexID == 8.0) {
        vTextureCoord = vec2(x0 + 0.1, y0 + 0.1);
    } else if(aVertexID == 9.0) {
        vTextureCoord = vec2(x0, y0);
    } else if(aVertexID == 10.0) {
        vTextureCoord = vec2(x0 + 0.1, y0 + 0.1);
    } else if(aVertexID == 11.0) {
        vTextureCoord = vec2(x0, y0 + 0.1);
    }

    vIsUnknown = aIsUnknown;
    vSelected = aSelected;
    vVertexID = aVertexID;
}

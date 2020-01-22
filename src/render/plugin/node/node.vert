attribute vec2 aVertexPosition;
attribute float aVertexID;

attribute vec2 aOffset;
attribute float aScale;
attribute float aIconIndex;

uniform mat3 projectionMatrix;
uniform mat3 transformMatrix;

varying vec2 vTextureCoord;
varying float vIsUnknown;
varying float vSelected;
varying float vVertexID;

void main(void){
    vec2 position = aScale * aVertexPosition + aOffset;

    gl_Position = vec4((projectionMatrix * transformMatrix * vec3(position, 1.0)).xy, 0.0, 1.0);

    float row = floor(aIconIndex / 16.0);
    float column = aIconIndex - row * 16.0;
    float x0 = column * 0.0625;  // width of every icon
    float y0 = row * 0.0625; // height of every icon

    if(aVertexID == 0.0){
        vTextureCoord = vec2(x0, y0);
    } else if(aVertexID == 1.0) {
        vTextureCoord = vec2(x0 + 0.0625, y0);
    } else if(aVertexID == 2.0) {
        vTextureCoord = vec2(x0 + 0.0625, y0 + 0.0625);
    } else if(aVertexID == 3.0) {
        vTextureCoord = vec2(x0, y0);
    } else if(aVertexID == 4.0) {
        vTextureCoord = vec2(x0 + 0.0625, y0 + 0.0625);
    } else if(aVertexID == 5.0) {
        vTextureCoord = vec2(x0, y0 + 0.0625);
    }
}

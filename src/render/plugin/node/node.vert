attribute vec2 aVertexPosition;
attribute float aVertexID;

attribute vec2 aOffset;

uniform mat3 projectionMatrix;
uniform mat3 transformMatrix;

varying vec2 vTextureCoord;

void main(void){
    vec2 position = 1.0 * aVertexPosition + aOffset;

    gl_Position = vec4((projectionMatrix * transformMatrix * vec3(position, 1.0)).xy, 0.0, 1.0);

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
    }
}

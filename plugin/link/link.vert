attribute vec2 aVertexPosition;
attribute float aVertexID;

attribute vec4 aOffset1;
attribute vec4 aOffset2;
attribute vec4 aOffset3;
attribute float aSelected;
attribute float aThickness;
attribute vec3 aColor;
attribute float aHasArrow;

uniform mat3 projectionMatrix;
uniform mat3 transformMatrix;

varying float vSelected;
varying float vVertexID;
varying vec3 vColor;
varying float vHasArrow;

vec2 rotate(vec2 v, float a) {
	float s = sin(a);
	float c = cos(a);
	mat2 m = mat2(c, -s, s, c);
	return m * v;
}

void main(void){
    vec4 currentOffset;

    if (aVertexID < 6.0) {
        currentOffset = aOffset1;
    } else if (aVertexID < 12.0) {
        currentOffset = aOffset2;
    } else if (aVertexID < 18.0){
        currentOffset = aOffset3;
    }

    vec2 position;
    if (aVertexID < 18.0) {
        position = rotate(vec2(aVertexPosition.x * currentOffset.z, aVertexPosition.y * aThickness), currentOffset.w) + currentOffset.xy;
    } else {
        position = rotate(aVertexPosition * aThickness, aOffset2.w) + aOffset2.xy;
    }
    gl_Position = vec4((projectionMatrix * transformMatrix * vec3(position, 1.0)).xy, 0.0, 1.0);

    vSelected = aSelected;
    vVertexID = aVertexID;
    vColor = aColor;
    vHasArrow = aHasArrow;
}

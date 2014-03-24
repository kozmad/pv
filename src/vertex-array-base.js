// Copyright (c) 2013-2014 Marco Biasini
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
(function(exports) {
"use strict";


function VertexArrayBase(gl, numVerts, float32Allocator) {
  this._gl = gl;
  this._vertBuffer = gl.createBuffer();
  this._float32Allocator = float32Allocator || null;
  this._ready = false;
  this._boundingSphere = null;
  var numFloats = this._FLOATS_PER_VERT * numVerts;
  this._vertData = float32Allocator.request(numFloats);
}

VertexArrayBase.prototype.setColor = function(index, r, g, b) {
  var colorStart = index * this._FLOATS_PER_VERT + this._COLOR_OFFSET;
  this._vertData[colorStart + 0] = r;
  this._vertData[colorStart + 1] = g;
  this._vertData[colorStart + 2] = b;
  this._ready = false;
};

VertexArrayBase.prototype.boundingSphere = function() {
  if (!this._boundingSphere) {
    this._boundingSphere = this._calculateBoundingSphere();
  }
  return this._boundingSphere;
};


VertexArrayBase.prototype._calculateBoundingSphere = function() {
  var numVerts = this.numVerts();
  if (numVerts === 0) {
    return null;
  }
  var center = vec3.create();
  for (var i = 0; i < numVerts; ++i) {
    var index = i * this._FLOATS_PER_VERT;
    center[0] += this._vertData[index + 0];
    center[1] += this._vertData[index + 1];
    center[2] += this._vertData[index + 2];
  }
  vec3.scale(center, center, 1.0/numVerts);
  var radiusSquare = 0.0;
  for (var i = 0; i < numVerts; ++i) {
    var index = i * this._FLOATS_PER_VERT;
    var dx  = center[0] - this._vertData[index + 0];
    var dy  = center[1] - this._vertData[index + 1];
    var dz  = center[2] - this._vertData[index + 2];
    radiusSquare = Math.max(radiusSquare, dx*dx + dy*dy + dz*dz);
  }
  return new geom.Sphere(center, Math.sqrt(radiusSquare));
};

VertexArrayBase.prototype.destroy = function() {
  this._gl.deleteBuffer(this._vertBuffer);
  this._float32Allocator.release(this._vertData);
};

VertexArrayBase.prototype.bindBuffers = function() {
  this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this._vertBuffer);
  if (this._ready) {
    return;
  }
  this._gl.bufferData(this._gl.ARRAY_BUFFER, this._vertData,
                      this._gl.STATIC_DRAW);
  this._ready = true;
};
VertexArrayBase.prototype.updateProjectionIntervals =  (function() {

  var transformedCenter = vec3.create();
  return function(xAxis, yAxis, zAxis, xInterval, yInterval, zInterval) {
    var bounds = this.boundingSphere();
    if (!bounds) {
      return;
    }
    var xProjected = vec3.dot(xAxis, bounds.center());
    var yProjected = vec3.dot(yAxis, bounds.center());
    var zProjected = vec3.dot(zAxis, bounds.center());
    xInterval.update(xProjected - bounds.radius());
    xInterval.update(xProjected + bounds.radius());
    yInterval.update(yProjected - bounds.radius());
    yInterval.update(yProjected + bounds.radius());
    zInterval.update(zProjected - bounds.radius());
    zInterval.update(zProjected + bounds.radius());
  };
})();
exports.VertexArrayBase = VertexArrayBase;

})(this);
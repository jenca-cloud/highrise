import _ from 'underscore';
import uuid from 'uuid';
import PF from 'pathfinding';
import Layout from './Layout';
import * as THREE from 'three';

const colors = {
  obstacle: 0xff0000,
  target:   0x00ff00,
  marker:   0xf4e842
};

class Surface {
  constructor(cellSize, layout, pos, color=0xaaaaaa) {
    this.id = uuid();
    this.layout = new Layout(layout);
    this.rows = this.layout.height;
    this.cols = this.layout.width;
    this.cellSize = cellSize;
    this.obstacles = [];
    this.highlighted = {};
    this.setupMesh(pos, color);
    this.annotate();
    this.grid = new PF.Grid(this.rows, this.cols);
  }

  setupMesh(pos, color) {
    var shape = new THREE.Shape(),
        vertices = this.layout.computeVertices(),
        start = vertices[0];

    // draw the shape
    shape.moveTo(start[0] * this.cellSize, start[1] * this.cellSize);
    _.each(_.rest(vertices), v => {
      shape.lineTo(v[0] * this.cellSize, v[1] * this.cellSize);
    });
    shape.lineTo(start[0] * this.cellSize, start[1] * this.cellSize);

    var geo = new THREE.ShapeGeometry(shape),
        mat = new THREE.MeshLambertMaterial({
          opacity: 0.6,
          transparent: true,
          color: color
        });

    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.rotation.x = -Math.PI/2;
    this.mesh.rotation.z = -Math.PI/2;
    this.mesh.position.copy(pos);
    this.mesh.kind = 'surface';
    this.mesh.obj = this;
  }

  coordKey(x, y) {
    return `${x}_${y}`;
  }

  highlightCoord(x, y, kind, color) {
    var key = this.coordKey(x, y);
    if (key in this.highlighted) {
      this.unhighlightCoord(x, y);
    }
    var pos = this.coordToPos(x, y),
        geo = new THREE.PlaneGeometry(this.cellSize, this.cellSize),
        mat = new THREE.MeshLambertMaterial({
          opacity: 0.6,
          transparent: false,
          color: color || colors[kind],
          side: THREE.DoubleSide
        }),
        p = new THREE.Mesh(geo, mat);

    // so the bottom-left corner is the origin
    geo.applyMatrix(
      new THREE.Matrix4().makeTranslation(this.cellSize/2, this.cellSize/2, 0));

    p.position.set(pos.x, pos.y, 0.01);
    this.mesh.add(p);
    this.highlighted[key] = {
      mesh: p,
      kind: kind
    };
  }

  unhighlightCoord(x, y) {
    var key = this.coordKey(x, y);
    if (key in this.highlighted) {
      var highlight = this.highlighted[key];
      this.mesh.remove(highlight.mesh);
      delete this.highlighted[key];
    }
  }

  existingHighlight(x, y) {
    var key = this.coordKey(x, y);
    if (key in this.highlighted) {
      return this.highlighted[key].kind;
    }
  }

  setObstacle(x, y) {
    this.unhighlightCoord(x, y);
    this.obstacles.push({x:x, y:y})
    this.grid.setWalkableAt(x, y, false);
    this.highlightCoord(x, y, 'obstacle');
  }

  removeObstacle(x, y) {
    var existing = _.findWhere(this.obstacles, {x:x, y:y});
    this.obstacles = _.without(this.obstacles, existing);
    this.grid.setWalkableAt(x, y, true);
    this.unhighlightCoord(x, y);
  }

  setPath(x, y, color) {
    this.highlightCoord(x, y, 'path', color);
  }

  removePath(x, y) {
    var key = this.coordKey(x, y);
    if (this.existingHighlight(x, y) === 'path') {
      this.unhighlightCoord(x, y);
    }
  }

  highlightPath(path, color=0x0000ff) {
    _.each(path, pos => {
      this.setPath(pos[0], pos[1], color);
    });
  }

  place(obj, x, y) {
    var pos = this.coordToPos(x, y);
    obj.mesh.position.x = pos.x;
    obj.mesh.position.y = pos.y;
    var bbox = obj.mesh.geometry.boundingBox;
    obj.mesh.position.z = Math.round(bbox.max.z - bbox.min.z)/2;
    this.mesh.add(obj.mesh);
    obj.position = {x: x, y: y};
  }

  coordToPos(x, y) {
    return {
      x: (x * this.cellSize) + this.cellSize/2 - (this.cellSize * this.rows)/2,
      y: (y * this.cellSize) + this.cellSize/2 - (this.cellSize * this.cols)/2
    };
  }

  coordToPos(x, y) {
    return {
      x: x * this.cellSize,
      y: y * this.cellSize
    };
  }

  posToCoord(x, y) {
    return {
      x: Math.round((x + (this.cellSize * this.rows)/2 - this.cellSize/2)/this.cellSize),
      y: Math.round((y + (this.cellSize * this.cols)/2 - this.cellSize/2)/this.cellSize)
    };
  }

  validCoord(x, y) {
    return x >= 0 && y >= 0 && x < this.rows && y < this.cols;
  }

  annotate() {
    var loader = new THREE.FontLoader(),
        height = 0.5,
        textMat = new THREE.MeshLambertMaterial({
          color: 0xaaaaaa
        });
    loader.load('assets/helvetiker.json', resp => {
      _.each([
        {t: 'y+', x: 0, y: this.cols},
        {t: 'x+', x: this.rows, y: 0},
        {t: '0,0', x: -1, y: -1}
      ], d => {
        var textGeo = new THREE.TextGeometry(d.t, {font:resp, size:2, height:height}),
            text = new THREE.Mesh(textGeo, textMat),
            pos = this.coordToPos(d.x, d.y);
        text.position.set(pos.x,pos.y,height/2);
        this.mesh.add(text);
      });
    });
  }
}

export default Surface;

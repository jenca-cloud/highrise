import _ from 'underscore';
import * as THREE from 'three';

class UI {
  constructor(world) {
    this.world = world;
    this.scene = world.scene;
    this.mouse = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this.selected = null;

    this.scene.renderer.domElement.addEventListener('mousedown', this.onMouseDown.bind(this), false);
    this.scene.renderer.domElement.addEventListener('touchstart', this.onTouchStart.bind(this), false);
    this.scene.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this), false);
    document.addEventListener('keydown', this.onKeyDown.bind(this), false);
  }

  updateMouse(ev) {
    // adjust browser mouse position for three.js scene
    this.mouse.x = (ev.clientX/this.scene.renderer.domElement.clientWidth) * 2 - 1;
    this.mouse.y = -(ev.clientY/this.scene.renderer.domElement.clientHeight) * 2 + 1;
  }

  onTouchStart(ev) {
    ev.preventDefault();
    ev.clientX = ev.touches[0].clientX;
    ev.clientY = ev.touches[0].clientY;
    this.onMouseDown(ev);
  }

  onMouseDown(ev) {
    ev.preventDefault();
    this.updateMouse(ev);
    this.raycaster.setFromCamera(this.mouse, this.scene.camera);

    var intersects = this.raycaster.intersectObjects(this.scene.selectables);
    if (intersects.length > 0) {
      var obj = intersects[0].object,
          pos = intersects[0].point;
      this.onSelect(obj, pos, ev);
    }
  }

  objectGridPositions(obj) {
    // convert an object's world position
    // to a grid position, accounting for offset
    var size = obj.obj.size,
        offset = {
          x: Math.floor((size.width-1)/2),
          z: Math.floor((size.depth-1)/2)
        },
        pos = this.world.worldToGrid(obj.position.x + offset.x, obj.position.z + offset.z);
    return _.chain(_.range(size.width)).map(i => {
      return _.map(_.range(size.depth), j => {
        return {
          x: pos.x - i,
          y: pos.y - j
        };
      });
    }).flatten().value();
  }

  onSelect(obj, pos, ev) {
    var pos = this.world.worldToGrid(pos.x, pos.z);
    if (ev.buttons === 1) {
      if (this.selected) {
        this.scene.selectables.push(this.selected);
        _.each(
          this.objectGridPositions(this.selected),
          pos => this.world.setObstacle(pos.x, pos.y));
        this.selected = null;
      } else if (obj.type === 'obstacle') {
        this.selected = obj;
      }
    } else if (ev.buttons === 2) {
      switch (obj.type) {
        case 'obstacle':
          // remove obstacle
          _.each(
            this.objectGridPositions(obj),
            pos => this.world.removeObstacle(pos.x, pos.y));
          this.scene.remove(obj);
          break;
        case 'ground':
          // set target
          this.world.setTarget(pos.x, pos.y);
          break;
      }
    }
  }

  onMouseMove(ev) {
    if (this.selected) {
      this.updateMouse(ev);
      this.raycaster.setFromCamera(this.mouse, this.scene.camera);

      var intersects = this.raycaster.intersectObject(this.world.floor.mesh);
      if (intersects.length > 0) {
        var pos = intersects[0].point;
        pos = this.world.worldToGrid(pos.x, pos.z);
        pos = this.world.gridToWorld(pos.x, pos.y);
        var size = this.selected.obj.size,
            offset = {
              x: (size.width - 1)/2,
              z: (size.depth - 1)/2
            };
        this.selected.position.set(
          pos.x - offset.x,
          this.world.floor.mesh.position.y + size.height/2,
          pos.z - offset.z);
      }
    }
  }

  onKeyDown(ev) {
    switch (ev.keyCode) {
      case 82: // r
        if (this.selected) {
          this.selected.rotation.y += Math.PI/2;
        }
        break;
    }
  }
}

export default UI;

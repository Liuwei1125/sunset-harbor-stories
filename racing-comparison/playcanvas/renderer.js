import {roadX, roadY, roadDX, clamp} from '../shared/simulation.js';
const pc = window.pc;
const degrees = 180 / Math.PI;
const color = hex => new pc.Color().fromString(hex);

// The simulation uses +Z forward. PlayCanvas receives -Z forward, including
// positions, normals, camera targets and yaw; the shared files stay unchanged.
export class Renderer {
  constructor(canvas, rules, models, world) {
    this.rules = rules;
    this.canvas = canvas;
    this.cameraMode = 0;
    this.fov = .98;
    this.materials = {};
    this.chunks = [];
    this.scenery = [];
    this.traffic = [];
    this.models = new Map(models.models.map(model => [model.name, model]));
    this.app = new pc.Application(canvas, {graphicsDeviceOptions: {
      antialias: true, alpha: false, preserveDrawingBuffer: true,
      powerPreference: 'high-performance'
    }});
    this.app.graphicsDevice.maxPixelRatio = 1;
    this.quality = 'high';
    this.resize();
    addEventListener('resize', () => this.resize());
    this.worldRoot = new pc.Entity('world');
    this.app.root.addChild(this.worldRoot);
    this.prepared = this.initialize(world);
  }

  resize() {
    const scale = this.quality === 'high' ? 1 : 1 / 1.5;
    this.app.setCanvasResolution(pc.RESOLUTION_FIXED,
      Math.round(innerWidth * scale), Math.round(innerHeight * scale));
  }

  async texture(name, srgb = true) {
    const image = new Image();
    image.src = '../shared/textures/' + name;
    await image.decode();
    const texture = new pc.Texture(this.app.graphicsDevice, {
      name, width: image.width, height: image.height, srgb,
      mipmaps: true, anisotropy: 4,
      addressU: pc.ADDRESS_REPEAT, addressV: pc.ADDRESS_REPEAT
    });
    texture.setSource(image);
    return texture;
  }

  async initialize(world) {
    const app = this.app;
    const textures = await Promise.all(['road.png', 'road-normal.png', 'grass.png',
      'rock.png', 'sky.png'].map(name => this.texture(name, name !== 'road-normal.png')));
    const [asphalt, normal, grass, rock, panorama] = textures;
    panorama.projection = pc.TEXTUREPROJECTION_EQUIRECT;
    const lighting = pc.EnvLighting.generateLightingSource(panorama, {size: 128});
    app.scene.envAtlas = pc.EnvLighting.generateAtlas(lighting, {
      size: 512, numReflectionSamples: 256, numAmbientSamples: 512
    });
    app.scene.skybox = pc.EnvLighting.generateSkyboxCubemap(panorama, 256);
    app.scene.skyboxIntensity = .65;
    app.scene.ambientLight = new pc.Color(.12, .15, .19);
    app.scene.exposure = 1.1;
    app.scene.fog.type = pc.FOG_LINEAR;
    app.scene.fog.color = new pc.Color(.68, .78, .83);
    app.scene.fog.start = 230;
    app.scene.fog.end = 650;
    this.camera = new pc.Entity('driver');
    this.camera.addComponent('camera', {nearClip: .035, farClip: 750,
      fov: this.fov * degrees, clearColor: new pc.Color(.67, .78, .85),
      toneMapping: pc.TONEMAP_ACES});
    app.root.addChild(this.camera);
    this.frame = new pc.CameraFrame(app, this.camera.camera);
    this.frame.rendering.toneMapping = pc.TONEMAP_ACES;
    this.frame.rendering.samples = 2;
    this.frame.bloom.intensity = .035;
    this.frame.bloom.blurLevel = 5;
    this.frame.grading.enabled = true;
    this.frame.grading.contrast = 1.05;
    this.frame.update();
    this.sun = new pc.Entity('late morning');
    this.sun.addComponent('light', {type: 'directional', color: new pc.Color(1, .92, .79),
      intensity: 2.9, castShadows: true, shadowResolution: 2048,
      shadowDistance: 180, numCascades: 2, cascadeDistribution: .75,
      shadowType: pc.SHADOW_PCF3_32F, shadowBias: .1, normalOffsetBias: .02});
    // Directional lights emit along local -Y.
    this.sun.setLocalRotation(new pc.Quat().setFromDirections(
      new pc.Vec3(0, -1, 0), new pc.Vec3(.54, -.72, .49).normalize()));
    app.root.addChild(this.sun);
    const road = this.pbr('road', '#ffffff', .92, 0, asphalt);
    road.normalMap = normal; road.bumpiness = .28; road.update();
    this.pbr('grass', '#ffffff', 1, 0, grass);
    this.pbr('rock', '#ffffff', .96, 0, rock);
    this.pbr('foliage', '#ffffff', 1);
    this.pbr('bark', '#ffffff', 1);
    for (const name of ['rock', 'foliage', 'bark']) {
      this.materials[name].diffuseVertexColor = true;
      this.materials[name].update();
    }
    this.pbr('rail', '#a7adb0', .44, .63);
    this.pbr('post', '#77817d', .75, .3);
    this.pbr('edge', '#aba794', .97);
    this.pbr('sign', '#285b44', .75);
    this.pbr('sea', '#3e7e91', .19, .25);
    this.pbr('headliner', '#172027', .95);
    this.pbr('mirror', '#798792', .04, 1);
    this.buildRoad();
    this.buildScenery(world);
    this.player = this.makeCar('comet-sport', '#b9d456', 'player');
    this.player.setLocalScale(.84, .84, .84);
    this.cockpit = this.makeCar('club-cockpit', '#b9d456', 'cockpit');
    this.box('roof lining', [0, 1.48, -.27], [1.42, .06, 1.65], 'headliner', this.cockpit);
    this.box('windshield header', [0, 1.455, .52], [1.40, .055, .1], 'headliner', this.cockpit);
    this.box('rear view mirror', [.12, 1.30, .4], [.25, .074, .045], 'mirror', this.cockpit);
  }

  pbr(name, hex, roughness = 1, metalness = 0, texture) {
    const material = new pc.StandardMaterial();
    material.name = name; material.diffuse = color(hex);
    material.useMetalness = true; material.metalness = metalness;
    material.gloss = 1 - roughness;
    if (texture) material.diffuseMap = texture;
    material.update();
    this.materials[name] = material;
    return material;
  }

  geometry(data) {
    const positions = data.positions.map((value, index) => index % 3 === 2 ? -value : value);
    const normals = data.normals?.length
      ? data.normals.map((value, index) => index % 3 === 2 ? -value : value)
      : pc.calculateNormals(positions, data.indices);
    const mesh = new pc.Mesh(this.app.graphicsDevice);
    mesh.setPositions(positions); mesh.setNormals(normals); mesh.setIndices(data.indices);
    if (data.uvs?.length) mesh.setUvs(0, data.uvs);
    if (data.colors?.length) mesh.setColors(data.colors);
    mesh.update();
    return mesh;
  }

  entity(name, mesh, material, parent = this.worldRoot, shadows = false) {
    const entity = new pc.Entity(name);
    const instance = new pc.MeshInstance(mesh, material, entity);
    entity.addComponent('render', {meshInstances: [instance], castShadows: shadows, receiveShadows: true});
    parent.addChild(entity);
    return entity;
  }

  box(name, position, size, material, parent, shadows = false) {
    this.boxMesh ||= pc.Mesh.fromGeometry(this.app.graphicsDevice, new pc.BoxGeometry());
    const entity = this.entity(name, this.boxMesh, this.materials[material], parent, shadows);
    entity.setLocalPosition(position[0], position[1], -position[2]);
    entity.setLocalScale(...size);
    return entity;
  }

  ribbon(name, z0, z1, xs, material, terrain = false) {
    const data = {positions: [], indices: [], uvs: []}, steps = 20;
    for (let i = 0; i <= steps; i++) for (let j = 0; j < xs.length; j++) {
      const z = z0 + (z1 - z0) * i / steps, x = xs[j];
      const offset = terrain ? -.06 + Math.max(0, Math.abs(x) - 9) * .065
        + Math.sin(z / 34 + x * .15) * Math.max(0, Math.abs(x) - 12) * .023 : 0;
      data.positions.push(roadX(z) + x, roadY(z) + offset, z);
      data.uvs.push(terrain ? x / 14 : (x + 7.7) / 15.4, terrain ? z / 14 : z / 12);
      if (i < steps && j < xs.length - 1) {
        const a = i * xs.length + j, b = a + xs.length;
        data.indices.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
    return this.entity(name, this.geometry(data), material);
  }

  buildRoad() {
    for (let z = -100; z < 8000; z += 100) {
      const root = new pc.Entity('section ' + z); this.worldRoot.addChild(root);
      this.ribbon('asphalt', z, z + 100, [-7.7, 7.7], this.materials.road).reparent(root);
      this.ribbon('terrain', z, z + 100, [-140, -90, -45, -20, -10, -7.8, 7.8, 10, 20, 45, 90, 140],
        this.materials.grass, true).reparent(root);
      for (const side of [-1, 1]) for (let dz = 0; dz < 100; dz += 10) {
        const s = z + dz + 5, x = roadX(s) + side * 8.2, y = roadY(s), yaw = -Math.atan(roadDX(s)) * degrees;
        this.box('steel barrier', [x, y + .68, s], [.10, .30, 10.15], 'rail', root, true).setLocalEulerAngles(0, yaw, 0);
        this.box('curb', [x - side * .17, y + .035, s], [.30, .10, 10.16], 'edge', root).setLocalEulerAngles(0, yaw, 0);
        this.box('rail post', [x, y + .3, s], [.14, .8, .13], 'post', root, true);
        if (dz % 20 === 0) this.box('reflector', [x - side * .073, y + .7, s], [.014, .09, .13], 'edge', root);
      }
      if (z > 0 && z % 600 === 0) {
        this.box('sign post', [roadX(z) - 10, roadY(z) + 2.5, z], [.12, 5, .12], 'rail', root, true);
        const sign = this.box('coast route', [roadX(z) - 10, roadY(z) + 4.5, z], [3, 1.4, .08], 'sign', root);
        const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 256;
        const ctx = canvas.getContext('2d'); ctx.fillStyle = '#245843'; ctx.fillRect(0, 0, 512, 256);
        ctx.strokeStyle = '#f3f4da'; ctx.lineWidth = 5; ctx.strokeRect(10, 10, 492, 236);
        ctx.fillStyle = '#f3f4da'; ctx.textAlign = 'center'; ctx.font = 'bold 55px sans-serif';
        ctx.fillText('COAST  01', 256, 100); ctx.font = '35px sans-serif';
        ctx.fillText('NORTH ↑  ' + (8 - z / 1000).toFixed(1) + ' km', 256, 177);
        const texture = new pc.Texture(this.app.graphicsDevice, {width: 512, height: 256, srgb: true}); texture.setSource(canvas);
        const material = this.pbr('sign lettering ' + z, '#ffffff', 1, 0, texture);
        sign.render.meshInstances[0].material = material;
      }
      this.chunks.push({z, root});
    }
    this.box('Pacific', [-1040, -5.05, 4000], [1900, .1, 10000], 'sea', this.worldRoot);
  }

  buildScenery(world) {
    const templates = new Map(world.meshes.map(data => [data.name, {mesh: this.geometry(data), material: this.materials[data.material]}]));
    for (const object of world.objects) {
      const template = templates.get(object.mesh);
      const entity = this.entity(object.mesh, template.mesh, template.material, this.worldRoot, true);
      entity.setLocalPosition(object.position[0], object.position[1], -object.position[2]);
      entity.setLocalScale(...object.scale); entity.setLocalEulerAngles(0, -object.yaw * degrees, 0);
      this.scenery.push({z: object.position[2], entity});
    }
  }

  makeCar(id, paint, name) {
    const root = new pc.Entity(name); root.parts = []; this.app.root.addChild(root);
    for (const part of this.models.get(id).parts) {
      const vertices = new Int16Array(Uint8Array.from(atob(part.vertices), c => c.charCodeAt(0)).buffer);
      const indices = new Uint16Array(Uint8Array.from(atob(part.indices), c => c.charCodeAt(0)).buffer);
      const data = {positions: [], normals: [], indices: Array.from(indices), uvs: []};
      const animated = part.part === 'steering' || part.part.endsWith('needle');
      for (let i = 0; i < vertices.length; i += 6) {
        data.positions.push(vertices[i] * .001 + (animated ? 0 : part.pivot[0]),
          vertices[i + 1] * .001 + (animated ? 0 : part.pivot[1]),
          -(vertices[i + 2] * .001 + (animated ? 0 : part.pivot[2])));
        data.normals.push(vertices[i + 3] / 32767, vertices[i + 4] / 32767, -vertices[i + 5] / 32767);
        data.uvs.push(vertices[i] * .001, vertices[i + 2] * .001);
      }
      const material = this.pbr(name + '/' + part.part, paint, part.paint ? .23 : part.roughness, part.paint ? .65 : part.metallic);
      if (!part.paint) material.diffuse = new pc.Color(...part.color);
      material.cull = pc.CULLFACE_NONE;
      if (part.paint) { material.clearCoat = 1; material.clearCoatGloss = .88; }
      if (part.roughness < .2) { material.metalness = .5; material.diffuse = new pc.Color(.035, .065, .085); material.gloss = .89; }
      if (part.emissive) { material.emissive = new pc.Color(...part.color); material.emissiveIntensity = 1.6; material.diffuse = new pc.Color(0, 0, 0); }
      material.update();
      const entity = this.entity(name + '/' + part.part, this.geometry(data), material, root, true);
      if (animated) entity.setLocalPosition(...part.pivot);
      root.parts.push({entity, part: part.part});
    }
    return root;
  }

  async ready(sim) {
    await this.prepared;
    this.render(sim, 0);
    // Wait for an actual rendered frame, including initial shader compilation.
    await new Promise(resolve => {this.app.once('frameend', resolve); this.app.start();});
  }

  startLoop(callback) { this.app.on('update', callback); }

  setQuality(level) {
    this.quality = level; this.resize();
    this.frame.bloom.intensity = level === 'high' ? .035 : 0;
    this.sun.light.shadowDistance = level === 'high' ? 180 : 100;
    this.frame.update();
  }

  render(sim, dt) {
    const z = sim.progress, center = roadX(z), y = roadY(z), yaw = Math.atan(roadDX(z));
    const slope = Math.atan((roadY(z + 1) - roadY(z - 1)) * .5);
    this.worldRoot.setLocalPosition(-center, -y, z);
    for (const chunk of this.chunks) chunk.root.enabled = chunk.z > z - 150 && chunk.z < z + 750;
    for (const object of this.scenery) object.entity.enabled = object.z > z - 100 && object.z < z + 680;
    const colors = ['#a5bd53', '#bfd0df', '#ba4934', '#d9d4c5', '#3f687e'];
    for (let i = 0; i < sim.traffic.length; i++) {
      const car = sim.traffic[i];
      if (!this.traffic[i]) {
        const root = this.makeCar(car.type ? 'trail-jeep' : 'comet-sport', colors[car.color], 'traffic ' + i);
        const scale = car.type ? .80 : .84; root.setLocalScale(scale, scale, scale); this.traffic[i] = root;
      }
      const root = this.traffic[i]; root.enabled = car.z - z < 680 && car.z - z > -80;
      root.setLocalPosition(roadX(car.z) + car.x - center, roadY(car.z) - y, z - car.z);
      root.setLocalEulerAngles(0, -Math.atan(roadDX(car.z)) * degrees, 0);
    }
    for (let i = sim.traffic.length; i < this.traffic.length; i++) this.traffic[i].enabled = false;
    const bodyYaw = yaw + sim.vx * .015, lean = -sim.steer * .035 * (sim.speed / 45);
    const bob = Math.sin(z * 1.1) * .004 * Math.min(1, sim.speed / 40), shake = sim.hit * Math.sin(performance.now() * .10) * .027;
    for (const root of [this.player, this.cockpit]) {
      root.setLocalPosition(sim.x, .01 + bob, 0);
      root.setLocalEulerAngles(slope * degrees, -bodyYaw * degrees, lean * degrees);
    }
    this.player.enabled = this.cameraMode !== 0; this.cockpit.enabled = this.cameraMode === 0;
    for (const part of this.cockpit.parts) {
      if (part.part === 'steering') part.entity.setLocalEulerAngles(0, 0, -sim.steer * .65 * degrees);
      if (part.part === 'speed-needle' || part.part === 'rpm-needle') part.entity.setLocalEulerAngles(0, 0, (2.2 - sim.speed / 77 * 4.4) * degrees);
    }
    let position, target;
    if (this.cameraMode === 2) {
      position = [sim.x - Math.sin(yaw) * 7, 3.3, -7]; target = [sim.x + Math.sin(bodyYaw) * 12, 1.1, 12];
    } else if (this.cameraMode === 1) {
      position = [sim.x, 1.22, 1.15]; target = [sim.x + Math.sin(bodyYaw) * 35, 1.15 + slope * 35, 36];
    } else {
      position = [sim.x - .37 * Math.cos(bodyYaw) - .82 * Math.sin(bodyYaw) + shake, 1.17 + bob, -.82 * Math.cos(bodyYaw) + .37 * Math.sin(bodyYaw)];
      target = [position[0] + Math.sin(bodyYaw) * 40, position[1] - .075 + slope * 40, position[2] + Math.cos(bodyYaw) * 40];
    }
    this.camera.setLocalPosition(position[0], position[1], -position[2]);
    this.camera.lookAt(target[0], target[1], -target[2]);
    this.camera.rotateLocal(0, 0, (lean * .55 + shake) * degrees);
    this.fov += (.98 + clamp((sim.speed - 30) / 220, 0, .22) + (sim.boosting ? .04 : 0) - this.fov) * Math.min(1, dt * 4);
    this.camera.camera.fov = this.fov * degrees;
  }

  stats() {
    const device = this.app.graphicsDevice, stats = this.app.stats;
    return {fps: stats.frame.fps, triangles: stats.frame.triangles || null,
      drawCalls: stats.drawCalls.total || null,
      countersNote: 'Production engine omits triangle profiling counters', width: device.width, height: device.height,
      webgl: 2, backend: device.deviceType};
  }
}

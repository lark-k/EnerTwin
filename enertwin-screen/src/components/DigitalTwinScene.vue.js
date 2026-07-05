import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as THREE from 'three';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
const props = defineProps();
const sceneRef = ref(null);
let renderer = null;
let labelRenderer = null;
let scene;
let camera;
let controls;
let frame = 0;
let resizeObserver = null;
let groundMaterial = null;
let gridMaterialRef = null;
const alarmDetailVisible = ref(false);
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const alarmPickables = [];
let alarmWorldPosition = null;
const updaters = [];
const labels = new Map();
const lakeBounds = {
    x: -10.6,
    z: -10.8,
    radiusX: 2.7,
    radiusZ: 1.65,
};
const campusBuildingNames = {
    a1: 'A座 综合楼',
    b2: 'B座 实验楼',
    c3: 'C座 研发中心',
    d4: 'D座 展厅',
    e5: 'E座 后勤楼',
};
const roadBounds = [
    { x: 0, z: -17.4, halfX: 29, halfZ: 3.1 },
    { x: 0, z: 13.6, halfX: 25, halfZ: 2.6 },
    { x: -29.2, z: -2.4, halfX: 2.3, halfZ: 16 },
    { x: 24.2, z: -2.4, halfX: 2.3, halfZ: 16 },
    { x: 1.5, z: -5.6, halfX: 14.5, halfZ: 2.3 },
    { x: 9.6, z: -1.6, halfX: 2, halfZ: 13 },
    { x: 18.2, z: -11.2, halfX: 7.4, halfZ: 2 },
    { x: -13.2, z: 1.6, halfX: 1.9, halfZ: 11.5 },
    { x: 0, z: -35.5, halfX: 60, halfZ: 5.5 },
    { x: -44.5, z: -3.2, halfX: 2.8, halfZ: 24 },
    { x: 32.5, z: -1.4, halfX: 3.0, halfZ: 22 },
];
const emphasisObjects = {
    pv: [],
    storage: [],
    charging: [],
    building: [],
    alarm: [],
    grid: [],
};
onMounted(() => {
    if (!sceneRef.value)
        return;
    initScene(sceneRef.value);
    applySceneMode();
    animate();
});
watch(() => props.mode, applySceneMode);
watch(() => props.nightMode, applyTheme);
watch(() => [props.storageSoc, props.pvPowerKw, props.loadPowerKw, props.chargerPowerKw], () => updateLabels());
onBeforeUnmount(() => {
    cancelAnimationFrame(frame);
    resizeObserver?.disconnect();
    controls?.dispose();
    renderer?.domElement.removeEventListener('click', handleSceneClick);
    renderer?.dispose();
});
function initScene(host) {
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(props.nightMode ? 0x061426 : 0xb6d8f0, props.nightMode ? 0.009 : 0.008);
    camera = new THREE.PerspectiveCamera(42, host.clientWidth / host.clientHeight, 0.1, 1200);
    camera.position.set(25, 15.5, 27);
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = props.nightMode ? 1.22 : 1.05;
    renderer.domElement.className = 'twin-canvas';
    renderer.domElement.addEventListener('click', handleSceneClick);
    host.appendChild(renderer.domElement);
    labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(host.clientWidth, host.clientHeight);
    labelRenderer.domElement.className = 'scene-label-layer';
    host.appendChild(labelRenderer.domElement);
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = true;
    controls.screenSpacePanning = true;
    controls.enableZoom = true;
    controls.autoRotate = false;
    controls.rotateSpeed = 0.42;
    controls.zoomSpeed = 0.75;
    controls.panSpeed = 0.45;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.minPolarAngle = Math.PI * 0.12;
    controls.minDistance = 10;
    controls.maxDistance = 62;
    controls.target.set(0, 1.8, 0);
    buildLights();
    buildSky();
    buildAerialGround();
    buildCampusCore();
    buildSurroundings();
    buildEnergyFlows();
    buildShowroomStage();
    applyTheme();
    resizeObserver = new ResizeObserver(() => {
        if (!renderer || !labelRenderer || !sceneRef.value)
            return;
        const { clientWidth, clientHeight } = sceneRef.value;
        camera.aspect = clientWidth / clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(clientWidth, clientHeight);
        labelRenderer.setSize(clientWidth, clientHeight);
    });
    resizeObserver.observe(host);
}
function buildLights() {
    scene.add(new THREE.HemisphereLight(0xd9f4ff, 0x102137, props.nightMode ? 1.7 : 2.4));
    const sun = new THREE.DirectionalLight(0xffffff, 3.2);
    sun.position.set(-18, 34, 16);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 120;
    sun.shadow.camera.left = -45;
    sun.shadow.camera.right = 45;
    sun.shadow.camera.top = 45;
    sun.shadow.camera.bottom = -45;
    scene.add(sun);
    const cyanRim = new THREE.PointLight(0x00e5ff, 95, 120);
    cyanRim.position.set(18, 8, -18);
    scene.add(cyanRim);
    const greenRim = new THREE.PointLight(0x22f59a, 70, 110);
    greenRim.position.set(-22, 9, 20);
    scene.add(greenRim);
}
function buildSky() {
    const sky = new THREE.Mesh(new THREE.SphereGeometry(170, 48, 24), new THREE.MeshBasicMaterial({
        map: createSkyTexture(),
        side: THREE.BackSide,
        transparent: true,
        opacity: props.nightMode ? 0.96 : 0.9,
    }));
    sky.position.y = 18;
    scene.add(sky);
    const horizon = new THREE.Mesh(new THREE.RingGeometry(58, 96, 160), new THREE.MeshBasicMaterial({
        color: props.nightMode ? 0x0b4261 : 0x8fc9e5,
        transparent: true,
        opacity: props.nightMode ? 0.22 : 0.18,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
    }));
    horizon.rotation.x = -Math.PI / 2;
    horizon.position.y = 0.18;
    scene.add(horizon);
    const stars = [];
    for (let i = 0; i < 1600; i += 1) {
        stars.push((Math.random() - 0.5) * 160, Math.random() * 70 + 8, (Math.random() - 0.5) * 160);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(stars, 3));
    const material = new THREE.PointsMaterial({
        color: 0xb8f4ff,
        size: 0.048,
        transparent: true,
        opacity: props.nightMode ? 0.62 : 0.24,
        blending: THREE.AdditiveBlending,
    });
    const field = new THREE.Points(geometry, material);
    scene.add(field);
    updaters.push((elapsed) => {
        field.rotation.y = elapsed * 0.012;
        material.opacity = props.nightMode ? 0.62 : 0.18;
    });
}
function createSkyTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    if (!context)
        return null;
    const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
    if (props.nightMode) {
        gradient.addColorStop(0, '#020714');
        gradient.addColorStop(0.52, '#071a2d');
        gradient.addColorStop(0.78, '#0b3342');
        gradient.addColorStop(1, '#123a35');
    }
    else {
        gradient.addColorStop(0, '#9bcdf4');
        gradient.addColorStop(0.5, '#d7eefb');
        gradient.addColorStop(0.78, '#a7cfd8');
        gradient.addColorStop(1, '#476d78');
    }
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    const glow = context.createRadialGradient(512, 390, 20, 512, 390, 520);
    glow.addColorStop(0, props.nightMode ? 'rgba(56, 232, 255, 0.22)' : 'rgba(255, 255, 255, 0.42)');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.fillStyle = glow;
    context.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < 240; i += 1) {
        const x = Math.random() * canvas.width;
        const y = 330 + Math.random() * 110;
        const h = 6 + Math.random() * 38;
        context.fillStyle = props.nightMode ? 'rgba(54, 120, 160, 0.18)' : 'rgba(90, 120, 135, 0.16)';
        context.fillRect(x, y - h, 3 + Math.random() * 8, h);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}
function buildShowroomStage() {
    const stage = new THREE.Group();
    stage.name = 'showroom-stage';
    scene.add(stage);
    const campusGlow = new THREE.Mesh(new THREE.CircleGeometry(28, 128), new THREE.MeshBasicMaterial({
        color: 0x1fcfff,
        transparent: true,
        opacity: props.nightMode ? 0.1 : 0.06,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    }));
    campusGlow.rotation.x = -Math.PI / 2;
    campusGlow.position.y = 0.07;
    campusGlow.scale.set(1.35, 0.72, 1);
    stage.add(campusGlow);
    const ringSpecs = [
        { rx: 29, rz: 18, y: 0.22, color: 0x28e6ff, speed: 0.025, opacity: 0.26 },
        { rx: 19, rz: 11.5, y: 0.28, color: 0x72ffb0, speed: -0.035, opacity: 0.18 },
        { rx: 11.5, rz: 7.2, y: 0.34, color: 0x8a6cff, speed: 0.045, opacity: 0.2 },
    ];
    ringSpecs.forEach((spec, index) => {
        const material = new THREE.MeshBasicMaterial({
            color: spec.color,
            transparent: true,
            opacity: spec.opacity,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.018 + index * 0.006, 8, 192), material);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = spec.y;
        ring.scale.set(spec.rx, spec.rz, 1);
        stage.add(ring);
        updaters.push((elapsed) => {
            ring.rotation.z = elapsed * spec.speed;
            material.opacity = spec.opacity * (0.72 + Math.sin(elapsed * 1.35 + index) * 0.18);
        });
    });
    const scanMaterial = new THREE.MeshBasicMaterial({
        color: 0x7ce5ff,
        transparent: true,
        opacity: 0.16,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
    });
    const scanner = new THREE.Mesh(new THREE.PlaneGeometry(52, 0.52), scanMaterial);
    scanner.rotation.x = -Math.PI / 2;
    scanner.position.y = 0.38;
    stage.add(scanner);
    const dataMaterial = new THREE.MeshBasicMaterial({
        color: 0x7ce5ff,
        transparent: true,
        opacity: 0.18,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });
    const dataColumns = [];
    for (let i = 0; i < 42; i += 1) {
        const h = 0.8 + (i % 7) * 0.34;
        const column = new THREE.Mesh(new THREE.BoxGeometry(0.025, h, 0.025), dataMaterial);
        const x = -25 + ((i * 7.1) % 50);
        const z = -15 + ((i * 5.4) % 30);
        column.position.set(x, h / 2 + 0.2, z);
        dataColumns.push(column);
        stage.add(column);
    }
    const coreMaterial = new THREE.MeshBasicMaterial({
        color: 0x7effd2,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.18, 24, 16), coreMaterial);
    core.position.set(0.8, 7.6, -0.6);
    stage.add(core);
    const coreRing = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.018, 8, 96), coreMaterial.clone());
    coreRing.position.copy(core.position);
    coreRing.rotation.x = Math.PI / 2.5;
    stage.add(coreRing);
    updaters.push((elapsed) => {
        scanner.position.z = -16 + ((elapsed * 3.6) % 32);
        scanMaterial.opacity = 0.08 + Math.sin(elapsed * 2.2) * 0.045;
        dataColumns.forEach((column, index) => {
            const pulse = 0.72 + Math.sin(elapsed * 2.1 + index * 0.53) * 0.28;
            column.scale.y = Math.max(0.18, pulse);
        });
        core.scale.setScalar(0.9 + Math.sin(elapsed * 2.6) * 0.18);
        coreRing.rotation.z = elapsed * 0.62;
    });
}
function buildAerialGround() {
    buildOuterWorld();
    const base = new THREE.Mesh(new THREE.BoxGeometry(68, 0.5, 40), new THREE.MeshStandardMaterial({
        color: props.nightMode ? 0x0d2232 : 0x253f4b,
        roughness: 0.76,
        metalness: 0.12,
        transparent: true,
        opacity: 0.94,
        emissive: props.nightMode ? 0x071d2f : 0x000000,
        emissiveIntensity: props.nightMode ? 0.12 : 0,
    }));
    base.position.y = -0.31;
    base.receiveShadow = true;
    scene.add(base);
    groundMaterial = new THREE.MeshStandardMaterial({
        color: props.nightMode ? 0x102235 : 0x27405a,
        roughness: 0.62,
        metalness: 0.08,
        emissive: props.nightMode ? 0x061426 : 0x000000,
        emissiveIntensity: props.nightMode ? 0.16 : 0,
    });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(66, 38), groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    const grid = new THREE.GridHelper(38, 38, 0x3dc6ff, 0x1f5c80);
    grid.position.y = 0.04;
    gridMaterialRef = grid.material;
    gridMaterialRef.transparent = true;
    gridMaterialRef.opacity = props.nightMode ? 0.18 : 0.08;
    scene.add(grid);
    buildTerrainPlates();
    buildWalkwaysAndPlazas();
    addWater(-10.6, -10.8, 2.3, 1.35);
    addBasketballCourt(-22.1, -7);
    addCampusRoadNetwork();
    addDigitalTwinFloorAccents();
    addStreetLights();
    addCampusBoundaryGlow();
    addCampusFenceAndGate();
}
function buildOuterWorld() {
    const world = new THREE.Mesh(new THREE.PlaneGeometry(220, 150), new THREE.MeshStandardMaterial({
        color: props.nightMode ? 0x081722 : 0x54747b,
        roughness: 0.86,
        metalness: 0.03,
        emissive: props.nightMode ? 0x041529 : 0x000000,
        emissiveIntensity: props.nightMode ? 0.18 : 0,
    }));
    world.rotation.x = -Math.PI / 2;
    world.position.y = -0.64;
    world.receiveShadow = true;
    scene.add(world);
    const districts = [
        [-66, -30, 22, 18, 0x17364a],
        [-64, 26, 28, 20, 0x1e4b3b],
        [54, -30, 34, 18, 0x17364a],
        [62, 28, 24, 22, 0x1e493a],
        [0, -45, 58, 16, 0x233a46],
        [0, 39, 70, 18, 0x203c36],
    ];
    districts.forEach(([x, z, width, depth, color]) => addOuterDistrict(x, z, width, depth, color));
    const roads = [
        [0, -31, 180, 3.2, Math.PI / 2],
        [0, 29, 170, 3.2, Math.PI / 2],
        [-55, 0, 104, 3, 0],
        [55, 0, 104, 3, 0],
        [-36, -40, 82, 2.2, Math.PI / 2],
        [38, 41, 86, 2.2, Math.PI / 2],
    ];
    roads.forEach(([x, z, length, width, rotation]) => addOuterRoad(x, z, length, width, rotation));
    addOuterRoad(0, 0, 116, 4.4, 0);
    addOuterRoad(0, -8, 168, 4.2, Math.PI / 2);
    addOuterRoad(-30, 14, 92, 3.4, 0);
    addOuterRoad(32, 14, 92, 3.4, 0);
    addOuterRoad(-76, 4, 88, 3.2, 0);
    addOuterRoad(76, -6, 94, 3.2, 0);
    addOuterRoad(-48, 0, 92, 3.4, Math.PI / 2);
    addOuterRoad(49, 0, 92, 3.4, Math.PI / 2);
    addOuterRoad(-35, 0, 50, 3.4, 0);
    addOuterRoad(35, 0, 50, 3.4, 0);
    addOuterRoad(0, 23.5, 78, 3.4, Math.PI / 2);
    addOuterRoad(0, -25.5, 84, 3.6, Math.PI / 2);
    addCityDistrict(-70, -20, 26, 22, 8);
    addCityDistrict(-70, 20, 28, 22, 7);
    addCityDistrict(70, -20, 30, 22, 9);
    addCityDistrict(70, 20, 28, 20, 7);
    addCityDistrict(-18, -48, 34, 17, 6);
    addCityDistrict(22, 48, 40, 18, 6);
    addCityDistrict(-36, -36, 24, 14, 8);
    addCityDistrict(-6, -38, 24, 14, 7);
    addCityDistrict(25, -36, 26, 14, 8);
    addCityDistrict(44, 7, 14, 24, 7);
    addCityDistrict(-56, 8, 14, 26, 7);
    addCityDistrict(-28, 30, 24, 12, 7);
    addCityDistrict(16, 31, 28, 12, 8);
    addCityDistrict(-41, -20, 14, 15, 7);
    addCityDistrict(39, -19, 15, 15, 7);
    addCityDistrict(-40, 21, 14, 14, 6);
    addCityDistrict(37, 20, 15, 14, 7);
    addCityDistrict(-16, 25, 18, 11, 6);
    addCityDistrict(14, -28, 20, 11, 7);
    addDarkCityCarpet();
    addFrontBoulevard();
    addUrbanTraffic();
    const river = new THREE.Mesh(new THREE.PlaneGeometry(150, 13), new THREE.MeshStandardMaterial({
        color: props.nightMode ? 0x0b4155 : 0x4f9eb4,
        roughness: 0.24,
        metalness: 0.22,
        transparent: true,
        opacity: props.nightMode ? 0.36 : 0.42,
        emissive: props.nightMode ? 0x062c44 : 0x000000,
        emissiveIntensity: props.nightMode ? 0.18 : 0,
    }));
    river.rotation.x = -Math.PI / 2;
    river.rotation.z = -0.34;
    river.position.set(-38, -0.53, 42);
    scene.add(river);
}
function addOuterDistrict(x, z, width, depth, color) {
    const district = new THREE.Mesh(new THREE.BoxGeometry(width, 0.06, depth), new THREE.MeshStandardMaterial({
        color,
        roughness: 0.88,
        metalness: 0.02,
        transparent: true,
        opacity: props.nightMode ? 0.78 : 0.64,
    }));
    district.position.set(x, -0.56, z);
    scene.add(district);
}
function addOuterRoad(x, z, length, width, rotation) {
    const road = new THREE.Mesh(new THREE.BoxGeometry(width, 0.045, length), new THREE.MeshStandardMaterial({ color: 0x111b26, roughness: 0.78, metalness: 0.08 }));
    road.position.set(x, -0.49, z);
    road.rotation.y = rotation;
    scene.add(road);
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.018, length * 0.92), new THREE.MeshBasicMaterial({ color: 0xffdd72, transparent: true, opacity: props.nightMode ? 0.56 : 0.42 }));
    line.position.set(x, -0.455, z);
    line.rotation.y = rotation;
    scene.add(line);
    const edgeMaterial = new THREE.MeshBasicMaterial({
        color: 0x00e5ff,
        transparent: true,
        opacity: props.nightMode ? 0.34 : 0.18,
        blending: THREE.AdditiveBlending,
    });
    for (const side of [-1, 1]) {
        const edge = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.018, length * 0.96), edgeMaterial);
        edge.position.set(side * (width / 2 - 0.16), 0.035, 0);
        const group = new THREE.Group();
        group.position.set(x, -0.45, z);
        group.rotation.y = rotation;
        group.add(edge);
        scene.add(group);
    }
    const dashMaterial = new THREE.MeshBasicMaterial({ color: 0xd8f2ff, transparent: true, opacity: props.nightMode ? 0.48 : 0.34 });
    const dashCount = Math.max(4, Math.floor(length / 8));
    for (let i = 0; i < dashCount; i += 1) {
        const dash = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.012, 1.35), dashMaterial);
        dash.position.set(0, 0.052, -length / 2 + 4 + i * (length / dashCount));
        const group = new THREE.Group();
        group.position.set(x, -0.44, z);
        group.rotation.y = rotation;
        group.add(dash);
        scene.add(group);
    }
}
function addCityDistrict(x, z, width, depth, count) {
    const block = new THREE.Mesh(new THREE.BoxGeometry(width, 0.05, depth), new THREE.MeshStandardMaterial({
        color: props.nightMode ? 0x172c45 : 0x6b7e88,
        roughness: 0.82,
        metalness: 0.06,
        transparent: true,
        opacity: props.nightMode ? 0.86 : 0.68,
        emissive: props.nightMode ? 0x06152c : 0x000000,
        emissiveIntensity: props.nightMode ? 0.16 : 0,
    }));
    block.position.set(x, -0.415, z);
    scene.add(block);
    const windowMaterial = new THREE.MeshBasicMaterial({
        color: 0xb8e8ff,
        transparent: true,
        opacity: props.nightMode ? 0.44 : 0.22,
    });
    for (let i = 0; i < count; i += 1) {
        const w = 2.2 + (i % 3) * 0.8;
        const d = 2.1 + ((i + 1) % 3) * 0.7;
        const h = 2.6 + ((i * 5) % 8) * 0.9;
        const px = x - width / 2 + 4 + (i % 4) * (width / 4.2);
        const pz = z - depth / 2 + 4 + Math.floor(i / 4) * (depth / 2.8);
        const tower = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({
            color: props.nightMode ? 0x4b6b82 : 0xb3c2c8,
            roughness: 0.62,
            metalness: 0.08,
            transparent: true,
            opacity: props.nightMode ? 0.82 : 0.8,
            emissive: props.nightMode ? 0x153653 : 0x000000,
            emissiveIntensity: props.nightMode ? 0.28 : 0,
        }));
        tower.position.set(px, h / 2 - 0.38, pz);
        scene.add(tower);
        addWorldNeonCap(px, pz, w, d, h - 0.38);
        for (let f = 0; f < Math.min(5, Math.floor(h / 0.9)); f += 1) {
            const strip = new THREE.Mesh(new THREE.BoxGeometry(w * 0.72, 0.026, 0.012), windowMaterial);
            strip.position.set(px, 0.55 + f * 0.75, pz + d / 2 + 0.01);
            scene.add(strip);
        }
    }
}
function addWorldNeonCap(x, z, width, depth, y) {
    const points = [
        new THREE.Vector3(-width / 2, y + 0.035, -depth / 2),
        new THREE.Vector3(width / 2, y + 0.035, -depth / 2),
        new THREE.Vector3(width / 2, y + 0.035, depth / 2),
        new THREE.Vector3(-width / 2, y + 0.035, depth / 2),
        new THREE.Vector3(-width / 2, y + 0.035, -depth / 2),
    ];
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({
        color: 0x4da2ff,
        transparent: true,
        opacity: props.nightMode ? 0.2 : 0.12,
        blending: THREE.AdditiveBlending,
    }));
    line.position.set(x, 0, z);
    scene.add(line);
}
function addDarkCityCarpet() {
    const material = new THREE.MeshStandardMaterial({
        color: props.nightMode ? 0x1b2d45 : 0x5d6f78,
        roughness: 0.78,
        metalness: 0.06,
        transparent: true,
        opacity: props.nightMode ? 0.84 : 0.66,
        emissive: props.nightMode ? 0x051428 : 0x000000,
        emissiveIntensity: props.nightMode ? 0.16 : 0,
    });
    for (let ix = -5; ix <= 5; ix += 1) {
        for (let iz = -4; iz <= 4; iz += 1) {
            const x = ix * 14 + ((iz % 2) * 2.4);
            const z = iz * 12;
            if (x > -38 && x < 31 && z > -24 && z < 20)
                continue;
            if (Math.abs(x) > 82 || Math.abs(z) > 58)
                continue;
            const width = 5.2 + ((ix + 7) % 3) * 1.4;
            const depth = 4.2 + ((iz + 6) % 3) * 1.2;
            const height = 0.7 + ((ix * ix + iz * 3 + 9) % 5) * 0.75;
            const block = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
            block.position.set(x, height / 2 - 0.46, z);
            scene.add(block);
        }
    }
}
function addFrontBoulevard() {
    const road = new THREE.Mesh(new THREE.BoxGeometry(116, 0.05, 8.4), new THREE.MeshStandardMaterial({ color: 0x121923, roughness: 0.72, metalness: 0.08 }));
    road.position.set(0, -0.39, -35.5);
    scene.add(road);
    const gold = new THREE.MeshBasicMaterial({
        color: 0xffc64d,
        transparent: true,
        opacity: props.nightMode ? 0.58 : 0.36,
        blending: THREE.AdditiveBlending,
    });
    const cyan = new THREE.MeshBasicMaterial({
        color: 0x65b8ff,
        transparent: true,
        opacity: props.nightMode ? 0.42 : 0.24,
        blending: THREE.AdditiveBlending,
    });
    for (const z of [-37.8, -33.2]) {
        const lane = new THREE.Mesh(new THREE.BoxGeometry(108, 0.014, 0.12), z < -35 ? gold : cyan);
        lane.position.set(0, -0.34, z);
        scene.add(lane);
    }
    const dashMaterial = new THREE.MeshBasicMaterial({ color: 0xe8f7ff, transparent: true, opacity: 0.5 });
    for (let x = -52; x <= 52; x += 6) {
        const dash = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.012, 0.045), dashMaterial);
        dash.position.set(x, -0.33, -35.5);
        scene.add(dash);
    }
}
function addUrbanTraffic() {
    const carMaterialA = new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.88 });
    const carMaterialB = new THREE.MeshBasicMaterial({ color: 0xffc64d, transparent: true, opacity: 0.78 });
    const cars = [
        [-8, 0, -47, 0],
        [14, 0, 35, Math.PI],
        [-56, 0, -10, 0],
        [53, 0, 18, Math.PI],
        [-30, 0, -32, Math.PI / 2],
        [39, 0, 32, Math.PI / 2],
    ];
    cars.forEach(([x, y, z, rotation], index) => {
        const car = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.16, 0.34), index % 2 === 0 ? carMaterialA : carMaterialB);
        car.position.set(x, -0.28 + y, z);
        car.rotation.y = rotation;
        scene.add(car);
        updaters.push((elapsed) => {
            const offset = Math.sin(elapsed * 0.45 + index) * 7;
            if (rotation === 0 || rotation === Math.PI)
                car.position.z = z + offset;
            else
                car.position.x = x + offset;
        });
    });
}
function buildTerrainPlates() {
    const plates = [
        [-20.2, -8.5, 10.5, 13.6, 0x2a6b4d],
    ];
    plates.forEach(([x, z, width, depth, color], index) => {
        addGroundPlate(x, z, width, depth, color, 0.055 + (index % 3) * 0.008);
    });
}
function buildWalkwaysAndPlazas() {
    addPavingPlate(-6.8, 1.5, 12.4, 6.2);
    addPavingPlate(6.8, -1.8, 12.2, 7.6);
    addPavingPlate(13.4, 5.2, 10.2, 6.2);
    addPavingPlate(-13.8, 6.8, 7.2, 6.2);
    addPavingPlate(-8.6, -2.4, 7.8, 8.6);
    addPavingPlate(-22.1, -7, 6.3, 4.2);
    const cyan = new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: props.nightMode ? 0.28 : 0.14 });
    const paths = [
        [0, 0, 36, 0.08, 0],
        [-7, 4.2, 18, 0.08, 0],
        [7, -4.8, 20, 0.08, 0],
        [-2, -1.6, 28, 0.08, Math.PI / 2],
        [11, 1.5, 26, 0.08, Math.PI / 2],
    ];
    paths.forEach(([x, z, length, width, rotation]) => {
        const line = new THREE.Mesh(new THREE.BoxGeometry(width, 0.018, length), cyan);
        line.position.set(x, 0.18, z);
        line.rotation.y = rotation;
        scene.add(line);
    });
}
function addCampusRoadNetwork() {
    addRoad(0, 0.055, -17.4, 5.2, 56, Math.PI / 2);
    addRoad(0, 0.055, 13.6, 4.2, 48, Math.PI / 2);
    addRoad(-29.2, 0.057, -2.4, 3.6, 31, 0);
    addRoad(24.2, 0.057, -2.4, 3.6, 31, 0);
    addRoad(1.5, 0.058, -5.6, 3.4, 28, Math.PI / 2);
    addRoad(9.6, 0.058, -1.6, 3.2, 24, 0);
    addRoad(18.2, 0.058, -11.2, 3.2, 13, Math.PI / 2);
    addRoad(-13.2, 0.058, 1.6, 3.0, 21, 0);
    addCrosswalk(-8, -17.4, Math.PI / 2);
    addCrosswalk(19.8, -17.4, Math.PI / 2);
    addCrosswalk(24.2, -8.2, 0);
    addCrosswalk(-13.2, -7.6, 0);
    buildParkingLot(-24.8, -18.2, -0.08);
}
function addCrosswalk(x, z, rotation) {
    const material = new THREE.MeshBasicMaterial({ color: 0xe8f7ff, transparent: true, opacity: 0.78 });
    for (let i = -2; i <= 2; i += 1) {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.012, 1.8), material);
        stripe.position.set(i * 0.38, 0.122, 0);
        const group = new THREE.Group();
        group.position.set(x, 0, z);
        group.rotation.y = rotation;
        group.add(stripe);
        scene.add(group);
    }
}
function addGroundPlate(x, z, width, depth, color, height = 0.06) {
    const material = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.74,
        metalness: 0.04,
        emissive: props.nightMode ? color : 0x000000,
        emissiveIntensity: props.nightMode ? 0.035 : 0,
    });
    const plate = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    plate.position.set(x, height / 2 + 0.035, z);
    plate.receiveShadow = true;
    scene.add(plate);
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(plate.geometry), new THREE.LineBasicMaterial({ color: 0x173a48, transparent: true, opacity: 0.32 }));
    edge.position.copy(plate.position);
    scene.add(edge);
}
function addPavingPlate(x, z, width, depth) {
    const material = new THREE.MeshStandardMaterial({
        color: props.nightMode ? 0x22323a : 0x41565c,
        roughness: 0.68,
        metalness: 0.1,
        emissive: props.nightMode ? 0x061d2a : 0x000000,
        emissiveIntensity: props.nightMode ? 0.1 : 0,
    });
    const plate = new THREE.Mesh(new THREE.BoxGeometry(width, 0.045, depth), material);
    plate.position.set(x, 0.082, z);
    plate.receiveShadow = true;
    scene.add(plate);
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(plate.geometry), new THREE.LineBasicMaterial({ color: 0x4ae7ff, transparent: true, opacity: props.nightMode ? 0.28 : 0.16 }));
    edge.position.copy(plate.position);
    scene.add(edge);
    const lineMaterial = new THREE.MeshBasicMaterial({
        color: 0x6af2ff,
        transparent: true,
        opacity: props.nightMode ? 0.13 : 0.08,
        blending: THREE.AdditiveBlending,
    });
    const verticalCount = Math.max(2, Math.floor(width / 2.4));
    for (let i = 1; i < verticalCount; i += 1) {
        const line = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.01, depth * 0.84), lineMaterial);
        line.position.set(x - width / 2 + (width / verticalCount) * i, 0.118, z);
        scene.add(line);
    }
    const horizontalCount = Math.max(2, Math.floor(depth / 2.2));
    for (let i = 1; i < horizontalCount; i += 1) {
        const line = new THREE.Mesh(new THREE.BoxGeometry(width * 0.84, 0.01, 0.018), lineMaterial);
        line.position.set(x, 0.12, z - depth / 2 + (depth / horizontalCount) * i);
        scene.add(line);
    }
}
function addDigitalTwinFloorAccents() {
    const traceMaterial = new THREE.MeshBasicMaterial({
        color: 0x00e5ff,
        transparent: true,
        opacity: props.nightMode ? 0.42 : 0.24,
        blending: THREE.AdditiveBlending,
    });
    const greenMaterial = new THREE.MeshBasicMaterial({
        color: 0x22f59a,
        transparent: true,
        opacity: props.nightMode ? 0.38 : 0.22,
        blending: THREE.AdditiveBlending,
    });
    const traces = [
        [-15, -7.8, 30, 0.035, Math.PI / 2, traceMaterial],
        [4, -10.8, 26, 0.035, Math.PI / 2, traceMaterial],
        [18.8, -3.6, 22, 0.035, 0, traceMaterial],
        [-14.6, 9.8, 26, 0.035, Math.PI / 2, greenMaterial],
        [7.2, 8.2, 30, 0.035, Math.PI / 2, greenMaterial],
        [26.5, 1.8, 24, 0.035, 0, traceMaterial],
    ];
    traces.forEach(([x, z, length, width, rotation, material]) => {
        const trace = new THREE.Mesh(new THREE.BoxGeometry(width, 0.014, length), material);
        trace.position.set(x, 0.155, z);
        trace.rotation.y = rotation;
        scene.add(trace);
    });
    const nodeMaterial = new THREE.MeshBasicMaterial({
        color: 0x79f7ff,
        transparent: true,
        opacity: 0.88,
        blending: THREE.AdditiveBlending,
    });
    const nodes = [
        [-15.5, -7.8],
        [-8.6, -2.4],
        [-0.8, 4.6],
        [5.8, -3.1],
        [14.6, -8.5],
        [18.4, -13.2],
        [11.7, 5.2],
    ];
    nodes.forEach(([x, z], index) => {
        const node = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), nodeMaterial);
        node.position.set(x, 0.32, z);
        scene.add(node);
        updaters.push((elapsed) => {
            const pulse = 0.82 + Math.sin(elapsed * 2.4 + index) * 0.22;
            node.scale.setScalar(pulse);
        });
    });
}
function buildCampusCore() {
    const buildings = [
        { id: 'a1', name: 'A1 综合楼', x: -8.6, z: -2.4, w: 4.8, d: 7.4, h: 5.2, load: 126, facade: 0xd9e7ea },
        { id: 'b2', name: 'B2 实验楼', x: -0.8, z: 4.6, w: 6.4, d: 4.2, h: 4.4, load: 104, facade: 0xc9d8dc },
        { id: 'c3', name: 'C3 研发中心', x: 5.8, z: -3.1, w: 5.6, d: 6.6, h: 7.1, load: 89, facade: 0xdfe8e6 },
        { id: 'd4', name: 'D4 展厅', x: 11.7, z: 5.2, w: 6.8, d: 3.8, h: 2.8, load: 63, facade: 0xd8d0c8 },
        { id: 'e5', name: 'E5 后勤楼', x: -13.8, z: 6.8, w: 4.2, d: 4.4, h: 3.2, load: 51, facade: 0xcbdbe2 },
    ];
    buildings.forEach((item, index) => {
        const building = createBuilding(item);
        scene.add(building);
        emphasisObjects.building.push(building);
        const label = makeLabel(item.id, `${campusBuildingNames[item.id] ?? item.name}<b>${item.load} kW</b>`);
        label.position.set(item.x, item.h + 1.8, item.z);
        scene.add(label);
        if (index < 4) {
            const solar = createSolarArray(item.x, item.h + 0.52, item.z, item.w * 0.72, item.d * 0.66);
            scene.add(solar);
            emphasisObjects.pv.push(solar);
        }
        if (item.id === 'c3') {
            const alarm = makeAlarmBeacon();
            alarm.position.set(item.x + item.w * 0.42, item.h + 0.92, item.z - item.d * 0.32);
            alarmWorldPosition = alarm.position.clone().add(new THREE.Vector3(0, 2.2, 0));
            scene.add(alarm);
            emphasisObjects.alarm.push(alarm);
            alarmPickables.push(alarm);
        }
    });
    buildStorageStation();
    buildChargingStation();
    buildGridStation();
    buildParkingLot(13.8, -9.6);
    addCampusSkywalks();
    addTreeRows();
    addCampusTreeGroves();
}
function buildSurroundings() {
    for (let i = 0; i < 72; i += 1) {
        const side = i % 4;
        const offset = i % 18;
        const x = side < 2 ? -48 + offset * 5.6 : side === 2 ? -55 - Math.random() * 10 : 55 + Math.random() * 10;
        const z = side < 2 ? (side === 0 ? -31 - Math.random() * 10 : 31 + Math.random() * 10) : -32 + offset * 3.8;
        const h = 1.2 + Math.random() * (side < 2 ? 9.5 : 7.2);
        const tower = new THREE.Mesh(new THREE.BoxGeometry(1.6 + Math.random() * 2.1, h, 1.4 + Math.random() * 2.2), new THREE.MeshStandardMaterial({
            color: props.nightMode ? 0x37566a : 0xa8bbc3,
            transparent: true,
            opacity: props.nightMode ? 0.34 : 0.58,
            roughness: 0.8,
            emissive: 0x143657,
            emissiveIntensity: props.nightMode ? 0.1 : 0,
        }));
        tower.position.set(x, h / 2, z);
        scene.add(tower);
        if (i % 3 === 0) {
            const cap = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.04, 1.2), new THREE.MeshBasicMaterial({ color: 0x7ce5ff, transparent: true, opacity: props.nightMode ? 0.22 : 0.1 }));
            cap.position.set(x, h + 0.035, z);
            scene.add(cap);
        }
    }
}
function createBuilding(item) {
    const group = new THREE.Group();
    group.position.set(item.x, 0, item.z);
    const podium = new THREE.Mesh(new THREE.BoxGeometry(item.w * 1.16, 0.22, item.d * 1.14), new THREE.MeshStandardMaterial({
        color: props.nightMode ? 0x263944 : 0x50636a,
        roughness: 0.58,
        metalness: 0.14,
        emissive: props.nightMode ? 0x082236 : 0x000000,
        emissiveIntensity: props.nightMode ? 0.08 : 0,
    }));
    podium.position.y = 0.12;
    podium.castShadow = true;
    podium.receiveShadow = true;
    group.add(podium);
    const podiumInset = new THREE.Mesh(new THREE.BoxGeometry(item.w * 1.02, 0.035, item.d), new THREE.MeshBasicMaterial({
        color: 0x7ce5ff,
        transparent: true,
        opacity: props.nightMode ? 0.16 : 0.08,
    }));
    podiumInset.position.y = 0.255;
    group.add(podiumInset);
    const podiumEdge = new THREE.LineSegments(new THREE.EdgesGeometry(podium.geometry), new THREE.LineBasicMaterial({ color: 0x4ae7ff, transparent: true, opacity: props.nightMode ? 0.24 : 0.14 }));
    podiumEdge.position.copy(podium.position);
    group.add(podiumEdge);
    const body = new THREE.Mesh(new THREE.BoxGeometry(item.w, item.h, item.d), new THREE.MeshStandardMaterial({
        color: props.nightMode ? 0x142b48 : 0x244562,
        roughness: 0.38,
        metalness: 0.18,
        emissive: 0x0a3156,
        emissiveIntensity: props.nightMode ? 0.24 : 0.08,
    }));
    body.position.y = item.h / 2 + 0.28;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(body.geometry), new THREE.LineBasicMaterial({
        color: 0x7ce5ff,
        transparent: true,
        opacity: props.nightMode ? 0.72 : 0.36,
    }));
    edge.position.copy(body.position);
    group.add(edge);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(item.w * 1.03, 0.14, item.d * 1.03), new THREE.MeshStandardMaterial({
        color: 0x10263c,
        roughness: 0.36,
        metalness: 0.24,
        emissive: 0x0a345e,
        emissiveIntensity: props.nightMode ? 0.2 : 0.08,
    }));
    roof.position.y = item.h + 0.38;
    group.add(roof);
    addWindowGrid(group, item.w, item.d, item.h);
    addFacadeLightStrips(group, item.w, item.d, item.h);
    addRoofNeonFrame(group, item.w, item.d, item.h + 0.48);
    addRoofEquipment(group, item.w, item.d, item.h);
    addBuildingPulseShell(group, item.w, item.d, item.h);
    return group;
}
function addBuildingPulseShell(group, width, depth, height) {
    const geometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(width + 0.34, height + 0.34, depth + 0.34));
    const material = new THREE.LineBasicMaterial({
        color: 0x7ce5ff,
        transparent: true,
        opacity: props.nightMode ? 0.5 : 0.24,
        blending: THREE.AdditiveBlending,
    });
    const shell = new THREE.LineSegments(geometry, material);
    shell.position.y = height / 2 + 0.28;
    group.add(shell);
    const crownMaterial = new THREE.MeshBasicMaterial({
        color: 0x65b8ff,
        transparent: true,
        opacity: props.nightMode ? 0.34 : 0.18,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });
    const crown = new THREE.Mesh(new THREE.BoxGeometry(width + 0.55, 0.026, depth + 0.55), crownMaterial);
    crown.position.y = height + 0.62;
    group.add(crown);
    updaters.push((elapsed) => {
        material.opacity = (props.nightMode ? 0.42 : 0.2) + Math.sin(elapsed * 1.8 + width) * 0.12;
        crownMaterial.opacity = (props.nightMode ? 0.22 : 0.12) + Math.sin(elapsed * 2.2 + depth) * 0.08;
    });
}
function addWindowGrid(group, width, depth, height) {
    const material = new THREE.MeshStandardMaterial({
        color: 0x89c7e8,
        emissive: 0x1d77a8,
        emissiveIntensity: props.nightMode ? 0.36 : 0.1,
        roughness: 0.25,
        metalness: 0.2,
    });
    const rows = Math.max(2, Math.floor(height / 0.82));
    const frontColumns = Math.max(3, Math.floor(width / 0.62));
    const sideColumns = Math.max(3, Math.floor(depth / 0.62));
    for (let r = 0; r < rows; r += 1) {
        const y = 1.18 + r * 0.72;
        for (let c = 0; c < frontColumns; c += 1) {
            const x = -width / 2 + 0.42 + c * ((width - 0.84) / Math.max(1, frontColumns - 1));
            addWindow(group, material, x, y, depth / 2 + 0.012, 0);
            addWindow(group, material, x, y, -depth / 2 - 0.012, Math.PI);
        }
        for (let c = 0; c < sideColumns; c += 1) {
            const z = -depth / 2 + 0.42 + c * ((depth - 0.84) / Math.max(1, sideColumns - 1));
            addWindow(group, material, width / 2 + 0.012, y, z, Math.PI / 2);
            addWindow(group, material, -width / 2 - 0.012, y, z, -Math.PI / 2);
        }
    }
}
function addWindow(group, material, x, y, z, rotationY) {
    const windowMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.5), material);
    windowMesh.position.set(x, y, z);
    windowMesh.rotation.y = rotationY;
    group.add(windowMesh);
}
function addFacadeLightStrips(group, width, depth, height) {
    const stripMaterial = new THREE.MeshBasicMaterial({
        color: 0xb9f5ff,
        transparent: true,
        opacity: props.nightMode ? 0.58 : 0.32,
        blending: THREE.AdditiveBlending,
    });
    const stripHeight = Math.max(1.2, height * 0.7);
    const y = 0.82 + stripHeight / 2;
    const frontCount = Math.max(2, Math.floor(width / 1.45));
    for (let i = 0; i < frontCount; i += 1) {
        const x = -width / 2 + 0.78 + i * ((width - 1.56) / Math.max(1, frontCount - 1));
        const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.08, stripHeight), stripMaterial);
        strip.position.set(x, y, depth / 2 + 0.02);
        group.add(strip);
    }
    const sideCount = Math.max(2, Math.floor(depth / 1.55));
    for (let i = 0; i < sideCount; i += 1) {
        const z = -depth / 2 + 0.74 + i * ((depth - 1.48) / Math.max(1, sideCount - 1));
        const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.08, stripHeight), stripMaterial);
        strip.position.set(width / 2 + 0.02, y, z);
        strip.rotation.y = Math.PI / 2;
        group.add(strip);
    }
}
function addRoofNeonFrame(group, width, depth, y) {
    const points = [
        new THREE.Vector3(-width / 2 - 0.18, y, -depth / 2 - 0.18),
        new THREE.Vector3(width / 2 + 0.18, y, -depth / 2 - 0.18),
        new THREE.Vector3(width / 2 + 0.18, y, depth / 2 + 0.18),
        new THREE.Vector3(-width / 2 - 0.18, y, depth / 2 + 0.18),
        new THREE.Vector3(-width / 2 - 0.18, y, -depth / 2 - 0.18),
    ];
    const frame = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({
        color: 0x65b8ff,
        transparent: true,
        opacity: props.nightMode ? 0.9 : 0.48,
        blending: THREE.AdditiveBlending,
    }));
    group.add(frame);
}
function addRoofEquipment(group, width, depth, height) {
    const material = new THREE.MeshStandardMaterial({ color: 0x617580, roughness: 0.52, metalness: 0.18 });
    for (let i = 0; i < 4; i += 1) {
        const unit = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.22, 0.34), material);
        unit.position.set(-width * 0.32 + i * 0.45, height + 0.58, depth * 0.32);
        group.add(unit);
    }
}
function createSolarArray(x, y, z, width, depth) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    const rows = Math.max(2, Math.floor(depth / 0.86));
    const columns = Math.max(3, Math.floor(width / 0.92));
    const panelWidth = 0.74;
    const panelDepth = 0.5;
    const panelMaterial = new THREE.MeshStandardMaterial({
        color: 0x0a3556,
        emissive: 0x0bbf9e,
        emissiveIntensity: props.nightMode ? 0.24 : 0.14,
        metalness: 0.68,
        roughness: 0.2,
    });
    const glassMaterial = new THREE.MeshBasicMaterial({
        color: 0x72fff0,
        transparent: true,
        opacity: props.nightMode ? 0.16 : 0.1,
        blending: THREE.AdditiveBlending,
    });
    const frameMaterial = new THREE.MeshStandardMaterial({
        color: 0x9deeff,
        emissive: 0x2be7ff,
        emissiveIntensity: props.nightMode ? 0.42 : 0.18,
        metalness: 0.62,
        roughness: 0.24,
    });
    const railMaterial = new THREE.MeshStandardMaterial({
        color: 0x7d939b,
        metalness: 0.48,
        roughness: 0.32,
    });
    const arrayWidth = (columns - 1) * 0.86 + panelWidth;
    const arrayDepth = (rows - 1) * 0.72 + panelDepth;
    for (let r = 0; r < rows; r += 1) {
        const railA = new THREE.Mesh(new THREE.BoxGeometry(arrayWidth + 0.42, 0.035, 0.045), railMaterial);
        railA.position.set(0, -0.055, -arrayDepth / 2 + r * 0.72 + 0.08);
        railA.rotation.x = -0.18;
        group.add(railA);
        const railB = railA.clone();
        railB.position.z += 0.34;
        group.add(railB);
    }
    for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < columns; c += 1) {
            const panelGroup = new THREE.Group();
            panelGroup.position.set(-arrayWidth / 2 + panelWidth / 2 + c * 0.86, 0, -arrayDepth / 2 + panelDepth / 2 + r * 0.72);
            panelGroup.rotation.x = -0.18;
            const panel = new THREE.Mesh(new THREE.BoxGeometry(panelWidth, 0.045, panelDepth), panelMaterial);
            panel.castShadow = true;
            panelGroup.add(panel);
            const glass = new THREE.Mesh(new THREE.PlaneGeometry(panelWidth * 0.86, panelDepth * 0.78), glassMaterial);
            glass.rotation.x = -Math.PI / 2;
            glass.position.y = 0.028;
            panelGroup.add(glass);
            const frameLongA = new THREE.Mesh(new THREE.BoxGeometry(panelWidth + 0.055, 0.035, 0.025), frameMaterial);
            frameLongA.position.z = panelDepth / 2 + 0.006;
            panelGroup.add(frameLongA);
            const frameLongB = frameLongA.clone();
            frameLongB.position.z = -panelDepth / 2 - 0.006;
            panelGroup.add(frameLongB);
            const frameShortA = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.035, panelDepth + 0.065), frameMaterial);
            frameShortA.position.x = -panelWidth / 2 - 0.006;
            panelGroup.add(frameShortA);
            const frameShortB = frameShortA.clone();
            frameShortB.position.x = panelWidth / 2 + 0.006;
            panelGroup.add(frameShortB);
            for (let i = 1; i <= 2; i += 1) {
                const cellLine = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, panelDepth * 0.72), glassMaterial);
                cellLine.position.set(-panelWidth / 2 + (panelWidth / 3) * i, 0.04, 0);
                panelGroup.add(cellLine);
            }
            group.add(panelGroup);
        }
    }
    updaters.push((elapsed) => {
        panelMaterial.emissiveIntensity = props.nightMode ? 0.24 + Math.sin(elapsed * 1.6) * 0.05 : 0.14;
    });
    return group;
}
function buildStorageStation() {
    const group = new THREE.Group();
    group.position.set(-15.5, 0.1, -7.8);
    const pad = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.12, 3.8), new THREE.MeshStandardMaterial({ color: 0x334958, roughness: 0.7 }));
    pad.position.y = 0.06;
    group.add(pad);
    for (let i = 0; i < 5; i += 1) {
        const container = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.25, 2.25), new THREE.MeshStandardMaterial({
            color: 0x1c5f8a,
            metalness: 0.35,
            roughness: 0.32,
            emissive: 0x39a7ff,
            emissiveIntensity: 0.2,
        }));
        container.position.set(-2.9 + i * 1.45, 0.72, 0);
        container.castShadow = true;
        group.add(container);
        emphasisObjects.storage.push(container);
    }
    const label = makeLabel('storage', `储能站<b>${Math.round(props.storageSoc)}% SOC</b>`);
    label.position.set(-15.5, 2.7, -7.8);
    scene.add(label);
    scene.add(group);
    addFacilityHalo(-15.5, -7.8, 4.8, 2.55, 0x39a7ff, 'storage');
}
function buildChargingStation() {
    const group = new THREE.Group();
    group.position.set(14.6, 0.1, -8.5);
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.18, 4.1), new THREE.MeshStandardMaterial({
        color: 0x18365a,
        emissive: 0x8a6cff,
        emissiveIntensity: 0.18,
        roughness: 0.3,
        metalness: 0.28,
    }));
    canopy.position.y = 1.85;
    group.add(canopy);
    for (let i = 0; i < 4; i += 1) {
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.8, 0.16), new THREE.MeshStandardMaterial({ color: 0x7fa8bf }));
        pillar.position.set(i < 2 ? -3 : 3, 0.92, i % 2 === 0 ? -1.7 : 1.7);
        group.add(pillar);
    }
    for (let i = 0; i < 8; i += 1) {
        const pile = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.82, 0.18), new THREE.MeshStandardMaterial({
            color: 0x351b78,
            emissive: i % 3 === 0 ? 0x8a6cff : 0x00e5ff,
            emissiveIntensity: 0.82,
        }));
        pile.position.set(-2.7 + (i % 4) * 1.8, 0.48, Math.floor(i / 4) * 1.25 - 0.62);
        group.add(pile);
        emphasisObjects.charging.push(pile);
        if (i % 2 === 0)
            addCar(group, pile.position.x + 0.55, 0.12, pile.position.z + 0.3, i);
    }
    const label = makeLabel('charging', `充电站<b>${Math.round(props.chargerPowerKw)} kW</b>`);
    label.position.set(14.6, 3.1, -8.5);
    scene.add(label);
    scene.add(group);
    addFacilityHalo(14.6, -8.5, 5.1, 3.25, 0x8a6cff, 'charging');
}
function buildGridStation() {
    const group = new THREE.Group();
    group.position.set(18.4, 0.12, -13.2);
    for (let i = 0; i < 2; i += 1) {
        const tower = new THREE.Group();
        tower.position.x = i * 3.4 - 1.7;
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.11, 4.2, 8), new THREE.MeshStandardMaterial({ color: 0x9fdcf0 }));
        pole.position.y = 2.1;
        tower.add(pole);
        const cross = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.08), new THREE.MeshBasicMaterial({ color: 0x00e5ff }));
        cross.position.y = 3.4;
        tower.add(cross);
        group.add(tower);
    }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.035, 12, 120), new THREE.MeshBasicMaterial({ color: 0x00e5ff }));
    ring.position.y = 2.1;
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
    const label = makeLabel('grid', '电网接入<b>10kV</b>');
    label.position.set(18.4, 4.5, -13.2);
    scene.add(label);
    scene.add(group);
    emphasisObjects.grid.push(group);
    addFacilityHalo(18.4, -13.2, 4.3, 2.55, 0x00e5ff, 'grid');
}
function addFacilityHalo(x, z, radiusX, radiusZ, color, kind) {
    const group = new THREE.Group();
    group.position.set(x, 0.34, z);
    const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.34,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.026, 8, 160), material);
    ring.rotation.x = Math.PI / 2;
    ring.scale.set(radiusX, radiusZ, 1);
    group.add(ring);
    const diskMaterial = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.07,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
    });
    const disk = new THREE.Mesh(new THREE.CircleGeometry(1, 96), diskMaterial);
    disk.rotation.x = -Math.PI / 2;
    disk.scale.set(radiusX * 0.92, radiusZ * 0.92, 1);
    group.add(disk);
    scene.add(group);
    emphasisObjects[kind]?.push(group);
    updaters.push((elapsed) => {
        ring.rotation.z = elapsed * 0.35;
        const pulse = 0.72 + Math.sin(elapsed * 2.2 + radiusX) * 0.22;
        ring.scale.set(radiusX * pulse, radiusZ * pulse, 1);
        material.opacity = 0.22 + Math.sin(elapsed * 2.6 + radiusZ) * 0.1;
        diskMaterial.opacity = 0.04 + Math.sin(elapsed * 1.8 + radiusX) * 0.025;
    });
}
function buildParkingLot(x, z, rotation = 0) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = rotation;
    const material = new THREE.MeshStandardMaterial({ color: 0x222d36, roughness: 0.86, metalness: 0.06 });
    const lot = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.04, 5.4), material);
    lot.position.y = 0.08;
    group.add(lot);
    const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xe8f7ff, transparent: true, opacity: 0.86 });
    const rows = [-1.25, 1.25];
    rows.forEach((rowZ) => {
        const center = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.012, 0.035), lineMaterial);
        center.position.set(0, 0.125, rowZ);
        group.add(center);
        for (let i = 0; i <= 7; i += 1) {
            const divider = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.012, 1.75), lineMaterial);
            divider.position.set(-3.9 + i * 1.1, 0.13, rowZ);
            divider.rotation.y = i % 2 === 0 ? 0.18 : -0.18;
            group.add(divider);
        }
    });
    const entrance = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.012, 4.8), new THREE.MeshBasicMaterial({ color: 0x65b8ff, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending }));
    entrance.position.set(4.55, 0.135, 0);
    group.add(entrance);
    scene.add(group);
}
function addCar(group, x, y, z, index) {
    const car = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.24, 0.45), new THREE.MeshStandardMaterial({ color: index % 2 === 0 ? 0x7ce5ff : 0x8a6cff, roughness: 0.28, metalness: 0.24 }));
    body.position.y = 0.18;
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.2, 0.34), new THREE.MeshStandardMaterial({ color: 0xd9f6ff, roughness: 0.2 }));
    top.position.y = 0.4;
    car.add(body, top);
    car.position.set(x, y, z);
    group.add(car);
}
function addTreeRows() {
    const positions = [
        [-12, -13.6],
        [-8.4, -13.6],
        [-4.8, -13.6],
        [-1.2, -13.6],
        [2.4, -13.6],
        [6, -13.6],
        [12.8, -13.6],
        [16.4, -13.6],
        [21.5, -8.8],
        [21.5, -5.4],
        [21.5, -2],
        [21.5, 1.4],
        [21.5, 4.8],
        [-24.3, -12.4],
        [-24.3, -10.3],
        [-25.25, -8.2],
        [-22.5, -2.3],
        [-20.5, -2.3],
        [-18.5, -2.3],
    ];
    positions.forEach(([x, z], index) => {
        const treeX = x;
        const treeZ = z;
        if (isInsideLake(treeX, treeZ) || isInsideRoad(treeX, treeZ))
            return;
        addTree(treeX, treeZ, 0.72 + (index % 3) * 0.08);
    });
}
function isInsideLake(x, z) {
    const normalizedX = (x - lakeBounds.x) / lakeBounds.radiusX;
    const normalizedZ = (z - lakeBounds.z) / lakeBounds.radiusZ;
    return normalizedX * normalizedX + normalizedZ * normalizedZ < 1;
}
function isInsideRoad(x, z) {
    return roadBounds.some((road) => Math.abs(x - road.x) < road.halfX && Math.abs(z - road.z) < road.halfZ);
}
function addCampusSkywalks() {
    addSkywalk(-6.2, -2.4, 3.0, -2.4, 3.1);
    addSkywalk(-6.7, 1.2, -4.0, 3.7, 2.85);
    addSkywalk(2.4, 3.8, 3.0, 0.0, 3.05);
    addSkywalk(-11.7, 6.8, -4.0, 5.4, 2.45);
}
function addSkywalk(x1, z1, x2, z2, y) {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const length = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dx, dz);
    const group = new THREE.Group();
    group.position.set((x1 + x2) / 2, y, (z1 + z2) / 2);
    group.rotation.y = angle;
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.28, length), new THREE.MeshStandardMaterial({
        color: 0x16314d,
        roughness: 0.34,
        metalness: 0.24,
        emissive: 0x082f58,
        emissiveIntensity: props.nightMode ? 0.18 : 0.06,
    }));
    group.add(body);
    const floorGlow = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.026, length * 0.96), new THREE.MeshBasicMaterial({
        color: 0x65b8ff,
        transparent: true,
        opacity: props.nightMode ? 0.24 : 0.12,
        blending: THREE.AdditiveBlending,
    }));
    floorGlow.position.y = -0.17;
    group.add(floorGlow);
    const edgeMaterial = new THREE.MeshBasicMaterial({
        color: 0x65b8ff,
        transparent: true,
        opacity: props.nightMode ? 0.7 : 0.36,
        blending: THREE.AdditiveBlending,
    });
    for (const side of [-1, 1]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, length * 0.96), edgeMaterial);
        rail.position.set(side * 0.42, 0.2, 0);
        group.add(rail);
    }
    for (const z of [-length / 2 + 0.12, length / 2 - 0.12]) {
        const deck = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.18, 0.72), body.material);
        deck.position.set(0, 0, z);
        group.add(deck);
    }
    const supportMaterial = new THREE.MeshStandardMaterial({
        color: 0x7fa8bf,
        roughness: 0.38,
        metalness: 0.36,
        emissive: props.nightMode ? 0x083147 : 0x000000,
        emissiveIntensity: props.nightMode ? 0.16 : 0,
    });
    for (const z of [-length / 2 + 0.42, length / 2 - 0.42]) {
        for (const x of [-0.32, 0.32]) {
            const support = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, y - 0.08, 8), supportMaterial);
            support.position.set(x, -y / 2, z);
            group.add(support);
        }
    }
    scene.add(group);
}
function addCampusTreeGroves() {
    const pocketTrees = [
        [-24.4, -13.4],
        [-24.4, -11.6],
        [-24.4, -9.8],
        [-25.25, -8],
        [-25.2, -6.2],
        [-22.6, -2.7],
        [-20.7, -2.4],
        [-18.8, -2.5],
    ];
    pocketTrees.forEach(([x, z], index) => {
        if (isInsideLake(x, z) || isInsideRoad(x, z))
            return;
        addTree(x, z, 0.76 + (index % 3) * 0.08);
    });
}
function addTree(x, z, scale) {
    const group = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.035 * scale, 0.055 * scale, 0.72 * scale, 7), new THREE.MeshStandardMaterial({ color: 0x6b5742 }));
    trunk.position.y = 0.36 * scale;
    const crownMaterial = new THREE.MeshStandardMaterial({
        color: 0x69b985,
        roughness: 0.82,
        emissive: 0x0b5135,
        emissiveIntensity: props.nightMode ? 0.16 : 0.04,
    });
    const crownTop = new THREE.Mesh(new THREE.SphereGeometry(0.34 * scale, 10, 8), crownMaterial);
    crownTop.scale.set(0.96, 1.18, 0.96);
    crownTop.position.y = 1.02 * scale;
    const crownLeft = new THREE.Mesh(new THREE.SphereGeometry(0.27 * scale, 9, 7), crownMaterial);
    crownLeft.position.set(-0.18 * scale, 0.82 * scale, 0.02);
    const crownRight = crownLeft.clone();
    crownRight.position.x = 0.18 * scale;
    crownRight.position.z = -0.03 * scale;
    group.add(trunk, crownLeft, crownRight, crownTop);
    group.position.set(x, 0.08, z);
    scene.add(group);
}
function addRoad(x, y, z, width, length, rotation) {
    const road = new THREE.Mesh(new THREE.BoxGeometry(width, 0.045, length), new THREE.MeshStandardMaterial({
        color: 0x162531,
        roughness: 0.68,
        metalness: 0.08,
        transparent: true,
        opacity: 0.94,
        emissive: props.nightMode ? 0x031b29 : 0x000000,
        emissiveIntensity: props.nightMode ? 0.12 : 0,
    }));
    road.position.set(x, y, z);
    road.rotation.y = rotation;
    scene.add(road);
    const center = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.022, length * 0.88), new THREE.MeshBasicMaterial({ color: 0xffd86a, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending }));
    center.position.set(x, y + 0.026, z);
    center.rotation.y = rotation;
    scene.add(center);
    const edgeMaterial = new THREE.MeshBasicMaterial({
        color: 0x00e5ff,
        transparent: true,
        opacity: props.nightMode ? 0.62 : 0.34,
        blending: THREE.AdditiveBlending,
    });
    const edgeA = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, length * 0.96), edgeMaterial);
    const edgeB = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, length * 0.96), edgeMaterial);
    edgeA.position.set(-width / 2 + 0.14, 0.028, 0);
    edgeB.position.set(width / 2 - 0.14, 0.028, 0);
    const roadGlow = new THREE.Group();
    roadGlow.position.set(x, y + 0.03, z);
    roadGlow.rotation.y = rotation;
    roadGlow.add(edgeA, edgeB);
    scene.add(roadGlow);
    const dashMaterial = new THREE.MeshBasicMaterial({
        color: 0xe8f8ff,
        transparent: true,
        opacity: props.nightMode ? 0.44 : 0.28,
        blending: THREE.AdditiveBlending,
    });
    const dashCount = Math.max(3, Math.floor(length / 6));
    for (let i = 0; i < dashCount; i += 1) {
        const dash = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.018, 1.05), dashMaterial);
        dash.position.set(width * 0.22, 0.048, -length / 2 + 3 + i * (length / dashCount));
        const dashGroup = new THREE.Group();
        dashGroup.position.set(x, y + 0.018, z);
        dashGroup.rotation.y = rotation;
        dashGroup.add(dash);
        scene.add(dashGroup);
    }
}
function addStreetLights() {
    const material = new THREE.MeshStandardMaterial({ color: 0x9ab5bd, roughness: 0.4, metalness: 0.35 });
    const bulbMaterial = new THREE.MeshBasicMaterial({ color: 0x75e9ff, transparent: true, opacity: 0.86 });
    const positions = [];
    for (let z = -20; z <= 20; z += 5) {
        positions.push([-3.2, z], [3.2, z]);
    }
    for (let x = -22; x <= 22; x += 5.5) {
        positions.push([x, -3.2], [x, 3.2]);
    }
    positions.forEach(([x, z], index) => {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.92, 8), material);
        pole.position.set(x, 0.56, z);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), bulbMaterial);
        bulb.position.set(x, 1.06, z);
        const light = new THREE.PointLight(0x75e9ff, props.nightMode ? 1.2 : 0.35, 4.2);
        light.position.set(x, 1.05, z);
        scene.add(pole, bulb, light);
        updaters.push((elapsed) => {
            const pulse = 0.75 + Math.sin(elapsed * 2 + index) * 0.15;
            bulb.scale.setScalar(pulse);
            light.intensity = props.nightMode ? 1.1 + pulse * 0.4 : 0.25;
        });
    });
}
function addCampusBoundaryGlow() {
    const shape = new THREE.Shape();
    shape.moveTo(-29, -19);
    shape.lineTo(24, -19);
    shape.lineTo(27, -5.5);
    shape.lineTo(23.8, 15);
    shape.lineTo(-26.5, 15);
    shape.lineTo(-30.5, 2);
    shape.lineTo(-29, -19);
    const points = shape.getPoints(120).map((point) => new THREE.Vector3(point.x, 0.16, point.y));
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: 0x22f59a, transparent: true, opacity: props.nightMode ? 0.48 : 0.28 }));
    scene.add(line);
}
function addCampusFenceAndGate() {
    const boundary = [
        [-29, -19],
        [24, -19],
        [27, -5.5],
        [23.8, 15],
        [-26.5, 15],
        [-30.5, 2],
        [-29, -19],
    ];
    for (let i = 0; i < boundary.length - 1; i += 1) {
        const [x1, z1] = boundary[i];
        const [x2, z2] = boundary[i + 1];
        if (z1 === -19 && z2 === -19) {
            addFenceSegment(x1, z1, -3.2, z2);
            addFenceSegment(3.2, z1, x2, z2);
        }
        else {
            addFenceSegment(x1, z1, x2, z2);
        }
    }
    addCampusGate(0, -19);
}
function addFenceSegment(x1, z1, x2, z2) {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const length = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dx, dz);
    const centerX = (x1 + x2) / 2;
    const centerZ = (z1 + z2) / 2;
    const railMaterial = new THREE.MeshStandardMaterial({
        color: 0x85e8ff,
        emissive: 0x00e5ff,
        emissiveIntensity: props.nightMode ? 0.32 : 0.12,
        metalness: 0.4,
        roughness: 0.28,
        transparent: true,
        opacity: 0.78,
    });
    const postMaterial = new THREE.MeshStandardMaterial({
        color: 0x9fb8c2,
        emissive: props.nightMode ? 0x0a3142 : 0x000000,
        emissiveIntensity: props.nightMode ? 0.22 : 0,
        metalness: 0.5,
        roughness: 0.35,
    });
    for (const y of [0.46, 0.82]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.055, length), railMaterial);
        rail.position.set(centerX, y, centerZ);
        rail.rotation.y = angle;
        scene.add(rail);
    }
    const postCount = Math.max(2, Math.floor(length / 1.8));
    for (let i = 0; i <= postCount; i += 1) {
        const t = i / postCount;
        const x = x1 + dx * t;
        const z = z1 + dz * t;
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 1.05, 8), postMaterial);
        post.position.set(x, 0.52, z);
        scene.add(post);
        if (i % 4 === 0) {
            const light = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 10), new THREE.MeshBasicMaterial({ color: 0x69f7ff, transparent: true, opacity: 0.8 }));
            light.position.set(x, 1.1, z);
            scene.add(light);
        }
    }
}
function addCampusGate(x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    const pillarMaterial = new THREE.MeshStandardMaterial({
        color: 0x203544,
        roughness: 0.36,
        metalness: 0.28,
        emissive: 0x06253b,
        emissiveIntensity: props.nightMode ? 0.24 : 0.08,
    });
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x00e5ff,
        transparent: true,
        opacity: props.nightMode ? 0.72 : 0.38,
        blending: THREE.AdditiveBlending,
    });
    for (const side of [-1, 1]) {
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.52, 2.25, 0.52), pillarMaterial);
        pillar.position.set(side * 3.2, 1.12, 0);
        group.add(pillar);
        const pillarLine = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.045, 0.58), glowMaterial);
        pillarLine.position.set(side * 3.2, 2.28, 0);
        group.add(pillarLine);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(6.9, 0.36, 0.5), pillarMaterial);
    beam.position.set(0, 2.28, 0);
    group.add(beam);
    const beamGlow = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.035, 0.58), glowMaterial);
    beamGlow.position.set(0, 2.51, 0);
    group.add(beamGlow);
    const leftBarrier = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.08, 0.08), glowMaterial);
    leftBarrier.position.set(-1.45, 0.72, -0.35);
    leftBarrier.rotation.z = -0.16;
    group.add(leftBarrier);
    const rightBarrier = leftBarrier.clone();
    rightBarrier.position.x = 1.45;
    rightBarrier.rotation.z = 0.16;
    group.add(rightBarrier);
    const entryPath = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.028, 4.2), new THREE.MeshBasicMaterial({
        color: 0x00e5ff,
        transparent: true,
        opacity: props.nightMode ? 0.11 : 0.07,
        blending: THREE.AdditiveBlending,
    }));
    entryPath.position.set(0, 0.16, 1.4);
    group.add(entryPath);
    scene.add(group);
}
function addWater(x, z, width, depth) {
    const basin = new THREE.Mesh(new THREE.CircleGeometry(1, 96), new THREE.MeshStandardMaterial({
        color: props.nightMode ? 0x071c26 : 0x214f5d,
        roughness: 0.5,
        metalness: 0.04,
        emissive: props.nightMode ? 0x041824 : 0x000000,
        emissiveIntensity: props.nightMode ? 0.22 : 0,
    }));
    basin.scale.set(width * 1.08, depth * 1.16, 1);
    basin.rotation.x = -Math.PI / 2;
    basin.position.set(x, 0.072, z);
    scene.add(basin);
    const water = new THREE.Mesh(new THREE.CircleGeometry(1, 96), new THREE.MeshStandardMaterial({
        color: 0x2db4d8,
        transparent: true,
        opacity: props.nightMode ? 0.62 : 0.5,
        roughness: 0.12,
        metalness: 0.35,
        emissive: 0x0b6889,
        emissiveIntensity: props.nightMode ? 0.16 : 0,
    }));
    water.scale.set(width, depth, 1);
    water.rotation.x = -Math.PI / 2;
    water.position.set(x, 0.09, z);
    scene.add(water);
    const shoreline = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 8, 160), new THREE.MeshBasicMaterial({
        color: 0x68f0ff,
        transparent: true,
        opacity: props.nightMode ? 0.54 : 0.32,
        blending: THREE.AdditiveBlending,
    }));
    shoreline.scale.set(width * 1.08, depth * 1.16, 1);
    shoreline.rotation.x = -Math.PI / 2;
    shoreline.position.set(x, 0.118, z);
    scene.add(shoreline);
    const rippleMaterial = new THREE.MeshBasicMaterial({
        color: 0x9cf7ff,
        transparent: true,
        opacity: props.nightMode ? 0.36 : 0.22,
        blending: THREE.AdditiveBlending,
    });
    for (let i = 0; i < 8; i += 1) {
        const ripple = new THREE.Mesh(new THREE.BoxGeometry(width * (0.36 + i * 0.045), 0.008, 0.018), rippleMaterial);
        ripple.position.set(x - width * 0.24 + i * width * 0.065, 0.128 + i * 0.001, z - depth * 0.48 + i * depth * 0.13);
        ripple.rotation.y = -0.22;
        scene.add(ripple);
    }
}
function addBasketballCourt(x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = -0.04;
    const court = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.035, 3.6), new THREE.MeshStandardMaterial({
        color: 0x315f76,
        roughness: 0.72,
        metalness: 0.08,
        emissive: props.nightMode ? 0x0d3c58 : 0x000000,
        emissiveIntensity: props.nightMode ? 0.18 : 0,
    }));
    court.position.y = 0.1;
    group.add(court);
    const orange = new THREE.MeshBasicMaterial({ color: 0xffb13d, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending });
    const white = new THREE.MeshBasicMaterial({ color: 0xe9f8ff, transparent: true, opacity: 0.86, blending: THREE.AdditiveBlending });
    const lines = [
        [0, 0, 5.6, 0.05, 1.72, orange],
        [0, 0, 5.6, 0.05, -1.72, orange],
        [-2.75, 0, 0.05, 0.05, 0, orange, 3.4],
        [2.75, 0, 0.05, 0.05, 0, orange, 3.4],
        [0, 0, 0.05, 0.05, 0, white, 3.4],
        [-1.55, 0, 0.05, 0.05, 0, white, 1.7],
        [1.55, 0, 0.05, 0.05, 0, white, 1.7],
    ];
    lines.forEach(([lx, , w, h, lz, material, depth]) => {
        const line = new THREE.Mesh(new THREE.BoxGeometry(w, 0.012, depth ?? h), material);
        line.position.set(lx, 0.135, lz);
        group.add(line);
    });
    for (const hoopX of [-2.35, 2.35]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.034, 0.68, 8), new THREE.MeshStandardMaterial({ color: 0xd6efff }));
        pole.position.set(hoopX, 0.52, 0);
        group.add(pole);
        const board = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.36, 0.54), white);
        board.position.set(hoopX, 0.86, 0);
        group.add(board);
    }
    scene.add(group);
}
function addSportsField(x, z) {
    const field = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.035, 5.6), new THREE.MeshStandardMaterial({
        color: 0x238d58,
        roughness: 0.92,
        emissive: props.nightMode ? 0x08391f : 0x000000,
        emissiveIntensity: props.nightMode ? 0.08 : 0,
    }));
    field.position.set(x, 0.1, z);
    scene.add(field);
    const lineMaterial = new THREE.MeshBasicMaterial({ color: 0x8df7cb, transparent: true, opacity: 0.46 });
    for (let i = -2; i <= 2; i += 1) {
        const line = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.012, 0.025), lineMaterial);
        line.position.set(x, 0.14, z + i * 0.86);
        scene.add(line);
    }
}
function buildEnergyFlows() {
    addFlow([
        new THREE.Vector3(-8.8, 6.8, -2.2),
        new THREE.Vector3(-3.5, 8.2, 0.4),
        new THREE.Vector3(1.3, 5.6, 0.2),
    ], 0x22f59a, 'pv');
    addFlow([
        new THREE.Vector3(-15.5, 2.4, -7.8),
        new THREE.Vector3(-9, 3.4, -4.5),
        new THREE.Vector3(0.5, 3.1, 0.2),
    ], 0x39a7ff, 'storage');
    addFlow([
        new THREE.Vector3(18.4, 4.3, -13.2),
        new THREE.Vector3(11.4, 5.6, -8.4),
        new THREE.Vector3(1.2, 3.2, 0.1),
    ], 0x00e5ff, 'grid');
    addFlow([
        new THREE.Vector3(1.2, 3.2, 0.1),
        new THREE.Vector3(8.2, 3.4, -3.6),
        new THREE.Vector3(14.6, 2.4, -8.5),
    ], 0x8a6cff, 'charging');
}
function addFlow(points, color, kind) {
    const curve = new THREE.CatmullRomCurve3(points);
    const lineMaterial = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.58,
        blending: THREE.AdditiveBlending,
    });
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(120)), lineMaterial);
    scene.add(line);
    emphasisObjects[kind]?.push(line);
    const tubeMaterial = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.14,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 120, 0.035, 8, false), tubeMaterial);
    scene.add(tube);
    emphasisObjects[kind]?.push(tube);
    for (let i = 0; i < 5; i += 1) {
        const particle = new THREE.Mesh(new THREE.SphereGeometry(i % 2 === 0 ? 0.13 : 0.085, 16, 16), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending }));
        scene.add(particle);
        emphasisObjects[kind]?.push(particle);
        updaters.push((elapsed) => {
            const speed = kind === 'charging' ? 0.23 : 0.18;
            const offset = i / 5 + (kind === 'pv' ? 0 : kind === 'storage' ? 0.12 : kind === 'grid' ? 0.24 : 0.36);
            const progress = (elapsed * speed + offset) % 1;
            particle.position.copy(curve.getPoint(progress));
            particle.scale.setScalar(0.82 + Math.sin(elapsed * 5.6 + i) * 0.22);
            lineMaterial.opacity = 0.4 + Math.sin(elapsed * 1.8) * 0.12;
            tubeMaterial.opacity = 0.1 + Math.sin(elapsed * 2 + i) * 0.035;
        });
    }
}
function makeAlarmBeacon() {
    const group = new THREE.Group();
    group.userData.alarm = true;
    const coreMaterial = new THREE.MeshBasicMaterial({ color: 0xff3b5c, transparent: true, opacity: 0.95 });
    const beamMaterial = new THREE.MeshBasicMaterial({
        color: 0xff3b5c,
        transparent: true,
        opacity: 0.16,
        side: THREE.DoubleSide,
        depthWrite: false,
    });
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.12, 20, 20), coreMaterial);
    core.position.y = 0.2;
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.22, 3.1, 32, 1, true), beamMaterial);
    beam.position.y = 1.65;
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.42, 4), coreMaterial);
    cap.position.y = 3.35;
    cap.rotation.y = Math.PI / 4;
    const label = makeAlarmLabel();
    label.position.set(0, 4.05, 0);
    group.add(core, beam, cap, label);
    group.traverse((child) => {
        child.userData.alarm = true;
    });
    updaters.push((elapsed) => {
        const pulse = 1 + Math.sin(elapsed * 5.2) * 0.22;
        core.scale.setScalar(0.9 + pulse * 0.18);
        beamMaterial.opacity = 0.12 + Math.sin(elapsed * 5.2) * 0.04;
        cap.rotation.y += 0.018;
    });
    return group;
}
function makeAlarmLabel() {
    const element = document.createElement('div');
    element.className = 'scene-alarm-label';
    element.innerHTML = '<span>一级告警</span><strong>PCS-02</strong><em>温度越限</em>';
    return new CSS2DObject(element);
}
function makeLabel(id, html) {
    const element = document.createElement('div');
    element.className = 'scene-label';
    element.innerHTML = html;
    labels.set(id, element);
    return new CSS2DObject(element);
}
function updateLabels() {
    const storage = labels.get('storage');
    if (storage)
        storage.innerHTML = `储能站<b>${Math.round(props.storageSoc)}% SOC</b>`;
    const charging = labels.get('charging');
    if (charging)
        charging.innerHTML = `充电站<b>${Math.round(props.chargerPowerKw)} kW</b>`;
}
function applyTheme() {
    if (!scene)
        return;
    scene.background = new THREE.Color(props.nightMode ? 0x030a18 : 0xa7d6ff);
    scene.fog = new THREE.FogExp2(props.nightMode ? 0x061426 : 0xb6d8f0, props.nightMode ? 0.009 : 0.008);
    if (renderer)
        renderer.toneMappingExposure = props.nightMode ? 1.22 : 1.05;
    if (groundMaterial) {
        groundMaterial.emissive.set(props.nightMode ? 0x061426 : 0x000000);
        groundMaterial.emissiveIntensity = props.nightMode ? 0.1 : 0;
    }
    if (gridMaterialRef) {
        gridMaterialRef.opacity = props.nightMode ? 0.2 : 0.1;
    }
}
function applySceneMode() {
    if (sceneRef.value)
        sceneRef.value.dataset.mode = props.mode;
    Object.entries(emphasisObjects).forEach(([kind, objects]) => {
        objects.forEach((object) => {
            object.traverse((child) => {
                const mesh = child;
                const material = mesh.material;
                if (!material || !('opacity' in material))
                    return;
                const active = props.mode === 'overview' || props.mode === kind || (props.mode === 'alarm' && kind === 'alarm');
                material.transparent = true;
                material.opacity = active ? 1 : 0.32;
            });
        });
    });
    const cameraTargets = {
        overview: { position: new THREE.Vector3(22, 14, 24), target: new THREE.Vector3(0, 1.8, 0) },
        pv: { position: new THREE.Vector3(9, 22, 12), target: new THREE.Vector3(-2, 3.6, 0) },
        storage: { position: new THREE.Vector3(-25, 10, -11), target: new THREE.Vector3(-12, 1.7, -6) },
        charging: { position: new THREE.Vector3(25, 9, -16), target: new THREE.Vector3(12, 1.5, -7) },
        building: { position: new THREE.Vector3(11, 13, 18), target: new THREE.Vector3(0, 3.2, 1) },
        alarm: { position: new THREE.Vector3(13, 12, 9), target: new THREE.Vector3(5.8, 5.2, -3.1) },
    };
    const target = cameraTargets[props.mode];
    if (target) {
        camera.position.copy(target.position);
        controls.target.copy(target.target);
    }
}
function handleSceneClick(event) {
    if (!renderer)
        return;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(alarmPickables, true);
    if (hits.some((hit) => hit.object.userData.alarm)) {
        alarmDetailVisible.value = true;
        return;
    }
    if (alarmWorldPosition) {
        const projected = alarmWorldPosition.clone().project(camera);
        const screenX = (projected.x * 0.5 + 0.5) * rect.width + rect.left;
        const screenY = (-projected.y * 0.5 + 0.5) * rect.height + rect.top;
        const distance = Math.hypot(event.clientX - screenX, event.clientY - screenY);
        if (distance < 110)
            alarmDetailVisible.value = true;
    }
}
function animate() {
    frame = requestAnimationFrame(animate);
    const elapsed = performance.now() / 1000;
    updaters.forEach((update) => update(elapsed));
    controls.update();
    renderer?.render(scene, camera);
    labelRenderer?.render(scene, camera);
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ref: "sceneRef",
    ...{ class: "digital-twin-scene" },
});
/** @type {typeof __VLS_ctx.sceneRef} */ ;
if (__VLS_ctx.alarmDetailVisible) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
        ...{ class: "alarm-detail-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.alarmDetailVisible))
                    return;
                __VLS_ctx.alarmDetailVisible = false;
            } },
        type: "button",
        title: "关闭告警详情",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dl, __VLS_intrinsicElements.dl)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
}
/** @type {__VLS_StyleScopedClasses['digital-twin-scene']} */ ;
/** @type {__VLS_StyleScopedClasses['alarm-detail-card']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            sceneRef: sceneRef,
            alarmDetailVisible: alarmDetailVisible,
        };
    },
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeProps: {},
});
; /* PartiallyEnd: #4569/main.vue */

<script setup lang="ts">
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { gsap } from 'gsap'
import * as THREE from 'three'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { SceneMode } from '../types'

const props = defineProps<{
  mode: SceneMode
  nightMode: boolean
  alarmCount: number
  storageSoc: number
  pvPowerKw: number
  loadPowerKw: number
  chargerPowerKw: number
  introActive: boolean
  warmupRequested: boolean
}>()

const emit = defineEmits<{
  ready: []
  warmupReady: []
  focusMode: [mode: SceneMode]
}>()

type CampusTarget = {
  code: string
  name: string
  type: string
  position: THREE.Vector3
  power: () => string
  tone: 'green' | 'cyan' | 'purple'
}

const sceneRef = ref<HTMLDivElement | null>(null)
const loading = ref(true)
const staticQa = new URLSearchParams(window.location.search).has('qa')
const selectedCode = ref<string | null>(null)
const selectedTarget = computed(() => campusTargets.find((item) => item.code === selectedCode.value) ?? null)

let renderer: THREE.WebGLRenderer | null = null
let labelRenderer: CSS2DRenderer | null = null
let composer: EffectComposer | null = null
let bloomPass: UnrealBloomPass | null = null
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let controls: OrbitControls
let resizeObserver: ResizeObserver | null = null
let frame = 0
let modelRoot: THREE.Group | null = null
let elapsed = 0
let lastFrame = performance.now()
let lastRender = 0
let modelLoadTimer = 0
let decorativeAssetsReady: Promise<void> = Promise.resolve()
let sceneWarmupStarted = false

const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()
const interactiveMeshes: THREE.Mesh[] = []
const updaters: Array<(time: number, delta: number) => void> = []
const labelElements = new Map<string, HTMLElement>()
const trackedMeshes: THREE.Mesh[] = []

const campusTargets: CampusTarget[] = [
  { code: 'A1', name: 'A座 综合楼', type: '光伏建筑', position: new THREE.Vector3(-12, 9.2, -6.5), power: () => '126 kW', tone: 'green' },
  { code: 'B2', name: 'B座 实验楼', type: '科研负荷', position: new THREE.Vector3(3, 6.8, 5.2), power: () => '104 kW', tone: 'green' },
  { code: 'C3', name: 'C座 研发中心', type: '重点用能', position: new THREE.Vector3(12.5, 9.8, -6.5), power: () => '89 kW', tone: 'green' },
  { code: 'D4', name: 'D座 展厅', type: '公共建筑', position: new THREE.Vector3(15.5, 5.4, 6.5), power: () => '63 kW', tone: 'green' },
  { code: 'E5', name: 'E座 后勤楼', type: '后勤负荷', position: new THREE.Vector3(-16, 5.2, 9.6), power: () => '51 kW', tone: 'green' },
  { code: 'STORAGE', name: '储能站', type: '储能系统', position: new THREE.Vector3(-22.5, 3.9, -5.5), power: () => `${Math.round(props.storageSoc)}% SOC`, tone: 'green' },
  { code: 'CHARGING', name: '充电站', type: '充电运营', position: new THREE.Vector3(24.5, 4.4, 1), power: () => `${Math.round(props.chargerPowerKw)} kW`, tone: 'purple' },
  { code: 'GRID', name: '电网接入', type: '园区配电', position: new THREE.Vector3(0, 4.3, -12), power: () => '10 kV', tone: 'cyan' },
]
const alarmPosition = new THREE.Vector3(10.5, 11.7, -5.5)

onMounted(() => {
  if (!sceneRef.value) return
  initScene(sceneRef.value)
  modelLoadTimer = window.setTimeout(loadCampusModel, props.introActive ? 560 : 0)
  animate()
})

watch(() => props.mode, applySceneMode)
watch(() => props.nightMode, applyTheme)
watch(() => props.introActive, applyPerformanceMode)
watch(() => props.warmupRequested, () => void beginSceneWarmup())
watch(() => [props.storageSoc, props.pvPowerKw, props.loadPowerKw, props.chargerPowerKw], updateLabels)

onBeforeUnmount(() => {
  window.clearTimeout(modelLoadTimer)
  cancelAnimationFrame(frame)
  resizeObserver?.disconnect()
  controls?.dispose()
  gsap.killTweensOf(camera?.position)
  gsap.killTweensOf(controls?.target)
  renderer?.domElement.removeEventListener('pointerup', handleScenePointer)
  renderer?.dispose()
  composer?.dispose()
})

function initScene(host: HTMLDivElement) {
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x020713)
  scene.fog = new THREE.FogExp2(0x020b17, 0.0115)

  camera = new THREE.PerspectiveCamera(39, host.clientWidth / host.clientHeight, 0.1, 500)
  camera.position.set(38, 36, 48)

  const initialPixelRatio = Math.min(window.devicePixelRatio, props.introActive ? 0.7 : 0.88)
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
  renderer.setPixelRatio(initialPixelRatio)
  renderer.setSize(host.clientWidth, host.clientHeight)
  renderer.shadowMap.enabled = !props.introActive
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.shadowMap.autoUpdate = false
  renderer.shadowMap.needsUpdate = !props.introActive
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.84
  renderer.domElement.className = 'twin-canvas'
  renderer.domElement.addEventListener('pointerup', handleScenePointer)
  host.appendChild(renderer.domElement)

  composer = new EffectComposer(renderer)
  composer.setPixelRatio(initialPixelRatio)
  composer.addPass(new RenderPass(scene, camera))
  bloomPass = new UnrealBloomPass(new THREE.Vector2(host.clientWidth, host.clientHeight), 0.72, 0.34, 0.66)
  bloomPass.threshold = 0.66
  bloomPass.strength = 0.72
  bloomPass.radius = 0.34
  bloomPass.enabled = !props.introActive
  composer.addPass(bloomPass)
  composer.addPass(new OutputPass())

  labelRenderer = new CSS2DRenderer()
  labelRenderer.setSize(host.clientWidth, host.clientHeight)
  labelRenderer.domElement.className = 'scene-label-layer'
  host.appendChild(labelRenderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.075
  controls.enablePan = true
  controls.enableZoom = true
  controls.rotateSpeed = 0.38
  controls.zoomSpeed = 0.72
  controls.panSpeed = 0.45
  controls.minDistance = 16
  controls.maxDistance = 86
  controls.minPolarAngle = Math.PI * 0.14
  controls.maxPolarAngle = Math.PI * 0.48
  controls.target.set(0, 1.8, 1.2)

  addLights()
  decorativeAssetsReady = Promise.allSettled([
    addCityBackdrop(),
    addLowPolyCityRing(),
    addGroundCarpet(),
  ]).then(() => undefined)
  addDataSky()
  addReferenceEnergyFlows()
  addCampusTelemetry()

  resizeObserver = new ResizeObserver(() => resizeScene())
  resizeObserver.observe(host)
}

function addLights() {
  scene.add(new THREE.HemisphereLight(0x83dff4, 0x01030b, 0.78))
  const moon = new THREE.DirectionalLight(0xc9f4ff, 1.72)
  moon.position.set(-20, 38, 24)
  moon.castShadow = true
  moon.shadow.mapSize.set(2048, 2048)
  moon.shadow.camera.left = -32
  moon.shadow.camera.right = 32
  moon.shadow.camera.top = 30
  moon.shadow.camera.bottom = -30
  scene.add(moon)

  const lights = [
    [0x00d9ff, 9, 14, -16, 18],
    [0x1bff83, -18, 8, 9, 20],
    [0x744cff, 16, 6, 9, 16],
    [0xff9d22, 2, 4, 14, 12],
  ] as const
  lights.forEach(([color, x, y, z, intensity]) => {
    const light = new THREE.PointLight(color, intensity, 75, 1.7)
    light.position.set(x, y, z)
    scene.add(light)
  })
}

async function addCityBackdrop() {
  const texture = await new THREE.TextureLoader().loadAsync('/assets/twin-city-skyline.png')
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.repeat.x = 1.45
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    color: 0x829eb0,
    side: THREE.BackSide,
    fog: false,
    transparent: true,
    opacity: 0.7,
    toneMapped: false,
  })
  const skyline = new THREE.Mesh(new THREE.CylinderGeometry(35.5, 35.5, 36, 96, 1, true), material)
  skyline.position.y = 13.2
  skyline.rotation.y = Math.PI * 0.08
  skyline.renderOrder = -10
  scene.add(skyline)
}

async function addGroundCarpet() {
  const texture = await new THREE.TextureLoader().loadAsync('/assets/twin-ground-grid.png')
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(2.4, 2.4)
  const carpet = new THREE.Mesh(
    new THREE.PlaneGeometry(112, 112),
    new THREE.MeshStandardMaterial({
      map: texture,
      color: 0x738b9b,
      emissive: 0x061a2d,
      emissiveIntensity: 0.28,
      roughness: 0.88,
      metalness: 0.08,
    }),
  )
  carpet.rotation.x = -Math.PI / 2
  carpet.position.y = -0.24
  carpet.receiveShadow = true
  scene.add(carpet)
}

async function addLowPolyCityRing() {
  const texture = await new THREE.TextureLoader().loadAsync('/assets/twin-facade-atlas.png')
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(0.72, 1.8)
  const geometry = new THREE.BoxGeometry(1, 1, 1)
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    emissiveMap: texture,
    color: 0x5f8295,
    emissive: 0x4f8aa4,
    emissiveIntensity: 0.43,
    roughness: 0.64,
    metalness: 0.15,
    transparent: true,
    opacity: 0.82,
  })
  const foregroundMaterial = material.clone()
  foregroundMaterial.color.setHex(0x436474)
  foregroundMaterial.emissiveIntensity = 0.3
  foregroundMaterial.opacity = 0.7
  const city = new THREE.InstancedMesh(geometry, material, 48)
  const foregroundCity = new THREE.InstancedMesh(geometry, foregroundMaterial, 32)
  const transform = new THREE.Object3D()
  const foregroundTransform = new THREE.Object3D()
  const cameraAngle = Math.atan2(camera.position.z, camera.position.x)
  for (let index = 0; index < 48; index += 1) {
    const angle = (index / 48) * Math.PI * 2 + ((index % 5) - 2) * 0.018
    const radius = 28.3 + (index % 6) * 1.42
    const width = 1.6 + (index % 4) * 0.52
    const depth = 1.65 + ((index + 2) % 5) * 0.4
    const angleDelta = Math.abs(Math.atan2(Math.sin(angle - cameraAngle), Math.cos(angle - cameraAngle)))
    const foregroundScale = angleDelta < 0.78 ? 0.28 : 1
    const height = (3.6 + ((index * 7) % 12) * 0.65) * foregroundScale
    transform.position.set(Math.cos(angle) * radius, height / 2 - 0.35, Math.sin(angle) * radius)
    transform.scale.set(width, height, depth)
    transform.rotation.y = -angle + Math.PI / 2
    transform.updateMatrix()
    city.setMatrixAt(index, transform.matrix)
  }
  city.instanceMatrix.needsUpdate = true
  for (let index = 0; index < 32; index += 1) {
    const angle = cameraAngle - 0.92 + (index / 31) * 1.84
    const radius = 30.5 + (index % 5) * 2.55
    const width = 1.8 + (index % 4) * 0.62
    const depth = 1.7 + ((index + 1) % 4) * 0.58
    const height = 2.3 + ((index * 5) % 7) * 0.56
    foregroundTransform.position.set(Math.cos(angle) * radius, height / 2 - 0.5, Math.sin(angle) * radius)
    foregroundTransform.scale.set(width, height, depth)
    foregroundTransform.rotation.y = -angle + Math.PI / 2
    foregroundTransform.updateMatrix()
    foregroundCity.setMatrixAt(index, foregroundTransform.matrix)
  }
  foregroundCity.instanceMatrix.needsUpdate = true
  scene.add(city, foregroundCity)
}

function addDataSky() {
  const stars: number[] = []
  for (let index = 0; index < 620; index += 1) {
    const radius = 22 + Math.random() * 54
    const angle = Math.random() * Math.PI * 2
    stars.push(Math.cos(angle) * radius, 9 + Math.random() * 43, Math.sin(angle) * radius)
  }
  const starGeometry = new THREE.BufferGeometry()
  starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(stars, 3))
  const starMaterial = new THREE.PointsMaterial({
    color: 0x18dfff,
    size: 0.08,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const field = new THREE.Points(starGeometry, starMaterial)
  scene.add(field)
  updaters.push((time) => {
    field.rotation.y = time * 0.006
    starMaterial.opacity = 0.42 + Math.sin(time * 0.8) * 0.08
  })

  const beamMaterial = new THREE.LineBasicMaterial({
    color: 0x00dfff,
    transparent: true,
    opacity: 0.2,
    blending: THREE.AdditiveBlending,
  })
  for (let index = 0; index < 56; index += 1) {
    const angle = (index / 56) * Math.PI * 2
    const radius = 26 + (index % 9) * 2.1
    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius
    const height = 5 + (index % 8) * 1.6
    const beam = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, 0, z), new THREE.Vector3(x, height, z)]),
      beamMaterial,
    )
    scene.add(beam)
  }
}

function addCampusTelemetry() {
  const group = new THREE.Group()
  group.name = 'CAMPUS_TELEMETRY_HALO'
  group.position.set(1.2, 0, 0.4)

  const beamMaterial = new THREE.LineBasicMaterial({
    color: 0x63eeff,
    transparent: true,
    opacity: 0.2,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  })
  const beam = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0.45, 0), new THREE.Vector3(0, 8.8, 0)]),
    beamMaterial,
  )
  const scanMaterial = new THREE.MeshBasicMaterial({
    color: 0x5affb4,
    transparent: true,
    opacity: 0.28,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  })
  const scan = new THREE.Mesh(new THREE.RingGeometry(0.32, 0.46, 36), scanMaterial)
  scan.rotation.x = -Math.PI / 2
  scan.position.y = 0.5
  group.add(beam, scan)
  scene.add(group)

  updaters.push((time) => {
    const scanPhase = (time * 0.34) % 1
    const scanScale = 0.9 + scanPhase * 4.4
    scan.scale.setScalar(scanScale)
    scanMaterial.opacity = (1 - scanPhase) * 0.26
    beamMaterial.opacity = 0.15 + Math.sin(time * 1.2) * 0.04
  })
}

async function loadCampusModel() {
  try {
    const gltf = await new GLTFLoader().loadAsync('/assets/enertwin-campus.glb?v=11')
    modelRoot = gltf.scene
    modelRoot.name = 'ENERTWIN_CAMPUS_ROOT'
    modelRoot.traverse((child) => {
      const mesh = child as THREE.Mesh
      if (!mesh.isMesh) return
      mesh.castShadow = !mesh.name.includes('WINDOW')
      mesh.receiveShadow = true
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map((material) => material.clone())
        : (mesh.material as THREE.Material).clone()
      trackedMeshes.push(mesh)
      const name = mesh.name.toUpperCase()
      if (name.startsWith('BUILDING_') || name.includes('STORAGE') || name.includes('CHARG') || name.includes('GRID_')) {
        interactiveMeshes.push(mesh)
      }
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      materials.forEach((material) => {
        const pbr = material as THREE.MeshStandardMaterial
        if (material.name.includes('UV_BAKED_FACADE')) pbr.emissiveIntensity = 0.48
        if (material.name.includes('WINDOW')) pbr.emissiveIntensity = 0.58
        if (material.name.includes('NEON')) pbr.emissiveIntensity = 2.08
        if (material.name.includes('SOLAR_PV')) pbr.emissiveIntensity = 0.48
        if (material.name.includes('UV_BAKED_GROUND')) pbr.emissiveIntensity = 0.23
        pbr.userData.baseOpacity = pbr.opacity
        pbr.userData.baseEmissiveIntensity = pbr.emissiveIntensity ?? 0
        if (name.includes('NEON') || material.name.includes('NEON')) {
          pbr.toneMapped = false
        }
      })
    })
    scene.add(modelRoot)
    addCampusLabels()
    addAlarmBeacon()
    applySceneMode()
    await decorativeAssetsReady
    try {
      await renderer?.compileAsync(scene, camera)
    } catch (compileError) {
      console.warn('Unable to precompile the EnerTwin scene', compileError)
    }
    loading.value = false
    emit('ready')
    if (props.warmupRequested) void beginSceneWarmup()
  } catch (error) {
    console.error('Unable to load EnerTwin campus GLB', error)
    loading.value = false
    emit('ready')
    if (props.warmupRequested) void beginSceneWarmup()
  }
}

function addCampusLabels() {
  campusTargets.forEach((target) => {
    const element = document.createElement('button')
    element.type = 'button'
    element.className = `scene-label scene-label-${target.tone}`
    element.dataset.code = target.code
    element.innerHTML = `<span>${target.name}</span><strong>${target.power()}</strong>`
    element.addEventListener('click', () => focusTarget(target))
    labelElements.set(target.code, element)
    const label = new CSS2DObject(element)
    label.position.copy(target.position)
    scene.add(label)
  })
}

function updateLabels() {
  campusTargets.forEach((target) => {
    const element = labelElements.get(target.code)
    const value = element?.querySelector('strong')
    if (value) value.textContent = target.power()
  })
}

function addAlarmBeacon() {
  const group = new THREE.Group()
  group.name = 'ALARM_BEACON'
  group.position.copy(alarmPosition)
  const coreMaterial = new THREE.MeshBasicMaterial({
    color: 0xff365c,
    transparent: true,
    opacity: 0.96,
    toneMapped: false,
  })
  const core = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.17, 0),
    coreMaterial,
  )
  core.position.y = 0.38

  const shell = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.29, 0),
    new THREE.MeshBasicMaterial({
      color: 0xff7892,
      wireframe: true,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  )
  shell.position.copy(core.position)

  const beamMaterial = new THREE.MeshBasicMaterial({
    color: 0xff365c,
    transparent: true,
    opacity: 0.13,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
    toneMapped: false,
  })
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.052, 2.35, 8, 1, true), beamMaterial)
  beam.position.y = 1.58

  const haloMaterial = new THREE.MeshBasicMaterial({
    color: 0xff6f89,
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  })
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.014, 6, 48), haloMaterial)
  halo.position.copy(core.position)
  halo.rotation.x = Math.PI / 2

  const pulseRings = Array.from({ length: 3 }, (_, index) => {
    const material = new THREE.MeshBasicMaterial({
      color: index === 0 ? 0xff365c : 0xff7892,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.012, 6, 48), material)
    ring.position.y = 0.08 + index * 0.015
    ring.rotation.x = Math.PI / 2
    group.add(ring)
    return { ring, material, offset: index / 3 }
  })

  const beaconLight = new THREE.PointLight(0xff264e, 1.8, 4.2, 2)
  beaconLight.position.y = 0.5
  group.add(core, shell, beam, halo, beaconLight)
  scene.add(group)

  const element = document.createElement('button')
  element.type = 'button'
  element.className = 'scene-alarm-label'
  element.setAttribute('aria-label', '一级告警：PCS-02 储能 PCS 温度越限，当前 68.4 摄氏度')
  element.innerHTML = '<span><i></i><b>CRITICAL / 一级</b><small>AL-01</small></span><strong>PCS-02 <small>储能 PCS</small></strong><em><b>温度越限</b><small>68.4°C</small></em>'
  element.addEventListener('click', () => focusAlarm())
  const label = new CSS2DObject(element)
  label.position.set(0, 3.1, 0)
  group.add(label)
  updaters.push((time) => {
    const pulse = 0.92 + Math.sin(time * 4.2) * 0.12
    core.scale.setScalar(pulse)
    core.rotation.y = time * 1.8
    shell.rotation.x = time * 0.72
    shell.rotation.y = -time * 1.05
    halo.rotation.z = time * 0.95
    halo.scale.setScalar(0.92 + Math.sin(time * 2.6) * 0.08)
    haloMaterial.opacity = 0.48 + Math.sin(time * 3.1) * 0.18
    beamMaterial.opacity = 0.08 + Math.sin(time * 2.4) * 0.035
    beaconLight.intensity = 1.45 + Math.sin(time * 3.8) * 0.42
    pulseRings.forEach(({ ring, material, offset }) => {
      const phase = (time * 0.42 + offset) % 1
      ring.scale.setScalar(0.76 + phase * 2.5)
      material.opacity = (1 - phase) * 0.38
    })
  })
}

function addReferenceEnergyFlows() {
  const energyBus = new THREE.Vector3(0, 8.85, -0.8)

  // Source side: three saturated colors converge above the central courtyard.
  addOrthogonalFlow('grid', 0x3288ff, [
    new THREE.Vector3(0, 3.1, -12),
    new THREE.Vector3(-2.8, 7.3, -7.4),
    energyBus,
  ])
  addOrthogonalFlow('pv', 0x25ff82, [
    new THREE.Vector3(-12, 8.15, -6.5),
    new THREE.Vector3(-6.4, 9.1, -4.2),
    energyBus,
  ])
  addOrthogonalFlow('storage', 0x9a65ff, [
    new THREE.Vector3(-22.5, 3.05, -5.5),
    new THREE.Vector3(-8.4, 9.4, 1.2),
    energyBus,
  ])

  // Load side: the bus allocates a unified cyan stream to key buildings, while
  // EV charging keeps its own amber circuit for instant category recognition.
  addOrthogonalFlow('load', 0x00dfff, [
    energyBus,
    new THREE.Vector3(1.5, 7.4, 2.1),
    new THREE.Vector3(3, 5.8, 5.2),
  ])
  addOrthogonalFlow('load', 0x00dfff, [
    energyBus,
    new THREE.Vector3(7.2, 9.1, -3.4),
    new THREE.Vector3(12.5, 8.75, -6.5),
  ])
  addOrthogonalFlow('load', 0x00dfff, [
    energyBus,
    new THREE.Vector3(8.2, 6.8, 3.4),
    new THREE.Vector3(15.5, 4.7, 6.5),
  ])
  addOrthogonalFlow('charging', 0xffb31b, [
    energyBus,
    new THREE.Vector3(10.5, 7.5, 8.2),
    new THREE.Vector3(19.8, 5.1, 9.4),
    new THREE.Vector3(24.5, 3.05, 1),
  ])

  addEnergyDispatchHub(energyBus.clone().add(new THREE.Vector3(0, 0.72, 0)))
}

function addEnergyDispatchHub(position: THREE.Vector3) {
  const hub = new THREE.Group()
  hub.name = 'ENERGY_DISPATCH_HUB'
  hub.position.copy(position)

  const colors = [0x25ff82, 0x9a65ff, 0x3288ff, 0x00dfff, 0xffb31b]
  const rings: THREE.Mesh[] = []
  colors.forEach((ringColor, index) => {
    const material = new THREE.MeshBasicMaterial({
      color: ringColor,
      transparent: true,
      opacity: 0.7 - index * 0.06,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.34 + index * 0.105, 0.025, 6, 42), material)
    ring.rotation.x = Math.PI / 2
    ring.rotation.z = index * 0.42
    rings.push(ring)
    hub.add(ring)
  })

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.135, 18, 14),
    new THREE.MeshBasicMaterial({
      color: 0x3eeaff,
      transparent: true,
      opacity: 0.66,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  )
  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.12, 3.8, 18, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0x00dfff,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    }),
  )
  beacon.position.y = 1.65
  hub.add(core, beacon)

  const element = document.createElement('div')
  element.className = 'scene-label scene-label-cyan energy-hub-label'
  element.innerHTML = '<span>园区能源母线</span><strong>多源汇聚 · 智能分配</strong>'
  const label = new CSS2DObject(element)
  label.position.set(2.35, 2.15, 0.2)
  hub.add(label)

  updaters.push((time) => {
    rings.forEach((ring, index) => {
      ring.rotation.z = time * (index % 2 === 0 ? 0.18 : -0.14) + index * 0.42
      const pulse = 1 + Math.sin(time * 2.2 - index * 0.5) * 0.045
      ring.scale.setScalar(pulse)
    })
    core.scale.setScalar(0.9 + Math.sin(time * 3.6) * 0.12)
  })
  scene.add(hub)
}

function addEnergyFlows() {
  addOrthogonalFlow('pv', 0x25ff82, [
    new THREE.Vector3(-10, 0.58, -5.5),
    new THREE.Vector3(-10, 0.58, 0),
    new THREE.Vector3(0, 0.58, 0),
    new THREE.Vector3(0, 0.58, 5),
  ])
  addOrthogonalFlow('pv', 0x25ff82, [
    new THREE.Vector3(10.5, 0.56, -5.5),
    new THREE.Vector3(10.5, 0.56, 0),
    new THREE.Vector3(0, 0.56, 0),
  ])
  addOrthogonalFlow('storage', 0x8b55ff, [
    new THREE.Vector3(-20, 0.62, -4),
    new THREE.Vector3(-20, 0.62, 3),
    new THREE.Vector3(-8, 0.62, 3),
    new THREE.Vector3(-8, 0.62, 5),
    new THREE.Vector3(0, 0.62, 5),
  ])
  addOrthogonalFlow('grid', 0x00deff, [
    new THREE.Vector3(20, 0.66, -7),
    new THREE.Vector3(20, 0.66, -1),
    new THREE.Vector3(12, 0.66, -1),
    new THREE.Vector3(12, 0.66, 0),
    new THREE.Vector3(0, 0.66, 0),
  ])
  addOrthogonalFlow('charging', 0xffb31b, [
    new THREE.Vector3(0, 0.7, 5),
    new THREE.Vector3(10, 0.7, 5),
    new THREE.Vector3(10, 0.7, 2),
    new THREE.Vector3(19, 0.7, 2),
  ])
  addOrthogonalFlow('charging', 0xffb31b, [
    new THREE.Vector3(0, 0.68, 5),
    new THREE.Vector3(0, 0.68, 14),
    new THREE.Vector3(13, 0.68, 14),
    new THREE.Vector3(13, 0.68, 10.5),
  ])
  addOrthogonalFlow('storage', 0x8b55ff, [
    new THREE.Vector3(-20, 0.64, -4),
    new THREE.Vector3(-24, 0.64, -4),
    new THREE.Vector3(-24, 0.64, 14),
    new THREE.Vector3(-14, 0.64, 14),
    new THREE.Vector3(-14, 0.64, 9),
  ])
  addOrthogonalFlow('grid', 0x00deff, [
    new THREE.Vector3(20, 0.72, -7),
    new THREE.Vector3(24, 0.72, -7),
    new THREE.Vector3(24, 0.72, 14),
    new THREE.Vector3(19, 0.72, 14),
    new THREE.Vector3(19, 0.72, 2),
  ])
  addOrthogonalFlow('pv', 0x27ff82, [
    new THREE.Vector3(-15, 0.76, -9),
    new THREE.Vector3(-5, 0.76, -9),
    new THREE.Vector3(-5, 0.76, 0),
    new THREE.Vector3(-15, 0.76, 0),
    new THREE.Vector3(-15, 0.76, -9),
  ])
  addOrthogonalFlow('grid', 0x00deff, [
    new THREE.Vector3(6, 0.78, -9),
    new THREE.Vector3(15, 0.78, -9),
    new THREE.Vector3(15, 0.78, 0),
    new THREE.Vector3(6, 0.78, 0),
    new THREE.Vector3(6, 0.78, -9),
  ])
  addOrthogonalFlow('charging', 0xffb31b, [
    new THREE.Vector3(-5, 0.8, 1),
    new THREE.Vector3(5, 0.8, 1),
    new THREE.Vector3(5, 0.8, 9),
    new THREE.Vector3(-5, 0.8, 9),
    new THREE.Vector3(-5, 0.8, 1),
  ])
  addOrthogonalFlow('storage', 0x8b55ff, [
    new THREE.Vector3(-18, 0.82, 6),
    new THREE.Vector3(-10, 0.82, 6),
    new THREE.Vector3(-10, 0.82, 13),
    new THREE.Vector3(-18, 0.82, 13),
    new THREE.Vector3(-18, 0.82, 6),
  ])
  addOrthogonalFlow('charging', 0xffb31b, [
    new THREE.Vector3(8, 0.84, 4.5),
    new THREE.Vector3(18, 0.84, 4.5),
    new THREE.Vector3(18, 0.84, 11.5),
    new THREE.Vector3(8, 0.84, 11.5),
    new THREE.Vector3(8, 0.84, 4.5),
  ])
}

function addCampusBoundaryGlow() {
  const points = [
    new THREE.Vector3(-27, 0.34, -19),
    new THREE.Vector3(27, 0.34, -19),
    new THREE.Vector3(27, 0.34, 19),
    new THREE.Vector3(-27, 0.34, 19),
    new THREE.Vector3(-27, 0.34, -19),
  ]
  const material = new THREE.LineBasicMaterial({
    color: 0x22ff7d,
    transparent: true,
    opacity: 0.92,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  })
  const boundary = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material)
  scene.add(boundary)

  const nodes: number[] = []
  for (let index = 0; index < 112; index += 1) {
    const t = index / 112
    const side = Math.floor(t * 4)
    const local = (t * 4) % 1
    if (side === 0) nodes.push(-27 + local * 54, 0.42, -19)
    if (side === 1) nodes.push(27, 0.42, -19 + local * 38)
    if (side === 2) nodes.push(27 - local * 54, 0.42, 19)
    if (side === 3) nodes.push(-27, 0.42, 19 - local * 38)
  }
  const nodeGeometry = new THREE.BufferGeometry()
  nodeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(nodes, 3))
  const nodeMaterial = new THREE.PointsMaterial({
    color: 0x5dff9b,
    size: 0.15,
    transparent: true,
    opacity: 0.92,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  })
  const nodeField = new THREE.Points(nodeGeometry, nodeMaterial)
  scene.add(nodeField)
  updaters.push((time) => {
    material.opacity = 0.72 + Math.sin(time * 1.7) * 0.16
    nodeMaterial.opacity = 0.72 + Math.sin(time * 2.2) * 0.2
  })
}

function addOrthogonalFlow(kind: string, color: number, points: THREE.Vector3[]) {
  const group = new THREE.Group()
  group.name = `ENERGY_ROUTE_${kind.toUpperCase()}`
  group.userData.flowKind = kind
  const flightLift = kind === 'grid' ? 2.9 : kind === 'charging' ? 2.55 : kind === 'load' ? 2.45 : 2.7
  const routePoints = points.map((point, index) => {
    const progress = index / (points.length - 1)
    const lift = 0.72 + Math.sin(progress * Math.PI) * flightLift
    return point.clone().add(new THREE.Vector3(0, lift, 0))
  })
  const routeLength = routePoints.slice(0, -1).reduce((sum, point, index) => sum + point.distanceTo(routePoints[index + 1]), 0)
  const curve = new THREE.CatmullRomCurve3(routePoints, false, 'centripetal', 0.18)
  const isDispatchHubPoint = (point: THREE.Vector3) => (
    point.y > 8
    && Math.abs(point.x) < 0.2
    && Math.abs(point.z + 0.8) < 0.2
  )
  const tubularSegments = Math.max(72, Math.ceil(routeLength * 3.2))
  const routeGeometry = new THREE.TubeGeometry(curve, tubularSegments, 1, 10, false)

  const guideMaterial = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.075,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  })
  const energyMaterial = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.38,
    blending: THREE.AdditiveBlending,
    depthTest: true,
    depthWrite: false,
    toneMapped: false,
  })
  const hotCoreMaterial = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.36,
    blending: THREE.AdditiveBlending,
    depthTest: true,
    depthWrite: false,
    toneMapped: false,
  })
  const guide = new THREE.Mesh(routeGeometry, guideMaterial)
  guide.scale.setScalar(0.24)
  const energyLane = new THREE.Mesh(routeGeometry, energyMaterial)
  energyLane.scale.setScalar(0.075)
  const hotCore = new THREE.Mesh(routeGeometry, hotCoreMaterial)
  hotCore.scale.setScalar(0.018)
  ;[guide, energyLane, hotCore].forEach((mesh, index) => {
    mesh.frustumCulled = false
    mesh.renderOrder = 10 + index
  })
  group.add(guide, energyLane, hotCore)

  const terminalStemMaterial = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.48,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  })
  ;[0, points.length - 1].forEach((index) => {
    if (isDispatchHubPoint(points[index])) return
    const stemCurve = new THREE.LineCurve3(points[index], routePoints[index])
    const stem = new THREE.Mesh(new THREE.TubeGeometry(stemCurve, 8, 0.045, 8, false), terminalStemMaterial)
    stem.renderOrder = 13
    group.add(stem)
  })

  // Compact relay nodes make changes in direction feel intentional and expose
  // source / destination without adding another layer of labels to the scene.
  const nodeMaterial = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.48,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  })
  const nodeCoreMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.04),
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  })
  const relayNodes: THREE.Group[] = []
  routePoints.forEach((point, index) => {
    if (isDispatchHubPoint(points[index])) return
    const relay = new THREE.Group()
    const terminal = index === 0 || index === points.length - 1
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(terminal ? 0.32 : 0.22, terminal ? 0.035 : 0.025, 6, 32),
      nodeMaterial,
    )
    ring.rotation.x = Math.PI / 2
    const core = new THREE.Mesh(new THREE.SphereGeometry(terminal ? 0.085 : 0.055, 10, 8), nodeCoreMaterial)
    relay.position.copy(point)
    relay.add(ring, core)
    relay.renderOrder = 16
    relayNodes.push(relay)
    group.add(relay)
  })

  // Each energy packet has a bright head and three progressively smaller trail
  // segments. Instancing keeps the showroom effect inexpensive even on 4K walls.
  const packetCount = kind === 'charging' ? 8 : kind === 'storage' ? 5 : kind === 'load' ? 6 : 7
  const trailLayers = 4
  const packetGeometry = new THREE.CapsuleGeometry(0.072, 0.46, 4, 8)
  const packetColor = new THREE.Color(color)
  const trailFields = Array.from({ length: trailLayers }, (_, layer) => {
    const material = new THREE.MeshBasicMaterial({
      color: packetColor.clone().lerp(new THREE.Color(0xffffff), Math.max(0, 0.05 - layer * 0.0125)),
      transparent: true,
      opacity: 0.94 - layer * 0.19,
      blending: THREE.AdditiveBlending,
      depthTest: true,
      depthWrite: false,
      toneMapped: false,
    })
    const field = new THREE.InstancedMesh(packetGeometry, material, packetCount)
    field.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    field.frustumCulled = false
    field.renderOrder = 24 - layer
    group.add(field)
    return { field, material }
  })

  const headGeometry = new THREE.SphereGeometry(0.105, 10, 8)
  const headMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.08),
    transparent: true,
    opacity: 0.98,
    blending: THREE.AdditiveBlending,
    depthTest: true,
    depthWrite: false,
    toneMapped: false,
  })
  const headField = new THREE.InstancedMesh(headGeometry, headMaterial, packetCount)
  headField.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  headField.frustumCulled = false
  headField.renderOrder = 26
  group.add(headField)

  const glowPositions = new Float32Array(packetCount * 3)
  const glowGeometry = new THREE.BufferGeometry()
  glowGeometry.setAttribute('position', new THREE.BufferAttribute(glowPositions, 3).setUsage(THREE.DynamicDrawUsage))
  const glowMaterial = new THREE.PointsMaterial({
    color,
    map: makeFlowGlowTexture(),
    size: 0.78,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.72,
    alphaTest: 0.015,
    blending: THREE.AdditiveBlending,
    depthTest: true,
    depthWrite: false,
    toneMapped: false,
  })
  const glowField = new THREE.Points(glowGeometry, glowMaterial)
  glowField.frustumCulled = false
  glowField.renderOrder = 25
  group.add(glowField)

  const packetTransform = new THREE.Object3D()
  const upAxis = new THREE.Vector3(0, 1, 0)
  const point = new THREE.Vector3()
  const tangent = new THREE.Vector3()
  const routePower = () => {
    if (kind === 'pv') return THREE.MathUtils.clamp(props.pvPowerKw / 280, 0.38, 1)
    if (kind === 'charging') return THREE.MathUtils.clamp(props.chargerPowerKw / 170, 0.38, 1)
    if (kind === 'grid') return THREE.MathUtils.clamp((props.loadPowerKw - props.pvPowerKw * 0.55) / 420, 0.38, 1)
    if (kind === 'load') return THREE.MathUtils.clamp(props.loadPowerKw / 560, 0.38, 1)
    return THREE.MathUtils.clamp(0.42 + props.storageSoc / 170, 0.38, 1)
  }

  updaters.push((time) => {
    const power = routePower()
    const emphasis = props.mode === 'overview' || props.mode === kind || (kind === 'load' && props.mode === 'building')
      ? 1
      : props.mode === 'building'
        ? 0.42
        : 0.2
    const speed = (kind === 'charging' ? 0.12 : kind === 'storage' ? 0.082 : 0.096) * (0.72 + power * 0.48)
    const trailGap = THREE.MathUtils.clamp(0.018 / Math.max(routeLength / 28, 0.7), 0.008, 0.021)

    for (let index = 0; index < packetCount; index += 1) {
      const rawHeadProgress = (time * speed + index / packetCount) % 1
      const headProgress = Number.isFinite(rawHeadProgress)
        ? THREE.MathUtils.clamp(rawHeadProgress, 0, 0.999999)
        : 0
      curve.getPoint(headProgress, point)
      const distanceScale = THREE.MathUtils.clamp(camera.position.distanceTo(point) * 0.016, 0.66, 1.14)
      const pulse = 0.95 + Math.sin(time * 6.2 + index * 0.9) * 0.08
      curve.getTangent(headProgress, tangent).normalize()

      packetTransform.position.copy(point)
      packetTransform.quaternion.setFromUnitVectors(upAxis, tangent)
      packetTransform.scale.setScalar(distanceScale * pulse)
      packetTransform.updateMatrix()
      headField.setMatrixAt(index, packetTransform.matrix)
      glowPositions[index * 3] = point.x
      glowPositions[index * 3 + 1] = point.y
      glowPositions[index * 3 + 2] = point.z

      trailFields.forEach(({ field }, layer) => {
        const rawProgress = ((headProgress - (layer + 0.6) * trailGap) % 1 + 1) % 1
        const progress = Number.isFinite(rawProgress)
          ? THREE.MathUtils.clamp(rawProgress, 0, 0.999999)
          : 0
        curve.getPoint(progress, point)
        curve.getTangent(progress, tangent).normalize()
        const falloff = 1 - layer * 0.16
        packetTransform.position.copy(point)
        packetTransform.quaternion.setFromUnitVectors(upAxis, tangent)
        packetTransform.scale.set(distanceScale * falloff, distanceScale * (1.18 - layer * 0.1), distanceScale * falloff)
        packetTransform.updateMatrix()
        field.setMatrixAt(index, packetTransform.matrix)
      })
    }
    headField.instanceMatrix.needsUpdate = true
    trailFields.forEach(({ field, material }, layer) => {
      field.instanceMatrix.needsUpdate = true
      material.opacity = (0.92 - layer * 0.18) * emphasis
    })
    glowGeometry.attributes.position.needsUpdate = true

    guideMaterial.opacity = (0.055 + power * 0.04) * emphasis
    energyMaterial.opacity = (0.32 + power * 0.24 + Math.sin(time * 1.8) * 0.025) * emphasis
    hotCoreMaterial.opacity = (0.3 + power * 0.16) * emphasis
    terminalStemMaterial.opacity = (0.34 + power * 0.2) * emphasis
    headMaterial.opacity = 0.98 * emphasis
    glowMaterial.opacity = (0.44 + power * 0.34) * emphasis
    nodeMaterial.opacity = (0.28 + power * 0.24) * emphasis
    nodeCoreMaterial.opacity = 0.88 * emphasis
    relayNodes.forEach((relay, index) => {
      const terminalBoost = index === 0 || index === relayNodes.length - 1 ? 0.18 : 0
      const scale = 1 + terminalBoost + Math.sin(time * 2.4 - index * 0.7) * (0.08 + power * 0.035)
      relay.scale.setScalar(scale)
    })
  })
  scene.add(group)
}

function makeFlowGlowTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const context = canvas.getContext('2d')
  if (!context) return null
  const glow = context.createRadialGradient(32, 32, 1, 32, 32, 31)
  glow.addColorStop(0, 'rgba(255,255,255,1)')
  glow.addColorStop(0.18, 'rgba(255,255,255,0.9)')
  glow.addColorStop(0.48, 'rgba(255,255,255,0.26)')
  glow.addColorStop(1, 'rgba(255,255,255,0)')
  context.fillStyle = glow
  context.fillRect(0, 0, 64, 64)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function handleScenePointer(event: PointerEvent) {
  if (!renderer || !sceneRef.value) return
  const bounds = renderer.domElement.getBoundingClientRect()
  pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1
  pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1
  raycaster.setFromCamera(pointer, camera)
  const hit = raycaster.intersectObjects(interactiveMeshes, false)[0]
  if (!hit) return
  const name = hit.object.name.toUpperCase()
  let code = campusTargets.find((item) => name.includes(item.code))?.code
  if (name.includes('STORAGE')) code = 'STORAGE'
  if (name.includes('CHARGER')) code = 'CHARGING'
  if (name.includes('GRID')) code = 'GRID'
  const target = campusTargets.find((item) => item.code === code)
  if (target) focusTarget(target)
}

function modeForTarget(target: CampusTarget): SceneMode | null {
  if (target.code === 'STORAGE') return 'storage'
  if (target.code === 'CHARGING') return 'charging'
  if (/^[A-E]\d$/.test(target.code)) return 'building'
  return null
}

function focusTarget(target: CampusTarget, mode: SceneMode | null = modeForTarget(target)) {
  selectedCode.value = target.code
  if (mode) emit('focusMode', mode)
  const offset = new THREE.Vector3(9.5, 7.8, 10.5)
  const cameraPosition = target.position.clone().add(offset)
  gsap.to(camera.position, { x: cameraPosition.x, y: cameraPosition.y, z: cameraPosition.z, duration: 1.05, ease: 'power2.inOut' })
  gsap.to(controls.target, { x: target.position.x, y: Math.max(1.2, target.position.y * 0.45), z: target.position.z, duration: 1.05, ease: 'power2.inOut' })
}

function focusAlarm(syncMode = true) {
  selectedCode.value = null
  if (syncMode) emit('focusMode', 'alarm')
  const cameraPosition = alarmPosition.clone().add(new THREE.Vector3(5.4, 4.2, 6.6))
  gsap.to(camera.position, { x: cameraPosition.x, y: cameraPosition.y, z: cameraPosition.z, duration: 1.05, ease: 'power2.inOut' })
  gsap.to(controls.target, { x: alarmPosition.x, y: alarmPosition.y + 1.8, z: alarmPosition.z, duration: 1.05, ease: 'power2.inOut' })
}

function resetOverview() {
  selectedCode.value = null
  gsap.to(camera.position, { x: 38, y: 36, z: 48, duration: 1.1, ease: 'power2.inOut' })
  gsap.to(controls.target, { x: 0, y: 1.8, z: 1.2, duration: 1.1, ease: 'power2.inOut' })
}

function applySceneMode() {
  if (!scene) return
  const activeKind = props.mode
  trackedMeshes.forEach((mesh) => {
    const name = mesh.name.toUpperCase()
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    let active = activeKind === 'overview'
    if (activeKind === 'pv') active = name.includes('_PV_') || name.startsWith('BUILDING_')
    if (activeKind === 'storage') active = name.includes('STORAGE')
    if (activeKind === 'charging') active = name.includes('CHARG')
    if (activeKind === 'building') active = name.startsWith('BUILDING_') || name.includes('FACADE') || name.includes('WINDOW')
    if (activeKind === 'alarm') active = name.includes('C3')
    materials.forEach((material) => {
      const pbr = material as THREE.MeshStandardMaterial
      pbr.transparent = true
      pbr.opacity = active ? (pbr.userData.baseOpacity ?? 1) : 0.28
      if ('emissiveIntensity' in pbr) {
        pbr.emissiveIntensity = active
          ? (pbr.userData.baseEmissiveIntensity ?? 0)
          : Math.min(0.08, pbr.userData.baseEmissiveIntensity ?? 0)
      }
    })
  })

  scene.children.forEach((child) => {
    const kind = child.userData.flowKind as string | undefined
    if (!kind) return
    child.visible = true
  })

  const targetByMode: Partial<Record<SceneMode, CampusTarget>> = {
    storage: campusTargets[5],
    charging: campusTargets[6],
    pv: campusTargets[0],
    building: campusTargets[1],
  }
  if (activeKind === 'alarm') {
    focusAlarm(false)
    return
  }
  const selected = selectedTarget.value
  const selectedMode = selected ? modeForTarget(selected) : null
  const focus = selectedMode === activeKind ? selected : targetByMode[activeKind]
  if (focus) focusTarget(focus, null)
  else resetOverview()
}

function applyTheme() {
  if (!scene || !renderer) return
  const isNight = props.nightMode
  scene.background = new THREE.Color(isNight ? 0x020713 : 0x0a2740)
  scene.fog = new THREE.FogExp2(isNight ? 0x020b17 : 0x153c54, isNight ? 0.0115 : 0.0075)
  renderer.toneMappingExposure = isNight ? 0.84 : 1.02
  if (bloomPass) bloomPass.strength = isNight ? 0.72 : 0.4
}

function applyPerformanceMode() {
  if (!renderer || !composer) return
  const lightweightIntro = props.introActive && !props.warmupRequested
  if (lightweightIntro) {
    renderer.shadowMap.enabled = false
    if (bloomPass) bloomPass.enabled = false
    setRenderPixelRatio(0.7)
  } else if (props.warmupRequested) {
    void beginSceneWarmup()
  } else {
    setRenderPixelRatio(0.88)
    if (bloomPass) bloomPass.enabled = true
    renderer.shadowMap.enabled = true
    renderer.shadowMap.autoUpdate = false
    renderer.shadowMap.needsUpdate = true
  }
  lastFrame = performance.now()
  lastRender = 0
}

async function beginSceneWarmup() {
  if (!props.warmupRequested || loading.value || !renderer || !composer || sceneWarmupStarted) return
  sceneWarmupStarted = true
  setRenderPixelRatio(0.88)
  if (bloomPass) bloomPass.enabled = true
  renderer.shadowMap.enabled = true
  renderer.shadowMap.autoUpdate = false
  renderer.shadowMap.needsUpdate = true

  try {
    await renderer.compileAsync(scene, camera)
  } catch (compileError) {
    console.warn('Unable to warm up the EnerTwin render pipeline', compileError)
  }

  await waitForRenderFrames(4)
  emit('warmupReady')
}

function waitForRenderFrames(count: number) {
  return new Promise<void>((resolve) => {
    let remaining = count
    const advance = () => {
      remaining -= 1
      if (remaining <= 0) resolve()
      else window.requestAnimationFrame(advance)
    }
    window.requestAnimationFrame(advance)
  })
}

function setRenderPixelRatio(maxPixelRatio: number) {
  if (!renderer || !composer) return
  const pixelRatio = Math.min(window.devicePixelRatio, maxPixelRatio)
  renderer.setPixelRatio(pixelRatio)
  composer.setPixelRatio(pixelRatio)
  resizeScene()
}

function resizeScene() {
  if (!renderer || !composer || !labelRenderer || !sceneRef.value) return
  const width = sceneRef.value.clientWidth
  const height = sceneRef.value.clientHeight
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height, false)
  composer.setSize(width, height)
  labelRenderer.setSize(width, height)
}

function animate(now = performance.now()) {
  if (!staticQa || loading.value) frame = requestAnimationFrame(animate)
  const lightweightIntro = props.introActive && !props.warmupRequested
  const minimumFrameDuration = lightweightIntro ? 1000 / 24 : 0
  if (minimumFrameDuration && now - lastRender < minimumFrameDuration) return
  lastRender = now
  const delta = Math.min(0.05, (now - lastFrame) / 1000)
  lastFrame = now
  elapsed += delta
  updaters.forEach((update) => update(elapsed, delta))
  controls?.update()
  if (lightweightIntro) {
    renderer?.render(scene, camera)
  } else {
    composer?.render(delta)
    labelRenderer?.render(scene, camera)
  }
}
</script>

<template>
  <div ref="sceneRef" class="digital-twin-scene" :data-mode="props.mode">
    <div v-if="loading" class="scene-loading">
      <span></span>
      <strong>加载数字孪生园区</strong>
    </div>

    <article v-if="selectedTarget" class="device-detail-card">
      <header>
        <div>
          <span>{{ selectedTarget.code }}</span>
          <strong>{{ selectedTarget.name }}</strong>
        </div>
        <button type="button" aria-label="关闭设备详情" @click="selectedCode = null">×</button>
      </header>
      <dl>
        <div><dt>系统类型</dt><dd>{{ selectedTarget.type }}</dd></div>
        <div><dt>当前功率</dt><dd>{{ selectedTarget.power() }}</dd></div>
        <div><dt>运行状态</dt><dd class="healthy">在线 · 正常</dd></div>
      </dl>
    </article>
  </div>
</template>

import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { gsap } from 'gsap';
import AlarmTicker from './components/AlarmTicker.vue';
import DigitalTwinScene from './components/DigitalTwinScene.vue';
import GlassPanel from './components/GlassPanel.vue';
import MetricFlip from './components/MetricFlip.vue';
import StatusRing from './components/StatusRing.vue';
import TopBar from './components/TopBar.vue';
import { useScreenStore } from './stores/screenStore';
const TrendChart = defineAsyncComponent(() => import('./components/TrendChart.vue'));
const store = useScreenStore();
const screenScale = ref(1);
const screenRef = ref(null);
const introRef = ref(null);
const sceneReady = ref(false);
const introStatus = ref('建立园区数据链路');
const staticQa = new URLSearchParams(window.location.search).has('qa');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const introVisible = ref(!staticQa && !reduceMotion);
const chartStage = ref(introVisible.value ? 0 : 2);
const sceneWarmupRequested = ref(!introVisible.value);
const warmupActive = ref(false);
let introTimeline = null;
let introProgressTween = null;
let introMinimumTimer = 0;
let introFallbackTimer = 0;
let warmupMinimumTimer = 0;
let warmupFallbackTimer = 0;
let entryDelayTimer = 0;
let introMinimumElapsed = false;
let introClosing = false;
let warmupStarted = false;
let warmupMinimumElapsed = false;
let warmupCompleted = false;
let sceneWarmupReady = !introVisible.value;
let introProgress = 8;
const introPhaseTimers = [];
const readyCharts = new Set();
function updateScreenScale() {
    screenScale.value = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
}
onMounted(async () => {
    updateScreenScale();
    window.addEventListener('resize', updateScreenScale);
    store.startMockStream();
    if (introVisible.value) {
        await nextTick();
        startIntroSequence();
    }
});
onBeforeUnmount(() => {
    window.removeEventListener('resize', updateScreenScale);
    store.stopMockStream();
    window.clearTimeout(introMinimumTimer);
    window.clearTimeout(introFallbackTimer);
    window.clearTimeout(warmupMinimumTimer);
    window.clearTimeout(warmupFallbackTimer);
    window.clearTimeout(entryDelayTimer);
    introPhaseTimers.forEach((timer) => window.clearTimeout(timer));
    introTimeline?.kill();
    introProgressTween?.kill();
});
function startIntroSequence() {
    if (!introRef.value || !screenRef.value)
        return;
    const dashboardParts = screenRef.value.querySelectorAll('.top-bar, .left-stack > .glass-panel, .right-stack > .glass-panel, .bottom-dock, .benefit-float, .scene-hud');
    gsap.set(dashboardParts, { opacity: 0 });
    introTimeline = gsap
        .timeline({ defaults: { ease: 'power3.out' } })
        .from('.intro-kicker', { y: 16, opacity: 0, duration: 0.45 })
        .from('.intro-title-line', { y: 42, opacity: 0, skewY: 2, stagger: 0.09, duration: 0.72 }, '-=0.18')
        .from('.intro-core-shell', { scale: 0.45, opacity: 0, rotate: -18, duration: 0.9 }, '-=0.62')
        .from('.intro-orbit', { opacity: 0, stagger: 0.08, duration: 0.75 }, '-=0.65')
        .from('.intro-status-panel', { y: 22, opacity: 0, duration: 0.52 }, '-=0.28')
        .from('.intro-telemetry', { x: -24, opacity: 0, stagger: 0.08, duration: 0.48 }, '-=0.46');
    const progressState = { value: introProgress };
    renderIntroProgress(8);
    introProgressTween = gsap.to(progressState, {
        value: 88,
        duration: 3.1,
        ease: 'power2.inOut',
        onUpdate: () => {
            renderIntroProgress(progressState.value);
        },
    });
    scheduleIntroPhase(650, '同步能源资产拓扑');
    scheduleIntroPhase(1420, '校准光储充能量路由');
    scheduleIntroPhase(2240, '构建三维孪生场景');
    introMinimumTimer = window.setTimeout(() => {
        introMinimumElapsed = true;
        if (sceneReady.value)
            beginResourceWarmup();
        else
            introStatus.value = '等待孪生模型响应';
    }, 3100);
    introFallbackTimer = window.setTimeout(() => beginResourceWarmup(true), 7200);
}
function scheduleIntroPhase(delay, label) {
    introPhaseTimers.push(window.setTimeout(() => {
        if (!introClosing)
            introStatus.value = label;
    }, delay));
}
function renderIntroProgress(value) {
    if (!introRef.value)
        return;
    const rounded = Math.round(value);
    if (rounded === introProgress && value !== 8)
        return;
    introProgress = rounded;
    const valueElement = introRef.value.querySelector('.intro-progress-value');
    const progressBar = introRef.value.querySelector('.intro-progress-track > i');
    const progressTrack = introRef.value.querySelector('.intro-progress-track');
    if (valueElement)
        valueElement.textContent = String(rounded).padStart(2, '0');
    if (progressBar)
        progressBar.style.transform = `scaleX(${rounded / 100})`;
    progressTrack?.setAttribute('aria-valuenow', String(rounded));
    introRef.value.querySelectorAll('.intro-checkpoints span').forEach((checkpoint) => {
        checkpoint.classList.toggle('online', rounded >= Number(checkpoint.dataset.threshold ?? 100));
    });
}
function handleSceneReady() {
    sceneReady.value = true;
    if (!introVisible.value)
        return;
    introStatus.value = '数字孪生场景已就绪';
    if (introMinimumElapsed)
        beginResourceWarmup();
}
function beginResourceWarmup(force = false) {
    if (!introVisible.value || warmupStarted)
        return;
    if (!force && (!sceneReady.value || !introMinimumElapsed))
        return;
    warmupStarted = true;
    warmupActive.value = true;
    window.clearTimeout(introFallbackTimer);
    introPhaseTimers.forEach((timer) => window.clearTimeout(timer));
    introStatus.value = '资源预热中 · 正在初始化运行环境';
    chartStage.value = 2;
    sceneWarmupRequested.value = true;
    introProgressTween?.kill();
    const progressState = { value: introProgress };
    introProgressTween = gsap.to(progressState, {
        value: 98,
        duration: 2.5,
        ease: 'power1.inOut',
        onUpdate: () => renderIntroProgress(progressState.value),
    });
    warmupMinimumTimer = window.setTimeout(() => {
        warmupMinimumElapsed = true;
        checkResourceWarmup();
    }, 2200);
    warmupFallbackTimer = window.setTimeout(completeResourceWarmup, 6500);
}
function handleSceneWarmupReady() {
    sceneWarmupReady = true;
    checkResourceWarmup();
}
function handleChartReady(key) {
    readyCharts.add(key);
    checkResourceWarmup();
}
function checkResourceWarmup() {
    if (!warmupStarted || warmupCompleted || !warmupMinimumElapsed)
        return;
    if (!sceneReady.value || !sceneWarmupReady || readyCharts.size < 2)
        return;
    completeResourceWarmup();
}
function completeResourceWarmup() {
    if (!warmupStarted || warmupCompleted)
        return;
    warmupCompleted = true;
    window.clearTimeout(warmupMinimumTimer);
    window.clearTimeout(warmupFallbackTimer);
    introProgressTween?.kill();
    renderIntroProgress(100);
    introStatus.value = '全部资源已就绪 · 正在进入系统';
    entryDelayTimer = window.setTimeout(finishIntroSequence, 520);
}
function requestIntroSkip() {
    introMinimumElapsed = true;
    beginResourceWarmup(true);
}
function finishIntroSequence() {
    if (!introVisible.value || introClosing || !introRef.value || !screenRef.value)
        return;
    introClosing = true;
    window.clearTimeout(introMinimumTimer);
    window.clearTimeout(introFallbackTimer);
    introPhaseTimers.forEach((timer) => window.clearTimeout(timer));
    introProgressTween?.kill();
    renderIntroProgress(100);
    introStatus.value = '系统就绪 · 场景接管';
    const leftPanels = screenRef.value.querySelectorAll('.left-stack > .glass-panel');
    const rightPanels = screenRef.value.querySelectorAll('.right-stack > .glass-panel');
    const utilityParts = screenRef.value.querySelectorAll('.bottom-dock, .benefit-float, .scene-hud');
    gsap
        .timeline({
        defaults: { ease: 'power3.out' },
        onComplete: () => {
            introVisible.value = false;
        },
    })
        .to('.intro-core-shell', { scale: 2.25, rotate: 36, opacity: 0, duration: 0.62, ease: 'power2.in' })
        .to(introRef.value, { opacity: 0, scaleY: 0.015, duration: 0.68, transformOrigin: '50% 50%', ease: 'power3.inOut' }, '-=0.34')
        .fromTo('.top-bar', { y: -34, opacity: 0 }, { y: 0, opacity: 1, duration: 0.62 }, '-=0.22')
        .fromTo(leftPanels, { x: -46, opacity: 0 }, { x: 0, opacity: 1, stagger: 0.08, duration: 0.56 }, '-=0.46')
        .fromTo(rightPanels, { x: 46, opacity: 0 }, { x: 0, opacity: 1, stagger: 0.07, duration: 0.56 }, '<')
        .fromTo(utilityParts, { y: 30, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.08, duration: 0.52 }, '-=0.36');
}
const energyChartOption = computed(() => ({
    animationDuration: 680,
    animationDurationUpdate: 240,
    animationEasingUpdate: 'linear',
    grid: { left: 43, right: 18, top: 42, bottom: 24 },
    tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(2,13,31,0.94)',
        borderColor: '#00d9ff',
        textStyle: { color: '#eaf7ff' },
    },
    legend: {
        top: 3,
        right: 12,
        itemWidth: 18,
        itemHeight: 8,
        textStyle: { color: '#91abc8', fontSize: 12 },
    },
    xAxis: {
        type: 'category',
        data: store.trend.map((item) => item.time),
        axisLine: { lineStyle: { color: '#18466f' } },
        axisTick: { show: false },
        axisLabel: { color: '#7696b7', interval: 2, fontSize: 11 },
    },
    yAxis: {
        type: 'value',
        min: -100,
        max: 500,
        interval: 100,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: 'rgba(77,137,191,0.18)' } },
        axisLabel: { color: '#7696b7', fontSize: 11 },
    },
    series: [
        smoothLine('光伏发电', store.trend.map((item) => item.pv), '#28df83'),
        smoothLine('园区负荷', store.trend.map((item) => item.load), '#00d9ff'),
        smoothLine('储能功率', store.trend.map((item) => item.storage), '#845cff'),
        smoothLine('充电负荷', store.trend.map((item) => item.charging), '#ff5366'),
    ],
}));
const strategyChartOption = computed(() => ({
    animationDuration: 680,
    animationDurationUpdate: 240,
    animationEasingUpdate: 'linear',
    grid: { left: 42, right: 18, top: 34, bottom: 24 },
    tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(2,13,31,0.94)',
        borderColor: '#ffb21b',
        textStyle: { color: '#eaf7ff' },
    },
    xAxis: {
        type: 'category',
        data: store.trend.map((item) => item.time),
        axisTick: { show: false },
        axisLabel: { color: '#7696b7', interval: 3, fontSize: 11 },
        axisLine: { lineStyle: { color: '#18466f' } },
    },
    yAxis: {
        type: 'value',
        min: 0.2,
        max: 1.4,
        interval: 0.2,
        axisLabel: { color: '#7696b7', fontSize: 11 },
        splitLine: { lineStyle: { color: 'rgba(77,137,191,0.18)' } },
    },
    series: [
        {
            name: '分时电价',
            type: 'bar',
            data: store.trend.map((item) => item.price),
            itemStyle: { color: '#ffb21b', borderRadius: [4, 4, 0, 0] },
            barWidth: 14,
        },
        {
            name: '调度阈值',
            type: 'line',
            data: store.trend.map((item) => (item.price > 1 ? 1.18 : item.price < 0.5 ? 0.35 : 0.72)),
            smooth: true,
            symbol: 'none',
            lineStyle: { color: '#22ef8a', width: 2 },
        },
    ],
}));
function smoothLine(name, data, color) {
    return {
        name,
        type: 'line',
        data,
        smooth: true,
        symbol: 'none',
        lineStyle: {
            color,
            width: 2.2,
            shadowColor: `${color}72`,
            shadowBlur: 6,
        },
        areaStyle: {
            color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                    { offset: 0, color: `${color}42` },
                    { offset: 1, color: `${color}00` },
                ],
            },
        },
    };
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
    ...{ class: "viewport-shell" },
    ...{ class: ({ day: !__VLS_ctx.store.nightMode }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ref: "screenRef",
    ...{ class: "screen-shell" },
    ...{ class: ({ 'intro-active': __VLS_ctx.introVisible }) },
    ...{ style: ({ '--screen-scale': __VLS_ctx.screenScale }) },
});
/** @type {typeof __VLS_ctx.screenRef} */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "particle-layer" },
    'aria-hidden': "true",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "aurora-layer" },
    'aria-hidden': "true",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "frame-corners" },
    'aria-hidden': "true",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({});
if (__VLS_ctx.introVisible) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ref: "introRef",
        ...{ class: "intro-stage" },
        ...{ class: ({ 'warmup-active': __VLS_ctx.warmupActive }) },
        'aria-label': "EnerTwin 数字孪生系统启动中",
        'aria-live': "polite",
    });
    /** @type {typeof __VLS_ctx.introRef} */ ;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "intro-grid" },
        'aria-hidden': "true",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "intro-scanline" },
        'aria-hidden': "true",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "intro-energy-beams" },
        'aria-hidden': "true",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.requestIntroSkip) },
        ...{ class: "intro-skip" },
        type: "button",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
        ...{ class: "intro-heading" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "intro-kicker" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "intro-title-line" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "intro-title-line" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
        ...{ class: "intro-telemetry intro-telemetry-left" },
        'aria-hidden': "true",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
        ...{ class: "intro-telemetry intro-telemetry-right" },
        'aria-hidden': "true",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "intro-core-zone" },
        'aria-hidden': "true",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "intro-orbit intro-orbit-a" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "intro-orbit intro-orbit-b" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "intro-orbit intro-orbit-c" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "intro-orbit intro-orbit-d" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "intro-core-shell" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "intro-status-panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "intro-status-copy" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.introStatus);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "intro-progress-value" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "intro-progress-track" },
        role: "progressbar",
        'aria-label': "数字孪生场景加载进度",
        'aria-valuemin': "0",
        'aria-valuemax': "100",
        'aria-valuenow': "8",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "intro-checkpoints" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        'data-threshold': "20",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        'data-threshold': "42",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        'data-threshold': "68",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        'data-threshold': "88",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({});
}
/** @type {[typeof TopBar, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(TopBar, new TopBar({
    ...{ 'onUpdate:mode': {} },
    ...{ 'onUpdate:nightMode': {} },
    parkName: (__VLS_ctx.store.parkName),
    mode: (__VLS_ctx.store.mode),
    nightMode: (__VLS_ctx.store.nightMode),
}));
const __VLS_1 = __VLS_0({
    ...{ 'onUpdate:mode': {} },
    ...{ 'onUpdate:nightMode': {} },
    parkName: (__VLS_ctx.store.parkName),
    mode: (__VLS_ctx.store.mode),
    nightMode: (__VLS_ctx.store.nightMode),
}, ...__VLS_functionalComponentArgsRest(__VLS_0));
let __VLS_3;
let __VLS_4;
let __VLS_5;
const __VLS_6 = {
    'onUpdate:mode': (...[$event]) => {
        __VLS_ctx.store.mode = $event;
    }
};
const __VLS_7 = {
    'onUpdate:nightMode': (...[$event]) => {
        __VLS_ctx.store.nightMode = $event;
    }
};
var __VLS_2;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "scene-wrap" },
    'aria-label': "可自由观察的三维数字孪生园区",
});
/** @type {[typeof DigitalTwinScene, ]} */ ;
// @ts-ignore
const __VLS_8 = __VLS_asFunctionalComponent(DigitalTwinScene, new DigitalTwinScene({
    ...{ 'onFocusMode': {} },
    ...{ 'onReady': {} },
    ...{ 'onWarmupReady': {} },
    mode: (__VLS_ctx.store.mode),
    nightMode: (__VLS_ctx.store.nightMode),
    alarmCount: (__VLS_ctx.store.metrics.alarmCount),
    storageSoc: (__VLS_ctx.store.metrics.storageSoc),
    pvPowerKw: (__VLS_ctx.store.metrics.pvPowerKw),
    loadPowerKw: (__VLS_ctx.store.metrics.loadPowerKw),
    chargerPowerKw: (__VLS_ctx.store.metrics.chargerPowerKw),
    introActive: (__VLS_ctx.introVisible),
    warmupRequested: (__VLS_ctx.sceneWarmupRequested),
}));
const __VLS_9 = __VLS_8({
    ...{ 'onFocusMode': {} },
    ...{ 'onReady': {} },
    ...{ 'onWarmupReady': {} },
    mode: (__VLS_ctx.store.mode),
    nightMode: (__VLS_ctx.store.nightMode),
    alarmCount: (__VLS_ctx.store.metrics.alarmCount),
    storageSoc: (__VLS_ctx.store.metrics.storageSoc),
    pvPowerKw: (__VLS_ctx.store.metrics.pvPowerKw),
    loadPowerKw: (__VLS_ctx.store.metrics.loadPowerKw),
    chargerPowerKw: (__VLS_ctx.store.metrics.chargerPowerKw),
    introActive: (__VLS_ctx.introVisible),
    warmupRequested: (__VLS_ctx.sceneWarmupRequested),
}, ...__VLS_functionalComponentArgsRest(__VLS_8));
let __VLS_11;
let __VLS_12;
let __VLS_13;
const __VLS_14 = {
    onFocusMode: (...[$event]) => {
        __VLS_ctx.store.mode = $event;
    }
};
const __VLS_15 = {
    onReady: (__VLS_ctx.handleSceneReady)
};
const __VLS_16 = {
    onWarmupReady: (__VLS_ctx.handleSceneWarmupReady)
};
var __VLS_10;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "scene-hud" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.store.metrics.pvPowerKw);
__VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flow-route" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "screen-grid" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
    ...{ class: "panel-stack left-stack" },
});
/** @type {[typeof GlassPanel, typeof GlassPanel, ]} */ ;
// @ts-ignore
const __VLS_17 = __VLS_asFunctionalComponent(GlassPanel, new GlassPanel({
    title: "能源资产总览",
    accent: "cyan",
}));
const __VLS_18 = __VLS_17({
    title: "能源资产总览",
    accent: "cyan",
}, ...__VLS_functionalComponentArgsRest(__VLS_17));
__VLS_19.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "metric-grid" },
});
/** @type {[typeof MetricFlip, ]} */ ;
// @ts-ignore
const __VLS_20 = __VLS_asFunctionalComponent(MetricFlip, new MetricFlip({
    label: "光伏装机",
    value: (__VLS_ctx.store.metrics.pvCapacityMw),
    unit: "MW",
    tone: "green",
}));
const __VLS_21 = __VLS_20({
    label: "光伏装机",
    value: (__VLS_ctx.store.metrics.pvCapacityMw),
    unit: "MW",
    tone: "green",
}, ...__VLS_functionalComponentArgsRest(__VLS_20));
/** @type {[typeof MetricFlip, ]} */ ;
// @ts-ignore
const __VLS_23 = __VLS_asFunctionalComponent(MetricFlip, new MetricFlip({
    label: "充电枪",
    value: (__VLS_ctx.store.metrics.chargerConnectorCount),
    unit: "把",
    tone: "purple",
}));
const __VLS_24 = __VLS_23({
    label: "充电枪",
    value: (__VLS_ctx.store.metrics.chargerConnectorCount),
    unit: "把",
    tone: "purple",
}, ...__VLS_functionalComponentArgsRest(__VLS_23));
/** @type {[typeof MetricFlip, ]} */ ;
// @ts-ignore
const __VLS_26 = __VLS_asFunctionalComponent(MetricFlip, new MetricFlip({
    label: "告警数量",
    value: (__VLS_ctx.store.metrics.alarmCount),
    unit: "条",
    tone: "red",
}));
const __VLS_27 = __VLS_26({
    label: "告警数量",
    value: (__VLS_ctx.store.metrics.alarmCount),
    unit: "条",
    tone: "red",
}, ...__VLS_functionalComponentArgsRest(__VLS_26));
/** @type {[typeof MetricFlip, ]} */ ;
// @ts-ignore
const __VLS_29 = __VLS_asFunctionalComponent(MetricFlip, new MetricFlip({
    label: "在线率",
    value: (__VLS_ctx.store.metrics.deviceOnlineRate),
    unit: "%",
    tone: "cyan",
}));
const __VLS_30 = __VLS_29({
    label: "在线率",
    value: (__VLS_ctx.store.metrics.deviceOnlineRate),
    unit: "%",
    tone: "cyan",
}, ...__VLS_functionalComponentArgsRest(__VLS_29));
var __VLS_19;
/** @type {[typeof GlassPanel, typeof GlassPanel, ]} */ ;
// @ts-ignore
const __VLS_32 = __VLS_asFunctionalComponent(GlassPanel, new GlassPanel({
    title: "光伏运行状态",
    accent: "green",
}));
const __VLS_33 = __VLS_32({
    title: "光伏运行状态",
    accent: "green",
}, ...__VLS_functionalComponentArgsRest(__VLS_32));
__VLS_34.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "metric-grid" },
});
/** @type {[typeof MetricFlip, ]} */ ;
// @ts-ignore
const __VLS_35 = __VLS_asFunctionalComponent(MetricFlip, new MetricFlip({
    label: "实时功率",
    value: (__VLS_ctx.store.metrics.pvPowerKw),
    unit: "kW",
    tone: "green",
}));
const __VLS_36 = __VLS_35({
    label: "实时功率",
    value: (__VLS_ctx.store.metrics.pvPowerKw),
    unit: "kW",
    tone: "green",
}, ...__VLS_functionalComponentArgsRest(__VLS_35));
/** @type {[typeof MetricFlip, ]} */ ;
// @ts-ignore
const __VLS_38 = __VLS_asFunctionalComponent(MetricFlip, new MetricFlip({
    label: "今日发电",
    value: (__VLS_ctx.store.metrics.pvEnergyTodayKwh),
    unit: "kWh",
    tone: "cyan",
}));
const __VLS_39 = __VLS_38({
    label: "今日发电",
    value: (__VLS_ctx.store.metrics.pvEnergyTodayKwh),
    unit: "kWh",
    tone: "cyan",
}, ...__VLS_functionalComponentArgsRest(__VLS_38));
/** @type {[typeof MetricFlip, ]} */ ;
// @ts-ignore
const __VLS_41 = __VLS_asFunctionalComponent(MetricFlip, new MetricFlip({
    label: "本月发电",
    value: (__VLS_ctx.store.metrics.pvEnergyMonthKwh),
    unit: "kWh",
    tone: "blue",
}));
const __VLS_42 = __VLS_41({
    label: "本月发电",
    value: (__VLS_ctx.store.metrics.pvEnergyMonthKwh),
    unit: "kWh",
    tone: "blue",
}, ...__VLS_functionalComponentArgsRest(__VLS_41));
/** @type {[typeof MetricFlip, ]} */ ;
// @ts-ignore
const __VLS_44 = __VLS_asFunctionalComponent(MetricFlip, new MetricFlip({
    label: "自发自用",
    value: (__VLS_ctx.store.metrics.selfConsumptionRate),
    unit: "%",
    tone: "green",
}));
const __VLS_45 = __VLS_44({
    label: "自发自用",
    value: (__VLS_ctx.store.metrics.selfConsumptionRate),
    unit: "%",
    tone: "green",
}, ...__VLS_functionalComponentArgsRest(__VLS_44));
var __VLS_34;
/** @type {[typeof GlassPanel, typeof GlassPanel, ]} */ ;
// @ts-ignore
const __VLS_47 = __VLS_asFunctionalComponent(GlassPanel, new GlassPanel({
    title: "储能运行状态",
    accent: "blue",
}));
const __VLS_48 = __VLS_47({
    title: "储能运行状态",
    accent: "blue",
}, ...__VLS_functionalComponentArgsRest(__VLS_47));
__VLS_49.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "ring-row" },
});
/** @type {[typeof StatusRing, ]} */ ;
// @ts-ignore
const __VLS_50 = __VLS_asFunctionalComponent(StatusRing, new StatusRing({
    label: "SOC",
    value: (__VLS_ctx.store.metrics.storageSoc),
    tone: "blue",
}));
const __VLS_51 = __VLS_50({
    label: "SOC",
    value: (__VLS_ctx.store.metrics.storageSoc),
    tone: "blue",
}, ...__VLS_functionalComponentArgsRest(__VLS_50));
/** @type {[typeof StatusRing, ]} */ ;
// @ts-ignore
const __VLS_53 = __VLS_asFunctionalComponent(StatusRing, new StatusRing({
    label: "SOH",
    value: (__VLS_ctx.store.metrics.storageSoh),
    tone: "green",
}));
const __VLS_54 = __VLS_53({
    label: "SOH",
    value: (__VLS_ctx.store.metrics.storageSoh),
    tone: "green",
}, ...__VLS_functionalComponentArgsRest(__VLS_53));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "metric-grid compact" },
});
/** @type {[typeof MetricFlip, ]} */ ;
// @ts-ignore
const __VLS_56 = __VLS_asFunctionalComponent(MetricFlip, new MetricFlip({
    label: "充电功率",
    value: (__VLS_ctx.store.metrics.storageChargePowerKw),
    unit: "kW",
    tone: "blue",
}));
const __VLS_57 = __VLS_56({
    label: "充电功率",
    value: (__VLS_ctx.store.metrics.storageChargePowerKw),
    unit: "kW",
    tone: "blue",
}, ...__VLS_functionalComponentArgsRest(__VLS_56));
/** @type {[typeof MetricFlip, ]} */ ;
// @ts-ignore
const __VLS_59 = __VLS_asFunctionalComponent(MetricFlip, new MetricFlip({
    label: "放电功率",
    value: (__VLS_ctx.store.metrics.storageDischargePowerKw),
    unit: "kW",
    tone: "amber",
}));
const __VLS_60 = __VLS_59({
    label: "放电功率",
    value: (__VLS_ctx.store.metrics.storageDischargePowerKw),
    unit: "kW",
    tone: "amber",
}, ...__VLS_functionalComponentArgsRest(__VLS_59));
var __VLS_49;
__VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
    ...{ class: "panel-stack right-stack" },
});
/** @type {[typeof GlassPanel, typeof GlassPanel, ]} */ ;
// @ts-ignore
const __VLS_62 = __VLS_asFunctionalComponent(GlassPanel, new GlassPanel({
    title: "用电统计",
    accent: "cyan",
}));
const __VLS_63 = __VLS_62({
    title: "用电统计",
    accent: "cyan",
}, ...__VLS_functionalComponentArgsRest(__VLS_62));
__VLS_64.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "metric-grid" },
});
/** @type {[typeof MetricFlip, ]} */ ;
// @ts-ignore
const __VLS_65 = __VLS_asFunctionalComponent(MetricFlip, new MetricFlip({
    label: "实时总负荷",
    value: (__VLS_ctx.store.metrics.loadPowerKw),
    unit: "kW",
    tone: "cyan",
}));
const __VLS_66 = __VLS_65({
    label: "实时总负荷",
    value: (__VLS_ctx.store.metrics.loadPowerKw),
    unit: "kW",
    tone: "cyan",
}, ...__VLS_functionalComponentArgsRest(__VLS_65));
/** @type {[typeof MetricFlip, ]} */ ;
// @ts-ignore
const __VLS_68 = __VLS_asFunctionalComponent(MetricFlip, new MetricFlip({
    label: "今日用电",
    value: (__VLS_ctx.store.metrics.loadEnergyTodayKwh),
    unit: "kWh",
    tone: "blue",
}));
const __VLS_69 = __VLS_68({
    label: "今日用电",
    value: (__VLS_ctx.store.metrics.loadEnergyTodayKwh),
    unit: "kWh",
    tone: "blue",
}, ...__VLS_functionalComponentArgsRest(__VLS_68));
/** @type {[typeof MetricFlip, ]} */ ;
// @ts-ignore
const __VLS_71 = __VLS_asFunctionalComponent(MetricFlip, new MetricFlip({
    label: "本月用电",
    value: (__VLS_ctx.store.metrics.loadEnergyMonthKwh),
    unit: "kWh",
    tone: "purple",
}));
const __VLS_72 = __VLS_71({
    label: "本月用电",
    value: (__VLS_ctx.store.metrics.loadEnergyMonthKwh),
    unit: "kWh",
    tone: "purple",
}, ...__VLS_functionalComponentArgsRest(__VLS_71));
/** @type {[typeof MetricFlip, ]} */ ;
// @ts-ignore
const __VLS_74 = __VLS_asFunctionalComponent(MetricFlip, new MetricFlip({
    label: "购电功率",
    value: (__VLS_ctx.store.metrics.gridImportPowerKw),
    unit: "kW",
    tone: "amber",
}));
const __VLS_75 = __VLS_74({
    label: "购电功率",
    value: (__VLS_ctx.store.metrics.gridImportPowerKw),
    unit: "kW",
    tone: "amber",
}, ...__VLS_functionalComponentArgsRest(__VLS_74));
var __VLS_64;
/** @type {[typeof GlassPanel, typeof GlassPanel, ]} */ ;
// @ts-ignore
const __VLS_77 = __VLS_asFunctionalComponent(GlassPanel, new GlassPanel({
    title: "充电运营",
    accent: "purple",
}));
const __VLS_78 = __VLS_77({
    title: "充电运营",
    accent: "purple",
}, ...__VLS_functionalComponentArgsRest(__VLS_77));
__VLS_79.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "metric-grid metric-grid-six" },
});
/** @type {[typeof MetricFlip, ]} */ ;
// @ts-ignore
const __VLS_80 = __VLS_asFunctionalComponent(MetricFlip, new MetricFlip({
    label: "充电桩",
    value: (__VLS_ctx.store.metrics.chargerPileCount),
    unit: "台",
    tone: "purple",
}));
const __VLS_81 = __VLS_80({
    label: "充电桩",
    value: (__VLS_ctx.store.metrics.chargerPileCount),
    unit: "台",
    tone: "purple",
}, ...__VLS_functionalComponentArgsRest(__VLS_80));
/** @type {[typeof MetricFlip, ]} */ ;
// @ts-ignore
const __VLS_83 = __VLS_asFunctionalComponent(MetricFlip, new MetricFlip({
    label: "使用中",
    value: (__VLS_ctx.store.metrics.chargerOccupiedCount),
    unit: "把",
    tone: "green",
}));
const __VLS_84 = __VLS_83({
    label: "使用中",
    value: (__VLS_ctx.store.metrics.chargerOccupiedCount),
    unit: "把",
    tone: "green",
}, ...__VLS_functionalComponentArgsRest(__VLS_83));
/** @type {[typeof MetricFlip, ]} */ ;
// @ts-ignore
const __VLS_86 = __VLS_asFunctionalComponent(MetricFlip, new MetricFlip({
    label: "空闲",
    value: (__VLS_ctx.store.metrics.chargerIdleCount),
    unit: "把",
    tone: "cyan",
}));
const __VLS_87 = __VLS_86({
    label: "空闲",
    value: (__VLS_ctx.store.metrics.chargerIdleCount),
    unit: "把",
    tone: "cyan",
}, ...__VLS_functionalComponentArgsRest(__VLS_86));
/** @type {[typeof MetricFlip, ]} */ ;
// @ts-ignore
const __VLS_89 = __VLS_asFunctionalComponent(MetricFlip, new MetricFlip({
    label: "故障",
    value: (__VLS_ctx.store.metrics.chargerFaultCount),
    unit: "把",
    tone: "red",
}));
const __VLS_90 = __VLS_89({
    label: "故障",
    value: (__VLS_ctx.store.metrics.chargerFaultCount),
    unit: "把",
    tone: "red",
}, ...__VLS_functionalComponentArgsRest(__VLS_89));
/** @type {[typeof MetricFlip, ]} */ ;
// @ts-ignore
const __VLS_92 = __VLS_asFunctionalComponent(MetricFlip, new MetricFlip({
    label: "当前功率",
    value: (__VLS_ctx.store.metrics.chargerPowerKw),
    unit: "kW",
    tone: "purple",
}));
const __VLS_93 = __VLS_92({
    label: "当前功率",
    value: (__VLS_ctx.store.metrics.chargerPowerKw),
    unit: "kW",
    tone: "purple",
}, ...__VLS_functionalComponentArgsRest(__VLS_92));
/** @type {[typeof MetricFlip, ]} */ ;
// @ts-ignore
const __VLS_95 = __VLS_asFunctionalComponent(MetricFlip, new MetricFlip({
    label: "今日电量",
    value: (__VLS_ctx.store.metrics.chargerEnergyTodayKwh),
    unit: "kWh",
    tone: "blue",
}));
const __VLS_96 = __VLS_95({
    label: "今日电量",
    value: (__VLS_ctx.store.metrics.chargerEnergyTodayKwh),
    unit: "kWh",
    tone: "blue",
}, ...__VLS_functionalComponentArgsRest(__VLS_95));
var __VLS_79;
/** @type {[typeof GlassPanel, typeof GlassPanel, ]} */ ;
// @ts-ignore
const __VLS_98 = __VLS_asFunctionalComponent(GlassPanel, new GlassPanel({
    title: "楼宇用能排行",
    accent: "amber",
}));
const __VLS_99 = __VLS_98({
    title: "楼宇用能排行",
    accent: "amber",
}, ...__VLS_functionalComponentArgsRest(__VLS_98));
__VLS_100.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "rank-list" },
});
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.store.buildingRanks))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: (item.name),
        ...{ class: "rank-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (item.name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (item.loadKw);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ style: ({ width: `${item.ratio}%` }) },
    });
}
var __VLS_100;
/** @type {[typeof GlassPanel, typeof GlassPanel, ]} */ ;
// @ts-ignore
const __VLS_101 = __VLS_asFunctionalComponent(GlassPanel, new GlassPanel({
    title: "实时告警",
    accent: "red",
}));
const __VLS_102 = __VLS_101({
    title: "实时告警",
    accent: "red",
}, ...__VLS_functionalComponentArgsRest(__VLS_101));
__VLS_103.slots.default;
/** @type {[typeof AlarmTicker, ]} */ ;
// @ts-ignore
const __VLS_104 = __VLS_asFunctionalComponent(AlarmTicker, new AlarmTicker({
    alarms: (__VLS_ctx.store.alarmEvents),
}));
const __VLS_105 = __VLS_104({
    alarms: (__VLS_ctx.store.alarmEvents),
}, ...__VLS_functionalComponentArgsRest(__VLS_104));
var __VLS_103;
__VLS_asFunctionalElement(__VLS_intrinsicElements.footer, __VLS_intrinsicElements.footer)({
    ...{ class: "bottom-dock" },
});
/** @type {[typeof GlassPanel, typeof GlassPanel, ]} */ ;
// @ts-ignore
const __VLS_107 = __VLS_asFunctionalComponent(GlassPanel, new GlassPanel({
    title: "今日能源趋势",
    accent: "cyan",
}));
const __VLS_108 = __VLS_107({
    title: "今日能源趋势",
    accent: "cyan",
}, ...__VLS_functionalComponentArgsRest(__VLS_107));
__VLS_109.slots.default;
if (__VLS_ctx.chartStage >= 1) {
    const __VLS_110 = {}.TrendChart;
    /** @type {[typeof __VLS_components.TrendChart, ]} */ ;
    // @ts-ignore
    const __VLS_111 = __VLS_asFunctionalComponent(__VLS_110, new __VLS_110({
        ...{ 'onReady': {} },
        option: (__VLS_ctx.energyChartOption),
    }));
    const __VLS_112 = __VLS_111({
        ...{ 'onReady': {} },
        option: (__VLS_ctx.energyChartOption),
    }, ...__VLS_functionalComponentArgsRest(__VLS_111));
    let __VLS_114;
    let __VLS_115;
    let __VLS_116;
    const __VLS_117 = {
        onReady: (...[$event]) => {
            if (!(__VLS_ctx.chartStage >= 1))
                return;
            __VLS_ctx.handleChartReady('energy');
        }
    };
    var __VLS_113;
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "trend-chart-placeholder" },
        'aria-hidden': "true",
    });
}
var __VLS_109;
/** @type {[typeof GlassPanel, typeof GlassPanel, ]} */ ;
// @ts-ignore
const __VLS_118 = __VLS_asFunctionalComponent(GlassPanel, new GlassPanel({
    title: "分时电价与调度策略",
    accent: "green",
}));
const __VLS_119 = __VLS_118({
    title: "分时电价与调度策略",
    accent: "green",
}, ...__VLS_functionalComponentArgsRest(__VLS_118));
__VLS_120.slots.default;
if (__VLS_ctx.chartStage >= 2) {
    const __VLS_121 = {}.TrendChart;
    /** @type {[typeof __VLS_components.TrendChart, ]} */ ;
    // @ts-ignore
    const __VLS_122 = __VLS_asFunctionalComponent(__VLS_121, new __VLS_121({
        ...{ 'onReady': {} },
        option: (__VLS_ctx.strategyChartOption),
    }));
    const __VLS_123 = __VLS_122({
        ...{ 'onReady': {} },
        option: (__VLS_ctx.strategyChartOption),
    }, ...__VLS_functionalComponentArgsRest(__VLS_122));
    let __VLS_125;
    let __VLS_126;
    let __VLS_127;
    const __VLS_128 = {
        onReady: (...[$event]) => {
            if (!(__VLS_ctx.chartStage >= 2))
                return;
            __VLS_ctx.handleChartReady('strategy');
        }
    };
    var __VLS_124;
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "trend-chart-placeholder" },
        'aria-hidden': "true",
    });
}
var __VLS_120;
__VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
    ...{ class: "benefit-float" },
});
/** @type {[typeof MetricFlip, ]} */ ;
// @ts-ignore
const __VLS_129 = __VLS_asFunctionalComponent(MetricFlip, new MetricFlip({
    label: "碳减排量",
    value: (__VLS_ctx.store.metrics.carbonReductionKg),
    unit: "kg",
    tone: "green",
}));
const __VLS_130 = __VLS_129({
    label: "碳减排量",
    value: (__VLS_ctx.store.metrics.carbonReductionKg),
    unit: "kg",
    tone: "green",
}, ...__VLS_functionalComponentArgsRest(__VLS_129));
/** @type {[typeof MetricFlip, ]} */ ;
// @ts-ignore
const __VLS_132 = __VLS_asFunctionalComponent(MetricFlip, new MetricFlip({
    label: "节约电费",
    value: (__VLS_ctx.store.metrics.costSavingYuan),
    unit: "元",
    tone: "amber",
}));
const __VLS_133 = __VLS_132({
    label: "节约电费",
    value: (__VLS_ctx.store.metrics.costSavingYuan),
    unit: "元",
    tone: "amber",
}, ...__VLS_functionalComponentArgsRest(__VLS_132));
/** @type {[typeof MetricFlip, ]} */ ;
// @ts-ignore
const __VLS_135 = __VLS_asFunctionalComponent(MetricFlip, new MetricFlip({
    label: "馈电功率",
    value: (__VLS_ctx.store.metrics.gridExportPowerKw),
    unit: "kW",
    tone: "cyan",
}));
const __VLS_136 = __VLS_135({
    label: "馈电功率",
    value: (__VLS_ctx.store.metrics.gridExportPowerKw),
    unit: "kW",
    tone: "cyan",
}, ...__VLS_functionalComponentArgsRest(__VLS_135));
/** @type {__VLS_StyleScopedClasses['viewport-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['particle-layer']} */ ;
/** @type {__VLS_StyleScopedClasses['aurora-layer']} */ ;
/** @type {__VLS_StyleScopedClasses['frame-corners']} */ ;
/** @type {__VLS_StyleScopedClasses['intro-stage']} */ ;
/** @type {__VLS_StyleScopedClasses['intro-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['intro-scanline']} */ ;
/** @type {__VLS_StyleScopedClasses['intro-energy-beams']} */ ;
/** @type {__VLS_StyleScopedClasses['intro-skip']} */ ;
/** @type {__VLS_StyleScopedClasses['intro-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['intro-kicker']} */ ;
/** @type {__VLS_StyleScopedClasses['intro-title-line']} */ ;
/** @type {__VLS_StyleScopedClasses['intro-title-line']} */ ;
/** @type {__VLS_StyleScopedClasses['intro-telemetry']} */ ;
/** @type {__VLS_StyleScopedClasses['intro-telemetry-left']} */ ;
/** @type {__VLS_StyleScopedClasses['intro-telemetry']} */ ;
/** @type {__VLS_StyleScopedClasses['intro-telemetry-right']} */ ;
/** @type {__VLS_StyleScopedClasses['intro-core-zone']} */ ;
/** @type {__VLS_StyleScopedClasses['intro-orbit']} */ ;
/** @type {__VLS_StyleScopedClasses['intro-orbit-a']} */ ;
/** @type {__VLS_StyleScopedClasses['intro-orbit']} */ ;
/** @type {__VLS_StyleScopedClasses['intro-orbit-b']} */ ;
/** @type {__VLS_StyleScopedClasses['intro-orbit']} */ ;
/** @type {__VLS_StyleScopedClasses['intro-orbit-c']} */ ;
/** @type {__VLS_StyleScopedClasses['intro-orbit']} */ ;
/** @type {__VLS_StyleScopedClasses['intro-orbit-d']} */ ;
/** @type {__VLS_StyleScopedClasses['intro-core-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['intro-status-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['intro-status-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['intro-progress-value']} */ ;
/** @type {__VLS_StyleScopedClasses['intro-progress-track']} */ ;
/** @type {__VLS_StyleScopedClasses['intro-checkpoints']} */ ;
/** @type {__VLS_StyleScopedClasses['scene-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['scene-hud']} */ ;
/** @type {__VLS_StyleScopedClasses['flow-route']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-stack']} */ ;
/** @type {__VLS_StyleScopedClasses['left-stack']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['ring-row']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['compact']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-stack']} */ ;
/** @type {__VLS_StyleScopedClasses['right-stack']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-grid-six']} */ ;
/** @type {__VLS_StyleScopedClasses['rank-list']} */ ;
/** @type {__VLS_StyleScopedClasses['rank-item']} */ ;
/** @type {__VLS_StyleScopedClasses['bottom-dock']} */ ;
/** @type {__VLS_StyleScopedClasses['trend-chart-placeholder']} */ ;
/** @type {__VLS_StyleScopedClasses['trend-chart-placeholder']} */ ;
/** @type {__VLS_StyleScopedClasses['benefit-float']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            AlarmTicker: AlarmTicker,
            DigitalTwinScene: DigitalTwinScene,
            GlassPanel: GlassPanel,
            MetricFlip: MetricFlip,
            StatusRing: StatusRing,
            TopBar: TopBar,
            TrendChart: TrendChart,
            store: store,
            screenScale: screenScale,
            screenRef: screenRef,
            introRef: introRef,
            introStatus: introStatus,
            introVisible: introVisible,
            chartStage: chartStage,
            sceneWarmupRequested: sceneWarmupRequested,
            warmupActive: warmupActive,
            handleSceneReady: handleSceneReady,
            handleSceneWarmupReady: handleSceneWarmupReady,
            handleChartReady: handleChartReady,
            requestIntroSkip: requestIntroSkip,
            energyChartOption: energyChartOption,
            strategyChartOption: strategyChartOption,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */

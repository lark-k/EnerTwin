import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { gsap } from 'gsap';
import AlarmTicker from './components/AlarmTicker.vue';
import DigitalTwinScene from './components/DigitalTwinScene.vue';
import GlassPanel from './components/GlassPanel.vue';
import MetricFlip from './components/MetricFlip.vue';
import StatusRing from './components/StatusRing.vue';
import TopBar from './components/TopBar.vue';
import TrendChart from './components/TrendChart.vue';
import { useScreenStore } from './stores/screenStore';
const store = useScreenStore();
const introVisible = ref(true);
const appRef = ref(null);
const introRef = ref(null);
onMounted(() => {
    store.startMockStream();
    window.setTimeout(() => {
        introVisible.value = false;
    }, 3200);
    if (introRef.value) {
        gsap
            .timeline({
            defaults: { ease: 'power3.out' },
            onComplete: () => {
                introVisible.value = false;
                if (appRef.value)
                    gsap.fromTo(appRef.value, { opacity: 0.78 }, { opacity: 1, duration: 0.5 });
            },
        })
            .from('.intro-brand span', { y: 18, opacity: 0, duration: 0.45 })
            .from('.intro-brand h1', { y: 28, opacity: 0, duration: 0.65 }, '-=0.15')
            .from('.orbit-ring', { scale: 0.35, opacity: 0, stagger: 0.12, duration: 0.8 }, '-=0.35')
            .to(introRef.value, { opacity: 0, duration: 0.55, delay: 0.65 });
    }
});
onBeforeUnmount(() => {
    store.stopMockStream();
});
const energyChartOption = computed(() => ({
    animationDuration: 680,
    grid: { left: 34, right: 14, top: 26, bottom: 20 },
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(4,16,34,0.92)', borderColor: '#00e5ff', textStyle: { color: '#eaf6ff' } },
    legend: { top: 0, right: 8, textStyle: { color: '#8fb6d8' } },
    xAxis: { type: 'category', data: store.trend.map((item) => item.time), axisLine: { lineStyle: { color: '#1e6b8d' } }, axisLabel: { color: '#8fb6d8' } },
    yAxis: { type: 'value', axisLine: { show: false }, splitLine: { lineStyle: { color: 'rgba(143,182,216,0.14)' } }, axisLabel: { color: '#8fb6d8' } },
    series: [
        smoothLine('光伏发电', store.trend.map((item) => item.pv), '#22f59a'),
        smoothLine('园区负荷', store.trend.map((item) => item.load), '#00e5ff'),
        smoothLine('储能功率', store.trend.map((item) => item.storage), '#39a7ff'),
        smoothLine('充电负荷', store.trend.map((item) => item.charging), '#8a6cff'),
    ],
}));
const strategyChartOption = computed(() => ({
    animationDuration: 680,
    grid: { left: 34, right: 12, top: 20, bottom: 20 },
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(4,16,34,0.92)', borderColor: '#22f59a', textStyle: { color: '#eaf6ff' } },
    xAxis: { type: 'category', data: store.trend.map((item) => item.time), axisLabel: { color: '#8fb6d8' }, axisLine: { lineStyle: { color: '#1e6b8d' } } },
    yAxis: [
        { type: 'value', name: '元/kWh', nameTextStyle: { color: '#8fb6d8' }, axisLabel: { color: '#8fb6d8' }, splitLine: { lineStyle: { color: 'rgba(143,182,216,0.14)' } } },
    ],
    series: [
        {
            name: '分时电价',
            type: 'bar',
            data: store.trend.map((item) => item.price),
            itemStyle: { color: '#ffb020', borderRadius: [4, 4, 0, 0] },
            barWidth: 12,
        },
        {
            name: '调度建议',
            type: 'line',
            data: store.trend.map((item) => (item.price > 1 ? 1.2 : item.price < 0.5 ? 0.35 : 0.72)),
            smooth: true,
            symbol: 'none',
            lineStyle: { color: '#22f59a', width: 2 },
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
        lineStyle: { color, width: 2 },
        areaStyle: {
            color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                    { offset: 0, color: `${color}55` },
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
    ref: "appRef",
    ...{ class: "screen-shell" },
    ...{ class: ({ day: !__VLS_ctx.store.nightMode }) },
});
/** @type {typeof __VLS_ctx.appRef} */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "particle-layer" },
});
if (__VLS_ctx.introVisible) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ref: "introRef",
        ...{ class: "intro-stage" },
        'aria-label': "EnerTwin 入口动画",
    });
    /** @type {typeof __VLS_ctx.introRef} */ ;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "intro-planet" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "orbit-ring orbit-pv" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "orbit-ring orbit-storage" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "orbit-ring orbit-charging" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "orbit-ring orbit-grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "intro-brand" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
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
});
/** @type {[typeof DigitalTwinScene, ]} */ ;
// @ts-ignore
const __VLS_8 = __VLS_asFunctionalComponent(DigitalTwinScene, new DigitalTwinScene({
    mode: (__VLS_ctx.store.mode),
    nightMode: (__VLS_ctx.store.nightMode),
    alarmCount: (__VLS_ctx.store.metrics.alarmCount),
    storageSoc: (__VLS_ctx.store.metrics.storageSoc),
    pvPowerKw: (__VLS_ctx.store.metrics.pvPowerKw),
    loadPowerKw: (__VLS_ctx.store.metrics.loadPowerKw),
    chargerPowerKw: (__VLS_ctx.store.metrics.chargerPowerKw),
}));
const __VLS_9 = __VLS_8({
    mode: (__VLS_ctx.store.mode),
    nightMode: (__VLS_ctx.store.nightMode),
    alarmCount: (__VLS_ctx.store.metrics.alarmCount),
    storageSoc: (__VLS_ctx.store.metrics.storageSoc),
    pvPowerKw: (__VLS_ctx.store.metrics.pvPowerKw),
    loadPowerKw: (__VLS_ctx.store.metrics.loadPowerKw),
    chargerPowerKw: (__VLS_ctx.store.metrics.chargerPowerKw),
}, ...__VLS_functionalComponentArgsRest(__VLS_8));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "scene-hud" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.store.metrics.pvPowerKw);
__VLS_asFunctionalElement(__VLS_intrinsicElements.em, __VLS_intrinsicElements.em)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "screen-grid" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
    ...{ class: "panel-stack left-stack" },
});
/** @type {[typeof GlassPanel, typeof GlassPanel, ]} */ ;
// @ts-ignore
const __VLS_11 = __VLS_asFunctionalComponent(GlassPanel, new GlassPanel({
    title: "能源资产总览",
    accent: "cyan",
}));
const __VLS_12 = __VLS_11({
    title: "能源资产总览",
    accent: "cyan",
}, ...__VLS_functionalComponentArgsRest(__VLS_11));
__VLS_13.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "metric-grid" },
});
/** @type {[typeof MetricFlip, ]} */ ;
// @ts-ignore
const __VLS_14 = __VLS_asFunctionalComponent(MetricFlip, new MetricFlip({
    label: "光伏装机",
    value: (__VLS_ctx.store.metrics.pvCapacityMw),
    unit: "MW",
    tone: "green",
}));
const __VLS_15 = __VLS_14({
    label: "光伏装机",
    value: (__VLS_ctx.store.metrics.pvCapacityMw),
    unit: "MW",
    tone: "green",
}, ...__VLS_functionalComponentArgsRest(__VLS_14));
/** @type {[typeof MetricFlip, ]} */ ;
// @ts-ignore
const __VLS_17 = __VLS_asFunctionalComponent(MetricFlip, new MetricFlip({
    label: "充电枪",
    value: (__VLS_ctx.store.metrics.chargerConnectorCount),
    unit: "把",
    tone: "purple",
}));
const __VLS_18 = __VLS_17({
    label: "充电枪",
    value: (__VLS_ctx.store.metrics.chargerConnectorCount),
    unit: "把",
    tone: "purple",
}, ...__VLS_functionalComponentArgsRest(__VLS_17));
/** @type {[typeof MetricFlip, ]} */ ;
// @ts-ignore
const __VLS_20 = __VLS_asFunctionalComponent(MetricFlip, new MetricFlip({
    label: "告警数量",
    value: (__VLS_ctx.store.metrics.alarmCount),
    unit: "条",
    tone: "red",
}));
const __VLS_21 = __VLS_20({
    label: "告警数量",
    value: (__VLS_ctx.store.metrics.alarmCount),
    unit: "条",
    tone: "red",
}, ...__VLS_functionalComponentArgsRest(__VLS_20));
/** @type {[typeof MetricFlip, ]} */ ;
// @ts-ignore
const __VLS_23 = __VLS_asFunctionalComponent(MetricFlip, new MetricFlip({
    label: "在线率",
    value: (__VLS_ctx.store.metrics.deviceOnlineRate),
    unit: "%",
    tone: "cyan",
}));
const __VLS_24 = __VLS_23({
    label: "在线率",
    value: (__VLS_ctx.store.metrics.deviceOnlineRate),
    unit: "%",
    tone: "cyan",
}, ...__VLS_functionalComponentArgsRest(__VLS_23));
var __VLS_13;
/** @type {[typeof GlassPanel, typeof GlassPanel, ]} */ ;
// @ts-ignore
const __VLS_26 = __VLS_asFunctionalComponent(GlassPanel, new GlassPanel({
    title: "光伏运行状态",
    accent: "green",
}));
const __VLS_27 = __VLS_26({
    title: "光伏运行状态",
    accent: "green",
}, ...__VLS_functionalComponentArgsRest(__VLS_26));
__VLS_28.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "metric-grid" },
});
/** @type {[typeof MetricFlip, ]} */ ;
// @ts-ignore
const __VLS_29 = __VLS_asFunctionalComponent(MetricFlip, new MetricFlip({
    label: "实时功率",
    value: (__VLS_ctx.store.metrics.pvPowerKw),
    unit: "kW",
    tone: "green",
}));
const __VLS_30 = __VLS_29({
    label: "实时功率",
    value: (__VLS_ctx.store.metrics.pvPowerKw),
    unit: "kW",
    tone: "green",
}, ...__VLS_functionalComponentArgsRest(__VLS_29));
/** @type {[typeof MetricFlip, ]} */ ;
// @ts-ignore
const __VLS_32 = __VLS_asFunctionalComponent(MetricFlip, new MetricFlip({
    label: "今日发电",
    value: (__VLS_ctx.store.metrics.pvEnergyTodayKwh),
    unit: "kWh",
    tone: "cyan",
}));
const __VLS_33 = __VLS_32({
    label: "今日发电",
    value: (__VLS_ctx.store.metrics.pvEnergyTodayKwh),
    unit: "kWh",
    tone: "cyan",
}, ...__VLS_functionalComponentArgsRest(__VLS_32));
/** @type {[typeof MetricFlip, ]} */ ;
// @ts-ignore
const __VLS_35 = __VLS_asFunctionalComponent(MetricFlip, new MetricFlip({
    label: "本月发电",
    value: (__VLS_ctx.store.metrics.pvEnergyMonthKwh),
    unit: "kWh",
    tone: "blue",
}));
const __VLS_36 = __VLS_35({
    label: "本月发电",
    value: (__VLS_ctx.store.metrics.pvEnergyMonthKwh),
    unit: "kWh",
    tone: "blue",
}, ...__VLS_functionalComponentArgsRest(__VLS_35));
/** @type {[typeof MetricFlip, ]} */ ;
// @ts-ignore
const __VLS_38 = __VLS_asFunctionalComponent(MetricFlip, new MetricFlip({
    label: "自发自用",
    value: (__VLS_ctx.store.metrics.selfConsumptionRate),
    unit: "%",
    tone: "green",
}));
const __VLS_39 = __VLS_38({
    label: "自发自用",
    value: (__VLS_ctx.store.metrics.selfConsumptionRate),
    unit: "%",
    tone: "green",
}, ...__VLS_functionalComponentArgsRest(__VLS_38));
var __VLS_28;
/** @type {[typeof GlassPanel, typeof GlassPanel, ]} */ ;
// @ts-ignore
const __VLS_41 = __VLS_asFunctionalComponent(GlassPanel, new GlassPanel({
    title: "储能运行状态",
    accent: "blue",
}));
const __VLS_42 = __VLS_41({
    title: "储能运行状态",
    accent: "blue",
}, ...__VLS_functionalComponentArgsRest(__VLS_41));
__VLS_43.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "ring-row" },
});
/** @type {[typeof StatusRing, ]} */ ;
// @ts-ignore
const __VLS_44 = __VLS_asFunctionalComponent(StatusRing, new StatusRing({
    label: "SOC",
    value: (__VLS_ctx.store.metrics.storageSoc),
    tone: "blue",
}));
const __VLS_45 = __VLS_44({
    label: "SOC",
    value: (__VLS_ctx.store.metrics.storageSoc),
    tone: "blue",
}, ...__VLS_functionalComponentArgsRest(__VLS_44));
/** @type {[typeof StatusRing, ]} */ ;
// @ts-ignore
const __VLS_47 = __VLS_asFunctionalComponent(StatusRing, new StatusRing({
    label: "SOH",
    value: (__VLS_ctx.store.metrics.storageSoh),
    tone: "green",
}));
const __VLS_48 = __VLS_47({
    label: "SOH",
    value: (__VLS_ctx.store.metrics.storageSoh),
    tone: "green",
}, ...__VLS_functionalComponentArgsRest(__VLS_47));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "metric-grid compact" },
});
/** @type {[typeof MetricFlip, ]} */ ;
// @ts-ignore
const __VLS_50 = __VLS_asFunctionalComponent(MetricFlip, new MetricFlip({
    label: "充电功率",
    value: (__VLS_ctx.store.metrics.storageChargePowerKw),
    unit: "kW",
    tone: "blue",
}));
const __VLS_51 = __VLS_50({
    label: "充电功率",
    value: (__VLS_ctx.store.metrics.storageChargePowerKw),
    unit: "kW",
    tone: "blue",
}, ...__VLS_functionalComponentArgsRest(__VLS_50));
/** @type {[typeof MetricFlip, ]} */ ;
// @ts-ignore
const __VLS_53 = __VLS_asFunctionalComponent(MetricFlip, new MetricFlip({
    label: "放电功率",
    value: (__VLS_ctx.store.metrics.storageDischargePowerKw),
    unit: "kW",
    tone: "amber",
}));
const __VLS_54 = __VLS_53({
    label: "放电功率",
    value: (__VLS_ctx.store.metrics.storageDischargePowerKw),
    unit: "kW",
    tone: "amber",
}, ...__VLS_functionalComponentArgsRest(__VLS_53));
var __VLS_43;
__VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
    ...{ class: "panel-stack right-stack" },
});
/** @type {[typeof GlassPanel, typeof GlassPanel, ]} */ ;
// @ts-ignore
const __VLS_56 = __VLS_asFunctionalComponent(GlassPanel, new GlassPanel({
    title: "用电统计",
    accent: "cyan",
}));
const __VLS_57 = __VLS_56({
    title: "用电统计",
    accent: "cyan",
}, ...__VLS_functionalComponentArgsRest(__VLS_56));
__VLS_58.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "metric-grid" },
});
/** @type {[typeof MetricFlip, ]} */ ;
// @ts-ignore
const __VLS_59 = __VLS_asFunctionalComponent(MetricFlip, new MetricFlip({
    label: "实时总负荷",
    value: (__VLS_ctx.store.metrics.loadPowerKw),
    unit: "kW",
    tone: "cyan",
}));
const __VLS_60 = __VLS_59({
    label: "实时总负荷",
    value: (__VLS_ctx.store.metrics.loadPowerKw),
    unit: "kW",
    tone: "cyan",
}, ...__VLS_functionalComponentArgsRest(__VLS_59));
/** @type {[typeof MetricFlip, ]} */ ;
// @ts-ignore
const __VLS_62 = __VLS_asFunctionalComponent(MetricFlip, new MetricFlip({
    label: "今日用电",
    value: (__VLS_ctx.store.metrics.loadEnergyTodayKwh),
    unit: "kWh",
    tone: "blue",
}));
const __VLS_63 = __VLS_62({
    label: "今日用电",
    value: (__VLS_ctx.store.metrics.loadEnergyTodayKwh),
    unit: "kWh",
    tone: "blue",
}, ...__VLS_functionalComponentArgsRest(__VLS_62));
/** @type {[typeof MetricFlip, ]} */ ;
// @ts-ignore
const __VLS_65 = __VLS_asFunctionalComponent(MetricFlip, new MetricFlip({
    label: "本月用电",
    value: (__VLS_ctx.store.metrics.loadEnergyMonthKwh),
    unit: "kWh",
    tone: "purple",
}));
const __VLS_66 = __VLS_65({
    label: "本月用电",
    value: (__VLS_ctx.store.metrics.loadEnergyMonthKwh),
    unit: "kWh",
    tone: "purple",
}, ...__VLS_functionalComponentArgsRest(__VLS_65));
/** @type {[typeof MetricFlip, ]} */ ;
// @ts-ignore
const __VLS_68 = __VLS_asFunctionalComponent(MetricFlip, new MetricFlip({
    label: "购电功率",
    value: (__VLS_ctx.store.metrics.gridImportPowerKw),
    unit: "kW",
    tone: "amber",
}));
const __VLS_69 = __VLS_68({
    label: "购电功率",
    value: (__VLS_ctx.store.metrics.gridImportPowerKw),
    unit: "kW",
    tone: "amber",
}, ...__VLS_functionalComponentArgsRest(__VLS_68));
var __VLS_58;
/** @type {[typeof GlassPanel, typeof GlassPanel, ]} */ ;
// @ts-ignore
const __VLS_71 = __VLS_asFunctionalComponent(GlassPanel, new GlassPanel({
    title: "充电运营",
    accent: "purple",
}));
const __VLS_72 = __VLS_71({
    title: "充电运营",
    accent: "purple",
}, ...__VLS_functionalComponentArgsRest(__VLS_71));
__VLS_73.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "metric-grid" },
});
/** @type {[typeof MetricFlip, ]} */ ;
// @ts-ignore
const __VLS_74 = __VLS_asFunctionalComponent(MetricFlip, new MetricFlip({
    label: "充电桩",
    value: (__VLS_ctx.store.metrics.chargerPileCount),
    unit: "台",
    tone: "purple",
}));
const __VLS_75 = __VLS_74({
    label: "充电桩",
    value: (__VLS_ctx.store.metrics.chargerPileCount),
    unit: "台",
    tone: "purple",
}, ...__VLS_functionalComponentArgsRest(__VLS_74));
/** @type {[typeof MetricFlip, ]} */ ;
// @ts-ignore
const __VLS_77 = __VLS_asFunctionalComponent(MetricFlip, new MetricFlip({
    label: "使用中",
    value: (__VLS_ctx.store.metrics.chargerOccupiedCount),
    unit: "把",
    tone: "green",
}));
const __VLS_78 = __VLS_77({
    label: "使用中",
    value: (__VLS_ctx.store.metrics.chargerOccupiedCount),
    unit: "把",
    tone: "green",
}, ...__VLS_functionalComponentArgsRest(__VLS_77));
/** @type {[typeof MetricFlip, ]} */ ;
// @ts-ignore
const __VLS_80 = __VLS_asFunctionalComponent(MetricFlip, new MetricFlip({
    label: "空闲",
    value: (__VLS_ctx.store.metrics.chargerIdleCount),
    unit: "把",
    tone: "cyan",
}));
const __VLS_81 = __VLS_80({
    label: "空闲",
    value: (__VLS_ctx.store.metrics.chargerIdleCount),
    unit: "把",
    tone: "cyan",
}, ...__VLS_functionalComponentArgsRest(__VLS_80));
/** @type {[typeof MetricFlip, ]} */ ;
// @ts-ignore
const __VLS_83 = __VLS_asFunctionalComponent(MetricFlip, new MetricFlip({
    label: "故障",
    value: (__VLS_ctx.store.metrics.chargerFaultCount),
    unit: "把",
    tone: "red",
}));
const __VLS_84 = __VLS_83({
    label: "故障",
    value: (__VLS_ctx.store.metrics.chargerFaultCount),
    unit: "把",
    tone: "red",
}, ...__VLS_functionalComponentArgsRest(__VLS_83));
/** @type {[typeof MetricFlip, ]} */ ;
// @ts-ignore
const __VLS_86 = __VLS_asFunctionalComponent(MetricFlip, new MetricFlip({
    label: "当前功率",
    value: (__VLS_ctx.store.metrics.chargerPowerKw),
    unit: "kW",
    tone: "purple",
}));
const __VLS_87 = __VLS_86({
    label: "当前功率",
    value: (__VLS_ctx.store.metrics.chargerPowerKw),
    unit: "kW",
    tone: "purple",
}, ...__VLS_functionalComponentArgsRest(__VLS_86));
/** @type {[typeof MetricFlip, ]} */ ;
// @ts-ignore
const __VLS_89 = __VLS_asFunctionalComponent(MetricFlip, new MetricFlip({
    label: "今日电量",
    value: (__VLS_ctx.store.metrics.chargerEnergyTodayKwh),
    unit: "kWh",
    tone: "blue",
}));
const __VLS_90 = __VLS_89({
    label: "今日电量",
    value: (__VLS_ctx.store.metrics.chargerEnergyTodayKwh),
    unit: "kWh",
    tone: "blue",
}, ...__VLS_functionalComponentArgsRest(__VLS_89));
var __VLS_73;
/** @type {[typeof GlassPanel, typeof GlassPanel, ]} */ ;
// @ts-ignore
const __VLS_92 = __VLS_asFunctionalComponent(GlassPanel, new GlassPanel({
    title: "楼宇用能排行",
    accent: "amber",
}));
const __VLS_93 = __VLS_92({
    title: "楼宇用能排行",
    accent: "amber",
}, ...__VLS_functionalComponentArgsRest(__VLS_92));
__VLS_94.slots.default;
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
var __VLS_94;
/** @type {[typeof GlassPanel, typeof GlassPanel, ]} */ ;
// @ts-ignore
const __VLS_95 = __VLS_asFunctionalComponent(GlassPanel, new GlassPanel({
    title: "实时告警",
    accent: "red",
}));
const __VLS_96 = __VLS_95({
    title: "实时告警",
    accent: "red",
}, ...__VLS_functionalComponentArgsRest(__VLS_95));
__VLS_97.slots.default;
/** @type {[typeof AlarmTicker, ]} */ ;
// @ts-ignore
const __VLS_98 = __VLS_asFunctionalComponent(AlarmTicker, new AlarmTicker({
    alarms: (__VLS_ctx.store.alarmEvents),
}));
const __VLS_99 = __VLS_98({
    alarms: (__VLS_ctx.store.alarmEvents),
}, ...__VLS_functionalComponentArgsRest(__VLS_98));
var __VLS_97;
__VLS_asFunctionalElement(__VLS_intrinsicElements.footer, __VLS_intrinsicElements.footer)({
    ...{ class: "bottom-dock" },
});
/** @type {[typeof GlassPanel, typeof GlassPanel, ]} */ ;
// @ts-ignore
const __VLS_101 = __VLS_asFunctionalComponent(GlassPanel, new GlassPanel({
    title: "今日能源趋势",
    accent: "cyan",
}));
const __VLS_102 = __VLS_101({
    title: "今日能源趋势",
    accent: "cyan",
}, ...__VLS_functionalComponentArgsRest(__VLS_101));
__VLS_103.slots.default;
/** @type {[typeof TrendChart, ]} */ ;
// @ts-ignore
const __VLS_104 = __VLS_asFunctionalComponent(TrendChart, new TrendChart({
    option: (__VLS_ctx.energyChartOption),
}));
const __VLS_105 = __VLS_104({
    option: (__VLS_ctx.energyChartOption),
}, ...__VLS_functionalComponentArgsRest(__VLS_104));
var __VLS_103;
/** @type {[typeof GlassPanel, typeof GlassPanel, ]} */ ;
// @ts-ignore
const __VLS_107 = __VLS_asFunctionalComponent(GlassPanel, new GlassPanel({
    title: "分时电价与调度策略",
    accent: "green",
}));
const __VLS_108 = __VLS_107({
    title: "分时电价与调度策略",
    accent: "green",
}, ...__VLS_functionalComponentArgsRest(__VLS_107));
__VLS_109.slots.default;
/** @type {[typeof TrendChart, ]} */ ;
// @ts-ignore
const __VLS_110 = __VLS_asFunctionalComponent(TrendChart, new TrendChart({
    option: (__VLS_ctx.strategyChartOption),
}));
const __VLS_111 = __VLS_110({
    option: (__VLS_ctx.strategyChartOption),
}, ...__VLS_functionalComponentArgsRest(__VLS_110));
var __VLS_109;
__VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
    ...{ class: "benefit-float" },
});
/** @type {[typeof MetricFlip, ]} */ ;
// @ts-ignore
const __VLS_113 = __VLS_asFunctionalComponent(MetricFlip, new MetricFlip({
    label: "碳减排量",
    value: (__VLS_ctx.store.metrics.carbonReductionKg),
    unit: "kg",
    tone: "green",
}));
const __VLS_114 = __VLS_113({
    label: "碳减排量",
    value: (__VLS_ctx.store.metrics.carbonReductionKg),
    unit: "kg",
    tone: "green",
}, ...__VLS_functionalComponentArgsRest(__VLS_113));
/** @type {[typeof MetricFlip, ]} */ ;
// @ts-ignore
const __VLS_116 = __VLS_asFunctionalComponent(MetricFlip, new MetricFlip({
    label: "节约电费",
    value: (__VLS_ctx.store.metrics.costSavingYuan),
    unit: "元",
    tone: "amber",
}));
const __VLS_117 = __VLS_116({
    label: "节约电费",
    value: (__VLS_ctx.store.metrics.costSavingYuan),
    unit: "元",
    tone: "amber",
}, ...__VLS_functionalComponentArgsRest(__VLS_116));
/** @type {[typeof MetricFlip, ]} */ ;
// @ts-ignore
const __VLS_119 = __VLS_asFunctionalComponent(MetricFlip, new MetricFlip({
    label: "馈电功率",
    value: (__VLS_ctx.store.metrics.gridExportPowerKw),
    unit: "kW",
    tone: "cyan",
}));
const __VLS_120 = __VLS_119({
    label: "馈电功率",
    value: (__VLS_ctx.store.metrics.gridExportPowerKw),
    unit: "kW",
    tone: "cyan",
}, ...__VLS_functionalComponentArgsRest(__VLS_119));
/** @type {__VLS_StyleScopedClasses['screen-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['particle-layer']} */ ;
/** @type {__VLS_StyleScopedClasses['intro-stage']} */ ;
/** @type {__VLS_StyleScopedClasses['intro-planet']} */ ;
/** @type {__VLS_StyleScopedClasses['orbit-ring']} */ ;
/** @type {__VLS_StyleScopedClasses['orbit-pv']} */ ;
/** @type {__VLS_StyleScopedClasses['orbit-ring']} */ ;
/** @type {__VLS_StyleScopedClasses['orbit-storage']} */ ;
/** @type {__VLS_StyleScopedClasses['orbit-ring']} */ ;
/** @type {__VLS_StyleScopedClasses['orbit-charging']} */ ;
/** @type {__VLS_StyleScopedClasses['orbit-ring']} */ ;
/** @type {__VLS_StyleScopedClasses['orbit-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['intro-brand']} */ ;
/** @type {__VLS_StyleScopedClasses['scene-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['scene-hud']} */ ;
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
/** @type {__VLS_StyleScopedClasses['rank-list']} */ ;
/** @type {__VLS_StyleScopedClasses['rank-item']} */ ;
/** @type {__VLS_StyleScopedClasses['bottom-dock']} */ ;
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
            introVisible: introVisible,
            appRef: appRef,
            introRef: introRef,
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

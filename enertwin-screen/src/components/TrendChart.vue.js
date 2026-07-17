import * as echarts from 'echarts/core';
import { BarChart, LineChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
echarts.use([
    BarChart,
    LineChart,
    GridComponent,
    LegendComponent,
    TooltipComponent,
    CanvasRenderer,
]);
const props = defineProps();
const emit = defineEmits();
const chartRef = ref(null);
let chart = null;
let observer = null;
let resizeFrame = 0;
let readyTimer = 0;
let readyEmitted = false;
function signalReady() {
    if (readyEmitted)
        return;
    readyEmitted = true;
    window.clearTimeout(readyTimer);
    emit('ready');
}
onMounted(() => {
    if (!chartRef.value)
        return;
    chart = echarts.init(chartRef.value, undefined, {
        renderer: 'canvas',
        devicePixelRatio: Math.min(window.devicePixelRatio, 1),
        useDirtyRect: true,
    });
    chart.on('finished', signalReady);
    chart.setOption(props.option, { notMerge: true, lazyUpdate: true });
    readyTimer = window.setTimeout(signalReady, 1200);
    observer = new ResizeObserver(() => {
        window.cancelAnimationFrame(resizeFrame);
        resizeFrame = window.requestAnimationFrame(() => chart?.resize({ silent: true }));
    });
    observer.observe(chartRef.value);
});
watch(() => props.option, (option) => chart?.setOption(option, { notMerge: true, lazyUpdate: true }));
onBeforeUnmount(() => {
    window.clearTimeout(readyTimer);
    window.cancelAnimationFrame(resizeFrame);
    observer?.disconnect();
    chart?.dispose();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ref: "chartRef",
    ...{ class: "trend-chart" },
});
/** @type {typeof __VLS_ctx.chartRef} */ ;
/** @type {__VLS_StyleScopedClasses['trend-chart']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            chartRef: chartRef,
        };
    },
    __typeEmits: {},
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEmits: {},
    __typeProps: {},
});
; /* PartiallyEnd: #4569/main.vue */

import * as echarts from 'echarts';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
const props = defineProps();
const chartRef = ref(null);
let chart = null;
let observer = null;
onMounted(() => {
    if (!chartRef.value)
        return;
    chart = echarts.init(chartRef.value, undefined, { renderer: 'canvas' });
    chart.setOption(props.option);
    observer = new ResizeObserver(() => chart?.resize());
    observer.observe(chartRef.value);
});
watch(() => props.option, (option) => chart?.setOption(option, true), { deep: true });
onBeforeUnmount(() => {
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
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeProps: {},
});
; /* PartiallyEnd: #4569/main.vue */

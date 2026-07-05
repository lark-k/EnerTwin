import { computed } from 'vue';
const props = defineProps();
const displayValue = computed(() => {
    if (typeof props.value === 'number') {
        return props.value >= 1000 ? props.value.toLocaleString('zh-CN') : props.value;
    }
    return props.value;
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "metric-flip" },
    ...{ class: (`tone-${__VLS_ctx.tone ?? 'cyan'}`) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "metric-label" },
});
(__VLS_ctx.label);
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({
    ...{ class: "metric-value" },
    key: (__VLS_ctx.displayValue),
});
(__VLS_ctx.displayValue);
if (__VLS_ctx.unit) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "metric-unit" },
    });
    (__VLS_ctx.unit);
}
/** @type {__VLS_StyleScopedClasses['metric-flip']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-label']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-value']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-unit']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            displayValue: displayValue,
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

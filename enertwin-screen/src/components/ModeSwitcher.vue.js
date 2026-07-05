import { Bell, BatteryCharging, Building2, CarFront, Grid3X3, SunMedium } from 'lucide-vue-next';
const __VLS_props = defineProps();
const emit = defineEmits();
const modes = [
    { value: 'overview', label: '总览', icon: Grid3X3 },
    { value: 'pv', label: '光伏', icon: SunMedium },
    { value: 'storage', label: '储能', icon: BatteryCharging },
    { value: 'charging', label: '充电', icon: CarFront },
    { value: 'building', label: '楼宇', icon: Building2 },
    { value: 'alarm', label: '告警', icon: Bell },
];
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "mode-switcher" },
    role: "tablist",
    'aria-label': "场景模式",
});
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.modes))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.emit('update:modelValue', item.value);
            } },
        key: (item.value),
        type: "button",
        ...{ class: ({ active: __VLS_ctx.modelValue === item.value }) },
        title: (`${item.label}模式`),
    });
    const __VLS_0 = ((item.icon));
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        size: (15),
    }));
    const __VLS_2 = __VLS_1({
        size: (15),
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (item.label);
}
/** @type {__VLS_StyleScopedClasses['mode-switcher']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            emit: emit,
            modes: modes,
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

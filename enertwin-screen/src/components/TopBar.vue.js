import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { Maximize2, Moon, SunMedium } from 'lucide-vue-next';
import ModeSwitcher from './ModeSwitcher.vue';
const props = defineProps();
const emit = defineEmits();
const now = ref(new Date());
let timer;
const formattedTime = computed(() => now.value.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
}));
onMounted(() => {
    timer = window.setInterval(() => {
        now.value = new Date();
    }, 1000);
});
onBeforeUnmount(() => {
    if (timer)
        window.clearInterval(timer);
});
function requestFullscreen() {
    document.documentElement.requestFullscreen?.();
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
    ...{ class: "top-bar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "brand-lockup" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "top-meta" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
(__VLS_ctx.parkName);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
(__VLS_ctx.formattedTime);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
/** @type {[typeof ModeSwitcher, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(ModeSwitcher, new ModeSwitcher({
    ...{ 'onUpdate:modelValue': {} },
    modelValue: (props.mode),
}));
const __VLS_1 = __VLS_0({
    ...{ 'onUpdate:modelValue': {} },
    modelValue: (props.mode),
}, ...__VLS_functionalComponentArgsRest(__VLS_0));
let __VLS_3;
let __VLS_4;
let __VLS_5;
const __VLS_6 = {
    'onUpdate:modelValue': (...[$event]) => {
        __VLS_ctx.emit('update:mode', $event);
    }
};
var __VLS_2;
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.emit('update:nightMode', !props.nightMode);
        } },
    ...{ class: "icon-button" },
    type: "button",
    title: (props.nightMode ? '切换日间模式' : '切换夜间模式'),
});
if (props.nightMode) {
    const __VLS_7 = {}.Moon;
    /** @type {[typeof __VLS_components.Moon, ]} */ ;
    // @ts-ignore
    const __VLS_8 = __VLS_asFunctionalComponent(__VLS_7, new __VLS_7({
        size: (18),
    }));
    const __VLS_9 = __VLS_8({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_8));
}
else {
    const __VLS_11 = {}.SunMedium;
    /** @type {[typeof __VLS_components.SunMedium, ]} */ ;
    // @ts-ignore
    const __VLS_12 = __VLS_asFunctionalComponent(__VLS_11, new __VLS_11({
        size: (18),
    }));
    const __VLS_13 = __VLS_12({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_12));
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.requestFullscreen) },
    ...{ class: "icon-button" },
    type: "button",
    title: "全屏",
});
const __VLS_15 = {}.Maximize2;
/** @type {[typeof __VLS_components.Maximize2, ]} */ ;
// @ts-ignore
const __VLS_16 = __VLS_asFunctionalComponent(__VLS_15, new __VLS_15({
    size: (18),
}));
const __VLS_17 = __VLS_16({
    size: (18),
}, ...__VLS_functionalComponentArgsRest(__VLS_16));
/** @type {__VLS_StyleScopedClasses['top-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['brand-lockup']} */ ;
/** @type {__VLS_StyleScopedClasses['top-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-button']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-button']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Maximize2: Maximize2,
            Moon: Moon,
            SunMedium: SunMedium,
            ModeSwitcher: ModeSwitcher,
            emit: emit,
            formattedTime: formattedTime,
            requestFullscreen: requestFullscreen,
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

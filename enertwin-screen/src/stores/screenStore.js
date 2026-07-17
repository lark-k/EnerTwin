import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { alarmEvents, buildingRanks, createTrendData, energyFlows, initialMetrics, nextMetrics } from '../data/mock';
export const useScreenStore = defineStore('screen', () => {
    const metrics = ref(initialMetrics);
    const trend = ref(createTrendData());
    const mode = ref('overview');
    const nightMode = ref(true);
    const parkName = ref('EnerTwin 零碳示范园区');
    let timer;
    const websocketPayload = computed(() => ({
        type: 'ENERGY_REALTIME',
        timestamp: new Date().toISOString(),
        data: {
            pvPowerKw: metrics.value.pvPowerKw,
            pvEnergyTodayKwh: metrics.value.pvEnergyTodayKwh,
            loadPowerKw: metrics.value.loadPowerKw,
            gridImportPowerKw: metrics.value.gridImportPowerKw,
            gridExportPowerKw: metrics.value.gridExportPowerKw,
            storageSoc: metrics.value.storageSoc,
            storageSoh: metrics.value.storageSoh,
            storagePowerKw: metrics.value.storageChargePowerKw - metrics.value.storageDischargePowerKw,
            chargerPowerKw: metrics.value.chargerPowerKw,
            chargerOccupiedCount: metrics.value.chargerOccupiedCount,
            selfConsumptionRate: metrics.value.selfConsumptionRate,
            carbonReductionKg: metrics.value.carbonReductionKg,
            costSavingYuan: metrics.value.costSavingYuan,
            alarmCount: metrics.value.alarmCount,
        },
    }));
    function startMockStream() {
        stopMockStream();
        timer = window.setInterval(() => {
            metrics.value = nextMetrics(metrics.value);
            trend.value = createTrendData();
        }, 9000);
    }
    function stopMockStream() {
        if (timer) {
            window.clearInterval(timer);
            timer = undefined;
        }
    }
    return {
        metrics,
        trend,
        mode,
        nightMode,
        parkName,
        buildingRanks,
        alarmEvents,
        energyFlows,
        websocketPayload,
        startMockStream,
        stopMockStream,
    };
});

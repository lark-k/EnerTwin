# enertwin-dispatch

调度策略服务，负责预测、优化和策略输出。

核心模块：

- `forecast/pv`：光伏发电预测。
- `forecast/load`：园区负荷预测。
- `forecast/charging`：充电负荷预测。
- `optimizer/storage`：储能充放电优化。
- `optimizer/tou`：分时电价优化。
- `strategy/demand`：需量控制。
- `strategy/peak-valley`：削峰填谷。
- `carbon`：碳减排收益计算。
- `jobs`：次日计划生成和定时任务。


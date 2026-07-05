# EnerTwin 企业级系统总体设计

项目代号：EnerTwin  
系统全称：光储充协同能源数字孪生平台

## 1. 总体架构

EnerTwin 采用“边缘采集 + 平台服务 + 调度优化 + 管理后台 + 3D 大屏”的分层架构。

```text
设备层
  光伏逆变器 / 储能 PCS / BMS / 充电桩 / 智能电表 / 楼宇仪表 / 气象站

边缘采集层 enertwin-edge
  Modbus TCP/RTU / OPC UA / OCPP / DL/T 645 / MQTT
  点表映射 / 数据清洗 / 本地缓存 / 断网续传 / 设备心跳

消息与数据接入层
  MQTT Broker / Kafka 或 RabbitMQ / HTTP API / WebSocket

平台服务层 enertwin-server
  认证授权 / 设备模型 / 资产台账 / 告警规则 / 统计分析 / 第三方接口

调度策略层 enertwin-dispatch
  光伏预测 / 负荷预测 / 分时电价优化 / 削峰填谷 / 需量控制 / 碳收益

数据存储层
  PostgreSQL + TimescaleDB / Redis / MinIO / 日志与审计库

应用展示层
  enertwin-web 企业管理后台 / enertwin-screen 3D 数字孪生大屏
```

关键数据流：

1. `enertwin-edge` 从现场设备采集原始点位，清洗后发布到 MQTT/Kafka。
2. `enertwin-server` 消费设备数据，写入时序库和业务库，触发告警规则。
3. `enertwin-dispatch` 周期性读取预测、负荷、电价和 SOC，生成调度计划。
4. `enertwin-screen` 通过 REST 拉取初始状态，通过 `WS /ws/screen/realtime` 接收实时指标。
5. `enertwin-web` 负责资产、点表、告警、报表、权限和策略配置。

## 2. 目录结构

```text
EnerTwin/
  enertwin-web/
    src/api
    src/router
    src/stores
    src/views
    src/components
    src/permissions

  enertwin-screen/
    src/components
    src/data
    src/stores
    src/types.ts
    src/App.vue

  enertwin-server/
    src/main/java/com/enertwin
      auth
      park
      device
      alarm
      screen
      report
      dispatch
      websocket
      common

  enertwin-edge/
    src/adapters
    src/protocols
    src/mappings
    src/cache
    src/uplink
    src/heartbeat

  enertwin-dispatch/
    src/forecast
    src/optimizer
    src/strategy
    src/carbon
    src/jobs

  database/schema.sql
  docs/EnerTwin-Enterprise-Architecture.md
  docker-compose.yml
```

## 3. 数据库设计

核心实体见 [database/schema.sql](../database/schema.sql)，覆盖：

- 园区与空间：`park`、`building`
- 设备与点位：`device`、`device_point`、`meter`
- 光伏：`pv_station`、`pv_inverter`
- 储能：`storage_station`、`battery_cluster`、`pcs`
- 充电：`charger_station`、`charger_pile`、`charger_connector`
- 告警与时序：`alarm_event`、`energy_record`
- 调度与低碳：`dispatch_strategy`、`carbon_record`
- 权限：`user_account`、`role`、`permission`、关联表

建议：

- 业务主数据存 PostgreSQL。
- `energy_record` 建 TimescaleDB hypertable，按 `recorded_at` 分区。
- 实时指标热数据放 Redis，WebSocket 推送使用 Redis Pub/Sub 或 Kafka topic。
- 文件、报表、设备资料存 MinIO。

## 4. 后端 API 设计

### 大屏接口

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/screen/overview` | 大屏总览指标 |
| GET | `/api/screen/energy-flow` | 光伏、储能、充电、楼宇、电网能量流 |
| GET | `/api/screen/pv/summary` | 光伏装机、功率、发电量、逆变器状态 |
| GET | `/api/screen/storage/summary` | 储能 SOC、SOH、充放电功率、PCS/BMS 状态 |
| GET | `/api/screen/charging/summary` | 充电桩、充电枪、功率、电量、故障 |
| GET | `/api/screen/buildings/ranking` | 楼宇用能排行和热力数据 |
| GET | `/api/screen/alarms/realtime` | 实时告警 |
| GET | `/api/screen/trends/today` | 今日光伏、负荷、储能、充电、电价曲线 |
| WS | `/ws/screen/realtime` | 大屏实时推送 |

### 管理端接口

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/auth/login` | 登录，返回 JWT/Refresh Token |
| GET | `/api/parks` | 园区列表 |
| GET | `/api/buildings` | 楼宇列表 |
| GET | `/api/devices` | 设备分页 |
| POST | `/api/devices` | 新建设备 |
| PUT | `/api/devices/{id}` | 更新设备 |
| GET | `/api/alarms` | 告警列表 |
| PUT | `/api/alarms/{id}/handle` | 告警处理闭环 |
| GET | `/api/reports/daily` | 日报 |
| GET | `/api/reports/monthly` | 月报 |
| GET | `/api/dispatch/strategies` | 调度策略 |
| POST | `/api/dispatch/strategies` | 新建/启用调度策略 |

统一响应：

```json
{
  "code": 0,
  "message": "ok",
  "data": {},
  "traceId": "01J1ENER..."
}
```

## 5. WebSocket 消息设计

主题建议：

- `ENERGY_REALTIME`：大屏核心指标。
- `ENERGY_FLOW_UPDATE`：能量流方向和功率。
- `ALARM_EVENT`：新增、恢复、确认告警。
- `DEVICE_STATUS`：设备在线离线。
- `DISPATCH_PLAN_UPDATE`：调度策略和次日计划。

示例：

```json
{
  "type": "ENERGY_REALTIME",
  "timestamp": "2026-07-04T10:30:00+08:00",
  "data": {
    "pvPowerKw": 186.5,
    "pvEnergyTodayKwh": 1248.8,
    "loadPowerKw": 432.8,
    "gridImportPowerKw": 150.7,
    "gridExportPowerKw": 0,
    "storageSoc": 76.2,
    "storageSoh": 95.1,
    "storagePowerKw": -80.0,
    "chargerPowerKw": 95.6,
    "chargerOccupiedCount": 18,
    "selfConsumptionRate": 87.3,
    "carbonReductionKg": 530.5,
    "costSavingYuan": 1268.9,
    "alarmCount": 2
  }
}
```

## 6. 大屏 UI 组件拆分

- `TopBar`：系统名称、园区、天气、时间、全屏、昼夜和模式切换。
- `DigitalTwinScene`：Three.js 园区数字孪生场景。
- `GlassPanel`：半透明玻璃数据舱基础容器。
- `MetricFlip`：动态翻牌指标。
- `StatusRing`：SOC/SOH/在线率环形状态。
- `TrendChart`：ECharts 趋势图基础组件。
- `AlarmTicker`：实时告警滚动与等级视觉。
- `ModeSwitcher`：总览、光伏、储能、充电、楼宇、告警模式切换。

布局：

- 顶部：标题、时间、天气、园区、全屏、模式切换。
- 左侧：资产总览、光伏运行、储能运行、设备在线率。
- 右侧：用电统计、充电运营、楼宇排行、实时告警。
- 底部：今日趋势、分时电价与调度策略、低碳收益。
- 中央：3D 园区、光伏板、储能站、充电桩、电网点、能量流线、告警点位。

## 7. Three.js 场景实现方案

原型已实现：

- `PerspectiveCamera + OrbitControls`：自动缓慢巡航，支持鼠标旋转缩放。
- `CylinderGeometry`：园区数字孪生基座。
- `BoxGeometry`：楼宇体块、储能舱、充电桩。
- `GridHelper`：园区科技网格。
- `CSS2DRenderer`：楼宇、储能、充电、电网悬浮标签。
- `CatmullRomCurve3 + Line + Sphere`：动态能量流线和流动粒子。
- `PointsMaterial`：深空粒子背景。
- 告警模式：红色闪烁 beacon 聚焦异常设备。

后续增强：

- 接入真实园区 GLTF/GLB 模型。
- 使用 InstancedMesh 承载大量设备点位。
- 结合后处理 Bloom 提升发光质感。
- 使用射线拾取展示设备详情弹窗。
- 按模式切换对象材质、透明度、相机位和能量流方向。

## 8. ECharts 图表配置方案

当前原型：

- 今日光伏发电曲线：绿色面积线。
- 今日园区负荷曲线：科技青面积线。
- 储能充放电曲线：储能蓝面积线，正负值表示充/放电。
- 充电负荷曲线：充电紫面积线。
- 分时电价：橙色柱状图。
- 调度建议：绿色平滑线。

配置原则：

- 深色 tooltip，边框使用能源主题色。
- 网格线低透明，避免抢中央 3D 视觉。
- 折线使用 `smooth` 和面积渐隐。
- 更新时保留动画，刷新周期建议 2 至 5 秒。

## 9. 模拟数据方案

`enertwin-screen/src/data/mock.ts` 提供模拟数据：

- 初始化总览指标。
- 按 24 小时生成趋势曲线。
- 每 2.6 秒扰动实时指标，模拟 WebSocket 推送。
- 根据负荷和光伏自动变化购电/馈电、储能充放电、充电占用、告警数量。

替换真实接口时：

1. 首屏调用 REST 获取 `overview`、`trends`、`ranking`、`alarms`。
2. 建立 `WS /ws/screen/realtime`。
3. 将 `ENERGY_REALTIME` payload 写入 Pinia store。
4. 将 `ENERGY_FLOW_UPDATE` 同步到 Three.js 流线方向和粒子速度。

## 10. Docker Compose 部署方案

根目录提供 `docker-compose.yml`：

- `enertwin-screen`：构建并通过 Nginx 暴露大屏静态资源。
- `postgres`：业务库与 TimescaleDB。
- `redis`：缓存、实时指标热数据。
- `emqx`：MQTT Broker。
- `minio`：报表、图片、模型文件。

生产建议：

- Nginx/APISIX 统一反向代理 `/api` 和 `/ws`。
- PostgreSQL 开启 PITR 备份。
- MQTT 与后端链路启用 TLS。
- 多园区企业版使用 Kubernetes，服务按园区和租户隔离。

## 11. 权限与安全方案

- 认证：JWT + Refresh Token，企业版支持 OAuth2/OIDC、LDAP/AD、SSO。
- 授权：RBAC + 园区数据权限 + 设备范围权限。
- 角色：超级管理员、园区管理员、能源运维、设备运维、领导驾驶舱、访客演示。
- 接口安全：HTTPS、签名校验、限流、审计日志、traceId。
- 设备安全：边缘网关证书、MQTT TLS、设备身份密钥轮换。
- 数据安全：敏感配置加密、MinIO 私有桶、数据库备份、操作留痕。
- WebSocket：鉴权握手、心跳、断线重连、按园区 topic 推送。

## 12. 项目实施里程碑

| 阶段 | 周期 | 目标 |
|---|---:|---|
| MVP 演示版 | 4-6 周 | 3D 大屏、模拟数据、核心指标、入口动画、趋势图、告警展示 |
| 试点版 | 8-12 周 | 接入真实设备、后台管理、告警闭环、报表、基础调度策略 |
| 企业版 | 12-20 周 | 多园区、多租户、高可用、权限审计、调度闭环、第三方集成 |

验收指标：

- 大屏首屏加载小于 8 秒。
- 实时数据刷新延迟小于 3 秒。
- 常规场景 3D 帧率不低于 30 FPS。
- 支持 1920x1080、2560x1440、3840x2160。
- 支持不少于 1000 个设备点位扩展。


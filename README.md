# EnerTwin

EnerTwin（光储充协同能源数字孪生平台）面向园区、校园、产业园、商业综合体和公共建筑群，提供光伏、储能、充电桩、楼宇负荷、电网交互、告警和能效收益的实时采集、分析、调度和 3D 数字孪生展示。

当前仓库优先实现 `enertwin-screen` 可运行 3D 大屏原型，并沉淀企业级架构设计、数据库模型、接口、WebSocket、部署和实施路线。

## 项目

- `enertwin-screen`：Vue 3 + Three.js + ECharts + GSAP 的 3D 数字孪生大屏原型。
- `enertwin-web`：企业管理后台工程骨架。
- `enertwin-server`：平台后端服务工程骨架。
- `enertwin-edge`：边缘采集服务工程骨架。
- `enertwin-dispatch`：调度策略服务工程骨架。
- `docs`：企业级总体设计文档。
- `database`：PostgreSQL / TimescaleDB 表结构。

## 本地运行大屏

```bash
npm install
npm run dev:screen
```

默认访问：`http://localhost:5173/`

## 构建

```bash
npm run build:screen
```


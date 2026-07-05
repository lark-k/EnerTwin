# enertwin-server

平台后端服务，推荐 Spring Boot 3.x + Java 21。

建议包结构：

- `auth`：登录、JWT、RBAC。
- `park`：园区、楼宇。
- `device`：设备、点位、协议元数据。
- `screen`：大屏聚合接口。
- `alarm`：告警规则、告警事件、处理闭环。
- `report`：日报、月报、碳收益。
- `dispatch`：调度策略配置和结果查询。
- `websocket`：实时推送。
- `common`：异常、审计、分页、响应封装。


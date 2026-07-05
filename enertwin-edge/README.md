# enertwin-edge

边缘采集服务，建议使用 Java、Go 或 Node.js 实现。

核心模块：

- `protocols/modbus`：Modbus TCP/RTU。
- `protocols/opcua`：OPC UA。
- `protocols/ocpp`：OCPP 1.6/2.0.1。
- `protocols/dlt645`：DL/T 645 电表。
- `mappings`：设备点表映射、单位换算。
- `cache`：本地缓存、断网续传。
- `uplink`：MQTT/Kafka/HTTP 上行。
- `heartbeat`：设备心跳和在线状态。


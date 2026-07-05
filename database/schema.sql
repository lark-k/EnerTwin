CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE park (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  address VARCHAR(256),
  latitude NUMERIC(10, 6),
  longitude NUMERIC(10, 6),
  timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Shanghai',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE building (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  park_id UUID NOT NULL REFERENCES park(id),
  code VARCHAR(64) NOT NULL,
  name VARCHAR(128) NOT NULL,
  area_m2 NUMERIC(12, 2),
  floor_count INT,
  position JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (park_id, code)
);

CREATE TABLE device (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  park_id UUID NOT NULL REFERENCES park(id),
  building_id UUID REFERENCES building(id),
  code VARCHAR(64) NOT NULL,
  name VARCHAR(128) NOT NULL,
  device_type VARCHAR(48) NOT NULL,
  protocol VARCHAR(48) NOT NULL,
  manufacturer VARCHAR(128),
  model VARCHAR(128),
  status VARCHAR(32) NOT NULL DEFAULT 'offline',
  position JSONB,
  installed_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (park_id, code)
);

CREATE TABLE device_point (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES device(id),
  code VARCHAR(64) NOT NULL,
  name VARCHAR(128) NOT NULL,
  point_type VARCHAR(32) NOT NULL,
  unit VARCHAR(32),
  address VARCHAR(128),
  scale NUMERIC(14, 6) NOT NULL DEFAULT 1,
  offset_value NUMERIC(14, 6) NOT NULL DEFAULT 0,
  value_type VARCHAR(32) NOT NULL DEFAULT 'number',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (device_id, code)
);

CREATE TABLE meter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES device(id),
  meter_type VARCHAR(48) NOT NULL,
  ct_ratio NUMERIC(12, 4),
  pt_ratio NUMERIC(12, 4),
  billing_account VARCHAR(128)
);

CREATE TABLE pv_station (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  park_id UUID NOT NULL REFERENCES park(id),
  name VARCHAR(128) NOT NULL,
  capacity_kw NUMERIC(14, 2) NOT NULL,
  grid_connection_voltage VARCHAR(32),
  position JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE pv_inverter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES pv_station(id),
  device_id UUID REFERENCES device(id),
  code VARCHAR(64) NOT NULL,
  capacity_kw NUMERIC(14, 2) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'offline',
  UNIQUE (station_id, code)
);

CREATE TABLE storage_station (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  park_id UUID NOT NULL REFERENCES park(id),
  name VARCHAR(128) NOT NULL,
  capacity_kwh NUMERIC(14, 2) NOT NULL,
  power_kw NUMERIC(14, 2) NOT NULL,
  position JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE battery_cluster (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES storage_station(id),
  code VARCHAR(64) NOT NULL,
  capacity_kwh NUMERIC(14, 2) NOT NULL,
  soc_percent NUMERIC(6, 2),
  soh_percent NUMERIC(6, 2),
  max_temperature NUMERIC(6, 2),
  status VARCHAR(32) NOT NULL DEFAULT 'standby',
  UNIQUE (station_id, code)
);

CREATE TABLE pcs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES storage_station(id),
  device_id UUID REFERENCES device(id),
  code VARCHAR(64) NOT NULL,
  rated_power_kw NUMERIC(14, 2) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'standby',
  UNIQUE (station_id, code)
);

CREATE TABLE charger_station (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  park_id UUID NOT NULL REFERENCES park(id),
  name VARCHAR(128) NOT NULL,
  position JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE charger_pile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES charger_station(id),
  device_id UUID REFERENCES device(id),
  code VARCHAR(64) NOT NULL,
  rated_power_kw NUMERIC(14, 2) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'offline',
  UNIQUE (station_id, code)
);

CREATE TABLE charger_connector (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pile_id UUID NOT NULL REFERENCES charger_pile(id),
  connector_no VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'idle',
  current_power_kw NUMERIC(14, 2) NOT NULL DEFAULT 0,
  current_order_id VARCHAR(64),
  UNIQUE (pile_id, connector_no)
);

CREATE TABLE alarm_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  park_id UUID NOT NULL REFERENCES park(id),
  device_id UUID REFERENCES device(id),
  level VARCHAR(32) NOT NULL,
  alarm_type VARCHAR(64) NOT NULL,
  title VARCHAR(128) NOT NULL,
  content TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  occurred_at TIMESTAMPTZ NOT NULL,
  recovered_at TIMESTAMPTZ,
  handled_at TIMESTAMPTZ,
  handler_id UUID,
  position JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE energy_record (
  time TIMESTAMPTZ NOT NULL,
  park_id UUID NOT NULL REFERENCES park(id),
  device_id UUID REFERENCES device(id),
  metric_code VARCHAR(64) NOT NULL,
  metric_value NUMERIC(18, 4) NOT NULL,
  unit VARCHAR(32),
  quality VARCHAR(32) NOT NULL DEFAULT 'good',
  tags JSONB,
  PRIMARY KEY (time, park_id, metric_code, device_id)
);

SELECT create_hypertable('energy_record', 'time', if_not_exists => TRUE);

CREATE TABLE dispatch_strategy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  park_id UUID NOT NULL REFERENCES park(id),
  name VARCHAR(128) NOT NULL,
  strategy_type VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'draft',
  priority INT NOT NULL DEFAULT 100,
  rule_config JSONB NOT NULL,
  effective_from TIMESTAMPTZ,
  effective_to TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE carbon_record (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  park_id UUID NOT NULL REFERENCES park(id),
  stat_date DATE NOT NULL,
  pv_energy_kwh NUMERIC(18, 2) NOT NULL DEFAULT 0,
  carbon_factor NUMERIC(10, 6) NOT NULL,
  carbon_reduction_kg NUMERIC(18, 2) NOT NULL,
  cost_saving_yuan NUMERIC(18, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (park_id, stat_date)
);

CREATE TABLE user_account (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(64) NOT NULL UNIQUE,
  display_name VARCHAR(128) NOT NULL,
  password_hash VARCHAR(256) NOT NULL,
  email VARCHAR(128),
  phone VARCHAR(32),
  status VARCHAR(32) NOT NULL DEFAULT 'enabled',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE role (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  description VARCHAR(256)
);

CREATE TABLE permission (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(128) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  permission_type VARCHAR(32) NOT NULL,
  resource VARCHAR(128)
);

CREATE TABLE user_role (
  user_id UUID NOT NULL REFERENCES user_account(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES role(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE role_permission (
  role_id UUID NOT NULL REFERENCES role(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permission(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX idx_device_park_type ON device (park_id, device_type);
CREATE INDEX idx_alarm_park_status_time ON alarm_event (park_id, status, occurred_at DESC);
CREATE INDEX idx_energy_record_metric_time ON energy_record (metric_code, time DESC);

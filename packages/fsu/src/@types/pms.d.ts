interface Unit {
  id: number;
  userName?: string;
  password?: string;
  unitId?: string;
  resourceId?: string;
  ipAddress: string;
  port: number;
  manufacturer?: string;
  model?: string;
  version?: string;
  unitVersion?: string;
  interval: number;
  createdAt: Date;
  updatedAt: Date;
  reportedAt?: Date;
}

interface Device {
  id: number;
  name: string;
  controller: string;
  protocol: string;
  model: string;
  port: string;
  code: string;
  serial: string;
  baudRate: number;
  timeout: number;
  updatedAt: Date | null;
  activite: boolean;
  signals: Signal[];
}

interface Alarm {
  id: string;
  deviceId: string;
  deviceResourceId: string;
  signal: string;
  value: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  active: boolean;
  signalId: string;
}

interface History {
  id: number;
  signal: Signal;
  signalId: number;
  value: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

interface DeviceResponse {
  message?: string;
  data: Buffer;
}

interface Port {
  path: string;
  active: boolean;
  busy: boolean;
  baudRate: number;
  timeout: number;
}

interface Message {
  protocol: string;
  path: string;
  baudRate?: string;
  data?: number[];
  timeout?: number;
  parsed?: Object;
}

interface Signal {
  id: string;
  name: string;
  length: number;
  code: string;
  ignore?: boolean;
  lowerMinorLimit: number | null;
  lowerMajorLimit: number | null;
  upperMinorLimit: number | null;
  upperMajorLimit: number | null;
  unit: string | null;
  enabled?: boolean;
  offset: number | null;
  raw: number | null;
  command: string;
  value: string | number | null;
  threshold: number | null;
  thresholdPercent?: number | null;
  startDelay: number | null;
  endDelay: number | null;
  normalValue: string | number | null;
  enum: {
    [key: number]: string | number;
  };
  alarm: number | null;
  reportAt: Date | null;
  interval?: number;
  updatedAt?: Date | string;
}
interface Component {
  name: string;
  description: string;
  components: {
    [key: string]: {
      默认: Signal[];
    };
  };
}

interface Template {
  name: string;
  description: string;
  protocol: string;
  components: { [key: string]: Signal[][] };
}

type Value = Signal & {
  deviceId: string;
  prev: number;
  current: number;
};

interface Unit {
  id: number;
  userName: string;
  password: string;
  unitId: string;
  resourceId: string;
  localAddress: string;
  remoteAddress: string;
  port: number;
  manufacturer: string;
  model: string;
  version: string;
  unitVersion: string;
  interval: number;
  createdAt: Date;
  updatedAt: Date;
  reportedAt?: Date;
}

interface Device {
  id: number;
  name: string;
  controller: string;
  commands: { [key: string]: string };
  model: string;
  port: string;
  code: string;
  serial: string;
  baudRate: number;
  timeout: number;
  activite: boolean;
  updatedAt?: Date;
  productionAt: Date;
  signals: Signal[];
}

interface Alarm {
  id: string;
  signal: string;
  value: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  state: string;
  signalId: string;
  occuredAt: Date;
  clearedAt: Date | null;
  reported: boolean;
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

interface Log {
  id: number;
  description: string;
  createdAt: Date;
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
  unit?: string;
  offset?: number;
  enabled?: boolean;
  raw?: number;
  value?: string | number;
  threshold?: number;
  thresholdPercent?: number;
  startDelay?: number;
  endDelay?: number;
  normalValue?: string | number;
  enum?: {
    [key: number]: string | number;
  };
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

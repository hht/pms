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
  model: string;
  port: string;
  code: string;
  serial: string;
  baudRate: number;
  timeout: number;
  updatedAt: Date | null;
}

interface Alarm {
  id: string;
  signal: Signal;
  value: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  active: boolean;
  signalId: number;
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

interface Command {
  id: string;
  name: string;
  command: Buffer;
  model: string[];
  preprocessor: (input: Buffer) => Buffer;
  controller: string;
  parser: (options: Signal[][]) => (input: Buffer) => Signal[];
  options: {
    [key: string]: Signal[];
  };
}

interface Value {
  name: string;
  value: "B" | "F" | "I";
  skip?: (value: number) => number;
}

interface Signal {
  id: string;
  name: string;
  length: number;
  lowerMinorLimit?: number;
  lowerMajorLimit?: number;
  upperMinorLimit?: number;
  upperMajorLimit?: number;
  unit?: string;
  value?: string | number;
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

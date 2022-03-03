interface Unit {
  id: number;
  userName: string;
  password: string;
  unitId: string;
  resourceId: string;
  ipAddress: string;
  port: number;
  vendor: string;
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
  vendor: string;
  model: string;
  deviceId: string;
  resourceId: string;
  port: string;
  baudRate: number;
  timeout: number;
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
  name: string;
  command: Buffer;
  preprocessor: (input: Buffer) => Buffer;
  parser: (input: Buffer, options: Signal[][]) => Signal[];
  options: Signal[][];
}
interface Protocol {
  id: string;
  name: string;
  model: string;
  type: string;
  commands: Command[];
  vendor: string;
  rtn?: {
    [key: string]: string;
  };
}

interface Value {
  name: string;
  value: "B" | "F" | "I";
  skip?: (value: number) => number;
}

interface Signal {
  name: string;
  unit: string;
  length: number;
  prefix: string;
  lowerMinorLimit?: number;
  lowerMajorLimit?: number;
  upperMinorLimit?: number;
  upperMajorLimit?: number;
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

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
  input: Buffer;
  name: string;
  process: (Buffer) => Buffer;
  parse: (input: Buffer) => { name: string; value: numbuer | string }[];
  validate: (response: Buffer) => Buffer | null;
}
interface Protocol {
  id: string;
  name: string;
  model: string;
  commands: Command[];
  manufacturer: string;
}

interface Value {
  name: string;
  value: "B" | "F" | "I";
  skip?: (value: number) => number;
}

interface Unit {
  id: number;
  userName: string;
  password: string;
  unitId: string;
  resourceId: string;
  ipAddress: string;
  port: string;
  vendor: string;
  model: string;
  version: string;
  unitVersion: string;
  devices: Device[];
  interval: number;
  createdAt: string;
  updatedAt: string;
  reportedAt: string;
}

interface Device {
  id: number;
  name: string;
  Unit: Unit;
  unitId: string;
  deviceId: string;
  resourceId: string;
  port: string;
  vendor: string;
}

interface Signal {
  id: number;
  device: Device;
  deviceId: string;
  name: string;
  value: string;
  highestLimit?: number;
  higherLimit?: number;
  lowerLimit?: number;
  lowestLimit?: number;
  threshold?: number;
  percent?: number;
  interval?: number;
  delay?: number;
  Histories: History[];
  Alarm: Alarm[];
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

interface Port {
  path: string;
  active: boolean;
  busy: boolean;
  baudRate: number;
  timeout: number;
}

interface Message {
  path: string;
  protocol: string;
  baudRate?: number;
  timeout?: number;
  error?: string;
  data: number[];
  parsed?: Object;
}

interface Protocol {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
}

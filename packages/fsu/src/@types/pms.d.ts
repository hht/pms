interface Unit {
  id: number;
  userName?: string;
  password?: string;
  unitId?: string;
  resourceId?: string;
  localAddress: string;
  remoteAddress: string;
  port: number;
  manufacturer?: string;
  model?: string;
  version?: string;
  unitVersion?: string;
  interval: number;
  createdAt: Date;
  updatedAt: Date;
  reportedAt?: Date;
  heartBeat: number;
  longitude: number;
  latitude: number;
  activeIp?: string;
}

interface Device {
  id: number;
  name: string;
  controller: string;
  resourceId: string;
  protocol: string;
  model: string;
  port: string;
  code: string;
  serial: string;
  baudRate: number;
  timeout: number;
  updatedAt: Date | null;
  productionAt: Date | null;
  activite: boolean;
  signals: Signal[];
  address?: number | null;
  createdAt?: Date;
}

interface Alarm {
  id: number;
  deviceId: string;
  deviceResourceId: string;
  signal: string;
  value: string;
  description: string;
  occuredAt: Date;
  updatedAt: Date;
  signalId: string;
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
  index: number;
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
};

interface InvokeInput {
  /** soapenc:string(undefined) */
  xmlData: string;
}

interface InvokeOutput {
  /** soapenc:string(undefined) */
  invokeReturn: string;
}

interface IServiceSoap {
  invoke: (
    input: InvokeInput,
    cb: (
      err: any | null,
      result: InvokeOutput,
      raw: string,
      soapHeader: { [k: string]: any }
    ) => any,
    options?: any,
    extraHeaders?: any
  ) => void;
}

interface SoapRequest {
  Request: {
    PK_Type: { Name: string; Code: string };
    Info: { SUId: string; SURId: string } & { [key: string]: any };
  };
}

type SoapParameter = [command: string, code: number | string, data: any];

type SoapDevice = {
  attributes: {
    Id: string;
  };
  Signal?: {
    attributes: {
      Id: string;
      Value?: string;
      SetValue?: string;
      SHLimit?: string;
      HLimit?: string;
      LLimit?: string;
      SLLimit?: string;
      Threshold?: string;
      RelativeVal?: string;
      IntervalTime?: string;
      BDelay?: string;
      EDelay?: string;
    };
  }[];
};

type SIGNAL_STATE = "00" | "01" | "02" | "03" | "04" | "05";

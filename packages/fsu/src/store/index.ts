/**
 * 系统缓存信息
 */
import _ from "lodash";
import { SerialPort } from "serialport";
import create from "zustand/vanilla";
import produce from "immer";

export interface DeviceStore {
  [key: string]: {
    values: { name: string; value: number | string }[];
    error?: string;
    timestamp: number;
    busy: boolean;
  };
}
/**
 * 各设备实时数据
 */
export const useDeviceStore = create<DeviceStore>(() => {
  return {};
});

/**
 * 系统串口信息
 */
export interface SerialPortStore {
  ports: {
    [key: string]: {
      port: SerialPort;
      buffer: Buffer;
      busy: boolean;
    };
  };
  update: (
    identity: string,
    updated: { port?: SerialPort; busy?: boolean; buffer?: Buffer }
  ) => void;
}

export const useSerialPortStore = create<SerialPortStore>((set) => ({
  ports: {},
  update: (identity, updated) =>
    set(
      produce((state: SerialPortStore) => {
        state.ports[identity] = { ...state.ports[identity], ...updated };
      })
    ),
}));

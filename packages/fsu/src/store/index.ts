/**
 * 系统缓存信息
 */
import _ from "lodash";
import { SerialPort } from "serialport";
import create from "zustand/vanilla";
import produce from "immer";

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

export const useUnitStore = create<Partial<Unit>>((set) => ({}));

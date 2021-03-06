/**
 * 系统缓存信息
 */
import _ from "lodash";
import create from "zustand/vanilla";

export interface BufferStore {
  [key: string]: Buffer;
}

/**
 * 各串口数据缓冲区
 */
export const useBufferStore = create<BufferStore>(() => {
  return {};
});

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

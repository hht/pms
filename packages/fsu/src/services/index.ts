/**
 * 采集程序
 */
import { getDevices } from "./orm";
import schedule from "node-schedule";
import _ from "lodash";
import { IDevice } from "../models/Device";
import { bootstrapDevice } from "../models/factory";
import { SerialPort } from "serialport";
import { Events } from "./rx";
import { EVENT } from "../models/enum";

const GLOBAL_INTERVAL = 10;
export const DEVICES: IDevice[] = [];

export const PORTS: { [key: string]: SerialPort } = {};

/**
 * 重置所有设备
 */
const resetDevices = async () => {
  for (const device of DEVICES) {
    await device.dispose();
  }
  DEVICES.length = 0;
  const devices = await getDevices();
  for (const device of devices) {
    const instance = await bootstrapDevice({
      ...device,
      signals: device.signals.map((signal) => ({
        ...signal,
        enum: signal.enum ? JSON.parse(signal.enum) : undefined,
      })),
    });
    if (instance) {
      DEVICES.push(instance);
    }
  }
};

// 计划任务，根据全局读取间隔时间获取设备实时数据
export const scheduleCron = async () => {
  console.log("--重启服务--");
  //   @ts-ignore 停止之前的定时任务
  await schedule.gracefulShutdown();
  // 重置设备
  await resetDevices();
  // 添加新的定时任务
  schedule.scheduleJob(`*/${GLOBAL_INTERVAL} * * * * *`, async () => {
    for (const device of DEVICES) {
      // 如果设备没有暂停则执行获取设备实时数据操作
      if (device.instance.activite) {
        try {
          await device.getDeviceValues();
          // const;
        } catch (e: any) {
          Events.emit(
            EVENT.ERROR_LOG,
            `${device.instance.name}内部错误,错误信息:${e.message}`
          );
        }
      }
    }
  });
};

/**
 * 获取设备的配置信息
 * @param id 设备ID
 * @param commandIds 命令ID列表
 */
export const getDeviceConfig = async (id: number, commandIds: string[]) => {
  return { values: [], errors: [] };
};

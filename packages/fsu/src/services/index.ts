/**
 * 采集程序
 */
import { DEVICES, getUnit, prisma } from "./orm";
import _ from "lodash";
import { bootstrapDevice } from "../models/factory";
import { SerialPort } from "serialport";
import { Events } from "./rx";
import { EVENT } from "../models/enum";
import { useSerialPortStore, useUnitStore } from "../store";
import { wait } from "../utils";
import { bootstrap, dispose } from "./opetration";
import { SoapClient } from "./soap";

export const SETTINGS = {
  isDebug: false,
  isRunning: true,
  isStopped: true,
  isConfiguring: false,
};

// 重新获取数据
export const refetchDevices = async () => {
  // 读取FSU信息
  const unit = await prisma.unit.findFirst({
    where: {
      id: 1,
    },
  });
  useUnitStore.setState(unit as unknown as Unit);

  // 读取设备信息
  DEVICES.length = 0;
  const devices = await prisma.device.findMany({
    include: {
      signals: true,
    },
  });
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

/**
 * 重置系统
 */
export const resetDevices = async () => {
  try {
    SETTINGS.isConfiguring = true;
    // 清除所有端口信息
    const ports = _.values(useSerialPortStore.getState().ports);
    for (const port of ports) {
      if (port.port?.isOpen) {
        await new Promise(async (resolve) => {
          await port.port.close(resolve);
        });
      }
    }
    useSerialPortStore.setState({ ports: {} });
    await refetchDevices();
    await SoapClient.invoke(await dispose());
    await SoapClient.invoke(await bootstrap());
  } catch (e) {
    console.log("重置系统失败：", e);
  } finally {
    SETTINGS.isConfiguring = false;
  }
};

// 计划任务，根据全局读取间隔时间获取设备实时数据
export const scheduleJob = async () => {
  console.log("---重启服务---");
  SETTINGS.isRunning = true;
  SETTINGS.isStopped = false;

  // 添加新的定时任务
  while (SETTINGS.isRunning) {
    const unit = await getUnit();
    for (const device of DEVICES) {
      // 如果设备没有暂停则执行获取设备实时数据操作
      if (
        SETTINGS.isRunning &&
        !SETTINGS.isDebug &&
        !SETTINGS.isConfiguring &&
        !SETTINGS.isStopped &&
        device.instance.activite
      ) {
        try {
          await device.getDeviceValues();
        } catch (e: any) {
          Events.emit(
            EVENT.ERROR_LOG,
            `读取${device.instance.name}信息发生内部错误,错误信息:${
              e.message || e || "未知错误"
            }`
          );
        }
      }
    }
    for (const i of _.times(unit.interval ?? 1)) {
      if (SETTINGS.isRunning && !SETTINGS.isStopped && !SETTINGS.isDebug) {
        await wait(1000);
      }
    }
  }
  SETTINGS.isStopped = true;
};

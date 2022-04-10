/**
 * 采集程序
 */
import { prisma } from "./orm";
import schedule from "node-schedule";
import _ from "lodash";
import { IDevice } from "../models/Device";
import { bootstrapDevice } from "../models/factory";
import { SerialPort } from "serialport";
import { Events } from "./rx";
import { EVENT } from "../models/enum";
import { useSerialPortStore, useUnitStore } from "../store";
import { SoapClient } from "./soap";
import { watchUpdate } from "./system";

export const DEVICES: IDevice[] = [];

/**
 * 关闭串口
 * @param port 需要关闭的串口
 * @returns
 */
const closePort = (port: SerialPort) =>
  new Promise((resolve, reject) => {
    if (port.isOpen) {
      port.close((error: Error | null) => {
        if (error) {
          reject(error);
        } else {
          resolve(true);
        }
      });
    } else {
      resolve(true);
    }
  });

/**
 * 重置系统
 */
const resetDevices = async () => {
  // 清除所有端口信息
  const ports = _.values(useSerialPortStore.getState().ports);
  for (const port of ports) {
    if (port.port.isOpen) {
      await closePort(port.port);
    }
  }
  useSerialPortStore.setState({ ports: {} });

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

// 计划任务，根据全局读取间隔时间获取设备实时数据
export const scheduleCron = async () => {
  console.log("---重启服务---");
  //   @ts-ignore 停止之前的定时任务
  await schedule.gracefulShutdown();
  // 重置设备
  await resetDevices();
  // 添加新的定时任务
  schedule.scheduleJob(
    `*/${useUnitStore.getState().interval} * * * * *`,
    async () => {
      for (const device of DEVICES) {
        // 如果设备没有暂停则执行获取设备实时数据操作
        if (device.instance.activite) {
          try {
            await device.getDeviceValues();
            // const;
          } catch (e: any) {
            Events.emit(
              EVENT.ERROR_LOG,
              `读取${device.instance.name}信息发生内部错误,错误信息:${
                e.message || e || "无详细信息"
              }`
            );
          }
        }
      }
    }
  );
  watchUpdate();
  await SoapClient.bootstrap();
};

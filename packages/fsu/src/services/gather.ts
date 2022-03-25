/**
 * 采集程序
 */
import { InterByteTimeoutParser, SerialPort } from "serialport";
import { getDevices, getSignals } from "./devices";
import schedule from "node-schedule";
import { GLOBAL_INTERVAL } from "../protocols";
import { useBufferStore } from "../store";
import _ from "lodash";
import fs from "fs";

const PORTS: SerialPort[] = [];

/**
 * 关闭串口
 * @param port 需要关闭的串口
 * @returns
 */
const closePort = (port: SerialPort) =>
  new Promise((resolve) => {
    if (port.isOpen) {
      port.close(resolve);
    } else {
      resolve(true);
    }
  });

/**
 * 重置所有设备
 */
const resetDevices = async () => {
  // 关闭所有串口
  for (const port of PORTS) {
    await closePort(port);
  }
  PORTS.length = 0;
  // 获取所有设备绑定的串口并初始化
  const devices = await getDevices();
  for (const device of devices) {
    const port = new SerialPort(
      {
        path: device.port,
        baudRate: device.baudRate,
        autoOpen: true,
      },
      (error: any) => {}
    );
    PORTS.push(port);
    // 如果数据之间间隔超过100毫秒则读取数据并更新串口对应的缓冲区
    port
      .pipe(new InterByteTimeoutParser({ interval: 100 }))
      .on("data", (data: Buffer) => {
        useBufferStore.setState({
          [device.port]: Buffer.concat([
            useBufferStore.getState()[device.port] ?? Buffer.alloc(0),
            data,
          ]),
        });
      });
  }
};

// 计划任务，根据全局读取间隔时间获取设备实时数据
export const scheduleCron = async () => {
  //   @ts-ignore 停止之前的定时任务
  await schedule.gracefulShutdown();
  // 重置设备
  await resetDevices();
  const devices = await getDevices();
  // 添加新的定时任务
  schedule.scheduleJob(`*/${GLOBAL_INTERVAL} * * * * *`, async () => {
    for (const device of devices) {
      // 如果设备没有暂停则执行获取设备实时数据操作
      if (device.activite) {
        try {
          const signals = await getSignals(device.id);
          const activeSignals = _.chain(signals)
            .filter((it) => !it.ignore)
            .groupBy("command")
            .value() as {
            [key: string]: Signal[];
          };
          // const;
        } catch (e: any) {
          console.log("错误处理", e.message, e.data);
        }
      }
    }
  });
};

/**
 * 返回模拟数据
 * @param device 设备
 * @param command 命令
 * @returns
 */

const getSimulationValue = async (device: Device, command: Command) => {
  const files: { [key: string]: string } = {
    交流屏模拟量: "./emulation/电总交流屏模拟量/PSM-A多屏",
    交流屏状态量: "./emulation/电总交流屏状态量/PSM-A多屏",
    交流屏告警量: "./emulation/电总交流屏告警量/PSM-A多屏",
    整流模块模拟量: "./emulation/电总整流模块模拟量/PSM-A",
    整流模块状态量: "./emulation/电总整流模块状态量/PSM-A",
    整流模块告警量: "./emulation/电总整流模块告警量/PSM-A",
    直流屏模拟量: "./emulation/电总直流屏模拟量/PSM-A",
  };
  const response = Buffer.from(
    fs.readFileSync(files[command.name], {
      encoding: "utf8",
    })
  );
  try {
    const data = command?.parser(command)(response);
    const values =
      _.chain(data)
        .filter((it) => !it.ignore && !!it.code)
        .orderBy("name")
        .groupBy("code")
        .mapValues((values) =>
          values.map((value, index) => ({
            ...value,
            id: `${device.code}-${value.length === 1 ? 3 : 1}-${
              value.code
            }-${_.padStart(`${index}`, 3, "0")}`,
            command: command.name,
          }))
        )
        .values()
        .flatten()
        .orderBy("name")
        .value() ?? [];
    return values;
  } catch (e: any) {
    throw e.message;
  }
};

/**
 * 获取设备的配置信息
 * @param id 设备ID
 * @param commandIds 命令ID列表
 */
export const getDeviceConfig = async (id: number, commandIds: string[]) => {
  return { values: [], errors: [] };
};

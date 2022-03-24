/**
 * 采集程序
 */
import { InterByteTimeoutParser, SerialPort } from "serialport";
import { getDevice, getDevices, getSignals } from "./devices";
import schedule from "node-schedule";
import { GLOBAL_INTERVAL, PROTOCOLS } from "../protocols";
import { useBufferStore, useDeviceStore } from "../store";
import _ from "lodash";
import { attempt, updateDeviceValue } from "../utils";
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
      (error: any) => {
        updateDeviceValue(
          {
            device,
            errors: [{ name: device.name, error: "串口初始化失败" }],
            values: [],
          },
          []
        );
      }
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

/**
 * 获取设备实时数据
 * @param device 设备
 * @param command 命令
 * @returns
 */
const getDeviceValue = (device: Device, command: Command) => {
  const port = PORTS.find((it) => it.path === device.port);
  return new Promise((resolve, reject) => {
    // 根据设备超时时间读取缓冲区
    setTimeout(async () => {
      const response = await _.attempt(
        command?.parser(command),
        useBufferStore.getState()[device.port]
      );
      // 如果数据校验不通过则报错
      if (_.isError(response) || _.isNull(response)) {
        reject(response);
      }
      // 清空数据缓冲区
      useBufferStore.setState({ [device.port]: Buffer.alloc(0) });
      resolve(
        _.chain(response as unknown as Signal[])
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
          .value()
      );
    }, device.timeout * 1000);
    // 发送命令
    port?.write(command.preprocessor(command.command));
  });
};

/**
 * 获取设备所有实时数据
 * @param device 设备
 * @param commands 命令
 * @param activeSignals 当前命令列表
 * @returns
 */
const getDeviceValues = async (device: Device, commands: Command[]) => {
  const values: Signal[] = [];
  const errors: { name: string; error: string }[] = [];
  try {
    // 如果上一次没有完成，取消本次采样
    if (useDeviceStore.getState()[device.id]?.busy) {
      return {
        errors: [{ name: device.name, error: "设备忙碌" }],
      };
    }
    useDeviceStore.setState(
      { [device.id]: { ...useDeviceStore.getState()[device.id], busy: true } },
      false
    );
    const port = PORTS.find((it) => it.path === device.port);
    if (!port) {
      errors.push({ name: device.name, error: `${device.port} 串口未打开` });
      return { errors };
    }
    // 如果串口没有打开则尝试打开串口
    if (!port.isOpen) {
      const opened = await new Promise((resolve, reject) => {
        port.open((error) => {
          if (error) {
            errors.push({
              name: device.name,
              error: `${device.port} 串口打开失败`,
            });
            reject(error);
          }
          resolve(true);
        });
      });
      if (opened !== true) {
        return { errors };
      }
    }

    // 根据设备命令获取设备实时数据

    for (const command of commands) {
      try {
        // 每个命令尝试三次读取，如果三次都读取不到数据则报错
        const values = (await attempt(() =>
          getDeviceValue(device, command)
        )) as Signal[];
        // TODO 更新设备信息
        for (const value of values) {
          values.push(value);
        }
      } catch (error: any) {
        errors.push({ name: command.name, error: error.message });
      }
    }
    return { values, errors };
  } catch (e) {
    errors.push({ name: device.name, error: "设备错误" });
    return { values, errors };
  } finally {
    useDeviceStore.setState(
      { [device.id]: { ...useDeviceStore.getState()[device.id], busy: false } },
      false
    );
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
          const commands = PROTOCOLS.filter((it) =>
            it.model.includes(device.model)
          ).filter((it) => _.keys(activeSignals).includes(it.name));
          const { values, errors } = await getSimulationValues(
            device,
            commands
          );
          updateDeviceValue({ device, values, errors }, signals as Signal[]);
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
 * 根据文件获取设备实时数据
 * @param device 设备
 * @param command 命令
 * @returns
 */
const getSimulationValues = async (device: Device, commands: Command[]) => {
  const values: Signal[] = [];
  const errors: { name: string; error: string }[] = [];
  try {
    // 如果上一次没有完成，取消本次采样
    if (useDeviceStore.getState()[device.id]?.busy) {
      return {
        errors: [{ name: device.name, error: "设备忙碌" }],
      };
    }
    useDeviceStore.setState(
      { [device.id]: { ...useDeviceStore.getState()[device.id], busy: true } },
      false
    );

    // 根据设备命令获取设备实时数据
    for (const command of commands) {
      try {
        // 每个命令尝试三次读取，如果三次都读取不到数据则报错
        const v = await attempt(() => getSimulationValue(device, command));
        // TODO 更新设备信息
        for (const value of v) {
          values.push(value);
        }
      } catch (error: any) {
        errors.push({ name: command.name, error: error.message });
      }
    }
    return { values, errors };
  } catch (e) {
    errors.push({ name: device.name, error: "设备错误" });
    return { values, errors };
  } finally {
    useDeviceStore.setState(
      { [device.id]: { ...useDeviceStore.getState()[device.id], busy: false } },
      false
    );
  }
};

/**
 * 获取设备的配置信息
 * @param id 设备ID
 * @param commandIds 命令ID列表
 */
export const getDeviceConfig = async (id: number, commandIds: string[]) => {
  const commands = PROTOCOLS.filter((it) => commandIds.includes(it.id));
  const device = await getDevice(id);
  if (!device) {
    throw new Error("设备不存在，请刷新页面重新获取数据");
  }
  try {
    return await getSimulationValues(device, commands);
  } catch (e: any) {
    return { values: [], errors: [{ name: "设备错误", error: e.message }] };
  }
};

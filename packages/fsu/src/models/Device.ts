import { SerialPort } from "serialport";
import _ from "lodash";
import { attempt } from "../utils";
import fs from "fs";
import path from "path";
import { prisma } from "../services/devices";

const SIMULATION_DATA_PATH: { [key: string]: string } = {
  交流屏模拟量: "./emulation/电总交流屏模拟量/",
  交流屏状态量: "./emulation/电总交流屏状态量/",
  交流屏告警量: "./emulation/电总交流屏告警量/",
  整流模块模拟量: "./emulation/电总整流模块模拟量/",
  整流模块状态量: "./emulation/电总整流模块状态量/",
  整流模块告警量: "./emulation/电总整流模块告警量/",
  直流屏模拟量: "./emulation/电总直流屏模拟量/",
};
export class IDevice {
  instance: Device;
  port: SerialPort;
  status: string = "工作正常";
  buffer: Buffer = Buffer.alloc(0);
  isBusy: boolean = false;
  configuration: {
    [key: string]: Signal[] | string;
  } = {};
  commands: { [key: string]: string } = {};
  constructor(device: Device) {
    this.instance = device;
    this.port = new SerialPort(
      {
        path: this.instance.port,
        baudRate: this.instance.baudRate,
        autoOpen: true,
      },
      (error: any) => {
        this.status = "串口初始化失败";
      }
    );
    const configuration = fs.readFileSync(
      path.join(process.cwd(), `/models/${this.instance.model}.json`),
      "utf-8"
    );
    if (configuration) {
      this.configuration = JSON.parse(configuration);
    }
    this.initialize();
  }
  initialize() {}

  getParser = (command: string) => {
    switch (command) {
      default:
        return () => [] as Signal[];
    }
  };

  getPayload = () => {
    return Buffer.alloc(0);
  };

  /**
   * 根据命令获取设备实时数据
   * @param command 命令
   * @returns
   */
  getDeviceValue = (command: string) => {
    return new Promise((resolve, reject) => {
      // 根据设备超时时间读取缓冲区
      setTimeout(async () => {
        const response = await _.attempt(this.getParser(command));
        // 如果数据校验不通过则报错
        if (_.isError(response) || _.isNull(response)) {
          reject(response);
        }
        // 清空数据缓冲区
        this.buffer = Buffer.alloc(0);
        resolve(
          _.chain(response as unknown as Signal[])
            .filter((it) => !!it.code)
            .orderBy("name")
            .groupBy("code")
            .mapValues((values) =>
              values.map((value, index) => ({
                ...value,
                id: `${this.instance.code}-${this.instance.serial}-${
                  value.length === 1 ? 3 : 1
                }-${value.code}-${_.padStart(`${index}`, 3, "0")}`,
                command: command,
              }))
            )
            .values()
            .flatten()
            .orderBy("name")
            .value()
        );
      }, this.instance.timeout * 1000);
      // 发送命令
      this.port?.write(Buffer.from(this.commands[command]));
    });
  };
  /**
   * 获取设备所有实时数据
   * @param device 设备
   * @param commands 命令
   * @param activeSignals 当前命令列表
   * @returns
   */
  getDeviceValues = async (commands: string[]) => {
    const values: Signal[] = [];
    const errors: { name: string; error: string }[] = [];
    try {
      // 如果上一次没有完成，取消本次采样
      if (this.isBusy) {
        this.status = "设备忙碌";
        return;
      }
      this.isBusy = true;
      if (!this.port) {
        this.status = "串口未初始化";
        return;
      }
      // 如果串口没有打开则尝试打开串口
      if (!this.port.isOpen) {
        const opened = await new Promise((resolve, reject) => {
          this.port.open((error) => {
            if (error) {
              this.status = "串口打开失败";
              reject(error);
            }
            resolve(true);
          });
        });
      }

      // 根据设备命令获取设备实时数据
      for (const command of commands) {
        try {
          // 每个命令尝试三次读取，如果三次都读取不到数据则报错
          const values = (await attempt(() =>
            this.getDeviceValue(command)
          )) as Signal[];
          // TODO 更新设备信息
          for (const value of values) {
            values.push(value);
          }
          this.updateDeviceValues(command, values);
        } catch (error: any) {
          errors.push({ name: command, error: error.message });
        }
      }
    } catch (e: any) {
      this.status = e.message;
      return { values, errors };
    } finally {
      this.isBusy = false;
    }
  };
  /**
   * 返回模拟数据
   * @param device 设备
   * @param command 命令
   * @returns
   */

  getSimulationValue = (command: string) => {
    this.buffer = Buffer.from(
      fs.readFileSync(
        `${SIMULATION_DATA_PATH[command]}${this.instance.model}`,
        {
          encoding: "utf8",
        }
      )
    );
    try {
      const data = this.getParser(command)();
      const values =
        _.chain(data)
          .filter((it) => !!it.code)
          .orderBy("name")
          .groupBy("code")
          .mapValues((values) =>
            values.map((value, index) => ({
              ...value,
              id: `${this.instance.code}-${this.instance.serial}-${
                value.length === 1 ? 3 : 1
              }-${value.code}-${_.padStart(`${index}`, 3, "0")}`,
              command: command,
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
   * 获取模拟数据
   * @param commands 命令
   * @returns
   */
  getSimulationValues = async (commands: string[]) => {
    const values: Signal[] = [];
    const errors: { name: string; error: string }[] = [];
    try {
      // 根据设备命令获取设备实时数据
      for (const command of commands) {
        try {
          const v = this.getSimulationValue(command);
          // TODO 更新设备信息
          for (const value of v) {
            values.push(value);
          }
          this.updateDeviceValues(command, v);
        } catch (error: any) {
          console.log(error);
          errors.push({ name: command, error: error.message });
        }
      }
      return { values, errors };
    } catch (e) {
      errors.push({ name: this.instance.name, error: "设备错误" });
      return { values, errors };
    }
  };
  /**
   * 更新设备信息
   */
  updateDeviceValues = async (command: string, values: Signal[]) => {
    const signals = await prisma.signal.findMany({
      where: {
        deviceId: this.instance.id,
        command,
      },
    });
    const updated = _.keyBy(values, "offset");
    for (const signal of signals) {
      const value = updated[signal.offset];
      if (!value) {
        console.log(signal);
      }
      await prisma.signal.update({
        data: {
          value: `${value.value}`,
          raw: value.raw,
        },
        where: {
          id: signal.id,
        },
      });
    }
  };
}

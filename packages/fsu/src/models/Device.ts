import { InterByteTimeoutParser, SerialPort } from "serialport";
import _, { reject } from "lodash";
import { attempt } from "../utils";
import fs from "fs";
import path from "path";
import { getDevice, prisma } from "../services/orm";
import { Events } from "./Events";
import { EVENT } from "./enum";
import { SocketServer } from "../services/socket";
const SIMULATION_DATA_PATH: { [key: string]: string } = {
  交流屏模拟量: "./emulation/电总交流屏模拟量/",
  交流屏状态量: "./emulation/电总交流屏状态量/",
  交流屏告警量: "./emulation/电总交流屏告警量/",
  整流模块模拟量: "./emulation/电总整流模块模拟量/",
  整流模块状态量: "./emulation/电总整流模块状态量/",
  整流模块告警量: "./emulation/电总整流模块告警量/",
  直流屏模拟量: "./emulation/电总直流屏模拟量/",
};

/**
 * 关闭串口
 * @param port 需要关闭的串口
 * @returns
 */
const closePort = (port: SerialPort) =>
  new Promise((resolve) => {
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

export class IDevice {
  instance: Device;
  port: SerialPort;
  status: string = "工作正常";
  buffer: Buffer = Buffer.alloc(0);
  isBusy: boolean = false;
  configuration: {
    [key: string]: Signal[] | { [key: string]: string };
  } = {};
  constructor(device: Device) {
    this.instance = device;
    // 初始化串口
    this.port = new SerialPort(
      {
        path: this.instance.port,
        baudRate: this.instance.baudRate,
        autoOpen: true,
      },
      (error: Error | null) => {
        if (error) {
          this.status = "串口初始化失败";
        } else {
          this.port
            .pipe(new InterByteTimeoutParser({ interval: 100 }))
            .on("data", (data: Buffer) => {
              this.buffer = Buffer.concat([
                this.buffer ?? Buffer.alloc(0),
                data,
              ]);
            });
        }
      }
    );
    // 读取配置
    try {
      const configuration = fs.readFileSync(
        path.join(process.cwd(), `/models/${this.instance.model}.json`),
        "utf-8"
      );
      this.configuration = JSON.parse(configuration);
    } catch (e) {
      this.setStatus("配置文件不存在");
      return;
    }
    this.initialize();
  }
  // 初始化
  protected initialize = async () => {};

  // 获取当前命令解析函数
  protected getParser = (command: string) => {
    switch (command) {
      default:
        return () => [] as Signal[];
    }
  };

  // 获取从串口中读取的数据
  protected getPayload = () => {
    return Buffer.alloc(0);
  };

  /**
   * 组装命令
   * @param command
   * @returns
   */
  protected assembleCommand = (command: Buffer) => {
    return command;
  };
  /**
   * 根据命令获取设备实时数据
   * @param command 命令
   * @returns
   */
  protected getDeviceValue = (command: string) => {
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
            .groupBy("code")
            .mapValues((values) =>
              _.orderBy(values, ["name"]).map((value, index) => ({
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
      }, this.instance.timeout);
      // 发送命令
      this.port?.write(
        this.assembleCommand(
          Buffer.from(
            (this.configuration["命令列表"] as { [key: string]: string })[
              command
            ]
          )
        )
      );
    });
  };
  /**
   * 获取当前数据库信息
   */
  public getCurrentState = async () => {
    const device = await getDevice(this.instance.id);
    this.instance = {
      ...device,
      signals: device!.signals.map((signal) => ({
        ...signal,
        enum: signal.enum ? JSON.parse(signal.enum) : undefined,
      })),
    } as Device;
    this.status = "工作正常";
  };
  /**
   * 获取设备所有实时数据
   * @param device 设备
   * @param commands 命令
   * @param activeSignals 当前命令列表
   * @returns
   */
  public getDeviceValues = async (input?: string[]) => {
    await this.getCurrentState();
    const values: Signal[] = [];
    const errors: string[] = [];
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
      await new Promise((resolve, reject) => {
        this.port.open((error) => {
          if (error) {
            this.status = "串口打开失败";
            reject(error);
          }
          resolve(true);
        });
      });
    }
    const current = _.chain(this.instance.signals)
      .map((it) => it.command)
      .uniq()
      .value();
    const commands =
      input ??
      (current.length
        ? current
        : (_.keys(this.configuration["命令列表"]) as string[]));
    // 根据设备命令获取设备实时数据
    for (const command of commands) {
      try {
        // 每个命令尝试三次读取，如果三次都读取不到数据则报错
        const v = (await attempt(() =>
          this.getDeviceValue(command)
        )) as Signal[];
        // TODO 更新设备信息
        for (const value of v) {
          values.push(value);
        }
      } catch (error: any) {
        errors.push(`设备命令[${command}]读取失败,错误信息:${error.message}`);
        this.setStatus(
          `设备命令[${command}]读取失败,错误信息:${error.message}`
        );
      }
    }
    this.isBusy = false;
    SocketServer.instance?.emit(EVENT.VALUE_RECEIVED, {
      device: this.instance.name,
      deviceId: this.instance.id,
      status: this.status,
      values,
      errors,
    });
    this.updateDeviceValues(values);

    return { values, errors };
  };
  /**
   * 返回模拟数据
   * @param device 设备
   * @param command 命令
   * @returns
   */

  protected getSimulationValue = (command: string) => {
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
          .groupBy("code")
          .mapValues((values) =>
            _.orderBy(values, ["name"]).map((value, index) => ({
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
  public getSimulationValues = async (input?: string[]) => {
    await this.getCurrentState();
    const values: Signal[] = [];
    const errors: string[] = [];
    const current = _.chain(this.instance.signals)
      .map((it) => it.command)
      .uniq()
      .value();
    const commands =
      input ??
      (current.length
        ? current
        : (_.keys(this.configuration["命令列表"]) as string[]));
    // 根据设备命令获取设备实时数据
    for (const command of commands) {
      try {
        const v = this.getSimulationValue(command);
        // TODO 更新设备信息
        for (const value of v) {
          values.push(value);
        }
      } catch (error: any) {
        errors.push(`设备命令[${command}]读取失败,错误信息:${error.message}`);
        this.setStatus(
          `设备命令[${command}]读取失败,错误信息:${error.message}`
        );
      }
    }
    SocketServer.instance?.emit(EVENT.VALUE_RECEIVED, {
      device: this.instance.name,
      deviceId: this.instance.id,
      status: this.status,
      values,
      errors,
    });
    this.updateDeviceValues(values);
    return {
      values: values.map((it) => ({
        ...it,
        threshold: 0,
        thresholdPercent: 0,
        startDelay: 0,
        endDelay: 0,
      })),
      errors,
    };
  };
  /**
   * 更新设备信息
   */
  protected updateDeviceValues = async (values: Signal[]) => {
    const signals = this.instance.signals;
    const updated = _.keyBy(values, "id");
    for (const signal of signals) {
      this.updateDeviceValue(signal, updated[signal.id]);
    }
  };
  protected updateDeviceValue = async (prev: Signal, current: Signal) => {
    // 如果当前无数据，则不更新
    if (!current) {
      return;
    }
    // 如果此采样点需要上报,则发送消息
    if (!prev.ignore && prev.enabled && !prev.code.startsWith("X")) {
      Events.emit(EVENT.VALUE_RECEIVED, {
        deviceId: this.instance.id,
        prev: prev.raw,
        current: current.raw,
        ...prev,
        value: current.value,
      });
    }
  };

  protected setStatus = (message: string) => {
    this.status = message;
  };
  public dispose = async () => {
    await closePort(this.port);
  };
}

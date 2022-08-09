import { InterByteTimeoutParser, SerialPort } from "serialport";
import _ from "lodash";
import { attempt, wait } from "../utils";
import fs from "fs";
import path from "path";
import { getDevice, prisma } from "../services/orm";
import { Events } from "../services/rx";
import { EVENT } from "./enum";
import { SocketServer } from "../services/socket";
import dayjs from "dayjs";
import { useSerialPortStore } from "../store";

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
  status: string = "工作正常";
  buffer: Buffer = Buffer.alloc(0);
  configuration: {
    [key: string]: Signal[] | { [key: string]: string } | string[];
  } = {};
  constructor(device: Device) {
    this.instance = device;
    // 初始化串口
    if (!useSerialPortStore.getState().ports[this.instance.port]) {
      const port = new SerialPort(
        {
          path: this.instance.port,
          baudRate: this.instance.baudRate,
          autoOpen: true,
        },
        (error: Error | null) => {
          if (error) {
            Events.emit(
              EVENT.ERROR_LOG,
              `串口${this.instance.port}初始化失败,错误信息:${
                error.message || error
              }`
            );
            this.status = "串口初始化失败";
          } else {
            port
              .pipe(new InterByteTimeoutParser({ interval: 100 }))
              .on("data", (data: Buffer) => {
                // console.log("串口返回", JSON.stringify(data));
                useSerialPortStore.getState().update(this.instance.port, {
                  buffer: Buffer.concat([
                    useSerialPortStore.getState().ports[this.instance.port]
                      .buffer ?? Buffer.alloc(0),
                    data,
                  ]),
                });
              });
          }
        }
      );
      useSerialPortStore.getState().update(this.instance.port, {
        port,
        busy: false,
      });
    }
    // 读取配置
    try {
      const configuration = fs.readFileSync(
        path.join(process.cwd(), `/models/${this.instance.model}.json`),
        "utf-8"
      );
      this.configuration = JSON.parse(configuration);
    } catch (e) {
      Events.emit(EVENT.ERROR_LOG, `${this.instance.name}配置文件不存在`);
      this.setStatus("配置文件不存在");
      return;
    }
    this.initialize();
    this.setStatus("工作正常");
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
   * 等待串口可用
   * @param command
   * @returns
   */
  protected awaitPort = async (start: number): Promise<boolean> => {
    while (
      dayjs().unix() - start < 60 &&
      useSerialPortStore.getState().ports[this.instance.port]?.busy
    ) {
      await wait(1000);
    }
    if (dayjs().unix() - start >= 60) {
      return false;
    }
    return true;
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
        this.buffer =
          useSerialPortStore.getState().ports[this.instance.port].buffer;
        const response = await _.attempt(this.getParser(command));
        useSerialPortStore
          .getState()
          .update(this.instance.port, { buffer: Buffer.alloc(0) });
        // 如果数据校验不通过则报错
        if (_.isError(response) || _.isNull(response)) {
          reject(response);
        } else {
          resolve(
            (response as unknown as Signal[]).map((it) => ({ ...it, command }))
          );
        }
      }, this.instance.timeout);
      // 发送命令
      // console.log(
      //   "发送命令",
      //   this.instance.name,
      //   command,
      //   JSON.stringify(
      //     this.assembleCommand(
      //       Buffer.from(
      //         (
      //           this.configuration["命令列表"] as {
      //             [key: string]: string | number[];
      //           }
      //         )[command]
      //       )
      //     )
      //   )
      // );
      useSerialPortStore.getState().ports[this.instance.port]?.port.write(
        this.assembleCommand(
          Buffer.from(
            (
              this.configuration["命令列表"] as {
                [key: string]: string | number[];
              }
            )[command]
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
    const signals = _.keyBy(this.instance.signals, "id");
    const values: Signal[] = [];
    const errors: string[] = [];
    // 如果串口没有完成，等候串口可用
    const isFree = await this.awaitPort(dayjs().unix());
    if (!isFree) {
      this.setStatus("串口状态忙碌");
      return;
    }
    useSerialPortStore.getState().update(this.instance.port, {
      busy: true,
    });
    // 如果串口没有打开则尝试打开串口
    if (!useSerialPortStore.getState().ports[this.instance.port]?.port.isOpen) {
      await new Promise((resolve, reject) => {
        useSerialPortStore
          .getState()
          .ports[this.instance.port]?.port.open((error) => {
            if (error) {
              this.setStatus("串口打开失败");
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
        useSerialPortStore.getState().update(this.instance.port, {
          buffer: Buffer.alloc(0),
        });
        // 每个命令尝试三次读取，如果三次都读取不到数据则报错
        const v = (await attempt(() =>
          this.getDeviceValue(command)
        )) as Signal[];
        if (_.isError(v)) {
          throw v;
        }
        for (const value of v) {
          values.push(value);
        }
      } catch (error: any) {
        const message = `采样失败(${command}) : ${
          error.message || error || "未知错误"
        }`;
        useSerialPortStore.getState().update(this.instance.port, {
          buffer: Buffer.alloc(0),
        });

        this.updateDeviceValues(
          this.instance.signals
            .filter((it) => it.command === command)
            .map((it) => ({
              ...it,
              raw: 0xffff,
              value: message,
            }))
        );
        errors.push(message);
        this.setStatus(message);
      }
    }
    useSerialPortStore.getState().update(this.instance.port, {
      busy: false,
    });
    if (errors.length === 0) {
      this.setStatus("工作正常");
    }
    const recieved = _.chain(values)
      .groupBy((it) => `${it.code}-${it.length}`)
      .mapValues((values) =>
        _.orderBy(values, ["command", "offset"]).map((value, index) => {
          const id = `${this.instance.code}-${this.instance.serial}-${
            value.length === 1 ? 3 : 1
          }-${value.code}-${_.padStart(`${index + 1}`, 3, "0")}`;
          const merged = { ...value, ...signals[id] };
          return {
            ...merged,
            index: value.index || index + 1,
            id,
            value:
              value.length === 1
                ? merged.enum[value.raw!]
                : `${value.raw?.toFixed(2)}${value.unit}`,
          };
        })
      )
      .values()
      .flatten()
      .value();

    SocketServer.instance?.emit(EVENT.VALUE_RECEIVED, {
      device: this.instance.name,
      deviceId: this.instance.id,
      status: this.status,
      values: recieved,
      errors,
    });
    this.updateDeviceValues(recieved);

    return { values: recieved, errors };
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
          .groupBy((it) => `${it.code}-${it.length}`)
          .mapValues((values) =>
            _.orderBy(values, ["name", "offset"]).map((value, index) => ({
              ...value,
              index,
              id: `${this.instance.code}-${this.instance.serial}-${
                value.length === 1 ? 3 : 1
              }-${value.code}-${_.padStart(`${index + 1}`, 3, "0")}`,
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
    if (
      this.instance.activite &&
      !prev.ignore &&
      prev.enabled &&
      !["X", "Y", "Z"].includes(prev.code.substring(0, 1))
    ) {
      Events.emit(EVENT.VALUE_RECEIVED, {
        deviceId: this.instance.id,
        prev: prev.raw,
        ...prev,
        raw: current.raw,
        value: current.value,
      });
    }
  };

  protected setStatus = async (message: string) => {
    this.status = message;
    await prisma.device.update({
      data: {
        status: message,
      },
      where: {
        id: this.instance.id,
      },
    });
  };
  public dispose = async () => {};
}

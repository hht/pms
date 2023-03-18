import { InterByteTimeoutParser, SerialPort } from "serialport";
import _ from "lodash";
import { wait } from "../utils";
import fs from "fs";
import path from "path";
import { getDevice, prisma } from "../services/orm";
import { Events } from "../services/rx";
import { EVENT } from "./enum";
import { SocketServer } from "../services/socket";
import dayjs from "dayjs";
import { useSerialPortStore } from "../store";
import { SETTINGS } from "../services";

export class IDevice {
  instance: Device;
  status: string = "工作正常";
  buffer: Buffer = Buffer.alloc(0);
  configuration: {
    [key: string]: Signal[] | { [key: string]: string } | string[];
  } = {};
  constructor(device: Device) {
    this.instance = device;

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

  protected getPort = async (): Promise<SerialPort> => {
    return new Promise((resolve, reject) => {
      // 初始化串口
      if (!useSerialPortStore.getState().ports[this.instance.port].port) {
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
              reject(error);
            } else {
              useSerialPortStore.getState().update(this.instance.port, {
                port,
                busy: false,
                buffer: Buffer.alloc(0),
              });
              resolve(port);
            }
          }
        );
        port.on("close", () => {
          console.log(port.path, "串口关闭");
          useSerialPortStore.getState().update(this.instance.port, {
            port: undefined,
            busy: false,
            buffer: Buffer.alloc(0),
          });
        });
        port
          .pipe(new InterByteTimeoutParser({ interval: 100 }))
          .on("data", (data: Buffer) => {
            console.log(data);
            useSerialPortStore.getState().update(this.instance.port, {
              buffer: Buffer.concat([
                useSerialPortStore.getState().ports[this.instance.port]
                  .buffer ?? Buffer.alloc(0),
                data,
              ]),
            });
          });
        resolve(port);
      } else {
        resolve(useSerialPortStore.getState().ports[this.instance.port].port);
      }
    });
  };
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
      useSerialPortStore.getState().ports[this.instance.port].busy
    ) {
      await wait(100);
    }
    return dayjs().unix() - start < 60;
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
   * 发送命令
   */
  public executeCommand = async (buffer: Buffer): Promise<Buffer> => {
    if (!useSerialPortStore.getState().ports[this.instance.port]) {
      return Buffer.from("");
    }
    try {
      const port = await this.getPort();
      await this.awaitPort(dayjs().unix());
      return new Promise((resolve, reject) => {
        setTimeout(async () => {
          if (!useSerialPortStore.getState().ports[this.instance.port]) {
            reject();
          }
          this.buffer =
            useSerialPortStore.getState().ports[this.instance.port].buffer;
          resolve(
            useSerialPortStore.getState().ports[this.instance.port].buffer
          );
        }, this.instance.timeout);
        useSerialPortStore
          .getState()
          .update(this.instance.port, { buffer: Buffer.alloc(0), busy: true });
        console.log("发送", buffer);
        port.write(buffer);
      });
    } catch (e) {
      return Buffer.alloc(0);
    } finally {
      useSerialPortStore.getState().update(this.instance.port, {
        busy: false,
      });
    }
  };

  /**
   * 根据命令获取设备实时数据
   * @param command 命令
   * @returns
   */
  protected getDeviceValue = async (command: string) => {
    const assembleCommand = this.assembleCommand(
      Buffer.from(
        (
          this.configuration["命令列表"] as {
            [key: string]: string | number[];
          }
        )[command]
      )
    );
    await this.executeCommand(assembleCommand);
    const values = this.getParser(command)();
    return values.map((it) => ({ ...it, command }));
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
        const v = await this.getDeviceValue(command);
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
        errors.push(message);
        this.setStatus(message);
      }
    }

    if (errors.length === 0) {
      this.setStatus("工作正常");
    }
    const recieved = _.chain(values)
      .groupBy((it) => `${it.code}`)
      .mapValues((values) =>
        _.orderBy(values, ["code"]).map((value, index) => {
          const id = `${value.code}${_.padStart(`${index + 1}`, 3, "0")}`;
          const merged = { ...value, ...signals[id] };
          return {
            ...merged,
            index: merged.index || index + 1,
            raw: value.raw,
            id,
            value: [2, 3, 4].includes(value.type)
              ? merged?.enum?.[value.raw!] ??
                `${value.raw?.toFixed(2)}${value.unit}`
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

  public setParameter = async (id: string, value: number) => {};
  /**
   * 返回模拟数据
   * @param device 设备
   * @param command 命令
   * @returns
   */

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

import { DeviceError } from "../utils/errors";
import _ from "lodash";
import { IDevice } from "./Device";
import {
  ALTERNATING_CURRENT,
  ALTERNATING_FREQUENCY,
  ALTERNATING_VOLTAGE,
  DIRECT_CURRENT,
  DIRECT_VOLTAGE,
} from "./enum";
import { SIGNAL_CODE } from "./enum";

/**
 * 电总规定的返回码
 */
const RTN: { [key: number]: string } = {
  0x1: "协议版本错",
  0x2: "CHKSUM错",
  0x3: "LCHKSUM错",
  0x4: "CID2无效",
  0x5: "命令格式错",
  0x6: "无效数据",
};

/**
 * 通用故障
 */
const COMMON_STATE: { [key: number]: string } = {
  0x00: "正常",
  0x01: "故障",
};

/**
 * 交流屏状态列表
 */
const ALTERNATING_ALARM_STATE: { [key: number]: string } = {
  0x00: "正常",
  0x01: "低于下限",
  0x02: "高于上限",
  0x03: "缺相",
  0x04: "熔丝断",
  0x05: "开关断开",
};

/**
 * 直流屏状态列表
 */

const DIRECT_ALARM_STATE: { [key: number]: string } = {
  0x00: "正常",
  0x01: "低于下限",
  0x02: "高于上限",
  0x03: "熔丝断",
  0x04: "开关打开",
  0x05: "传感器未接",
  0x06: "传感器故障",
  0xe1: "过温",
  0xe2: "通讯中断",
};

/**
 * 开关状态
 */
const POWER_STATE: { [key: number]: string } = {
  0x00: "开机",
  0x01: "关机",
};

/**
 * 限流状态
 */
const THROTTLING_STATE: { [key: number]: string } = {
  0x00: "限流",
  0x01: "不限流",
};

/**
 * 充电状态
 */
const CHARGING_STATE: { [key: number]: string } = {
  0x00: "浮充",
  0x01: "均充",
  0x02: "测试",
  0x03: "交流停电",
};

class YDT extends IDevice {
  /**
   * 分解电总协议长度数据
   * @param input 数据
   * @param offset 长度数据位移
   * @returns 返回计算的校验和，原高四位，长度值
   */
  private getLengthChecksum = (input: Buffer, offset: number) => {
    const values = _.chain(input.toString().substring(offset, offset + 4))
      .split("")
      .value();
    const sum = _.drop(values.map((it) => parseInt(it, 16))).reduce(
      (acc, cur) => acc + cur,
      0
    );
    const checksum = (~(sum % 16) + 1) & 0xf;
    return [
      checksum,
      parseInt(values[0], 16),
      parseInt(_.drop(values).join(""), 16),
    ];
  };

  /**
   * 生成符合YDT1363标准的命令
   * @param input 原始数据
   * @returns 组装后的数据
   */
  protected assembleCommand = (input: Buffer) => {
    // 设置局码
    input.writeInt16BE(this.instance.address ?? 1, 2);
    const [checksum] = this.getLengthChecksum(input, 8);
    input.write(`${checksum.toString(16).toUpperCase()}`, 8);
    const sum = [...input.valueOf()].reduce((prev, curr) => prev + curr, 0);
    return Buffer.concat([
      Buffer.from([0x7e]),
      input,
      Buffer.from(
        ((~sum + 1) & 0xffff)
          .toString(16)
          .toUpperCase()
          .split("")
          .map((it) => it.charCodeAt(0))
      ),
      Buffer.from("\r"),
    ]);
  };

  /**
   * 电总协议数据校验
   * @param divider 是否有DATAFLAG
   * @returns 返回去除首位标识和校验位的数据
   */
  protected getPayload = (divider = true) => {
    // 匹配符合首尾标识的数据
    const response = /.*\~([^\~\r]*)\r.*/.exec(this.buffer.toString())?.[1];
    if (!response) {
      throw new DeviceError({
        message: "电总协议数据格式错误",
        data: this.buffer,
      });
    }
    // 数据校验和
    const checksum = parseInt(
      `0x${response.substring(response.length - 4)}`,
      16
    );
    const data = Buffer.from(response).subarray(0, -4).valueOf();
    const sum = _.chain(data)
      .reduce((acc, cur) => acc + cur, 0)
      .value();
    if (checksum !== ((~sum + 1) & 0xffff)) {
      throw new DeviceError({
        message: "电总协议数据校验错误",
        data: this.buffer,
      });
    }
    // RTN
    if (parseInt(response.substring(6, 8), 16) !== 0) {
      throw new DeviceError({
        message:
          {
            ...RTN,
            ...(this.configuration["RTN"] as { [key: number]: string }),
          }[parseInt(response.substring(6, 8), 16)] ??
          `厂家自定义错误${response.substring(6, 8)}`,
        data: this.buffer,
      });
    }
    // 长度校验和
    const [lcheck, v0, length] = this.getLengthChecksum(this.buffer, 9);
    if (lcheck !== v0) {
      throw new DeviceError({
        message: "电总协议长度位校验错误",
        data: this.buffer,
      });
    }
    // 返回有效负荷
    return Buffer.from(
      _.chain(data.subarray(-length).subarray(divider ? 2 : 0))
        .split("")
        .chunk(2)
        .map(([h, l]) => parseInt(`${h}${l}`, 16))
        .value()
    );
  };
  protected initialize = async () => {};

  protected getParser = (command: string) => {
    switch (command) {
      case "交流屏模拟量":
        return this.parseAlternatingValues;
      case "交流屏状态量":
        return this.parseAlternatingStatus;
      case "交流屏告警量":
        return this.parseAlternatingAlarms;
      case "整流模块模拟量":
        return this.parseRectifierValues;
      case "整流模块状态量":
        return this.parseRectifierStatus;
      case "整流模块告警量":
        return this.parseRectifierAlarms;
      case "直流屏模拟量":
        return this.parseDirectValues;
      case "直流屏告警量":
        return this.parseDirectAlarms;
      default:
        return () => [] as Signal[];
    }
  };
  /**
   * 电总交流屏模拟量
   */
  private parseAlternatingValues = () => {
    const data = this.getPayload();
    let offset = 0;
    const response = [];
    const screenCount = data.readInt8(offset);
    offset += 1;
    for (let i = 0; i < screenCount; i++) {
      const forkCount = data.readInt8(offset);
      offset += 1;
      for (let j = 0; j < forkCount; j++) {
        for (const signal of [
          {
            ...ALTERNATING_VOLTAGE,
            name: "输入电压A",
          },
          {
            ...ALTERNATING_VOLTAGE,
            name: "输入电压B",
          },
          {
            ...ALTERNATING_VOLTAGE,
            name: "输入电压C",
          },
          {
            ...ALTERNATING_FREQUENCY,
            name: "输入频率",
          },
        ]) {
          response.push({
            ...signal,
            name: `交流屏#${i + 1}第${j + 1}路${signal.name}`,
            raw: data.readFloatLE(offset),
            code: SIGNAL_CODE[signal.name],
            offset,
          });
          offset += signal.length;
        }
        const customCount = data.readUInt8(offset);
        offset += 1;
        for (let k = 0; k < customCount; k++) {
          for (const signal of this.configuration[
            "自定义交流屏模拟量"
          ] as Signal[]) {
            response.push({
              ...signal,
              name: `交流屏#${i + 1}第${j + 1}路${signal.name}`,
              raw: data.readFloatLE(offset),
              code: SIGNAL_CODE[signal.name],
              offset,
            });
            offset += signal.length;
          }
        }
      }
      for (const signal of [
        {
          ...ALTERNATING_CURRENT,
          name: "输出电流A",
        },
        {
          ...ALTERNATING_CURRENT,
          name: "输出电流B",
        },
        {
          ...ALTERNATING_CURRENT,
          name: "输出电流C",
        },
      ] as Signal[]) {
        response.push({
          ...signal,
          name: `交流屏#${i + 1}${signal.name}`,
          raw: data.readFloatLE(offset),
          code: SIGNAL_CODE[signal.name],
          offset,
        });
        offset += signal.length;
      }
    }
    return response as Signal[];
  };
  /**
   * 电总交流屏状态量
   */
  private parseAlternatingStatus = () => {
    const data = this.getPayload();
    console.log(JSON.stringify(data));
    let offset = 0;
    const response = [];
    const screenCount = data.readInt8(offset);
    offset += 1;
    for (let i = 0; i < screenCount; i++) {
      const forkCount = data.readInt8(offset);
      offset += 1;
      for (let j = 0; j < forkCount; j++) {
        for (const signal of [
          {
            name: "空开状态",
            length: 1,
            normalValue: 0x00,
            enum: {
              0x00: "闭合",
              0x01: "断开",
            } as { [key: number]: string },
          },
        ]) {
          const value = data.readUInt8(offset);
          response.push({
            ...signal,
            name: `交流屏#${i + 1}第${j + 1}路${signal.name}`,
            raw: value,
            code: SIGNAL_CODE[signal.name],
            offset,
          });
          offset += signal.length;
        }
      }
      const customCount = data.readUInt8(offset);
      offset += 1;
      for (const [index, signal] of (
        this.configuration["自定义交流屏状态量"] as Signal[]
      ).entries()) {
        if (index > customCount - 1) {
          break;
        }
        const value = data.readUInt8(offset);
        response.push({
          ...signal,
          name: `交流屏#${i + 1}${signal.name}`,
          raw: value,
          code: SIGNAL_CODE[signal.name],
          offset,
        });
        offset += signal.length;
      }
    }
    return response as Signal[];
  };
  /**
   * 电总交流屏告警量
   */
  private parseAlternatingAlarms = () => {
    const data = this.getPayload();
    let offset = 0;
    const response = [];
    const screenCount = data.readInt8(offset);
    offset += 1;
    for (let i = 0; i < screenCount; i++) {
      const forkCount = data.readInt8(offset);
      offset += 1;
      for (let j = 0; j < forkCount; j++) {
        for (const signal of [
          {
            name: "输入电压A",
            length: 1,
            enum: {
              ...ALTERNATING_ALARM_STATE,
              ...(this.configuration["交流屏告警状态"] as {
                [key: number]: string;
              }),
            },
            normalValue: 0x00,
          },
          {
            name: "输入电压B",
            length: 1,
            enum: {
              ...ALTERNATING_ALARM_STATE,
              ...(this.configuration["交流屏告警状态"] as {
                [key: number]: string;
              }),
            },
            normalValue: 0x00,
          },
          {
            name: "输入电压C",
            length: 1,
            enum: {
              ...ALTERNATING_ALARM_STATE,
              ...(this.configuration["交流屏告警状态"] as {
                [key: number]: string;
              }),
            },
            normalValue: 0x00,
          },
          {
            name: "输入频率",
            length: 1,
            enum: {
              ...ALTERNATING_ALARM_STATE,
              ...(this.configuration["交流屏告警状态"] as {
                [key: number]: string;
              }),
            },
            normalValue: 0x00,
          },
        ]) {
          const value = data.readUInt8(offset);
          response.push({
            ...signal,
            name: `交流屏#${i + 1}第${j + 1}路${signal.name}`,
            raw: value,
            code: SIGNAL_CODE[signal.name],
            offset,
          });
          offset += signal.length;
        }
        const switchCount = data.readUInt8(offset);
        offset += 1;
        for (let k = 0; k < switchCount; k++) {
          for (const signal of [
            {
              name: "融丝/开关",
              length: 1,
              enum: {
                ...ALTERNATING_ALARM_STATE,
                ...(this.configuration["交流屏告警状态"] as {
                  [key: number]: string;
                }),
              },
              normalValue: 0x00,
            },
          ]) {
            const value = data.readUInt8(offset);
            response.push({
              ...signal,
              name: `交流屏#${i + 1}第${j + 1}路${signal.name}`,
              raw: value,
              code: SIGNAL_CODE[signal.name],
              offset,
            });
            offset += signal.length;
          }
        }
        const customCount = data.readUInt8(offset);
        offset += 1;
        for (const [index, signal] of (
          this.configuration["自定义交流屏告警量"] as Signal[]
        ).entries()) {
          if (index > customCount - 1) {
            break;
          }
          const value = data.readUInt8(offset);
          response.push({
            ...signal,
            name: `交流屏#${i + 1}${signal.name}`,
            raw: value,
            code: SIGNAL_CODE[signal.name],
            offset,
          });
          offset += signal.length;
        }
      }
      for (const signal of [
        {
          name: "输出电流A",
          length: 1,
          enum: {
            ...ALTERNATING_ALARM_STATE,
            ...(this.configuration["交流屏告警状态"] as {
              [key: number]: string;
            }),
          },
          normalValue: 0x00,
        },
        {
          name: "输出电流B",
          length: 1,
          enum: {
            ...ALTERNATING_ALARM_STATE,
            ...(this.configuration["交流屏告警状态"] as {
              [key: number]: string;
            }),
          },
          normalValue: 0x00,
        },
        {
          name: "输出电流C",
          length: 1,
          enum: {
            ...ALTERNATING_ALARM_STATE,
            ...(this.configuration["交流屏告警状态"] as {
              [key: number]: string;
            }),
          },
          normalValue: 0x00,
        },
      ]) {
        const value = data.readUInt8(offset);
        response.push({
          ...signal,
          name: `交流屏#${i + 1}${signal.name}`,
          raw: value,
          code: SIGNAL_CODE[signal.name],
          offset,
        });
        offset += signal.length;
      }
    }
    return response as Signal[];
  };
  /**
   * 获取整流模块模拟量
   */
  private parseRectifierValues = () => {
    const data = this.getPayload();
    let offset = 0;
    const response = [];
    for (const signal of [
      {
        ...DIRECT_VOLTAGE,
        name: "输出电压",
      },
    ]) {
      response.push({
        ...signal,
        name: signal.name,
        raw: data.readFloatLE(offset),
        code: SIGNAL_CODE[signal.name],
        offset,
      });
      offset += signal.length;
    }

    const count = data.readInt8(offset);
    offset += 1;
    for (let i = 0; i < count; i++) {
      for (const signal of [
        {
          ...DIRECT_CURRENT,
          name: "输出电流",
        },
      ]) {
        response.push({
          ...signal,
          name: `整流模块#${i + 1}${signal.name}`,
          raw: data.readFloatLE(offset),
          code: SIGNAL_CODE[signal.name],
          offset,
        });
        offset += signal.length;
      }
      const customCount = data.readInt8(offset);
      offset += 1;
      for (const [index, signal] of (
        this.configuration["自定义整流模块模拟量"] as Signal[]
      ).entries()) {
        if (index > customCount - 1) {
          break;
        }
        response.push({
          ...signal,
          name: `整流模块#${i + 1}${signal.name}`,
          raw: data.readFloatLE(offset),
          code: SIGNAL_CODE[signal.name],
          offset,
        });
        offset += signal.length;
      }
    }
    return response as Signal[];
  };
  /**
   * 获取整流模块状态量
   * @returns
   */
  private parseRectifierStatus = () => {
    const data = this.getPayload();
    let offset = 0;
    const response = [];
    const count = data.readInt8(offset);
    offset += 1;
    for (let i = 0; i < count; i++) {
      for (const signal of [
        {
          name: "开机/关机状态",
          length: 1,
          enum: POWER_STATE,
        },
        {
          name: "限流/不限流状态",
          length: 1,
          enum: THROTTLING_STATE,
        },
        {
          name: "浮充/均充/测试状态",
          length: 1,
          enum: CHARGING_STATE,
        },
      ]) {
        const value = data.readUInt8(offset);
        response.push({
          ...signal,
          name: `整流模块#${i + 1}${signal.name}`,
          raw: value,
          code: SIGNAL_CODE[signal.name],
          offset,
        });
        offset += signal.length;
      }
      const customCount = data.readInt8(offset);
      offset += 1;
      for (const [index, signal] of (
        this.configuration["自定义整流模块状态量"] as Signal[]
      ).entries()) {
        if (index > customCount - 1) {
          break;
        }
        const value = data.readUInt8(offset);
        response.push({
          ...signal,
          name: `整流模块#${i + 1}${signal.name}`,
          raw: value,
          code: SIGNAL_CODE[signal.name],
          offset,
        });
        offset += signal.length;
      }
    }
    return response as Signal[];
  };
  /**
   * 整流模块告警量
   * @returns
   */
  private parseRectifierAlarms = () => {
    const data = this.getPayload();
    let offset = 0;
    const response = [];
    const count = data.readInt8(offset);
    offset += 1;
    for (let i = 0; i < count; i++) {
      for (const signal of [
        {
          name: "整流模块状态",
          length: 1,
          enum: COMMON_STATE,
          normalValue: 0x00,
        },
      ]) {
        const value = data.readUInt8(offset);
        response.push({
          ...signal,
          name: `整流模块#${i + 1}${signal.name}`,
          raw: value,
          code: SIGNAL_CODE[signal.name],
          offset,
        });
        offset += signal.length;
      }
      const customCount = data.readUInt8(offset);
      offset += 1;
      for (const [index, signal] of (
        this.configuration["自定义整流模块告警量"] as Signal[]
      ).entries()) {
        if (index > customCount - 1) {
          break;
        }
        const value = data.readUInt8(offset);
        response.push({
          ...signal,
          name: `整流模块#${i + 1}${signal.name}`,
          raw: value,
          code: SIGNAL_CODE[signal.name],
          offset,
        });
        offset += signal.length;
      }
    }
    return response as Signal[];
  };

  /**
   * 直流屏模拟量
   * @returns
   */
  private parseDirectValues = () => {
    const data = this.getPayload();
    let offset = 0;
    const response = [];
    const screenCount = data.readInt8(offset);
    offset += 1;
    for (let i = 0; i < screenCount; i++) {
      for (const signal of [
        {
          ...DIRECT_VOLTAGE,
          name: "直流输出电压",
        },
        { ...DIRECT_CURRENT, name: "总负载电流" },
      ]) {
        response.push({
          ...signal,
          name: `直流屏#${i + 1}${signal.name}`,
          raw: data.readFloatLE(offset),
          code: SIGNAL_CODE[signal.name],
          offset,
        });
        offset += signal.length;
      }
      const groupCount = data.readInt8(offset);
      offset += 1;
      for (let j = 0; j < groupCount; j++) {
        for (const signal of [{ ...DIRECT_CURRENT, name: "充放电电流" }]) {
          response.push({
            ...signal,
            name: `直流屏#${i + 1}第${j + 1}组蓄电池${signal.name}`,
            raw: data.readFloatLE(offset),
            code: SIGNAL_CODE[signal.name],
            offset,
          });
          offset += signal.length;
        }
      }
      const forkCount = data.readInt8(offset);
      offset += 1;
      for (let j = 0; j < forkCount; j++) {
        for (const signal of [{ ...DIRECT_CURRENT, name: "分路电流" }]) {
          response.push({
            ...signal,
            name: `直流屏#${i + 1}${signal.name}#${j + 1}`,
            raw: data.readFloatLE(offset),
            code: SIGNAL_CODE[signal.name],
            offset,
          });
          offset += signal.length;
        }
      }
      const customCount = data.readInt8(offset);
      let currentCustomCount = 0;
      offset += 1;
      for (const item of this.configuration[
        "自定义直流屏模拟量数组"
      ] as string[]) {
        if (item === "直流屏电池组数据") {
          for (let j = 0; j < groupCount; j++) {
            for (const [index, signal] of (
              this.configuration["直流屏电池组数据"] as Signal[]
            ).entries()) {
              if (currentCustomCount > customCount) {
                break;
              }
              response.push({
                ...signal,
                name: `直流屏#${i + 1}第${j + 1}组蓄电池${signal.name}`,
                raw: data.readFloatLE(offset),
                code: SIGNAL_CODE[signal.name],
                offset,
              });
              currentCustomCount++;
              offset += signal.length;
            }
          }
        }
        if (item === "自定义直流屏模拟量") {
          const entries = this.configuration["自定义直流屏模拟量"] as Signal[];
          for (const [index, signal] of entries.entries()) {
            if (currentCustomCount > customCount) {
              break;
            }
            response.push({
              ...signal,
              name: `直流屏#${i + 1}${signal.name}`,
              raw: data.readFloatLE(offset),
              code: SIGNAL_CODE[signal.name],
              offset,
            });
            currentCustomCount++;
            offset += signal.length;
          }
        }
      }
    }
    return response as Signal[];
  };
  /**
   * 直流屏告警量
   * @returns
   */
  private parseDirectAlarms = () => {
    const data = this.getPayload();
    let offset = 0;
    const response = [];
    const count = data.readInt8(offset);
    offset += 1;
    for (let i = 0; i < count; i++) {
      for (const signal of [
        {
          name: "直流电压",
          length: 1,
          enum: DIRECT_ALARM_STATE,
          normalValue: 0x00,
        },
      ]) {
        const value = data.readUInt8(offset);
        response.push({
          ...signal,
          name: `整流模块#${i + 1}${signal.name}`,
          raw: value,
          code: SIGNAL_CODE[signal.name],
          offset,
        });
        offset += signal.length;
      }
      const switchCount = data.readUInt8(offset);
      offset += 1;
      for (let j = 0; j < switchCount; j++) {
        for (const signal of [
          {
            name: "融丝/开关",
            length: 1,
            enum: {
              ...DIRECT_ALARM_STATE,
              ...(this.configuration["直流屏告警状态"] as {
                [key: number]: string;
              }),
            },
            normalValue: 0x00,
          },
        ]) {
          const value = data.readUInt8(offset);
          response.push({
            ...signal,
            name: `直流屏#${i + 1}${signal.name}#${j + 1}`,
            raw: value,
            code: SIGNAL_CODE[signal.name],
            offset,
          });
          offset += signal.length;
        }
      }
      const customCount = data.readUInt8(offset);
      offset += 1;
      for (const [index, signal] of (
        this.configuration["自定义直流屏告警量"] as Signal[]
      ).entries()) {
        if (index > customCount - 1) {
          break;
        }
        const value = data.readUInt8(offset);
        response.push({
          ...signal,
          name: `直流屏#${i + 1}${signal.name}`,
          raw: value,
          code: SIGNAL_CODE[signal.name],
          offset,
        });
        offset += signal.length;
      }
    }
    return response as Signal[];
  };
}

export { YDT };

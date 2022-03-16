/**
 * 电总协议
 */
import _ from "lodash";
import { DeviceError } from "../utils/errors";
import { RTN } from "./enum";

/**
 * 分解电总协议长度数据
 * @param input 数据
 * @param offset 长度数据位移
 * @returns 返回计算的校验和，原高四位，长度值
 */
export const getLengthChecksum = (input: Buffer, offset: number) => {
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
export const assembleCommand = (input: Buffer) => {
  const [checksum] = getLengthChecksum(input, 8);
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
 * @param input 数据
 * @param divider 是否有DATAFLAG
 * @param rtn 返回的数据
 * @returns 返回去除首位标识和校验位的数据
 */
export const getPayload = (input: Buffer, divider = true) => {
  // 匹配符合首尾标识的数据
  const response = /.*\~([^\~\r]*)\r.*/.exec(input.toString())?.[1];
  if (!response) {
    throw new DeviceError({ message: "电总协议数据格式错误", data: input });
  }
  // 数据校验和
  const checksum = parseInt(`0x${response.substring(response.length - 4)}`, 16);
  const data = Buffer.from(response).subarray(0, -4).valueOf();
  const sum = _.chain(data)
    .reduce((acc, cur) => acc + cur, 0)
    .value();
  if (checksum !== ((~sum + 1) & 0xffff)) {
    throw new DeviceError({ message: "电总协议数据校验错误", data: input });
  }
  // RTN
  if (parseInt(response.substring(6, 8), 16) !== 0) {
    throw new DeviceError({
      message:
        RTN[parseInt(response.substring(6, 8), 16)] ??
        `厂家自定义错误${response.substring(6, 8)}`,
      data: input,
    });
  }
  // 长度校验和
  const [lcheck, v0, length] = getLengthChecksum(input, 9);
  if (lcheck !== v0) {
    throw new DeviceError({ message: "电总协议长度位校验错误", data: input });
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

// ------------------

/**
 * 电总交流屏模拟量
 * @param input 数据
 * @param options 参数
 */
export const parseAlternatingValues =
  (multi = true) =>
  (options: Signal[][]) =>
  (input: Buffer) => {
    const data = getPayload(input);
    let offset = 0;
    const response = [];
    const screenCount = multi ? data.readInt8(offset) : 1;
    offset += multi ? 1 : 0;
    for (let i = 0; i < screenCount; i++) {
      const forkCount = data.readInt8(offset);
      offset += 1;
      for (let j = 0; j < forkCount; j++) {
        for (const signal of options[0]) {
          response.push({
            ...signal,
            name: `交流屏#${i + 1}第${j + 1}路${signal.name}`,
            value: `${data.readFloatLE(offset).toFixed(2)}${signal.unit}`,
            raw: data.readFloatLE(offset),
            id: `${signal.id}-${_.padStart(
              `${i * forkCount + j + 1}`,
              3,
              "0"
            )}`,
            offset,
          });
          offset += 4;
        }
        const customCount = data.readUInt8(offset);
        offset += 1;
        for (let k = 0; k < customCount; k++) {
          for (const signal of options[1]) {
            response.push({
              ...signal,
              name: `交流屏#${i + 1}第${j + 1}路${signal.name}`,
              value: `${data.readFloatLE(offset).toFixed(2)}${signal.unit}`,
              raw: data.readFloatLE(offset),
              id: `${signal.id}-${_.padStart(
                `${i * forkCount + j * customCount + k + 1}`,
                3,
                "0"
              )}`,
              offset,
            });
            offset += 4;
          }
        }
      }
      for (const signal of options[2]) {
        response.push({
          ...signal,
          name: `交流屏#${i + 1}${signal.name}`,
          value: `${data.readFloatLE(offset).toFixed(2)}${signal.unit}`,
          raw: data.readFloatLE(offset),
          id: `${signal.id}-${_.padStart(`${i + 1}`, 3, "0")}`,
          offset,
        });
        offset += 4;
      }
    }
    return response;
  };

/**
 * 电总交流屏状态量
 * @param input 数据
 * @param options 参数
 */
export const parseAlternatingStatus =
  (multi = true) =>
  (options: Signal[][]) =>
  (input: Buffer) => {
    const data = getPayload(input);
    let offset = 0;
    const response = [];
    const screenCount = multi ? data.readInt8(offset) : 1;
    offset += multi ? 1 : 0;
    for (let i = 0; i < screenCount; i++) {
      const forkCount = data.readInt8(offset);
      offset += 1;
      for (let j = 0; j < forkCount; j++) {
        for (const signal of options[0]) {
          const value = data.readUInt8(offset);
          response.push({
            ...signal,
            name: `交流屏#${i + 1}第${j + 1}路${signal.name}`,
            value: signal.enum![value],
            raw: value,
            id: `${signal.id}-${_.padStart(
              `${i * forkCount + j + 1}`,
              3,
              "0"
            )}`,
            offset,
          });
          offset += 1;
        }
      }
      const customCount = data.readUInt8(offset);
      offset += 1;
      for (const [index, signal] of options[1].entries()) {
        if (index > customCount - 1) {
          break;
        }
        const value = data.readUInt8(offset);
        response.push({
          ...signal,
          name: `交流屏#${i + 1}${signal.name}`,
          value: signal.enum![value],
          raw: value,
          id: `${signal.id}-${_.padStart(`${i + 1}`, 3, "0")}`,
          offset,
        });
        offset += 1;
      }
    }
    return response;
  };

/**
 * 电总交流屏告警量
 * @param input 数据
 * @param options 参数
 */
export const parseAlternatingAlarms =
  (multi = true) =>
  (options: Signal[][]) =>
  (input: Buffer) => {
    const data = getPayload(input);
    let offset = 0;
    const response = [];
    const screenCount = multi ? data.readInt8(offset) : 1;
    offset += multi ? 1 : 0;
    for (let i = 0; i < screenCount; i++) {
      const forkCount = data.readInt8(offset);
      offset += 1;
      for (let j = 0; j < forkCount; j++) {
        for (const signal of options[0]) {
          const value = data.readUInt8(offset);
          response.push({
            ...signal,
            name: `交流屏#${i + 1}第${j + 1}路${signal.name}`,
            value: signal.enum![value],
            raw: value,
            id: `${signal.id}-${_.padStart(
              `${i * forkCount + j + 1}`,
              3,
              "0"
            )}`,
            offset,
          });
          offset += 1;
        }
        const switchCount = data.readUInt8(offset);
        offset += 1;
        for (let k = 0; k < switchCount; k++) {
          for (const signal of options[1]) {
            const value = data.readUInt8(offset);
            response.push({
              ...signal,
              name: `交流屏#${i + 1}第${j + 1}路${signal.name}`,
              value: signal.enum![value],
              raw: value,
              id: `${signal.id}-${_.padStart(
                `${i * forkCount + j * switchCount + k + 1}`,
                3,
                "0"
              )}`,
              offset,
            });
            offset += 1;
          }
        }
        const customCount = data.readUInt8(offset);
        offset += 1;
        for (const [index, signal] of options[2].entries()) {
          if (index > customCount - 1) {
            break;
          }
          const value = data.readUInt8(offset);
          response.push({
            ...signal,
            name: `交流屏#${i + 1}${signal.name}`,
            value: signal.enum![value],
            raw: value,
            id: `${signal.id}-${_.padStart(`${i + 1}`, 3, "0")}`,
            offset,
          });
          offset += 1;
        }
      }
      for (const signal of options[3]) {
        const value = data.readUInt8(offset);
        response.push({
          ...signal,
          name: `交流屏#${i + 1}${signal.name}`,
          value: signal.enum![value],
          raw: value,
          id: `${signal.id}-${_.padStart(`${i + 1}`, 3, "0")}`,
          offset,
        });
        offset += 1;
      }
    }
    return response;
  };

/**
 * 获取整流模块模拟量
 * @param input 数据
 * @returns
 */
export const parseRectifierValues =
  (options: Signal[][]) => (input: Buffer) => {
    const data = getPayload(input);
    let offset = 0;
    const response = [];
    for (const signal of options[0]) {
      response.push({
        ...signal,
        name: signal.name,
        id: `${signal.id}-001`,
        value: `${data.readFloatLE(offset).toFixed(2)}${signal.unit}`,
        raw: data.readFloatLE(offset),
        offset,
      });
      offset += 4;
    }

    const count = data.readInt8(offset);
    offset += 1;
    for (let i = 0; i < count; i++) {
      for (const signal of options[1]) {
        response.push({
          ...signal,
          id: `${signal.id}-${_.padStart(`${i + 1}`, 3, "0")}`,
          name: `整流模块#${i + 1}${signal.name}`,
          value: `${data.readFloatLE(offset).toFixed(2)}${signal.unit}`,
          raw: data.readFloatLE(offset),
          offset,
        });
        offset += 4;
      }
      const customCount = data.readInt8(offset);
      offset += 1;
      for (const [index, signal] of options[2].entries()) {
        if (index > customCount - 1) {
          break;
        }
        response.push({
          ...signal,
          id: `${signal.id}-${_.padStart(`${i + 1}`, 3, "0")}`,
          name: signal.name,
          value: `${data.readFloatLE(offset).toFixed(2)}${signal.unit}`,
          raw: data.readFloatLE(offset),
          offset,
        });
        offset += 4;
      }
    }

    return response;
  };

/**
 * 获取整流模块状态量
 * @returns
 */
export const parseRectifierStatus =
  (options: Signal[][]) => (input: Buffer) => {
    const data = getPayload(input);
    let offset = 0;
    const response = [];
    const count = data.readInt8(offset);
    offset += 1;
    for (let i = 0; i < count; i++) {
      for (const signal of options[0]) {
        const value = data.readUInt8(offset);
        response.push({
          ...signal,
          id: `${signal.id}-${_.padStart(`${i + 1}`, 3, "0")}`,
          name: `整流模块#${i + 1}${signal.name}`,
          value: signal.enum![value],
          raw: value,
          offset,
        });
        offset += 1;
      }
      const customCount = data.readInt8(offset);
      offset += 1;
      for (const [index, signal] of options[1].entries()) {
        if (index > customCount - 1) {
          break;
        }
        const value = data.readUInt8(offset);
        response.push({
          ...signal,
          id: `${signal.id}-${_.padStart(`${i + 1}`, 3, "0")}`,
          name: `整流模块#${i + 1}${signal.name}`,
          value: signal.enum![value],
          raw: value,
          offset,
        });
        offset += 1;
      }
    }
    return response;
  };

/**
 * 整流模块告警量
 * @param input 数据
 * @returns
 */
export const parseRectifierAlarms =
  (options: Signal[][]) => (input: Buffer) => {
    const data = getPayload(input);
    let offset = 0;
    const response = [];
    const count = data.readInt8(offset);
    offset += 1;
    for (let i = 0; i < count; i++) {
      for (const signal of options[0]) {
        const value = data.readUInt8(offset);
        response.push({
          ...signal,
          id: `${signal.id}-${_.padStart(`${i + 1}`, 3, "0")}`,
          name: `整流模块#${i + 1}${signal.name}`,
          value: signal.enum![value],
          raw: value,
          offset,
        });
        offset += 1;
      }
      const customCount = data.readUInt8(offset);
      offset += 1;
      for (const [index, signal] of options[1].entries()) {
        if (index > customCount - 1) {
          break;
        }
        const value = data.readUInt8(offset);
        response.push({
          ...signal,
          id: `${signal.id}-${_.padStart(`${i + 1}`, 3, "0")}`,
          name: `整流模块#${i + 1}${signal.name}`,
          value: signal.enum![value],
          raw: value,
          offset,
        });
        offset += 1;
      }
    }
    return response;
  };

/**
 * 直流屏模拟量
 * @param options
 * @returns
 */
export const parseDirectValues =
  (multi = true) =>
  (options: Signal[][]) =>
  (input: Buffer) => {
    const data = getPayload(input);
    let offset = 0;
    const response = [];
    const screenCount = multi ? data.readInt8(offset) : 1;
    offset += multi ? 1 : 0;
    for (let i = 0; i < screenCount; i++) {
      for (const signal of options[0]) {
        response.push({
          ...signal,
          id: `${signal.id}-${_.padStart(`${i + 1}`, 3, "0")}`,
          name: `直流屏#${i + 1}${signal.name}`,
          value: `${data.readFloatLE(offset).toFixed(2)}${signal.unit}`,
          raw: data.readFloatLE(offset),
          offset,
        });
        offset += 4;
      }
      const groupCount = data.readInt8(offset);
      offset += 1;
      for (let j = 0; j < groupCount; j++) {
        for (const signal of options[1]) {
          response.push({
            ...signal,
            id: `${signal.id}-${_.padStart(
              `${i * screenCount + j * groupCount + 1}`,
              3,
              "0"
            )}`,
            name: `直流屏#${i + 1}第${j + 1}组蓄电池${signal.name}`,
            value: `${data.readFloatLE(offset).toFixed(2)}${signal.unit}`,
            raw: data.readFloatLE(offset),
            offset,
          });
          offset += 4;
        }
      }
      const forkCount = data.readInt8(offset);
      offset += 1;
      for (let j = 0; j < forkCount; j++) {
        for (const signal of options[2]) {
          response.push({
            ...signal,
            id: `${signal.id}-${_.padStart(
              `${i * screenCount + j * forkCount + 1}`,
              3,
              "0"
            )}`,
            name: `直流屏#${i + 1}分路#${j + 1}${signal.name}`,
            value: `${data.readFloatLE(offset).toFixed(2)}${signal.name}`,
            raw: data.readFloatLE(offset),
            offset,
          });
          offset += 4;
        }
      }
      const customCount = data.readInt8(offset);
      offset += 1;
      for (let j = 0; j < groupCount; j++) {
        for (const [index, signal] of options[3].entries()) {
          response.push({
            ...signal,
            id: `${signal.id}-${_.padStart(
              `${i * screenCount + j * groupCount + 1}`,
              3,
              "0"
            )}`,
            name: `直流屏#${i + 1}第${j + 1}组蓄电池${signal.name}`,
            value: `${data.readFloatLE(offset).toFixed(2)}${signal.unit}`,
            raw: data.readFloatLE(offset),
            offset,
          });
          offset += 4;
        }
      }
      for (const [index, signal] of options[4].entries()) {
        if (index > customCount - groupCount * options[3].length - 1) {
          break;
        }
        response.push({
          ...signal,
          id: `${signal.id}-${_.padStart(`${i + 1}`, 3, "0")}`,
          name: `直流屏#${i + 1}${signal.name}`,
          value: `${data.readFloatLE(offset).toFixed(2)}${signal.unit}`,
          raw: data.readFloatLE(offset),
          offset,
        });
        offset += 4;
      }
    }
    console.log(data.length, offset);
    return response;
  };

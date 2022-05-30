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
};
/**
 * 分解电总协议长度数据
 * @param input 数据
 * @param offset 长度数据位移
 * @returns 返回计算的校验和，原高四位，长度值
 */
const getLengthChecksum = (input: Buffer, offset: number) => {
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
const assembleCommand = (input: Buffer) => {
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
 * @param divider 是否有DATAFLAG
 * @returns 返回去除首位标识和校验位的数据
 */
const getPayload = (divider = true) => {
  // 匹配符合首尾标识的数据
  const response = /.*\~([^\~\r]*)\r.*/.exec(
    "~2001420020680001F7481055DEFFCFF704B435C33F381F7FFBD017FBDF114C543D06001CF74600437047E042744EE0FFC34EFE2FBE4EBC703E4FE60E\r"
  )?.[1];
  if (!response) {
    throw new DeviceError({
      message: "电总协议数据格式错误",
      data: Buffer.from("数据格式错误"),
    });
  }
  // 数据校验和
  const checksum = parseInt(`0x${response.substring(response.length - 4)}`, 16);
  const data = Buffer.from(response).subarray(0, -4).valueOf();
  const sum = _.chain(data)
    .reduce((acc, cur) => acc + cur, 0)
    .value();
  if (checksum !== ((~sum + 1) & 0xffff)) {
    throw new DeviceError({
      message: "电总协议数据校验错误",
    });
  }
  // RTN
  if (parseInt(response.substring(6, 8), 16) !== 0) {
    throw new DeviceError({
      message:
        {
          ...RTN,
        }[parseInt(response.substring(6, 8), 16)] ??
        `厂家自定义错误${response.substring(6, 8)}`,
    });
  }
  // 长度校验和
  const [lcheck, v0, length] = getLengthChecksum(
    Buffer.from(
      "~2001420020680001F7481055DEFFCFF704B435C33F381F7FFBD017FBDF114C543D06001CF74600437047E042744EE0FFC34EFE2FBE4EBC703E4FE60E\r"
    ),
    9
  );
  if (lcheck !== v0) {
    throw new DeviceError({
      message: "电总协议长度位校验错误",
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

/**
 * 直流屏模拟量
 * @returns
 */
const parseDirectValues = () => {
  const data = getPayload();
  let offset = 0;
  const response = [];
  console.log(data);
  const screenCount = data.readInt8(offset);
  offset += 1;
  for (let i = 0; i < data.length - 4; i++) {
    console.log(data.readFloatBE(i), i);
  }
  return;
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
    // const customCount = data.readInt8(offset);
    // console.log(customCount);
    // offset += 1;
    // for (let j = 0; j < groupCount; j++) {
    //   for (const [index, signal] of ([] as Signal[]).entries()) {
    //     response.push({
    //       ...signal,
    //       name: `直流屏#${i + 1}第${j + 1}组蓄电池${signal.name}`,
    //       raw: data.readFloatLE(offset),
    //       code: SIGNAL_CODE[signal.name],
    //       offset,
    //     });
    //     offset += signal.length;
    //   }
    // }
    // const entries: Signal[] = [];
    // for (const [index, signal] of entries.entries()) {
    //   if (index > customCount - groupCount * entries.length - 1) {
    //     break;
    //   }
    //   response.push({
    //     ...signal,
    //     name: `直流屏#${i + 1}${signal.name}`,
    //     raw: data.readFloatLE(offset),
    //     code: SIGNAL_CODE[signal.name],
    //     offset,
    //   });
    //   offset += signal.length;
    // }
  }
  return response as Signal[];
};

console.log(parseDirectValues());

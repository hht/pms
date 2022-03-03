/**
 * 通用数据算法
 */
import { DeviceError } from "../utils/errors";
import _ from "lodash";
import { RTN } from "./enum";

/**
 * CRC16校验算法
 * @param numbers 待校验字符串
 * @returns
 */
export const CRC16 = (numbers: Uint8Array) => {
  let crc = 0xffff;
  let odd = 0x0000;
  for (let i = 0; i < numbers.length; i++) {
    crc = crc ^ numbers[i];
    for (var j = 0; j < 8; j++) {
      odd = crc & 0x0001;
      crc = crc >> 1;
      if (odd) {
        crc = crc ^ 0xa001;
      }
    }
  }
  return crc;
};

/**
 * 添加CRC16校验码
 * @param input 数据
 * @returns 返回添加了CRC16的Buffer
 */
export const appendCrc16 = (input: Buffer) => {
  const buffer = Buffer.alloc(input.length + 2);
  const checkSum = CRC16(input.valueOf());
  input.forEach((it, index) => buffer.writeUInt8(it, index));
  buffer.writeUInt16LE(checkSum, input.length);
  return buffer;
};

/**
 * 使用CRC16校验码校验数据
 * @param input 待校验数据
 * @returns
 */
export const checkCrc16 = (input: Buffer) => {
  const [addr, code, length, ...rest] = input.valueOf();
  if (length > rest.length - 2) {
    return null;
  }
  const data = [addr, code, length, ...rest.slice(0, length)];
  if (CRC16(Buffer.from(data)) !== input.readUInt16LE(input.length - 2)) {
    throw new DeviceError({ message: "CRC16校验错误", data: input });
  }
  return Buffer.from(data);
};

export const ACDistribution: Value[] = [
  { name: "输入线/相电压AB/A", value: "F" },
  { name: "输入线/相电压AB/A", value: "F" },
  { name: "输入线/相电压AB/A", value: "F" },
  { name: "输入频率", value: "F" },
  { name: "用户自定义数据", value: "B", skip: (value: number) => value },
];

/**
 * 分解电总协议长度数据
 * @param input 数据
 * @param offset 长度数据位移
 * @returns 返回计算的校验和，原高四位，长度值
 */
export const getYDT1363LengthChecksum = (input: Buffer, offset: number) => {
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
export const assembleCommandOfYDT = (input: Buffer) => {
  const [checksum] = getYDT1363LengthChecksum(input, 8);
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
export const getPayloadForYDT = (input: Buffer, divider = true) => {
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
  const [lcheck, v0, length] = getYDT1363LengthChecksum(input, 9);
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
export const parseAlternatingValuesOfYDT = (
  input: Buffer,
  options: Signal[][]
) => {
  const data = getPayloadForYDT(input, true);
  let offset = 0;
  const response = [];
  const screenCount = data.readInt8(offset);
  offset += 1;
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
          prefix: `${signal.prefix}${_.padStart(
            `${i * forkCount + j + 1}`,
            3,
            "0"
          )}`,
        });
        offset += signal.length;
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
            prefix: `${signal.prefix}${_.padStart(
              `${i * forkCount + j * customCount + k + 1}`,
              3,
              "0"
            )}`,
          });
          offset += signal.length;
        }
      }
    }
    for (const signal of options[2]) {
      response.push({
        ...signal,
        name: `交流屏#${i + 1}${signal.name}`,
        value: `${data.readFloatLE(offset).toFixed(2)}${signal.unit}`,
        raw: data.readFloatLE(offset),
        prefix: `${signal.prefix}${_.padStart(`${i + 1}`, 3, "0")}`,
      });
      offset += signal.length;
    }
  }
  return response;
};

/**
 * 获取所有交流屏模拟量
 * @param input 数据
 * @returns
 */
export const getACDistributionValues = (input: Buffer) => {
  let offset = 0;
  const response = [];
  const converted = input;
  const maxScreens = converted.readInt8(offset);
  offset += 1;
  for (let i = 0; i < maxScreens; i++) {
    const maxInput = converted.readInt8(offset);
    offset += 1;
    for (let j = 0; j < maxInput; j++) {
      for (const ac of ACDistribution) {
        if (ac.skip) {
          offset += ac.skip(converted.readInt8(offset)) + 1;
        } else {
          response.push({
            name: `交流屏#${i + 1}第${j + 1}路${ac.name}`,
            value:
              ac.value === "F"
                ? converted.readFloatLE(offset)
                : ac.value === "I"
                ? converted.readInt16BE(offset)
                : converted.readInt8(offset),
          });
          offset += ac.value === "F" ? 4 : ac.value === "I" ? 2 : 1;
        }
      }
    }
    for (const name of [
      "交流屏输出电流A",
      "交流屏输出电流B",
      "交流屏输出电流C",
    ]) {
      response.push({ name, value: converted.readFloatLE(offset) });
      offset += 4;
    }
  }
  return response;
};

/**
 * 获取所有交流屏状态量
 * @param input 数据
 * @returns
 */
export const getACDistributionStatus = (input: Buffer) => {
  const converted = Buffer.from(
    _.chain(input.toString())
      .split("")
      .chunk(2)
      .map(([h, l]) => parseInt(`${h}${l}`, 16))
      .value()
  );
  let offset = 0;
  const response = [];
  const maxScreens = converted.readInt8(offset);
  offset += 1;
  for (let i = 0; i < maxScreens; i++) {
    const maxInput = converted.readInt8(offset);
    offset += 1;
    for (let j = 0; j < maxInput; j++) {
      response.push({
        name: `交流屏#${i + 1}空开#${j + 1}状态`,
        value: converted.readInt8(offset),
      });
      offset += 1;
    }
    offset += 1;
    for (const name of ["交流切换状态", "事故照明灯状态", "当前工作路号"]) {
      response.push({ name, value: converted.readInt8(offset).toString(16) });
      offset += 1;
    }
  }
  return response;
};

/**
 * 获取交流屏告警量
 * @param input 数据
 * @returns
 */
export const getACDistributionAlarms = (input: Buffer) => {
  const converted = Buffer.from(
    _.chain(input.toString())
      .split("")
      .chunk(2)
      .map(([h, l]) => parseInt(`${h}${l}`, 16))
      .value()
  );
  let offset = 0;
  const response = [];
  const maxScreens = converted.readInt8(offset);
  offset += 1;
  for (let i = 0; i < maxScreens; i++) {
    const maxInput = converted.readInt8(offset);
    offset += 1;
    for (let j = 0; j < maxInput; j++) {
      for (const name of [
        "输入线/相电压AB/A",
        "输入线/相电压BC/B",
        "输入线/相电压CA/C",
        "频率",
      ]) {
        response.push({
          name,
          value: converted.readInt8(offset).toString(16),
        });
        offset += 1;
      }
      const switchCount = converted.readInt8(offset);
      offset += 1;
      for (let k = 0; k < switchCount; k++) {
        response.push({
          name: `交流屏#${i}第${j}路融丝/开关#${k}`,
          value: converted.readInt8(offset).toString(16),
        });
        offset += 1;
      }
      const customCount = converted.readInt8(offset);
      offset += 1;
      const customName = [
        "交流输入空开跳",
        "交流输出空开跳",
        "防雷器断",
        "交流输入1停电",
        "交流输入2停电",
        "交流输入3停电",
        "市电切换失败",
        "交流屏通讯中断",
      ];
      for (let l = 0; l < customCount; l++) {
        response.push({
          name: customName[l],
          value: converted.readInt8(offset).toString(16),
        });
        offset += 1;
      }
    }
    for (const name of ["A相输入电流", "B相输入电流", "C相输入电流"]) {
      response.push({
        name,
        value: converted.readInt8(offset).toString(16),
      });
      offset += 1;
    }
  }
  return response;
};

/**
 * 获取交流屏参数设置
 * @param input 数据
 * @returns
 */
export const getACDistributionParameters = (input: Buffer) => {
  const converted = Buffer.from(
    _.chain(input.toString())
      .split("")
      .chunk(2)
      .map(([h, l]) => parseInt(`${h}${l}`, 16))
      .value()
  );
  let offset = 0;
  const response = [];
  for (const name of [
    "交流输入线/相电压上限",
    "交流输入线/相电压下限",
    "交流输入电流上限",
    "频率上限",
    "频率下限",
  ]) {
    response.push({ name, value: converted.readFloatLE(offset) });
    offset += 4;
  }

  const customCount = converted.readInt8(offset);
  for (let i = 0; i < customCount; i++) {
    response.push({ name: "用户自定义", value: converted.readInt8(offset) });
  }
  return response;
};

export const getDCDistributionValues = (input: Buffer) => {
  const converted = Buffer.from(
    _.chain(input.toString())
      .split("")
      .chunk(2)
      .map(([h, l]) => parseInt(`${h}${l}`, 16))
      .value()
  );
  let offset = 0;
  const response = [];
  response.push({
    name: "整流模块输出电压",
    value: converted.readFloatLE(offset),
  });
  offset += 4;
  const count = converted.readInt8(offset);
  offset += 1;
  for (let i = 0; i < count; i++) {
    response.push({
      name: `交流屏#${i} 整流模块输出电流`,
      value: converted.readFloatLE(offset),
    });
    offset += 4;
    const customCount = converted.readInt8(offset);
    offset += 1;
    const customName = [
      "模块温度",
      "模块限流点（百分数）",
      "模块输出电压",
      "输出电压保护点",
    ];
    for (let l = 0; l < customCount; l++) {
      response.push({
        name: customName[l],
        value: converted.readFloatLE(offset),
      });
      offset += 4;
    }
  }
  return response;
};
export const getDCDistributionStatus = (input: Buffer) => {
  const converted = Buffer.from(
    _.chain(input.toString())
      .split("")
      .chunk(2)
      .map(([h, l]) => parseInt(`${h}${l}`, 16))
      .value()
  );
  let offset = 0;
  const response = [];
  const count = converted.readInt8(offset);
  offset += 1;
  for (let i = 0; i < count; i++) {
    for (const name of [
      "开机/关机状态",
      "限流/不限流状态",
      "浮充/均充/测试状态",
    ]) {
      response.push({
        name,
        value: converted.readUInt8(offset).toString(16),
      });
      offset += 1;
    }
    const customCount = converted.readInt8(offset);
    offset += 1;
    const customName = ["自动/手动状态"];
    for (let l = 0; l < customCount; l++) {
      response.push({
        name: customName[l],
        value: converted.readUInt8(offset).toString(16),
      });
      offset += 1;
    }
  }
  return response;
};

export const getDCDistributionAlarms = (input: Buffer) => {
  const converted = Buffer.from(
    _.chain(input.toString())
      .split("")
      .chunk(2)
      .map(([h, l]) => parseInt(`${h}${l}`, 16))
      .value()
  );
  let offset = 0;
  const response = [];
  const count = converted.readInt8(offset);
  offset += 1;
  for (let i = 0; i < count; i++) {
    for (const name of ["整流模块故障"]) {
      response.push({
        name,
        value: converted.readUInt8(offset).toString(16),
      });
      offset += 1;
    }
    const customCount = converted.readUInt8(offset);
    offset += 1;
    const customName = ["模块保护", "风扇故障", "模块过温", "模块通讯中断"];
    for (let l = 0; l < customCount; l++) {
      response.push({
        name: customName[l],
        value: converted.readUInt8(offset).toString(16),
      });
      offset += 1;
    }
  }
  return response;
};

export const getXDCDistributionValues = (input: Buffer) => {
  const converted = Buffer.from(
    _.chain(input.toString())
      .split("")
      .chunk(2)
      .map(([h, l]) => parseInt(`${h}${l}`, 16))
      .value()
  );
  let offset = 0;
  const response = [];
  const screenCount = converted.readInt8(offset);
  offset += 1;
  for (let i = 0; i < screenCount; i++) {
    for (const name of ["直流输出电压", "总负载电流 "]) {
      response.push({
        name,
        value: converted.readFloatLE(offset),
      });
      offset += 4;
    }
    const groupCount = converted.readInt8(offset);
    offset += 1;
    for (let j = 0; j < groupCount; j++) {
      response.push({
        name: `直流屏#${i}第${j}组蓄电池充、放电电流`,
        value: converted.readFloatLE(offset),
      });
      offset += 4;
    }
    const forkCount = converted.readInt8(offset);
    offset += 1;
    for (let j = 0; j < forkCount; j++) {
      response.push({
        name: `直流屏#${i}直流分路#${j}电流`,
        value: converted.readFloatLE(offset),
      });
      offset += 4;
    }
    const customCount = screenCount + forkCount;
    offset += 1;
    const groupCustomName = ["电池组1电压", "电池组2电压"];
    for (let j = 0; j < groupCount; j++) {
      response.push({
        name: `直流屏#${i}${groupCustomName[i]}`,
        value: converted.readFloatLE(offset),
      });
      offset += 4;
    }
    const forkCustomName = ["电池房温度", "测点1温度", "测点2温度"];
    for (let j = 0; j < forkCount; j++) {
      response.push({
        name: `直流屏#${j}${forkCustomName}`,
        value: converted.readFloatLE(offset),
      });
      offset += 4;
    }
  }
  return response;
};

export const getXDCDistributionParameters = (input: Buffer) => {
  const converted = Buffer.from(
    _.chain(input.toString())
      .split("")
      .chunk(2)
      .map(([h, l]) => parseInt(`${h}${l}`, 16))
      .value()
  );
  let offset = 0;
  const response = [];
  for (const name of ["直流电压上限", "直流电压下限"]) {
    response.push({
      name,
      value: converted.readFloatLE(offset),
    });
    offset += 4;
  }
  const customCount = converted.readInt8(offset);
  offset += 1;
  const customName = [
    "电池组1过压告警点",
    "电池组1欠压告警点",
    "电池组1充电过流告警点",
    "电池组2过压告警点",
    "电池组2欠压告警点",
    "电池组2充电过流告警点",
    "电池房过温告警点",
    "测点1过温告警点",
    "测点2过温告警点",
  ];
  for (let j = 0; j < customCount; j++) {
    response.push({
      name: customName[j],
      value: converted.readFloatLE(offset),
    });
    offset += 4;
  }
  return response;
};

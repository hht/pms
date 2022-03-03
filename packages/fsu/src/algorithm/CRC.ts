/**
 * CRC算法
 */
import { DeviceError } from "../utils/errors";
import _ from "lodash";

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

import { DeviceError } from "../utils/errors";
import _ from "lodash";
import { IDevice } from "./Device";
import { appendCrc16, checkCrc16 } from "../algorithm/CRC";

/**
 * 通用故障
 */
const COMMON_STATE: { [key: number]: string } = {
  0x01: "正常",
  0x00: "故障",
};

class Environment extends IDevice {
  /**
   * 生成符合Modbus命令
   * @param input 原始数据
   * @returns 组装后的数据
   */
  protected assembleCommand = (input: Buffer) => {
    const address = this.instance.address || 1;
    return appendCrc16(Buffer.from([address, ...input]));
  };

  /**
   * 返回数据
   * @param divider
   * @returns 返回去除校验位的数据
   */
  protected getPayload = (divider = true) => {
    // 校验数据
    if (!checkCrc16(this.buffer)) {
      throw new DeviceError({
        message: `${this.instance.name}数据校验失败`,
        data: this.buffer,
      });
    }
    return this.buffer;
  };
  protected initialize = async () => {};

  protected getParser = (command: string) => {
    switch (command) {
      case "环境量":
        return this.parse;
      default:
        return () => [] as Signal[];
    }
  };
  /**
   * 获取环境数据
   */
  private parse = () => {
    const data = this.getPayload();
    const values: number[] = [];
    let offset = 0;
    const length = data.readInt8(2);
    offset += 3;
    const address = data.readUInt16BE(offset);
    values.push(address);
    offset += 2;
    for (let i = 0; i < 18; i += 1) {
      values.push(data.readUInt16BE(offset) / 100);
      offset += 2;
    }
    let switches = data.readUInt16BE(offset);
    for (let i = 0; i < 16; i++) {
      values.push(switches & 1);
      switches = switches >> 1;
    }
    return (this.configuration["协议数据"] as Signal[])
      .map((it, index) => ({
        ...it,
        raw: values[index],
        value: `${values[index]}${it.unit}`,
        threshold: 0,
        thresholdPercent: 0,
        startDelay: 0,
        endDelay: 0,
        offset: index * 2,
      }))
      .filter((it) => it.name !== "协议保留");
  };
}

export { Environment };

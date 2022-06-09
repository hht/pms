import { DeviceError } from "../utils/errors";
import _ from "lodash";
import { IDevice } from "./Device";
import { SIGNAL_CODE } from "./enum";
import { appendCrc16, checkCrc16 } from "../algorithm/CRC";

/**
 * 通用故障
 */
const COMMON_STATE: { [key: number]: string } = {
  0x00: "正常",
  0x01: "故障",
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
   * 温湿度模拟量
   */
  private parse = () => {
    const data = this.getPayload();
    const values: number[] = [];
    const length = data.readInt8(2);
    console.log(length, data);
    for (let i = 0; i < 20; i += 2) {
      values.push(data.readInt16BE(i + 3) / 100);
    }

    console.log("数据", values);
    return (this.configuration["环境量"] as Signal[]).map((it, index) => ({
      ...it,
      code: SIGNAL_CODE[it.name],
      raw: values[index],
      value: `${values[index]}${it.unit}`,
      threshold: 0,
      thresholdPercent: 0,
      startDelay: 0,
      endDelay: 0,
      offset: index * 2,
    }));
  };
}

export { Environment };

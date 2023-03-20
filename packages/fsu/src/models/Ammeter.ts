import { DeviceError } from "../utils/errors";
import _ from "lodash";
import { IDevice } from "./Device";
import { appendCrc16, checkCrc16 } from "../algorithm/CRC";
import { SIGNAL_CODE } from "./enum";

class Ammeter extends IDevice {
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
      default:
        return this.parse(command);
    }
  };

  /**
   * 获取数据
   */
  private parse = (command: string) => () => {
    const data = this.getPayload();
    const length = data.readUInt8(2);
    for (let i = 0; i < length; i += 2) {
      console.log(data.length, length, {
        [i]: `[${i / 2 + 1}]${data.readInt16BE(i + 3)}`,
      });
    }
    return (this.configuration[command] as Signal[])
      .map((it) => ({
        ...it,
        code: it.code ?? SIGNAL_CODE[it.name],
        raw: data.readInt16BE((it.offset ?? 0) + 3) * (it.ratio ?? 1),
        value: `${data.readInt16BE((it.offset ?? 0) + 3) * (it.ratio ?? 1)}${
          it.unit
        }`,
        deviceId: this.instance.deviceId,
        threshold: 0,
        thresholdPercent: 0,
        startDelay: 0,
        endDelay: 0,
        offset: it.offset,
      }))
      .filter((it) => it.name !== "协议保留");
  };
}

export { Ammeter };

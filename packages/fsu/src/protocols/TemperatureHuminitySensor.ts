/**
 * 温湿度传感器协议
 */
import { appendCrc16, checkCrc16 } from "../algorithm/CRC";

const PROTOCOLS: any[] = [
  {
    id: "53627350-2705-E8DB-8248-DACEE000144B",
    controller: "智能温湿度",
    name: "温湿度",
    model: ["智能温湿度"],
    command: Buffer.from([0x01, 0x03, 0x00, 0x00, 0x00, 0x02]),
    preprocessor: appendCrc16,
    parser: () => (input: Buffer) => {
      const values: number[] = [];
      const length = input.readInt8(2);
      for (let i = 0; i < length; i += 2) {
        values.push(input.readInt16BE(i + 2 + 1) / 10);
      }
      return ["湿度", "温度"].map((name, index) => ({
        name,
        code: "",
        offset: index,
        raw: values[index],
        value: values[index] as number,
        unit: "℃",
        length: 2,
        id: "",
      }));
    },
  },
];

export default PROTOCOLS;

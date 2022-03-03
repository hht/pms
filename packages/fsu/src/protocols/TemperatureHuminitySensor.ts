/**
 * 温湿度传感器协议
 */
import { appendCrc16, checkCrc16 } from "../algorithm/CRC";

const PROTOCOLS: Protocol[] = [
  {
    id: "2CC0ED46-BC86-B5D6-4215-7F9F57857E03",
    type: "环境监测",
    name: "温湿度传感器",
    model: "DS18B20",
    vendor: "DHT",
    commands: [
      {
        name: "温湿度",
        command: Buffer.from([0x01, 0x03, 0x00, 0x00, 0x00, 0x02]),
        preprocessor: appendCrc16,
        parser:
          ([]) =>
          (input: Buffer) => {
            const values: number[] = [];
            const length = input.readInt8(2);
            for (let i = 0; i < length; i += 2) {
              values.push(input.readInt16BE(i + 2 + 1) / 10);
            }
            return ["湿度", "温度"].map((name, index) => ({
              name,
              value: values[index] as number,
              unit: "℃",
              length: 2,
              id: "",
            }));
          },
        options: {},
      },
    ],
  },
];

export default PROTOCOLS;

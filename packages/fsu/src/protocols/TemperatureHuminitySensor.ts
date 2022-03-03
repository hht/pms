/**
 * 温湿度传感器协议
 */
import {
  appendCrc16,
  checkCrc16,
  getInt16BEArrayWith8BitLength,
} from "./algorithm";

const PROTOCOLS: Protocol[] = [
  {
    id: "2CC0ED46-BC86-B5D6-4215-7F9F57857E03",
    name: "温湿度传感器",
    model: "DS18B20",
    manufacturer: "DHT",
    commands: [
      {
        name: "温湿度",
        input: Buffer.from([0x01, 0x03, 0x00, 0x00, 0x00, 0x02]),
        process: (input: Buffer) => {
          return appendCrc16(input);
        },
        validate: checkCrc16,
        parse: (input: Buffer) => {
          const response = getInt16BEArrayWith8BitLength(2)(input).map(
            (it) => it / 10
          );
          return ["湿度", "温度"].map((name, index) => ({
            name,
            value: response[index] as number,
          }));
        },
      },
    ],
  },
];

export default PROTOCOLS;

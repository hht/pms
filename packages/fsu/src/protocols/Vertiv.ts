/**
 * 维谛开关电源
 */

import _ from "lodash";
import {
  assembleCommand,
  parseAlternatingValues,
  parseAlternatingStatus,
  parseAlternatingAlarms,
  parseAlternatingParameters,
  parseRectifierValues,
  parseRectifierStatus,
  parseRectifierAlarms,
  parseDirectValues,
  parseDirectParameters,
} from "../algorithm/YDT";
import { DEFINITIONS } from "../algorithm/vendor";
const PROTOCOLS: Protocol[] = [
  {
    id: "2CC0ED46-BC86-B5D6-4215-7F9F57857E03",
    name: "电总协议",
    type: "组合开关电源",
    model: "适用于PSM-A",
    vendor: "维谛",
    commands: [
      {
        name: "交流屏模拟量",
        command: Buffer.from(`200140410002FF`),
        preprocessor: assembleCommand,
        parser: parseAlternatingValues(false),
        options: { 用户自定义数据: [] },
      },
      {
        name: "交流屏状态量",
        command: Buffer.from(`200140430002FF`),
        preprocessor: assembleCommand,
        parser: parseAlternatingStatus(true),
        options: {
          用户自定义数据: DEFINITIONS["交流屏模拟量-#1"].properties,
        },
      },
      {
        name: "交流屏告警量",
        command: Buffer.from(`200140440002FF`),
        preprocessor: assembleCommand,
        parser: parseAlternatingAlarms(true),
        options: {
          用户自定义数据: DEFINITIONS["交流屏告警量-#1"].properties,
        },
      },
      {
        name: "交流屏参数",
        command: Buffer.from(`200140460000`),
        preprocessor: assembleCommand,
        parser: parseAlternatingParameters,
        options: {
          用户自定义数据: [],
        },
      },
      {
        name: "整流模块模拟量",
        command: Buffer.from(`200140460000`),
        preprocessor: assembleCommand,
        parser: parseRectifierValues,
        options: {
          用户自定义数据: DEFINITIONS["整流模块模拟量-#1"].properties,
        },
      },
      {
        name: "整流模块状态量",
        command: Buffer.from(`200140460000`),
        preprocessor: assembleCommand,
        parser: parseRectifierStatus,
        options: {
          用户自定义数据: DEFINITIONS["整流模块状态量-#1"].properties,
        },
      },
      {
        name: "整流模块告警量",
        command: Buffer.from(`200140460000`),
        preprocessor: assembleCommand,
        parser: parseRectifierAlarms,
        options: {
          用户自定义数据: DEFINITIONS["整流模块告警量-#1"].properties,
        },
      },
      {
        name: "直流屏模拟量",
        command: Buffer.from(`200140460000`),
        preprocessor: assembleCommand,
        parser: parseDirectValues(true),
        options: {
          用户自定义电池组数据: DEFINITIONS["直流屏电池组数据-#1"].properties,
          用户自定义数据: DEFINITIONS["直流屏模拟量-#1"].properties,
        },
      },
      {
        name: "直流屏参数",
        command: Buffer.from(`200140460000`),
        preprocessor: assembleCommand,
        parser: parseDirectParameters,
        options: {
          用户自定义数据: DEFINITIONS["直流屏参数-#1"].properties,
        },
      },
    ],
  },
];

export default PROTOCOLS;

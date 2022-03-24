/**
 * 维谛开关电源
 */

import _ from "lodash";
import {
  assembleCommand,
  parseAlternatingValues,
  parseAlternatingStatus,
  parseAlternatingAlarms,
  parseRectifierValues,
  parseRectifierStatus,
  parseRectifierAlarms,
  parseDirectValues,
} from "../algorithm/YDT";

const PROTOCOLS: Command[] = [
  {
    id: "93EBA5A3-07AC-A168-9D00-398DBEB66085",
    controller: "开关电源",
    model: ["PSM-A"],
    name: "交流屏模拟量",
    command: Buffer.from(`200140410002FF`),
    preprocessor: assembleCommand,
    parser: parseAlternatingValues,
  },
  {
    id: "2E555939-3075-57DD-E085-5CF4499ACD4F",
    controller: "开关电源",
    model: ["PSM-A"],
    name: "交流屏状态量",
    command: Buffer.from(`200140430002FF`),
    preprocessor: assembleCommand,
    parser: parseAlternatingStatus,
    options: ["交流屏状态量"],
  },
  {
    id: "645A0B51-11F9-CAE9-3D75-68703E9A44D5",
    controller: "开关电源",
    model: ["PSM-A"],
    name: "交流屏告警量",
    command: Buffer.from(`200140440002FF`),
    preprocessor: assembleCommand,
    parser: parseAlternatingAlarms,
    options: ["交流屏告警量"],
  },
  {
    id: "532FABE1-6E68-CEE0-5E25-7E235C347C9C",
    controller: "开关电源",
    model: ["PSM-A"],
    name: "整流模块模拟量",
    command: Buffer.from(`200140460000`),
    preprocessor: assembleCommand,
    parser: parseRectifierValues,
    options: ["整流模块模拟量"],
  },
  {
    id: "06307D15-D3F1-0F4E-7DF9-05159B47D9F7",
    controller: "开关电源",
    model: ["PSM-A"],
    name: "整流模块状态量",
    command: Buffer.from(`200140460000`),
    preprocessor: assembleCommand,
    parser: parseRectifierStatus,
    options: ["整流模块状态量"],
  },
  {
    id: "6B2841D4-4723-5AA0-D499-6B3DC163B525",
    controller: "开关电源",
    model: ["PSM-A"],
    name: "整流模块告警量",
    command: Buffer.from(`200140460000`),
    preprocessor: assembleCommand,
    parser: parseRectifierAlarms,
    options: ["整流模块告警量"],
  },
  {
    id: "DBDD11C1-DABD-B71B-4C68-A9E237CD54E0",
    controller: "开关电源",
    model: ["PSM-A"],
    name: "直流屏模拟量",
    command: Buffer.from(`200140460000`),
    preprocessor: assembleCommand,
    parser: parseDirectValues,
    options: ["直流屏电池组数据", "直流屏模拟量"],
  },
];
export default PROTOCOLS;

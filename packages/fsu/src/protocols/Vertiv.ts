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
import {
  ALTERNATING_ALARM_STATE,
  ALTERNATING_CUSTOM_STATE,
  AUTOMATION_STATE,
  COMMON_STATE,
  COMMUNICATION_STATE,
} from "../algorithm/enum";
import { DIRECT_VOLTAGE } from "../templates/signals";
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
        parser: parseAlternatingValues,
        options: { 用户自定义数据: [] },
      },
      {
        name: "交流屏状态量",
        command: Buffer.from(`200140430002FF`),
        preprocessor: assembleCommand,
        parser: parseAlternatingStatus,
        options: {
          用户自定义数据: [
            {
              id: "401300200",
              name: "交流切换状态",
              length: 1,
              enum: ALTERNATING_CUSTOM_STATE[0],
            },
            {
              id: "401300300",
              name: "事故照明灯状态",
              length: 1,
              enum: ALTERNATING_CUSTOM_STATE[0],
            },
            {
              id: "401300400",
              name: "当前工作路号",
              length: 1,
              enum: ALTERNATING_CUSTOM_STATE[0],
            },
          ],
        },
      },
      {
        name: "交流屏告警量",
        command: Buffer.from(`200140440002FF`),
        preprocessor: assembleCommand,
        parser: parseAlternatingAlarms,
        options: {
          用户自定义数据: [
            {
              id: "401300200",
              name: "交流输入空开",
              length: 1,
              enum: ALTERNATING_ALARM_STATE[0],
            },
            {
              id: "401300300",
              name: "交流输出空开",
              length: 1,
              enum: ALTERNATING_ALARM_STATE[0],
            },
            {
              id: "401300400",
              name: "防雷器",
              length: 1,
              enum: ALTERNATING_ALARM_STATE[0],
            },
            {
              id: "401300200",
              name: "交流输入1",
              length: 1,
              enum: ALTERNATING_ALARM_STATE[0],
            },
            {
              id: "401300300",
              name: "交流输入2",
              length: 1,
              enum: ALTERNATING_ALARM_STATE[0],
            },
            {
              id: "401300400",
              name: "交流输入3",
              length: 1,
              enum: ALTERNATING_ALARM_STATE[0],
            },
            {
              id: "401300200",
              name: "市电切换",
              length: 1,
              enum: ALTERNATING_ALARM_STATE[0],
            },
            {
              id: "401300300",
              name: "交流屏通讯",
              length: 1,
              enum: ALTERNATING_ALARM_STATE[0],
            },
          ],
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
          用户自定义数据: [
            {
              id: "401110300",
              name: "模块温度",
              unit: "℃",
              length: 4,
            },
            {
              id: "401113900",
              name: "模块限流点（百分数）",
              unit: "%",
              length: 4,
            },
            {
              id: "401114100",
              name: "模块输出电压",
              unit: "",
              length: 4,
            },
            {
              id: "401114100",
              name: "输出电压保护点",
              unit: "",
              length: 4,
            },
          ],
        },
      },
      {
        name: "整流模块状态量",
        command: Buffer.from(`200140460000`),
        preprocessor: assembleCommand,
        parser: parseRectifierStatus,
        options: {
          用户自定义数据: [
            {
              id: "401110300",
              name: "自动/手动状态",
              length: 1,
              enum: AUTOMATION_STATE,
            },
          ],
        },
      },
      {
        name: "整流模块告警量",
        command: Buffer.from(`200140460000`),
        preprocessor: assembleCommand,
        parser: parseRectifierAlarms,
        options: {
          用户自定义数据: [
            {
              id: "401110100",
              name: "模块保护",
              length: 1,
              enum: COMMON_STATE,
            },
            {
              id: "401110100",
              name: "风扇故障",
              length: 1,
              enum: COMMON_STATE,
            },
            {
              id: "401110100",
              name: "模块过温",
              length: 1,
              enum: COMMON_STATE,
            },
            {
              id: "401110100",
              name: "模块通讯中断",
              length: 1,
              enum: COMMUNICATION_STATE,
            },
          ],
        },
      },
      {
        name: "直流屏模拟量",
        command: Buffer.from(`200140460000`),
        preprocessor: assembleCommand,
        parser: parseDirectValues,
        options: {
          用户自定义电池组数据: [
            {
              ...DIRECT_VOLTAGE,
              id: "401110100",
              name: "电压",
              length: 4,
            },
          ],
          用户自定义数据: [
            {
              id: "401110100",
              name: "电池房温度",
              length: 4,
              unit: "℃",
            },
            {
              id: "401110100",
              name: "测点1温度",
              length: 4,
              unit: "℃",
            },
            {
              id: "401110100",
              name: "测点2温度",
              length: 4,
              unit: "℃",
            },
          ],
        },
      },
      {
        name: "直流屏参数",
        command: Buffer.from(`200140460000`),
        preprocessor: assembleCommand,
        parser: parseDirectParameters,
        options: {
          用户自定义数据: [
            {
              ...DIRECT_VOLTAGE,
              id: "401110100",
              name: "电池组1过压告警点",
              length: 4,
            },

            {
              ...DIRECT_VOLTAGE,
              id: "401110100",
              name: "电池组1欠压告警点",
              length: 4,
            },
            {
              ...DIRECT_VOLTAGE,
              id: "401110100",
              name: "电池组1充电过流告警点",
              length: 4,
            },
            {
              ...DIRECT_VOLTAGE,
              id: "401110100",
              name: "电池组2过压告警点",
              length: 4,
            },
            {
              ...DIRECT_VOLTAGE,
              id: "401110100",
              name: "电池组2欠压告警点",
              length: 4,
            },
            {
              ...DIRECT_VOLTAGE,
              id: "401110100",
              name: "电池组2充电过流告警点",
              length: 4,
            },
            {
              ...DIRECT_VOLTAGE,
              id: "401110100",
              name: "电池房过温告警点",
              length: 4,
            },
            {
              ...DIRECT_VOLTAGE,
              id: "401110100",
              name: "测点1过温告警点",
              length: 4,
            },
            {
              ...DIRECT_VOLTAGE,
              id: "401110100",
              name: "测点2过温告警点",
              length: 4,
            },
          ],
        },
      },
    ],
  },
];

export default PROTOCOLS;

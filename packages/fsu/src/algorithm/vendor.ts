import { DIRECT_VOLTAGE } from "./signals";
import {
  ALTERNATING_ALARM_STATE,
  ALTERNATING_CUSTOM_STATE,
  AUTOMATION_STATE,
  COMMON_STATE,
  COMMUNICATION_STATE,
} from "./enum";

/**
 * 厂家自定义数据
 */

export const CUSTOM_PROPERTIES = [
  {
    name: "交流屏状态量",
    model: ["PSM-A"],
    properties: [
      {
        name: "交流切换状态",
        length: 1,
        enum: ALTERNATING_CUSTOM_STATE[0],
      },
      {
        name: "事故照明灯状态",
        length: 1,
        enum: ALTERNATING_CUSTOM_STATE[0],
      },
      {
        name: "当前工作路号",
        length: 1,
        enum: ALTERNATING_CUSTOM_STATE[0],
      },
    ],
  },
  {
    name: "交流屏告警量",
    model: ["PSM-A"],
    properties: [
      {
        name: "交流输入空开",
        length: 1,
        enum: ALTERNATING_ALARM_STATE[0],
        normalValue: 0x00,
      },
      {
        name: "交流输出空开",
        length: 1,
        enum: ALTERNATING_ALARM_STATE[0],
        normalValue: 0x00,
      },
      {
        name: "防雷器",
        length: 1,
        enum: ALTERNATING_ALARM_STATE[0],
        normalValue: 0x00,
      },
      {
        name: "交流输入1",
        length: 1,
        enum: ALTERNATING_ALARM_STATE[0],
        normalValue: 0x00,
      },
      {
        name: "交流输入2",
        length: 1,
        enum: ALTERNATING_ALARM_STATE[0],
        normalValue: 0x00,
      },
      {
        name: "交流输入3",
        length: 1,
        enum: ALTERNATING_ALARM_STATE[0],
      },
      {
        name: "市电切换",
        length: 1,
        enum: ALTERNATING_ALARM_STATE[0],
        normalValue: 0x00,
      },
      {
        name: "交流屏通讯",
        length: 1,
        enum: ALTERNATING_ALARM_STATE[0],
        normalValue: 0x00,
      },
    ],
  },
  {
    name: "整流模块模拟量",
    model: ["PSM-A"],
    properties: [
      {
        name: "模块温度",
        unit: "℃",
        length: 4,
      },
      {
        name: "模块限流点（百分数）",
        unit: "%",
        length: 4,
      },
      {
        name: "模块输出电压",
        unit: "V",
        length: 4,
      },
      {
        name: "输出电压保护点",
        unit: "",
        length: 4,
      },
    ],
  },
  {
    name: "整流模块状态量",
    model: ["PSM-A"],
    properties: [
      {
        name: "自动/手动状态",
        length: 1,
        enum: AUTOMATION_STATE,
      },
    ],
  },
  {
    name: "整流模块告警量",
    model: ["PSM-A"],
    properties: [
      {
        name: "模块保护",
        length: 1,
        enum: COMMON_STATE,
        normalValue: 0x00,
      },
      {
        name: "风扇故障",
        length: 1,
        enum: COMMON_STATE,
        normalValue: 0x00,
      },
      {
        name: "模块过温",
        length: 1,
        enum: COMMON_STATE,
        normalValue: 0x00,
      },
      {
        name: "模块通讯中断",
        length: 1,
        enum: COMMUNICATION_STATE,
        normalValue: 0x00,
      },
    ],
  },
  {
    name: "直流屏电池组数据",
    model: ["PSM-A"],
    properties: [
      {
        ...DIRECT_VOLTAGE,
        name: "电压",
        length: 4,
      },
    ],
  },
  {
    name: "直流屏模拟量",
    model: ["PSM-A"],
    properties: [
      {
        name: "电池房温度",
        length: 4,
        unit: "℃",
      },
      {
        name: "测点1温度",
        length: 4,
        unit: "℃",
      },
      {
        name: "测点2温度",
        length: 4,
        unit: "℃",
      },
    ],
  },
];

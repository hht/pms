import { DIRECT_VOLTAGE } from "../templates/signals";
import {
  ALTERNATING_ALARM_STATE,
  ALTERNATING_CUSTOM_STATE,
  AUTOMATION_STATE,
  COMMON_STATE,
  COMMUNICATION_STATE,
} from "./enum";

export const DEFINITIONS = {
  "交流屏模拟量-#1": {
    descriptions: "适用于维谛PSM-A",
    properties: [
      {
        id: "4013002",
        name: "交流切换状态",
        length: 1,
        enum: ALTERNATING_CUSTOM_STATE[0],
      },
      {
        id: "4013003",
        name: "事故照明灯状态",
        length: 1,
        enum: ALTERNATING_CUSTOM_STATE[0],
      },
      {
        id: "4013004",
        name: "当前工作路号",
        length: 1,
        enum: ALTERNATING_CUSTOM_STATE[0],
      },
    ],
  },
  "交流屏告警量-#1": {
    description: "适用于维谛PSM-A",
    properties: [
      {
        id: "4013002",
        name: "交流输入空开",
        length: 1,
        enum: ALTERNATING_ALARM_STATE[0],
      },
      {
        id: "4013003",
        name: "交流输出空开",
        length: 1,
        enum: ALTERNATING_ALARM_STATE[0],
      },
      {
        id: "4013004",
        name: "防雷器",
        length: 1,
        enum: ALTERNATING_ALARM_STATE[0],
      },
      {
        id: "4013002",
        name: "交流输入1",
        length: 1,
        enum: ALTERNATING_ALARM_STATE[0],
      },
      {
        id: "4013003",
        name: "交流输入2",
        length: 1,
        enum: ALTERNATING_ALARM_STATE[0],
      },
      {
        id: "4013004",
        name: "交流输入3",
        length: 1,
        enum: ALTERNATING_ALARM_STATE[0],
      },
      {
        id: "4013002",
        name: "市电切换",
        length: 1,
        enum: ALTERNATING_ALARM_STATE[0],
      },
      {
        id: "4013003",
        name: "交流屏通讯",
        length: 1,
        enum: ALTERNATING_ALARM_STATE[0],
      },
    ],
  },
  "整流模块模拟量-#1": {
    descriptions: "适用于维谛PSM-A",
    properties: [
      {
        id: "4011103",
        name: "模块温度",
        unit: "℃",
        length: 4,
      },
      {
        id: "4011139",
        name: "模块限流点（百分数）",
        unit: "%",
        length: 4,
      },
      {
        id: "4011141",
        name: "模块输出电压",
        unit: "",
        length: 4,
      },
      {
        id: "4011141",
        name: "输出电压保护点",
        unit: "",
        length: 4,
      },
    ],
  },
  "整流模块状态量-#1": {
    description: "适用于维谛PSM-A",
    properties: [
      {
        id: "4011103",
        name: "自动/手动状态",
        length: 1,
        enum: AUTOMATION_STATE,
      },
    ],
  },
  "整流模块告警量-#1": {
    description: "适用于维谛PSM-A",
    properties: [
      {
        id: "4011101",
        name: "模块保护",
        length: 1,
        enum: COMMON_STATE,
      },
      {
        id: "4011101",
        name: "风扇故障",
        length: 1,
        enum: COMMON_STATE,
      },
      {
        id: "4011101",
        name: "模块过温",
        length: 1,
        enum: COMMON_STATE,
      },
      {
        id: "4011101",
        name: "模块通讯中断",
        length: 1,
        enum: COMMUNICATION_STATE,
      },
    ],
  },
  "直流屏电池组数据-#1": {
    description: "适用于维谛PSM-A",
    properties: [
      {
        ...DIRECT_VOLTAGE,
        id: "4011101",
        name: "电压",
        length: 4,
      },
    ],
  },
  "直流屏模拟量-#1": {
    description: "适用于维谛PSM-A",
    properties: [
      {
        id: "4011101",
        name: "电池房温度",
        length: 4,
        unit: "℃",
      },
      {
        id: "4011101",
        name: "测点1温度",
        length: 4,
        unit: "℃",
      },
      {
        id: "4011101",
        name: "测点2温度",
        length: 4,
        unit: "℃",
      },
    ],
  },
  "直流屏参数-#1": {
    description: "适用于维谛PSM-A",
    properties: [
      {
        ...DIRECT_VOLTAGE,
        id: "4011101",
        name: "电池组1过压告警点",
        length: 4,
      },

      {
        ...DIRECT_VOLTAGE,
        id: "4011101",
        name: "电池组1欠压告警点",
        length: 4,
      },
      {
        ...DIRECT_VOLTAGE,
        id: "4011101",
        name: "电池组1充电过流告警点",
        length: 4,
      },
      {
        ...DIRECT_VOLTAGE,
        id: "4011101",
        name: "电池组2过压告警点",
        length: 4,
      },
      {
        ...DIRECT_VOLTAGE,
        id: "4011101",
        name: "电池组2欠压告警点",
        length: 4,
      },
      {
        ...DIRECT_VOLTAGE,
        id: "4011101",
        name: "电池组2充电过流告警点",
        length: 4,
      },
      {
        ...DIRECT_VOLTAGE,
        id: "4011101",
        name: "电池房过温告警点",
        length: 4,
      },
      {
        ...DIRECT_VOLTAGE,
        id: "4011101",
        name: "测点1过温告警点",
        length: 4,
      },
      {
        ...DIRECT_VOLTAGE,
        id: "4011101",
        name: "测点2过温告警点",
        length: 4,
      },
    ],
  },
};

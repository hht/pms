import _ from "lodash";
import {
  ALTERNATING_ALARM_STATE,
  ALTERNATING_BREAKER_STATE,
  CHARGING_STATE,
  COMMON_STATE,
  POWER_STATE,
  SIGNAL_CODE,
  THROTTLING_STATE,
} from "../algorithm/enum";
import {
  ALTERNATING_FREQUENCY,
  ALTERNATING_VOLTAGE,
  ALTERNATING_CURRENT,
  DIRECT_VOLTAGE,
  DIRECT_CURRENT,
} from "./signals";

const Template: {
  [key: string]: (Signal[] | string)[];
} = {
  /**
   * 交流屏模拟量模版，数组数据顺序为:
   * 单屏一路数据
   * 单屏一路用户自定义数据
   * 单屏数据
   * */
  交流屏模拟量: [
    [
      {
        ...ALTERNATING_VOLTAGE,
        name: "输入电压A",
        id: SIGNAL_CODE["输入电压A"],
      },
      {
        ...ALTERNATING_VOLTAGE,
        name: "输入电压B",
        id: SIGNAL_CODE["输入电压B"],
      },
      {
        ...ALTERNATING_VOLTAGE,
        name: "输入电压C",
        id: SIGNAL_CODE["输入电压C"],
      },
      {
        ...ALTERNATING_FREQUENCY,
        name: "输入频率",
        id: SIGNAL_CODE["输入频率"],
      },
    ],
    "用户自定义数据",
    [
      {
        ...ALTERNATING_CURRENT,
        name: "输出电流A",
        id: SIGNAL_CODE["输出电流A"],
      },
      {
        ...ALTERNATING_CURRENT,
        name: "输出电流B",
        id: SIGNAL_CODE["输出电流B"],
      },
      {
        ...ALTERNATING_CURRENT,
        name: "输出电流C",
        id: SIGNAL_CODE["输出电流C"],
      },
    ],
  ],
  /**
   * 交流屏状态量模版，数组数据顺序为:
   * 单屏状态
   * 单屏用户自定义数据
   * */
  交流屏状态量: [
    [
      {
        name: "防雷器空开跳闸",
        length: 1,
        id: "4013109",
        enum: ALTERNATING_BREAKER_STATE,
        normalValue: 0x00,
      },
    ],
    "用户自定义数据",
  ],
  /**
   * 交流屏告警量模版，数组数据顺序为:
   * 单屏一路告警
   * 单屏一路开关告警
   * 单屏用户自定义数据
   * 单屏告警
   * */
  交流屏告警量: [
    [
      {
        name: "输入电压A",
        id: SIGNAL_CODE["输入电压A"],
        length: 1,
        enum: ALTERNATING_ALARM_STATE[0],
      },
      {
        name: "输入电压B",
        id: SIGNAL_CODE["输入电压B"],
        length: 1,
        enum: ALTERNATING_ALARM_STATE[0],
      },
      {
        name: "输入电压C",
        id: SIGNAL_CODE["输入电压C"],
        length: 1,
        enum: ALTERNATING_ALARM_STATE[0],
      },
      {
        name: "输入频率",
        id: SIGNAL_CODE["输入频率"],
        length: 1,
        enum: ALTERNATING_ALARM_STATE[0],
      },
    ],
    [
      {
        name: "融丝/开关",
        id: SIGNAL_CODE["融丝/开关"],
        length: 1,
        enum: ALTERNATING_ALARM_STATE[0],
      },
    ],
    "用户自定义数据",
    [
      {
        name: "输出电流A",
        id: SIGNAL_CODE["输出电流A"],
        length: 1,
        enum: ALTERNATING_ALARM_STATE[0],
      },
      {
        name: "输出电流B",
        id: SIGNAL_CODE["输出电流A"],
        length: 1,
        enum: ALTERNATING_ALARM_STATE[0],
      },
      {
        name: "输出电流C",
        id: SIGNAL_CODE["输出电流C"],
        length: 1,
        enum: ALTERNATING_ALARM_STATE[0],
      },
    ],
  ],
  /**
   * 整流模块模拟量模版，数组数据顺序为:
   * 整流模块输出电压
   * 整流模块输出电流
   * 用户自定义数据
   * */
  整流模块模拟量: [
    [
      {
        ...DIRECT_VOLTAGE,
        name: "输出电压",
        id: SIGNAL_CODE["输出电压"],
      },
    ],
    [
      {
        ...DIRECT_CURRENT,
        name: "输出电流",
        id: SIGNAL_CODE["输出电流"],
      },
    ],
    "用户自定义数据",
  ],
  /**
   * 整流模块状态量模版，数组数据顺序为:
   * 整流模块状态
   * 用户自定义数据
   * */
  整流模块状态量: [
    [
      {
        name: "开机/关机状态",
        id: SIGNAL_CODE["开机/关机状态"],
        length: 1,
        enum: POWER_STATE,
      },
      {
        name: "限流/不限流状态",
        id: SIGNAL_CODE["限流/不限流状态"],
        length: 1,
        enum: THROTTLING_STATE,
      },
      {
        name: "浮充/均充/测试状态",
        id: SIGNAL_CODE["浮充/均充/测试状态"],
        length: 1,
        enum: CHARGING_STATE,
      },
    ],
    "用户自定义数据",
  ],
  /**
   * 整流模块告警量模版，数组数据顺序为:
   * 整流模块告警
   * 用户自定义数据
   */
  整流模块告警量: [
    [
      {
        name: "整流模块状态",
        length: 1,
        id: SIGNAL_CODE["整流模块状态"],
        enum: COMMON_STATE,
      },
    ],
    "用户自定义数据",
  ],
  /**
   * 直流屏模拟量模版
   */
  直流屏模拟量: [
    [
      {
        ...DIRECT_VOLTAGE,
        name: "直流输出电压",
        id: SIGNAL_CODE["直流输出电压"],
      },
      { ...DIRECT_CURRENT, name: "总负载电流", id: SIGNAL_CODE["总负载电流"] },
    ],
    [{ ...DIRECT_CURRENT, name: "电流", id: SIGNAL_CODE["冲放电电流"] }],
    [{ ...DIRECT_CURRENT, name: "电流", id: SIGNAL_CODE["直流分路电流"] }],
    "用户自定义电池组数据",
    "用户自定义数据",
  ],
};

export const getTemplate = (
  name: string,
  customOptions: { [key: string]: Signal[] }
) => {
  return Template[name]!.map((it) => (_.isString(it) ? customOptions[it] : it));
};

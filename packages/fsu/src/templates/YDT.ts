import _ from "lodash";
import {
  ALTERNATING_ALARM_STATE,
  ALTERNATING_BREAKER_STATE,
  CHARGING_STATE,
  COMMON_STATE,
  POWER_STATE,
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
        id: "4011101",
      },
      {
        ...ALTERNATING_VOLTAGE,
        name: "输入电压B",
        id: "4011102",
      },
      {
        ...ALTERNATING_VOLTAGE,
        name: "输入电压C",
        id: "4011103",
      },
      { ...ALTERNATING_FREQUENCY, name: "输入频率", id: "4011139" },
    ],
    "用户自定义数据",
    [
      {
        ...ALTERNATING_CURRENT,
        name: "输出电流A",
        id: "4011115",
      },
      {
        ...ALTERNATING_CURRENT,
        name: "输出电流B",
        id: "4011116",
      },
      {
        ...ALTERNATING_CURRENT,
        name: "输出电流C",
        id: "4011117",
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
        name: "空开状态",
        length: 1,
        id: "4013001",
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
        id: "4011101",
        length: 1,
        enum: ALTERNATING_ALARM_STATE[0],
      },
      {
        name: "输入电压B",
        id: "4011102",
        length: 1,
        enum: ALTERNATING_ALARM_STATE[0],
      },
      {
        name: "输入电压C",
        id: "4011103",
        length: 1,
        enum: ALTERNATING_ALARM_STATE[0],
      },
      {
        name: "输入频率",
        id: "4011139",
        length: 1,
        enum: ALTERNATING_ALARM_STATE[0],
      },
    ],
    [
      {
        name: "融丝/开关",
        id: "4011141",
        length: 1,
        enum: ALTERNATING_ALARM_STATE[0],
      },
    ],
    "用户自定义数据",
    [
      {
        name: "输出电流A",
        id: "4011115",
        length: 1,
        enum: ALTERNATING_ALARM_STATE[0],
      },
      {
        name: "输出电流B",
        id: "4011116",
        length: 1,
        enum: ALTERNATING_ALARM_STATE[0],
      },
      {
        name: "输出电流C",
        id: "4011117",
        length: 1,
        enum: ALTERNATING_ALARM_STATE[0],
      },
    ],
  ],
  /**
   * 交流屏参数模版，数组数据顺序为:
   * 配电屏参数
   * 用户自定义数据
   * */
  交流屏参数: [
    [
      {
        name: "输入电压上限",
        id: "4011101",
        unit: "V",
        length: 4,
      },
      {
        name: "输入电压下限",
        id: "4011102",
        unit: "V",
        length: 4,
      },
      {
        name: "输入电流上限",
        id: "4011103",
        unit: "A",
        length: 4,
      },
      {
        name: "频率上限",
        id: "4011139",
        unit: "Hz",
        length: 4,
      },
      {
        name: "频率下限",
        id: "4011141",
        unit: "Hz",
        length: 4,
      },
    ],
    "用户自定义数据",
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
        id: "4011101",
      },
    ],
    [
      {
        ...DIRECT_CURRENT,
        name: "输出电流",
        id: "4011101",
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
        id: "4011101",
        length: 1,
        enum: POWER_STATE,
      },
      {
        name: "限流/不限流状态",
        id: "4011101",
        length: 1,
        enum: THROTTLING_STATE,
      },
      {
        name: "浮充/均充/测试状态",
        id: "4011101",
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
        name: "状态",
        length: 1,
        id: "4011101",
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
      { ...DIRECT_VOLTAGE, name: "直流输出电压", id: "4011101" },
      { ...DIRECT_CURRENT, name: "总负载电流", id: "4011101" },
    ],
    [{ ...DIRECT_CURRENT, name: "电流", id: "4011101" }],
    [{ ...DIRECT_CURRENT, name: "电流", id: "4011101" }],
    "用户自定义电池组数据",
    "用户自定义数据",
  ],
  /**
   * 直流屏参数模版
   */
  直流屏参数: [
    [
      { ...DIRECT_VOLTAGE, name: "直流电压上限", id: "4011101" },
      { ...DIRECT_CURRENT, name: "直流电压下限", id: "4011101" },
    ],
    "用户自定义数据",
  ],
};

export const getTemplate = (
  name: string,
  customOptions: { [key: string]: Signal[] }
) => {
  return Template[name]!.map((it) => (_.isString(it) ? customOptions[it] : it));
};

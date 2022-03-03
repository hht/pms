import _ from "lodash";
import {
  ALTERNATING_ALARM_STATE,
  ALTERNATING_BREAKER_STATE,
  ALTERNATING_CUSTOM_STATE,
  CHARGING_STATE,
  COMMON_STATE,
  COMMUNICATION_STATE,
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
        name: "输入线/相电压AB/A",
        id: "401110100",
      },
      {
        ...ALTERNATING_VOLTAGE,
        name: "输入线/相电压BC/B",
        id: "401110200",
      },
      {
        ...ALTERNATING_VOLTAGE,
        name: "输入线/相电压CA/C",
        id: "401110300",
      },
      { ...ALTERNATING_FREQUENCY, name: "输入频率", id: "401113900" },
    ],
    "用户自定义数据",
    [
      {
        ...ALTERNATING_CURRENT,
        name: "输出电流A",
        id: "401111500",
      },
      {
        ...ALTERNATING_CURRENT,
        name: "输出电流B",
        id: "401111600",
      },
      {
        ...ALTERNATING_CURRENT,
        name: "输出电流C",
        id: "401111700",
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
        unit: "",
        length: 1,
        id: "401300100",
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
        name: "输入线/相电压AB/A",
        id: "401110100",
        unit: "",
        length: 1,
        enum: ALTERNATING_ALARM_STATE[0],
      },
      {
        name: "输入线/相电压BC/B",
        id: "401110200",
        unit: "",
        length: 1,
        enum: ALTERNATING_ALARM_STATE[0],
      },
      {
        name: "输入线/相电压CA/C",
        id: "401110300",
        unit: "",
        length: 1,
        enum: ALTERNATING_ALARM_STATE[0],
      },
      {
        name: "输入频率",
        id: "401113900",
        unit: "",
        length: 1,
        enum: ALTERNATING_ALARM_STATE[0],
      },
    ],
    [
      {
        name: "融丝/开关",
        id: "401114100",
        unit: "",
        length: 1,
        enum: ALTERNATING_ALARM_STATE[0],
      },
    ],
    "用户自定义数据",
    [
      {
        name: "输出电流A",
        id: "401111500",
        unit: "",
        length: 1,
        enum: ALTERNATING_ALARM_STATE[0],
      },
      {
        name: "输出电流B",
        id: "401111600",
        unit: "",
        length: 1,
        enum: ALTERNATING_ALARM_STATE[0],
      },
      {
        name: "输出电流C",
        id: "401111700",
        unit: "",
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
        name: "交流输入线/相电压上限",
        id: "401110100",
        unit: "V",
        length: 4,
      },
      {
        name: "交流输入线/相电压下限",
        id: "401110200",
        unit: "V",
        length: 4,
      },
      {
        name: "交流输入电流上限",
        id: "401110300",
        unit: "A",
        length: 4,
      },
      {
        name: "频率上限",
        id: "401113900",
        unit: "Hz",
        length: 4,
      },
      {
        name: "频率下限",
        id: "401114100",
        unit: "",
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
        name: "整流模块输出电压",
        id: "401110100",
      },
    ],
    [
      {
        ...DIRECT_CURRENT,
        name: "整流模块输出电流",
        id: "401110100",
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
        id: "401110100",
        length: 1,
        enum: POWER_STATE,
      },
      {
        name: "限流/不限流状态",
        id: "401110100",
        length: 1,
        enum: THROTTLING_STATE,
      },
      {
        name: "浮充/均充/测试状态",
        id: "401110100",
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
        name: "整流模块故障",
        length: 1,
        id: "401110100",
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
      { ...DIRECT_VOLTAGE, name: "直流输出电压" },
      { ...DIRECT_CURRENT, name: "总负载电流" },
    ],
    [{ ...DIRECT_CURRENT, name: "电流" }],
    [{ ...DIRECT_CURRENT, name: "电流" }],
    "用户自定义电池组数据",
    "用户自定义数据",
  ],
  /**
   * 直流屏参数模版
   */
  直流屏参数: [
    [
      { ...DIRECT_VOLTAGE, name: "直流电压上限" },
      { ...DIRECT_CURRENT, name: "直流电压下限" },
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

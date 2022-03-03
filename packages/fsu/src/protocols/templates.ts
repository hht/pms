import { ALTERNATING_BREAKER_STATE, ALTERNATING_CUSTOM_STATE } from "./enum";
import {
  ALTERNATING_FREQUENCY,
  ALTERNATING_VOLTAGE,
  ALTERNATING_CURRENT,
} from "./signals";

export const VERTIVE_PSMA: Template = {
  name: "PMSA",
  protocol: "电总协议",
  description: "适用维谛PSM-A",
  components: {
    /**
     * 交流屏模拟量模版，数组数据顺序为:
     * 一路交流配电系统遥测内容
     * 一路交流配电系统遥测内容用户自定义数据
     * 单屏交流配电系统遥测量内容
     * */
    交流屏模拟量: [
      [
        {
          ...ALTERNATING_VOLTAGE,
          name: "输入线/相电压AB/A",
          prefix: "401110100",
        },
        {
          ...ALTERNATING_VOLTAGE,
          name: "输入线/相电压BC/B",
          prefix: "401110200",
        },
        {
          ...ALTERNATING_VOLTAGE,
          name: "输入线/相电压CA/C",
          prefix: "401110300",
        },
        { ...ALTERNATING_FREQUENCY, name: "输入频率", prefix: "401113900" },
      ],
      [],
      [
        {
          ...ALTERNATING_CURRENT,
          name: "交流屏输出电流A",
          prefix: "401111500",
        },
        {
          ...ALTERNATING_CURRENT,
          name: "交流屏输出电流B",
          prefix: "401111600",
        },
        {
          ...ALTERNATING_CURRENT,
          name: "交流屏输出电流C",
          prefix: "401111700",
        },
      ],
    ],
    /**
     * 交流屏状态量模版，数组数据顺序为:
     * 一路交流配电系统的状态
     * 一路交流配电系统遥测内容用户自定义数据
     * */
    交流屏状态量: [
      [
        {
          name: "空开状态",
          unit: "",
          length: 1,
          prefix: "401300100",
          enum: ALTERNATING_BREAKER_STATE,
          normalValue: 0x00,
        },
      ],
      [
        {
          name: "交流切换状态",
          unit: "",
          length: 1,
          prefix: "401300200",
          enum: ALTERNATING_CUSTOM_STATE[0],
        },
        {
          name: "事故照明灯状态",
          unit: "",
          length: 1,
          prefix: "401300300",
          enum: ALTERNATING_CUSTOM_STATE[0],
        },
        {
          name: "当前工作路号",
          unit: "",
          length: 1,
          prefix: "401300400",
          enum: ALTERNATING_CUSTOM_STATE[0],
        },
      ],
    ],
  },
};

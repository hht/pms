export const DEVICE_CODE: { [key: string]: string } = {
  组合开关电源: "419",
  温湿度传感器: "402",
};

export const SIGNAL_CODE: { [key: string]: string } = {
  输入电压A: "101",
  输入电压B: "102",
  输入电压C: "103",
  输出电压: "110",
  输出电流A: "115",
  输出电流B: "116",
  输出电流C: "117",
  输出电流: "118",
  防雷器空开跳闸: "109",
  "开机/关机状态": "002",
  "限流/不限流状态": "005",
  "浮充/均充/测试状态": "006",
  输入频率: "139",
  "融丝/开关": "10A",
  整流模块状态: "308",
  直流输出电压: "203",
  总负载电流: "204",
  直流分路电流: "205",
  冲放电电流: "275",
  交流切换状态: "902",
  事故照明灯状态: "009",
  当前工作路号: "015",
  防雷器: "905",
  交流输入: "015",
};

type T = Omit<Signal, "id" | "code">;

export const ALTERNATING_VOLTAGE: T = {
  name: "交流电压",
  unit: "V",
  length: 4,
  lowerMinorLimit: 200,
  lowerMajorLimit: 180,
  upperMinorLimit: 240,
  upperMajorLimit: 250,
};
export const ALTERNATING_CURRENT: T = {
  name: "交流电流",
  unit: "A",
  length: 4,
  lowerMinorLimit: 50,
  lowerMajorLimit: 48,
  upperMinorLimit: 54,
  upperMajorLimit: 56,
};
export const ALTERNATING_FREQUENCY: T = {
  name: "交流频率",
  unit: "Hz",
  length: 4,
  lowerMinorLimit: 200,
  lowerMajorLimit: 180,
  upperMinorLimit: 240,
  upperMajorLimit: 250,
};

export const DIRECT_VOLTAGE: T = {
  name: "直流电压",
  unit: "V",
  length: 4,
  lowerMinorLimit: 50,
  lowerMajorLimit: 48,
  upperMinorLimit: 54,
  upperMajorLimit: 56,
};

export const DIRECT_CURRENT: T = {
  name: "直流电流",
  unit: "A",
  length: 4,
  lowerMinorLimit: 50,
  lowerMajorLimit: 48,
  upperMinorLimit: 54,
  upperMajorLimit: 56,
};

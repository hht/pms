type T = Pick<
  Signal,
  | "name"
  | "unit"
  | "length"
  | "lowerMajorLimit"
  | "lowerMinorLimit"
  | "upperMajorLimit"
  | "upperMinorLimit"
>;

export const EVENT = {
  VALUE_RECEIVED: "valueReceived",
  ANALOG_VALUE_CHANGED: "analogValueChanged",
  DIGITAL_VALIE_CHANGED: "digitalValueChanged",
  ALARM_CHANGED: "alarmChanged",
  ALARM_OCCURED: "BEGIN",
  ALARM_DISMISSED: "END",
  ALARM_SETTLE: "alarmSettle",
  ERROR_LOG: "errorLog",
  SOAP_EVENT: "soapEvent",
  DISCONNECTED: "disconnected",
  DEVICE_ERROR: "deviceError",
};

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

export const DEVICE_CODE: { [key: string]: string } = {
  组合开关电源: "419",
  智能温湿度: "911",
  环境监测: "911",
};

export const SIGNAL_CODE: { [key: string]: string } = {
  输出电压: "110",
  输入电压A: "101",
  输入电压B: "102",
  输入电压C: "103",
  防雷器空开跳闸: "109",
  输出电流A: "115",
  输出电流B: "116",
  输出电流C: "117",
  输出电流: "118",
  输入频率: "139",
  直流输出电压: "203",
  总负载电流: "204",
  直流分路电流: "205",
  电池电压: "271",
  充放电电流: "275",

  空开状态: "001",
  "开机/关机状态": "002",
  "自动/手动状态": "003",
  "限流/不限流状态": "005",
  "浮充/均充/测试状态": "006",
  事故照明灯: "009",
  市电切换: "012",
  交流输入空开: "107",
  交流输出空开: "108",
  风扇: "164",
  "融丝/开关": "203",
  模块输出电压: "210",
  整流模块状态: "308",
  模块通讯: "340",
  模块温度: "404",
  "模块限流点（百分数）": "A3B",
  室内环境湿度: "432",
  // 环境采集器数据
  室内环境温度: "430",
  烟感: "605",
  水浸: "606",
  门磁: "608",
  输入相电压: "104",
  蓄电池组总电压: "274",

  // 无规范定义数据，以X开始
  当前工作路号: "X01",
  "交流输入#1": "X02",
  "交流输入#2": "X03",
  "交流输入#3": "X04",
  输出电压保护点: "X05",
  交流切换状态: "X06",
  模块保护: "X07",
  模块温度故障: "X08",
  交流屏通讯: "X09",
  电池房温度: "X10",
  测点1温度: "X11",
  测点2温度: "X12",
  防雷器: "X13",
  // 环境采集器通用数据
  模拟量: "Z01",
  开关量: "Z02",
};

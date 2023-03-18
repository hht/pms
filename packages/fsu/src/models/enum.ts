type T = Pick<
  Signal,
  | "name"
  | "unit"
  | "length"
  | "lowerMajorLimit"
  | "lowerMinorLimit"
  | "upperMajorLimit"
  | "upperMinorLimit"
  | "type"
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
  type: 1,
};

export const ALTERNATING_CURRENT: T = {
  name: "交流电流",
  unit: "A",
  length: 4,
  lowerMinorLimit: 50,
  lowerMajorLimit: 48,
  upperMinorLimit: 54,
  upperMajorLimit: 56,
  type: 1,
};
export const ALTERNATING_FREQUENCY: T = {
  name: "交流频率",
  unit: "Hz",
  length: 4,
  lowerMinorLimit: 200,
  lowerMajorLimit: 180,
  upperMinorLimit: 240,
  upperMajorLimit: 250,
  type: 1,
};

export const DIRECT_VOLTAGE: T = {
  name: "直流电压",
  unit: "V",
  length: 4,
  lowerMinorLimit: 50,
  lowerMajorLimit: 48,
  upperMinorLimit: 54,
  upperMajorLimit: 56,
  type: 1,
};

export const DIRECT_CURRENT: T = {
  name: "直流电流",
  unit: "A",
  length: 4,
  lowerMinorLimit: 50,
  lowerMajorLimit: 48,
  upperMinorLimit: 54,
  upperMajorLimit: 56,
  type: 1,
};

export const DEVICE_CODE: { [key: string]: string } = {
  组合开关电源: "419",
  智能温湿度: "911",
  环境监测: "911",
  单元式空调: "602",
  智能电表: "406",
};

export const SIGNAL_CODE: { [key: string]: string } = {
  输出电压: "110",
  直流电压: "110",
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
  交流AB线电压: "105",
  交流BC线电压: "106",
  交流CA线电压: "107",

  空开状态: "001",
  "开机/关机状态": "002",
  "自动/手动状态": "003",
  "限流/不限流状态": "005",
  "浮充/均充/测试状态": "006",
  事故照明灯: "009",
  市电切换: "012",
  交流输入空开: "107",
  交流输出空开: "108",
  "融丝/开关": "203",
  模块输出电压: "210",
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

  // 空调
  空调送风温度: "309",

  // 无规范定义数据，以X开始
  当前工作路号: "X01",
  风扇: "X02",
  整流模块状态: "X03",
  模块通讯: "X04",
  输出电压保护点: "X05",
  交流切换状态: "X06",
  模块保护: "X07",
  模块温度故障: "X08",
  交流屏通讯: "002",
  电池房温度: "X10",
  测点1温度: "X11",
  测点2温度: "X12",
  模块位置号: "X14",
  "WALK-In": "X15",
  模块的交流限功率: "X16",
  温度限功率: "X17",
  过压脱离: "X18",
  风扇全速: "X19",
  模块交流停电: "X20",
  模块交流欠压: "X21",
  模块限功率: "X22",
  "电池组#1电池电压": "X26",
  "电池组#1实际容量百分比": "X27",
  "电池组#2电池电压": "X28",
  "电池组#2实际容量百分比": "X29",
  "电池组#3电池电压": "X30",
  "电池组#3实际容量百分比": "X31",
  "电池组#4电池电压": "X32",
  "电池组#4实际容量百分比": "X33",
  LVD1状态: "X34",
  LVD2状态: "X35",
  电池组1供电过流: "X43",
  电池组2供电过流: "X45",
  电池组3供电过流: "X47",
  电池组4供电过流: "X49",
  直流屏通讯: "002",
  // 环境采集器通用数据
  模拟量: "Z01",
  开关量: "Z02",
};

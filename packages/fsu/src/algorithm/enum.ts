/**
 *
 */
export const DEVICE_ENUM = {
  组合开关电源: "419",
};

/**
 * 通用故障
 */
export const COMMON_STATE = {
  0x00: "正常",
  0x01: "故障",
};

/**
 * 开关状态
 */
export const ALTERNATING_BREAKER_STATE = {
  0x01: "闭合",
  0x02: "断开",
};
/**
 * 交流屏自定义状态列表
 */
export const ALTERNATING_CUSTOM_STATE = [
  {
    0xe0: "交流切换自动",
    0xe1: "交流切换手动",
    0xe2: "照明开",
    0xe3: "照明关",
    0xe4: "第一路",
    0xe5: "第二路",
    0xe6: "第三路",
    0xe7: "无工作路号",
  },
];
/**
 * 交流屏告警量列表
 */
export const ALTERNATING_ALARM_STATE = [
  {
    0x00: "正常",
    0x01: "低于下限",
    0x02: "高于上限",
    0x03: "缺相",
    0x04: "熔丝断",
    0x05: "开关断开",
    0xe0: "交流输入不平衡",
    0xe1: "停电",
    0xe2: "中断",
    0xe3: "切换失败",
  },
];

/**
 * 电总规定的返回码
 */
export const RTN: { [key: number]: string } = {
  0x1: "协议版本错",
  0x2: "CHKSUM错",
  0x3: "LCHKSUM错",
  0x4: "CID2无效",
  0x5: "命令格式错",
  0x6: "无效数据",
};

/**
 * 厂家自定义返回码列表
 */
export const CUSTOM_RTN = [
  {
    0xe0: "无效权限",
    0xe1: "操作失败",
    0xe2: "设备故障",
    0xe3: "设备写保护",
  },
];

/**
 * 开关机
 */
export const POWER_STATE = {
  0x00: "开机",
  0x01: "关机",
};

/**
 * 限流状态
 */
export const THROTTLING_STATE = {
  0x00: "限流",
  0x01: "不限流",
};

/**
 * 充电状态
 */
export const CHARGING_STATE = {
  0x00: "浮充",
  0x01: "均充",
  0x02: "测试",
};

/**
 * 是否自动
 */
export const AUTOMATION_STATE = {
  0xe0: "自动",
  0xe1: "手动",
};

/**
 * 通讯故障
 */
export const COMMUNICATION_STATE = {
  0x00: "正常",
  0xe2: "通讯中断",
};

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

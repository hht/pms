/**
 * 导出所有协议
 */
import TemperatureHuminitySensor from "./TemperatureHuminitySensor";
import Vertiv from "./Vertiv";
export const GLOBAL_INTERVAL = 10;

export const PROTOCOLS = [...TemperatureHuminitySensor, ...Vertiv];

/**
 * 获取系统信息
 */
import OS from "os-utils";
import { SerialPort } from "serialport";
import { PROTOCOLS } from "../protocols";
import _ from "lodash";

/**
 * 获取CPU使用情况
 * @returns
 */
const getCpuUsage = () =>
  new Promise<number>((resolve) => OS.cpuUsage(resolve));

/**
 * 获取系统信息
 * @returns cpu及内存使用情况
 */
export const getSystemInfo = async () => {
  const cpu = await getCpuUsage();
  const mem = 1 - OS.freememPercentage();
  return { cpu, mem };
};

/**
 * 获取系统所有串口信息
 * @returns
 */
export const getPorts = async () => {
  return await SerialPort.list();
};

/**
 * 获取系统支持的所有设备协议
 * @returns
 */
export const getProtocols = async () => {
  return _.chain(PROTOCOLS)
    .map((it) => ({
      id: it.id,
      manufacturer: it.manufacturer,
      name: it.name,
      model: it.model,
      command: it.commands[0].input.valueOf(),
    }))
    .groupBy("manufacturer")
    .value();
};

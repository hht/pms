/**
 * 获取系统信息
 */
import OS from "os-utils";
import { SerialPort } from "serialport";
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

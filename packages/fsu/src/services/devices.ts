/**
 * 局站信息设置
 */
import _ from "lodash";

import { PrismaClient } from "@prisma/client";
import { scheduleCron } from "./gather";
import { GLOBAL_INTERVAL, PROTOCOLS } from "../protocols";
import { CONTROLLER_CODE } from "../algorithm/enum";

const prisma = new PrismaClient();

/**
 * 获取局站信息
 * @returns
 */
export const getUnit = async () => {
  return await prisma.unit.findFirst({
    where: {
      id: 1,
    },
  });
};

/**
 * 创建或更新局站信息
 * @param unit 局站信息
 * @returns
 */
export const upsertUnit = async (unit: Unit) => {
  const updated = unit.id
    ? await prisma.unit.update({
        where: { id: unit.id },
        data: _.omitBy(unit, _.isUndefined),
      })
    : await prisma.unit.create({
        data: unit,
      });
  return updated;
};

/**
 * 获取设备列表
 * @returns
 */
export const getDevices = async () => {
  return await prisma.device.findMany();
};

/**
 * 获取设备详情
 * @param id 设备ID
 * @returns
 */
export const getDevice = async (id: number) => {
  return await prisma.device.findFirst({
    where: {
      id,
    },
  });
};

/**
 * 创建或更新设备
 * @param device 设备信息
 * @returns
 */
export const upsertDevice = async (device: Device) => {
  const unit = await getUnit();
  const code = CONTROLLER_CODE[device.controller];
  if (device.id) {
    return await prisma.device.update({
      data: { ..._.omitBy(device, _.isUndefined), code },
      where: { id: device.id },
    });
  }
  return await prisma.device.create({
    data: { ..._.omit(device, "id"), code },
  });
};
/**
 * 删除设备
 * @param id 设备ID
 * @returns
 */
export const deleteDevice = async (id: number) => {
  const deleted = await prisma.device.delete({
    where: { id },
  });
  // 如果设备删除成功则重置计划任务
  scheduleCron(GLOBAL_INTERVAL);
  return deleted;
};

/**
 * 获取设备采样点信息
 */
export const getSignals = async (id: number) => {
  return await prisma.signal.findMany({
    where: {
      deviceId: id,
    },
  });
};

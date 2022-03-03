/**
 * 局站信息设置
 */
import _ from "lodash";

import { PrismaClient } from "@prisma/client";
import { scheduleCron } from "./gather";
import { GLOBAL_INTERVAL } from "../protocols";

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
  if (device.id) {
    await prisma.device.delete({
      where: { id: device.id },
    });
  }
  const updated = await prisma.device.create({
    data: { ..._.omit(device, "id"), unitId: unit!.id },
  });
  // 如果设备更新成功则重置计划任务
  scheduleCron(GLOBAL_INTERVAL);
  return updated;
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

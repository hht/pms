/**
 * 局站信息设置
 */
import _ from "lodash";
import { networkInterfaces } from "os";
import { PrismaClient } from "@prisma/client";
import { DEVICE_CODE } from "../models/enum";
import dayjs from "dayjs";
import { changeFtpUser } from "./system";

const getNetworkAddress = async () => {
  const nets = networkInterfaces();
  return nets["enp3s0"]?.[0]?.address;
};

export const prisma = new PrismaClient({
  errorFormat: "minimal",
});

/**
 * 获取局站信息
 * @returns
 */
export const getUnit = async () => {
  const unit = await prisma.unit.findFirst({
    where: {
      id: 1,
    },
  });
  if (!unit) {
    return await prisma.unit.create({
      data: {
        id: 1,
        localAddress: (await getNetworkAddress()) ?? "",
        port: 21,
        manufacturer: "电服中心",
        unitVersion: "1.01",
        userName: "admin",
        password: "CTSC@2020",
      },
    });
  }
  return unit;
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
        data: _.omitBy(
          _.omit(unit, ["userName", "password", "localAddress", "port"]),
          _.isUndefined
        ),
      })
    : await prisma.unit.create({
        data: unit,
      });
  return updated;
};

/**
 * 修改FTP信息
 * @param unit 局站信息
 * @returns
 */
export const upsertFTP = async (
  unit: Pick<Unit, "userName" | "password" | "id">
) => {
  if (!unit.userName || !unit.password) {
    throw "用户名和密码不能为空";
  }
  const updated = await prisma.unit.update({
    where: { id: unit.id },
    data: unit,
  });
  await changeFtpUser(unit.userName!, unit.password!);
  return updated;
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
    include: {
      signals: true,
    },
  });
};

/**
 * 创建或更新设备
 * @param device 设备信息
 * @returns
 */
export const upsertDevice = async (device: Device) => {
  const code = DEVICE_CODE[device.controller];
  if (device.id) {
    return await prisma.device.update({
      data: {
        ..._.chain(device)
          .omit("signals")
          .omit("commands")
          .omitBy(_.isUndefined)
          .value(),
        code,
        productionAt: dayjs(device.productionAt).toDate(),
      },
      where: { id: device.id },
    });
  }
  return await prisma.device.create({
    data: {
      ..._.omit(device, "id"),
      productionAt: dayjs(device.productionAt).toDate(),
      code,
    },
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

/**
 * 更新设备采样点信息
 */
export const saveSignals = async (id: number, values: Signal[]) => {
  const response = await prisma.$transaction(async (prisma) => {
    await prisma.signal.deleteMany({
      where: {
        deviceId: id,
      },
    });
    for (const value of values) {
      await prisma.signal.create({
        data: {
          ...(_.omit(value, [
            "enum",
            "deviceId",
            "index",
            "updateAt",
          ]) as Signal & {
            raw: number;
            value: string;
            normalValue: number;
            unit: string;
            offset: number;
          }),
          enum: (value.enum
            ? (JSON.stringify(value.enum) as string)
            : null) as any,
          device: {
            connect: {
              id,
            },
          },
        },
      });
    }
  });
  return response;
};

/**
 * 更新设备采样点数据
 */

export const updateSignal = async (value: Signal) => {
  return await prisma.signal.update({
    data: _.pick(value, ["raw", "value"]) as { raw: number; value: string },
    where: { id: value.id },
  });
};

/**
 * 局站信息设置
 */
import _ from "lodash";
import { PrismaClient } from "@prisma/client";
import { DEVICE_CODE } from "../models/enum";
import dayjs from "dayjs";
import { changeFtpUser, getMacAddress, getNetworkAddress } from "./system";
import { getSignalState } from "../utils";
import { recoverAlarms } from "./opetration";
import { IDevice } from "../models/Device";
export const DEVICES: IDevice[] = [];

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
        unitId: await getMacAddress(),
        manufacturer: "电服中心",
        unitVersion: "1.01",
        userName: "admin",
        password: "CTSC@2020",
        updatedAt: dayjs().toDate(),
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
        data: _.omitBy(_.omit(unit, ["userName", "password"]), _.isUndefined),
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
    throw "用户名或密码不能为空";
  }
  const updated = await prisma.unit.update({
    where: { id: unit.id },
    data: unit,
  });
  // await changeFtpUser(unit.userName!, unit.password!);
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
        deviceId: `${code}${device.serial}`,
        code,
        productionAt: dayjs(device.productionAt).toDate(),
      },
      where: { id: device.id },
    });
  }
  return await prisma.device.create({
    data: {
      ..._.omit(device, ["id", "signals"]),
      deviceId: `${code}${device.serial}`,
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
  const alarms = await prisma.alarm.findMany({
    where: {
      deviceId: `${deleted.code}${deleted.serial}`,
      state: {
        notIn: ["已清除", "已取消"],
      },
    },
  });

  await recoverAlarms(alarms, "设备已删除");

  // 如果设备删除成功则重置计划任务
  return deleted;
};

/**
 * 获取设备采样点信息
 */
export const getSignals = async (deviceId: string) => {
  return await prisma.signal.findMany({
    where: {
      deviceId,
    },
  });
};

/**
 * 更新设备采样点信息
 */
export const saveSignals = async (deviceId: string, values: Signal[]) => {
  const signals = await prisma.signal.findMany({
    where: {
      deviceId,
    },
  });
  const alarmIds = signals
    .filter((it) => it.alarm)
    .map((it) => it.alarm) as number[];
  const alarms = await prisma.alarm.findMany({
    where: {
      id: {
        in: alarmIds,
      },
      state: {
        notIn: ["已清除", "已取消"],
      },
    },
  });
  await recoverAlarms(alarms, "采样点已删除");
  await prisma.signal.deleteMany({
    where: {
      deviceId,
    },
  });
  console.log(values);
  for (const value of values) {
    await prisma.signal.create({
      data: {
        ...(_.omit(value, ["id", "enum", "deviceId", "updateAt"]) as Omit<
          Signal,
          "id"
        > & {
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
            deviceId,
          },
        },
      },
    });
  }
  return signals;
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

/**
 * 转换设备信息到B接口格式
 */

export const encodeDevice = async ({
  d,
  filter = (signal: Signal) => true,
  autoFill = true,
}: {
  d: SoapDevice;
  filter: (signal: Signal) => boolean;
  autoFill?: boolean;
}) => {
  const device = await prisma.device.findFirst({
    where: {
      deviceId: d.attributes.Id,
    },
    include: {
      signals: true,
    },
  });
  if (device) {
    const signals = _.isArray(d.Signal) ? d.Signal : d.Signal ? [d.Signal] : [];
    return {
      attributes: {
        ...d.attributes,
        ...(autoFill
          ? {
              Rid: device.resourceId,
              DeviceVender: device.manufacturer,
              DeviceType: device.model,
              MFD: dayjs(device.productionAt).format("YYYY-MM-DD"),
              ControllerType: device.controller,
              SoftwareVersion: device.version,
              BatchNo: device.batch,
            }
          : {}),
      },
      Signal: device.signals.filter((it) =>
        signals.length
          ? signals.map((s) => s.attributes.Id).includes(it.signalId)
          : filter(it as Signal)
      ),
    };
  }
  return {
    attributes: d.attributes,
  };
};

export const encodeDevices: (
  devices: SoapDevice[] | SoapDevice,
  filter: (signal: Signal) => boolean,
  mapper: (signal: Signal) => { [key: string]: string | number | null },
  autoFill?: boolean
) => Promise<any> = async (devices, filter, mapper, autoFill = false) => {
  const _devices = devices
    ? _.isArray(devices)
      ? devices
      : [devices]
    : (
        await prisma.device.findMany({
          include: { signals: false },
        })
      ).map((it) => ({
        attributes: {
          Id: `${it.code}${it.serial}`,
          Rid: it.resourceId,
          DeviceVender: it.manufacturer,
          DeviceType: it.model,
          BatchNo: "",
        },
      }));
  const response = await Promise.all(
    _devices?.map(async (it) => await encodeDevice({ d: it, filter, autoFill }))
  );
  return {
    DeviceList: {
      Device: response.map((it) => ({
        attributes: { ...it?.attributes },
        Signal: it?.Signal?.map((it) => {
          return {
            attributes: {
              Id: it.signalId,
              ...mapper(it as Signal),
            },
          };
        }),
      })),
    },
  };
};

export const decodeDevices: (
  devices: SoapDevice[] | SoapDevice
) => Promise<Partial<Signal & { deviceId: string }>[]> = async (devices) => {
  const response = [];
  const devs = _.isArray(devices) ? devices : [devices];
  for (const device of devs) {
    const signals = _.isArray(device.Signal)
      ? device.Signal
      : device.Signal
      ? [device.Signal]
      : [];
    response.push(
      ...(signals?.map((signal) => {
        const [a, b, c, d, e, f, g, h, i, j, k, l] =
          signal.attributes.Id.split("");
        return _.omitBy(
          {
            signalId: signal.attributes.Id,
            deviceId: device.attributes.Id,
            code: `${a}${b}${c}${d}${e}${f}${g}${h}${i}`,
            index: parseInt(`${j}${k}${l}`, 10),
            ..._.mapValues(
              {
                raw: signal.attributes.SetValue,
                upperMajorLimit: signal.attributes.SHLimit,
                upperMinorLimit: signal.attributes.HLimit,
                lowerMinorLimit: signal.attributes.LLimit,
                lowerMajorLimit: signal.attributes.SLLimit,
                threshold: signal.attributes.Threshold,
                thresholdPercent: signal.attributes.RelativeVal,
                interval: signal.attributes.IntervalTime,
                startDelay: signal.attributes.BDelay,
                endDelay: signal.attributes.EDelay,
              },
              (v) => _.parseInt(v ?? "NaN", 10)
            ),
          },
          (it) => _.isNaN(it) || _.isNull(it) || _.isUndefined(it)
        );
      }) ?? ([] as Partial<Signal>[]))
    );
  }
  return response;
};

export const encodeAlarm = (alarm: Alarm, flag?: "BEGIN" | "END") => ({
  SerialNo: _.padStart(`${alarm.id}`, 10, "0"),
  DeviceId: alarm.deviceId,
  DeviceRId: alarm.deviceResourceId,
  AlarmTime: dayjs(alarm.occuredAt).format("YYYY-MM-DD HH:mm:ss"),
  TriggerVal: alarm.value.replace(">", "&gt").replace("<", "&lt"),
  AlarmFlag: flag ?? "BEGIN",
  SignalId:
    alarm.signalId.substring(0, 3) +
    (alarm.signalId.substring(3, 4) === "1" ? "2" : "4") +
    alarm.signalId.substring(4),
  AlarmDesc: alarm.description,
});

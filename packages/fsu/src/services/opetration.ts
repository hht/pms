import _ from "lodash";
import { useUnitStore } from "../store";
import {
  decodeDevices,
  DEVICES,
  encodeAlarm,
  encodeDevice,
  encodeDevices,
  prisma,
} from "./orm";
import dayjs from "dayjs";
import { changeFtpUser, getSystemInfo } from "./system";
import { SoapClient } from "./soap";
import { SerialPort } from "serialport";
import { refetchDevices } from ".";

type Operation = (
  ...payload: any
) => Promise<[command: string, code: number | string, data: any]>;

export const getIdentity = (data: Signal) => {
  // @ts-ignore
  const device = DEVICES.find((it) => it.instance.deviceId === data.deviceId);
  return {
    deviceId: `${device?.instance.code}${device?.instance.serial}`,
    deviceResourceId: device?.instance.resourceId ?? "",
    signalId: data.signalId,
  };
};

const getValues = (data: Signal[], type: number[]) => {
  if (data.length) {
    const valuesByDeviceId = _.chain(data)
      .filter((it) => type.includes(it.type))
      .map((value) => ({
        ...value,
        ...getIdentity(value),
        signalId: value.signalId,
      }))
      .groupBy("deviceId")
      .value();
    const updated = _.keys(valuesByDeviceId).map((key) => {
      const signals = valuesByDeviceId[key];
      return {
        attributes: {
          Id: key,
          Rid: signals[0].deviceResourceId,
        },
        Signal: signals.map((it) => ({
          attributes: {
            Id: it.signalId,
            Value: `${it.raw}`,
          },
        })),
      };
    });
    return updated;
  }
  return [];
};

// FSU注册
export const bootstrap: Operation = async () => {
  const unit = useUnitStore.getState();
  const devices = await prisma.device.findMany();
  return [
    "LOGIN",
    "101",
    {
      UserName: unit.userName,
      PassWord: unit.password,
      SUIP: unit.localAddress,
      SUPort: unit.port,
      SUVendor: unit.manufacturer,
      SUModel: unit.model,
      SUHardVer: unit.unitVersion,
      Location: {
        Longitude: unit.longitude,
        Latitude: unit.latitude,
      },
      SUConfigTime: dayjs(unit.updatedAt).format("YYYY-MM-DD HH:mm:ss"),
      DeviceList: {
        Decice: devices.map((device) => ({
          attributes: {
            Id: `${device.code}${device.serial}`,
            Rid: device.resourceId,
            DeviceVender: device.manufacturer,
            DeviceType: device.model,
            MFD: dayjs(device.productionAt).format("YYYY-MM-DD"),
            ControllerType: device.controller,
            SoftwareVersion: device.version,
            BatchNo: device.batch,
          },
        })),
      },
      SUVer: "3.0",
    },
  ];
};

// 注销
export const dispose: Operation = async () => {
  return ["LOGOUT", "103", {}];
};

// 设置采集服务器IP
const setIP: Operation = async (ip: string) => {
  // await SoapClient.setClient(ip);
  return [
    "SET_IP_ACK",
    "106",
    {
      Result: 1,
    },
  ];
};

// 获取遥测量信息

const getAnalogValues: Operation = async (devices: SoapDevice[]) => {
  return [
    "GET_AIDATA_ACK",
    "202",
    {
      ReportTime: dayjs().format("YYYY-MM-DD HH:mm:ss"),
      Values: await encodeDevices(
        devices,
        (it) => it.type === 1,
        (it) => ({ Value: `${it.value}` })
      ),
    },
  ];
};

// 上报遥测量信息
export const setAnalogValues = async (data: any[]) => {
  const values = getValues(data as Value[], [1]);
  if (values.length) {
    SoapClient.invoke([
      "SEND_AIDATA",
      "203",
      {
        ReportTime: dayjs().format("YYYY-MM-DD HH:mm:ss"),
        Values: {
          DeviceList: {
            Device: values,
          },
        },
      },
    ]).catch(async (e) => {
      await prisma.history.create({
        data: {
          code: 205,
          payload: JSON.stringify(data),
        },
      });
    });
  }
};

// 获取遥信量信息
const getDigitalValues: Operation = async (devices: SoapDevice[]) => {
  return [
    "GET_DIDATA_ACK",
    "302",
    {
      ReportTime: dayjs().format("YYYY-MM-DD HH:mm:ss"),
      Values: await encodeDevices(
        devices,
        (it) => [2, 3, 4].includes(it.type),
        (it) => ({ Value: `${parseInt(`${it.value}`)}` })
      ),
    },
  ];
};

// 上报遥信量信息
export const setDigitalValues = async (data: any[]) => {
  const values = getValues(data as Value[], [2, 3, 4]);
  if (values.length) {
    SoapClient.invoke([
      "SEND_DIDATA",
      "303",
      {
        ReportTime: dayjs().format("YYYY-MM-DD HH:mm:ss"),
        Values: {
          DeviceList: {
            Device: values,
          },
        },
      },
    ]).catch(async () => {
      await prisma.history.create({
        data: {
          code: 305,
          payload: JSON.stringify(data),
        },
      });
    });
  }
};

// 上报本地缓存记录
export const sendLocalData = async (command: string, code: number) => {
  const history = await prisma.history.findMany({
    where: {
      code,
    },
  });
  const data = _.chain(history)
    .map((it) => JSON.parse(it.payload))
    .flatten()
    .value();
  if (history.length) {
    switch (code) {
      case 205:
        SoapClient.invoke([
          command,
          code,
          {
            Values: {
              DeviceList: {
                Device: getValues(data as Value[], [1]),
              },
            },
          },
        ])
          .then(async () => {
            await prisma.history.deleteMany({
              where: {
                code,
              },
            });
          })
          .catch((e) => {});
        return;
      case 305:
        SoapClient.invoke([
          command,
          code,
          {
            Values: {
              DeviceList: {
                Device: getValues(data as Value[], [2, 3, 4]),
              },
            },
          },
        ])
          .then(async () => {
            await prisma.history.deleteMany({
              where: {
                code,
              },
            });
          })
          .catch((e) => {});
        return;
      case 605:
        SoapClient.invoke([
          command,
          code,
          {
            Values: {
              DeviceList: {
                Device: getValues(data as Value[], [2, 4]),
              },
            },
          },
        ])
          .then(async () => {
            await prisma.history.deleteMany({
              where: {
                code,
              },
            });
          })
          .catch((e) => {});
        return;
        return;
    }
  }
};

// 获取遥调量信息
const getParameters: Operation = async (devices: SoapDevice[]) => {
  return [
    "GET_AODATA_ACK",
    "402",
    {
      Values: await encodeDevices(
        devices,
        (it) => it.type === 6,
        (it) => ({
          SetValue: it.raw,
          SHLimit: it.upperMajorLimit ?? "",
          HLimit: it.upperMinorLimit ?? "",
          LLimit: it.lowerMinorLimit ?? "",
          SLLimit: it.lowerMajorLimit ?? "",
          Threshold: it.threshold ?? "",
          RelativeVal: it.thresholdPercent ?? "",
          IntervalTime: it.interval ?? "",
        })
      ),
    },
  ];
};

// 设置遥调量信息
const setParameters: Operation = async (devices: SoapDevice[]) => {
  const updated = await decodeDevices(devices);
  console.log(updated);
  for (const signal of updated) {
    await prisma.signal.update({
      data: _.omit(signal, "id") as any,
      where: {
        deviceId_signalId: {
          signalId: signal.signalId!,
          deviceId: signal.deviceId!,
        },
      },
    });
    const device = DEVICES.find(
      (it) => it.instance.deviceId === signal.deviceId
    );
    if (signal.signalId && device && signal.raw) {
      await device.setParameter(signal.signalId!, signal.raw);
    }
  }
  await refetchDevices();
  return ["SET_AODATA_ACK", "404", { Result: 1 }];
};

// 设置遥控量信息
const setControllers: Operation = async (input: {
  DeviceId: string;
  Signal: {
    attributes: {
      Id: string;
    };
  };
}) => {
  try {
    const signal = await prisma.signal.findFirst({
      where: {
        deviceId: input.DeviceId,
        signalId: input.Signal.attributes.Id,
      },
    });
    const device = DEVICES.find(
      (it) => it.instance.deviceId === signal?.deviceId
    );
    if (!device) {
      throw new Error("设备未找到");
    }
    await device.setParameter(input.Signal.attributes.Id, 0);
    return ["SET_DODATA_ACK", "504", { Result: 1 }];
  } catch (e) {
    console.log(e);
    return ["SET_DODATA_ACK", "504", { Result: 0 }];
  }
};

// 获取遥控点信息
const getControllers: Operation = async (devices: SoapDevice[]) => {
  return [
    "GET_DO_ACK",
    "502",
    {
      Values: await encodeDevices(
        devices,
        (it) => it.type === 5,
        (it) => ({}),
        true
      ),
    },
  ];
};

// 获取当前告警
const getCurrentAlarms: Operation = async (devices: SoapDevice[]) => {
  const current = _.chain(
    await Promise.all(
      devices.map(
        async (it) =>
          await encodeDevice({
            d: it,
            filter: (it) => !!it.alarm,
          })
      )
    )
  )
    .map((it) => it.Signal!)
    .flatten()
    .map((it) => it.alarm)
    .filter((it) => !!it)
    .value();

  const alarms = await prisma.alarm.findMany({
    where: {
      id: {
        in: current as number[],
      },
    },
  });

  return [
    "GET_ALARM_ACK",
    "602",
    {
      Values: {
        TAalarmList: {
          TAlarm: alarms.map((alarm) => encodeAlarm(alarm)),
        },
      },
    },
  ];
};

// 发送告警
export const sendAlarm = async (data: any[]) => {
  if (data.length) {
    const values = (data as { SerialNo: string }[]).map((it) => ({
      ...it,
      SerialNo: _.padStart(it.SerialNo, 10, "0"),
    }));
    SoapClient.invoke([
      "SEND_ALARM",
      "603",
      {
        Values: {
          TAlarmList: {
            TAlarm: values,
          },
        },
      },
    ]).catch(async () => {
      await prisma.history.create({
        data: {
          code: 605,
          payload: JSON.stringify(values),
        },
      });
    });
  }
};

export const recoverAlarms = async (data: Alarm[], description: string) => {
  await prisma.alarm.deleteMany({
    where: {
      id: {
        in: data.map((it) => it.id),
      },
    },
  });
  await sendAlarm(data.map((it) => encodeAlarm({ ...it, description }, "END")));
};

// 获取FTP参数
const getFTP: Operation = async () => {
  const unit = useUnitStore.getState();
  return [
    "GET_FTP_ACK",
    "702",
    {
      Result: 1,
      UserName: unit.userName,
      Password: unit.password,
    },
  ];
};

// 设置FTP参数
const setFTP: Operation = async (UserName: string, Password: string) => {
  await changeFtpUser(UserName, Password);
  const unit = await prisma.unit.update({
    data: {
      userName: UserName,
      password: Password,
    },
    where: {
      id: 1,
    },
  });
  useUnitStore.setState(unit as unknown as Unit);
  return [
    "GET_FTP_ACK",
    "704",
    {
      Result: 1,
      UserName,
      Password,
    },
  ];
};
// 设置时间
const setTime: Operation = async ({
  Year,
  Month,
  Day,
  Hour,
  Minute,
  Second,
}: {
  Year: string;
  Month: string;
  Day: string;
  Hour: string;
  Minute: string;
  Second: string;
}) => {
  require("child_process").exec(
    `timedatectl set-time "${Year}-${Month}-${Day} ${Hour}:${Minute}:${Second}"`
  );
  return ["SET_TIME_ACK", "802", { Result: 1 }];
};

// 获取时间
const getTime: Operation = async () => {
  const devices = await prisma.device.findMany();
  const [Y, M, D, H, m, s] = dayjs().format("YYYY-MM-DD-HH-mm-ss").split("-");
  return [
    "GET_TIME_ACK",
    "804",
    {
      Time: {
        Year: Y,
        Month: M,
        Day: D,
        Hour: H,
        Minute: m,
        Second: s,
      },
      DeviceList: {
        Device: devices.map((it) => ({
          attributes: {
            Id: `${it.code}${it.serial}`,
            Rid: it.resourceId,
            DeviceVendor: it.manufacturer,
            DeviceType: it.model,
            BatchNo: "",
          },
          Time: "FAILURE",
        })),
      },
    },
  ];
};

// 心跳
const getUnitInfo: Operation = async () => {
  const { cpu, mem } = await getSystemInfo();
  return [
    "GET_SUINFO_ACK",
    902,
    {
      TSUStatus: {
        CPUUsage: `${cpu}`,
        MEMUsage: `${mem}`,
      },
    },
  ];
};

// 获取端口信息
const getPorts: Operation = async () => {
  const ports = (await SerialPort.list()).sort((a, b) =>
    a.path < b.path ? -1 : 1
  );
  const devices = await prisma.device.findMany();
  return [
    "GET_SUPORT_ACK",
    "904",
    {
      PortList: {
        TPortInfo: ports.map((port, index) => {
          const devicesInPort: Omit<Device, "signals">[] = devices.filter(
            (it) => it.port === port.path
          );
          return {
            attributes: {
              PortUsed: devicesInPort.length > 0 ? 1 : 0,
              PortNo: index + 1,
              PortName: "Serial",
              PortType: "IA",
              Settings: `${devicesInPort[0]?.baudRate ?? 9600},n,8,1`,
            },
            DeviceList: devicesInPort.map((it) => ({
              attributes: {
                Id: `${it.code}${it.serial}`,
                Rid: it.resourceId,
                Address: it.address,
                Protocol: it.protocol,
                Version: it.version,
                UpdatetTime: dayjs(it.createdAt).format("YYYY-MM-DD HH:mm:ss"),
              },
            })),
          };
        }),
      },
    },
  ];
};

// 重启设备
const reboot: Operation = async () => {
  require("child_process").exec("sleep 5 && sudo /sbin/reboot", console.log);
  return await ["SET_SUREBOOT_ACK", "1002", { Result: 1 }];
};

// 获取告警量配置
const getAlarmProperties: Operation = async (devices: SoapDevice[]) => {
  return [
    "GET_AlarmProperty_ACK",
    "1102",
    {
      Values: await encodeDevices(
        devices,
        (it) => it.type === 4,
        (it) => ({
          BDelay: it.startDelay,
          EDelay: it.endDelay,
          Value: it.raw,
        }),
        true
      ),
    },
  ];
};

// 设置告警量配置
const setAlarmProperties: Operation = async (devices: SoapDevice[]) => {
  const updated = await decodeDevices(devices);
  for (const signal of updated) {
    await prisma.signal.update({
      data: _.omit(signal, "id") as any,
      where: {
        id: signal.id,
      },
    });
  }
  await refetchDevices();
  return ["SET_AlarmProperty_ACK", "1104", { Result: 1 }];
};

// 发送本地缓存历史记录
export const transmitLocalRecords: Operation = async (
  command: string,
  code: number
) => {
  const devices = await prisma.device.findMany();
  const records = await prisma.history.findMany({
    where: {
      code: 203,
    },
  });
  const values = _.chain(records)
    .map((it) => JSON.parse(it.payload))
    .flatten()
    .groupBy((it) => it.attributes.Id)
    .mapValues((it) =>
      _.chain(it)
        .map((i) => i.Signal)
        .flatten()
        .value()
    )
    .value();

  return [
    command,
    code,
    {
      ReportTime: dayjs().format("YYYY-MM-DD HH:mm:ss"),
      Values: {
        DeviceList: {
          Device: _.keys(values).map((it) => {
            const [a, b, c, d, e] = it.split("");
            const device = devices.find(
              (device) =>
                device.code === `${a}${b}${c}` && device.serial === `${d}${e}`
            );
            return {
              attributes: {
                Id: it,
                Rid: device?.resourceId,
                DeviceVender: device?.manufacturer,
                DeviceType: device?.model,
                BatchNo: "",
              },
              Signal: values[it],
            };
          }),
        },
      },
    },
  ];
};

export const handleRequest: Operation = async (command: SoapRequest) => {
  switch (command.Request.PK_Type.Code) {
    case "105":
      return await setIP(command.Request.Info.SCIP);
    case "201":
      return await getAnalogValues(command.Request.Info.DeviceList?.Device);
    case "301":
      return await getDigitalValues(command.Request.Info.DeviceList?.Device);
    case "401":
      return await getParameters(command.Request.Info.DeviceList?.Device);
    case "403":
      return await setParameters(command.Request.Info.DeviceList?.Device);
    case "501":
      return await getControllers(command.Request.Info.DeviceList?.Device);
    case "503":
      return await setControllers(command.Request.Info);
    case "601":
      return await getCurrentAlarms(command.Request.Info.DeviceList?.Device);
    case "701":
      return await getFTP();
    case "703":
      return await setFTP(
        command.Request.Info.UserName,
        command.Request.Info.Password
      );
    case "801":
      return await setTime(command.Request.Info.Time);
    case "803":
      return await getTime();
    case "901":
      return await getUnitInfo();
    case "903":
      return await getPorts();
    case "1001":
      return await reboot();
    case "1101":
      return await getAlarmProperties(command.Request.Info.DeviceList?.Device);
    case "1103":
      return await setAlarmProperties(command.Request.Info.DeviceList?.Device);
  }

  throw new Error("无法解析的命令编码");
};

export const handleResponse = async (code: string | number, response: any) => {
  try {
    switch (`${code}`) {
      default:
        if (
          `${response.Response.PK_Type.Code}` ===
          `${parseInt(`${code}`, 10) + 1}`
        ) {
          return;
        }
        throw new Error(`命令失败,返回数据:${JSON.stringify(response)}`);
    }
  } catch (e) {
    throw e;
  }
};

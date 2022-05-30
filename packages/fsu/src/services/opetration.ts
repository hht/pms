import _ from "lodash";
import { useUnitStore } from "../store";
import {
  decodeDevices,
  encodeAlarm,
  encodeDevice,
  encodeDevices,
  encodeSignalId,
  prisma,
} from "./orm";
import dayjs from "dayjs";
import { changeFtpUser, getSystemInfo } from "./system";
import { SoapClient } from "./soap";
import { SerialPort } from "serialport";
import { getIdentity } from "../utils";

type Operation = (
  ...payload: any
) => Promise<[command: string, code: number | string, data: any]>;

const getValues = (data: Signal[]) => {
  if (data.length) {
    const valuesByDeviceId = _.chain(data)
      .map((value) => ({ ...value, ...getIdentity(value) }))
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
            RecordTime: dayjs(it.updatedAt).format("YYYY-MM-DD HH:mm:ss"),
          },
          value: it.value,
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
      SUVer: unit.version,
    },
  ];
};

// 注销
export const dispose: Operation = async () => {
  return ["LOGOUT", "103", {}];
};

// 设置采集服务器IP
const setIP: Operation = async (ip: string) => {
  await SoapClient.setClient(ip);
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
    await encodeDevices(
      devices,
      (it) => it.length !== 1,
      (it) => ({ Value: `${it.value}` })
    ),
  ];
};

// 上报遥测量信息
export const setAnalogValues = async (data: any[]) => {
  const values = getValues(data as Value[]);
  if (values.length) {
    SoapClient.invoke([
      "SEND_AIDATA",
      "203",
      {
        Values: {
          DeviceList: {
            Device: values,
          },
        },
      },
    ]).catch(async () => {
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
    await encodeDevices(
      devices,
      (it) => it.length === 1,
      (it) => ({ Value: `${it.value}` })
    ),
  ];
};

// 上报遥信量信息
export const setDigitalValues = async (data: any[]) => {
  const values = getValues(data as Value[]);
  if (values.length) {
    SoapClient.invoke([
      "SEND_DIDATA",
      "303",
      {
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
      case 305:
        SoapClient.invoke([
          command,
          code,
          {
            Values: {
              DeviceList: {
                Device: getValues(data as Value[]),
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
            TAalarmList: {
              TAlarm: data,
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
    }
  }
};

// 获取遥调量信息
const getParameters: Operation = async (devices: SoapDevice[]) => {
  return [
    "GET_AODATA_ACK",
    "402",
    await encodeDevices(
      devices,
      (it) => true,
      (it) => ({
        SetValue: it.raw,
        SHLimit: it.upperMajorLimit,
        HLimit: it.upperMinorLimit,
        LLimit: it.lowerMinorLimit,
        SLLimit: it.lowerMajorLimit,
        Threshold: it.threshold,
        RelativeVal: it.thresholdPercent ?? null,
        IntervalTime: it.interval ?? 0,
      })
    ),
  ];
};

// 设置遥调量信息
const setParameters: Operation = async (devices: SoapDevice[]) => {
  const updated = decodeDevices(devices);
  for (const signal of updated) {
    await prisma.signal.update({
      data: _.omit(signal, "id") as any,
      where: {
        id: signal.id,
      },
    });
  }
  return ["SET_AODATA_ACK", "404", { Result: 1 }];
};

// 获取所有监控点信息
const getDevices: Operation = async (devices: SoapDevice[]) => {
  return [
    "GET_DO_ACK",
    "502",
    await encodeDevices(
      devices,
      (it) => true,
      (it) => ({}),
      true
    ),
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
  // await changeFtpUser(UserName, Password);
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
            DeviceType: it.controller,
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
          const devicesInPort = devices.filter((it) => it.port === port.path);
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
  require("child_process").exec(
    "sleep 3 && sudo /sbin/shutdown -r now",
    console.log
  );
  return await ["SET_SUREBOOT_ACK", "1002", { Result: 1 }];
};

// 获取告警量配置
const getAlarmProperties: Operation = async (devices: SoapDevice[]) => {
  return [
    "GET_AlarmProperty_ACK",
    "1102",
    await encodeDevices(
      devices,
      () => true,
      (it) => ({
        BDelay: it.startDelay,
        EDelay: it.endDelay,
      }),
      true
    ),
  ];
};

// 设置告警量配置
const setAlarmProperties: Operation = async (devices: SoapDevice[]) => {
  const updated = decodeDevices(devices);
  for (const signal of updated) {
    await prisma.signal.update({
      data: _.omit(signal, "id") as any,
      where: {
        id: signal.id,
      },
    });
  }
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
      return await getDevices(command.Request.Info.DeviceList?.Device);
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

  return [
    command.Request.PK_Type.Name,
    command.Request.PK_Type.Code,
    { xmlData: "无法解析的请求" },
  ];
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

export const handle: (method: string) => Promise<SoapParameter> = async (
  method: string
) => {
  let devices = [];
  switch (method) {
    case "登录":
      return await bootstrap();
    case "注销":
      return await dispose();
    case "设置IP":
      return await Promise.resolve(["SET_IP", 105, { SCIP: "127.0.0.1" }]);
    case "获取遥测量信息":
      devices = await prisma.device.findMany({
        include: { signals: true },
      });
      return await Promise.resolve([
        "GET_AIDATA",
        201,
        {
          DeviceList: {
            Device: devices.map((device) => {
              return {
                attributes: {
                  Id: `${device.code}${device.serial}`,
                  Rid: device?.resourceId,
                },
                Signal:
                  Math.random() < 0.5
                    ? device.signals.map((signal) => ({
                        attributes: { Id: encodeSignalId(signal as Signal) },
                      }))
                    : [],
              };
            }),
          },
        },
      ]);
    case "获取遥信量信息":
      devices = await prisma.device.findMany({
        include: { signals: true },
      });
      return await Promise.resolve([
        "GET_DIDATA",
        301,
        {
          DeviceList: {
            Device: devices.map((device) => {
              return {
                attributes: {
                  Id: `${device.code}${device.serial}`,
                  Rid: device?.resourceId,
                },
                Signal:
                  Math.random() < 0.5
                    ? device.signals.map((signal) => ({
                        attributes: { Id: encodeSignalId(signal as Signal) },
                      }))
                    : [],
              };
            }),
          },
        },
      ]);
    case "获取遥调量信息":
      devices = await prisma.device.findMany({
        include: { signals: true },
      });
      return await Promise.resolve([
        "GET_AODATA",
        401,
        {
          DeviceList: {
            Device: devices.map((device) => {
              return {
                attributes: {
                  Id: `${device.code}${device.serial}`,
                  Rid: device?.resourceId,
                },
                Signal:
                  Math.random() < 0.5
                    ? device.signals.map((signal) => ({
                        attributes: { Id: encodeSignalId(signal as Signal) },
                      }))
                    : [],
              };
            }),
          },
        },
      ]);
    case "设置遥调量信息":
      devices = await prisma.device.findMany({
        include: { signals: true },
      });
      return await Promise.resolve([
        "SET_AODATA",
        403,
        {
          DeviceList: {
            Device: devices.map((device) => {
              return {
                attributes: {
                  Id: `${device.code}${device.serial}`,
                  Rid: device?.resourceId,
                },
                Signal:
                  Math.random() < 0.5
                    ? device.signals.map((it) => ({
                        attributes: {
                          Id: encodeSignalId(it as Signal),
                          SetValue: it.raw,
                          SHLimit:
                            (it.upperMajorLimit ?? 0) +
                            (Math.random() < 0.5 ? 1 : -1),
                          HLimit:
                            (it.upperMinorLimit ?? 0) +
                            (Math.random() < 0.5 ? 1 : -1),
                          LLimit:
                            (it.lowerMinorLimit ?? 0) +
                            (Math.random() < 0.5 ? 1 : -1),
                          SLLimit:
                            (it.lowerMajorLimit ?? 0) +
                            (Math.random() < 0.5 ? 1 : -1),
                          Threshold:
                            (it.threshold ?? 0) +
                            (Math.random() < 0.5 ? 1 : -1),
                          RelativeVal:
                            (it.thresholdPercent ?? 0) +
                            (Math.random() < 0.5 ? 1 : -1),
                          IntervalTime:
                            (it.interval ?? 0) + (Math.random() < 0.5 ? 1 : -1),
                        },
                      }))
                    : [],
              };
            }),
          },
        },
      ]);
    case "获取遥控量报文":
      devices = await prisma.device.findMany({
        include: { signals: true },
      });
      return [
        "GET_DO",
        "501",
        {
          DeviceList: {
            Device: devices.map((device) => {
              return {
                attributes: {
                  Id: `${device.code}${device.serial}`,
                  Rid: device?.resourceId,
                },
                Signal:
                  Math.random() < 0.5
                    ? device.signals.map((signal) => ({
                        attributes: { Id: encodeSignalId(signal as Signal) },
                      }))
                    : [],
              };
            }),
          },
        },
      ];
    case "获取当前告警":
      devices = await prisma.device.findMany({
        include: { signals: true },
      });
      return await Promise.resolve([
        "GET_ALARM",
        601,
        {
          DeviceList: {
            Device: devices.map((device) => {
              return {
                attributes: {
                  Id: `${device.code}${device.serial}`,
                  Rid: device?.resourceId,
                },
                Signal:
                  Math.random() < 0.5
                    ? device.signals.map((signal) => ({
                        attributes: { Id: encodeSignalId(signal as Signal) },
                      }))
                    : [],
              };
            }),
          },
        },
      ]);
    case "获取FTP参数":
      return await Promise.resolve(["GET_FTP", 701, {}]);
    case "设置FTP参数":
      return await Promise.resolve([
        "SET_FTP",
        703,
        {
          UserName: "ftp",
          Password: "ftp",
        },
      ]);

    case "设置时间":
      const [Y, M, D, H, m, s] = dayjs()
        .format("YYYY-MM-DD-HH-mm-ss")
        .split("-");
      return [
        "SET_TIME",
        801,
        {
          // Time: {
          //   Year: Y,
          //   Month: M,
          //   Day: D,
          //   Hour: H,
          //   Minute: m,
          //   Second: s,
          // },
        },
      ];
    case "获取时间":
      return ["GET_TIME", 803, {}];
    case "获取端口信息":
      return ["GET_SUPORT", 903, {}];
    case "重启":
      return ["SET_SUREBOOT", 1001, {}];

    case "获取告警量设置":
      devices = await prisma.device.findMany({
        include: { signals: true },
      });
      return await Promise.resolve([
        "GET_AlarmProperty",
        1101,
        {
          DeviceList: {
            Device: devices.map((device) => {
              return {
                attributes: {
                  Id: `${device.code}${device.serial}`,
                  Rid: device?.resourceId,
                },
                Signal:
                  Math.random() < 0.5
                    ? device.signals.map((signal) => ({
                        attributes: { Id: encodeSignalId(signal as Signal) },
                      }))
                    : [],
              };
            }),
          },
        },
      ]);
    case "设置告警量设置":
      devices = await prisma.device.findMany({
        include: { signals: true },
      });
      return await Promise.resolve([
        "SET_AlarmProperty",
        1103,
        {
          DeviceList: {
            Device: devices.map((device) => {
              return {
                attributes: {
                  Id: `${device.code}${device.serial}`,
                  Rid: device?.resourceId,
                },
                Signal:
                  Math.random() < 0.5
                    ? device.signals.map((it) => ({
                        attributes: {
                          Id: encodeSignalId(it as Signal),
                          BDelay:
                            (it.startDelay ?? 0) +
                            (Math.random() < 0.5 ? 1 : -1),
                          EDelay:
                            (it.endDelay ?? 0) + (Math.random() < 0.5 ? 1 : -1),
                        },
                      }))
                    : [],
              };
            }),
          },
        },
      ]);
    default:
      throw new Error("未知指令");
  }
};

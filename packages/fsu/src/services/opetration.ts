import _, { String } from "lodash";
import * as soap from "soap";
import { useUnitStore } from "../store";
import { prisma } from "./orm";
import dayjs from "dayjs";
import { getSystemInfo } from "./system";
import { InvokeOutput } from "./soap";

type Operation = (
  ...payload: any
) => Promise<[command: string, code: number | string, data: any]>;

// FSU注册
export const bootstrap: Operation = async () => {
  const unit = useUnitStore.getState();
  const devices = await prisma.device.findMany();
  return [
    "LOGIN",
    101,
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
      SUConfigTime: dayjs().format("YYYY-MM-DD HH:mm:ss"),
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
const dispose: Operation = async () => {
  return [
    "LOGOUT_ACK",
    804,
    {
      Result: 1,
    },
  ];
};

const getFTP: Operation = async () => {
  const unit = useUnitStore.getState();
  return [
    "GET_FTP_ACK",
    702,
    {
      Result: 1,
      UserName: unit.userName,
      Password: unit.password,
    },
  ];
};

const setFTP: Operation = async (UserName: string, Password: string) => {
  await prisma.unit.update({
    data: {
      userName: UserName,
      password: Password,
    },
    where: {
      id: 1,
    },
  });
  return [
    "GET_FTP_ACK",
    702,
    {
      Result: 1,
      UserName,
      Password,
    },
  ];
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

export const handleRequest: Operation = async (command: {
  Request: {
    PK_Type: { Name: string; Code: string };
    Info: { SUId: string; SURId: string };
  };
}) => {
  switch (command.Request.PK_Type.Code) {
    case "901":
      return await getUnitInfo();
    case "801":
      return ["SET_TIME_ACK", 802, { Result: 1 }];
    case "701":
      return await getFTP();
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
      case "101":
        if (response.Response.PK_Type.Code !== "102") {
          throw new Error(`登录失败,返回数据:${JSON.stringify(response)}`);
        }
        return;
      default:
        throw new Error("不支持的指令");
    }
  } catch (e) {
    throw e;
  }
};

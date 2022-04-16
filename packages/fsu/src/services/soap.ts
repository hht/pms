import _, { String } from "lodash";
import * as soap from "soap";
import { Express } from "express";
import { useUnitStore } from "../store";
import { Events } from "./rx";
import { EVENT } from "../models/enum";
import { prisma } from "./orm";
import dayjs from "dayjs";
import { getSystemInfo } from "./system";
const cliendSWDL = require("fs").readFileSync("./soap/SUService.wsdl", "utf8");
const serverWSDL = require("fs").readFileSync("./soap/SCService.wsdl", "utf8");

const getRequest = async (command: string, code: number, data: object) => {
  const unit = useUnitStore.getState();
  return {
    parameters: {
      xmlData: `<?xml version="1.0" encoding="UTF-8"?>${parser.objectToXML(
        {
          Request: {
            PK_Type: {
              Name: command,
              Code: `${code}`,
            },
            Info: {
              SUId: unit.unitId,
              SURid: unit.resourceId || "",
              ...data,
            },
          },
        },
        "invoke",
        "",
        "http://SUService.chinaunicom.com"
      )}
  `,
    },
  };
};

const getResponse = async (command: string, code: number, data: object) => {
  const unit = useUnitStore.getState();
  return {
    invokeReturn: `<?xml version="1.0" encoding="UTF-8"?>${parser.objectToXML(
      {
        Response: {
          PK_Type: {
            Name: command,
            Code: `${code}`,
          },
          Info: {
            SUId: unit.unitId,
            SURid: unit.resourceId || "",
            ...data,
          },
        },
      },
      "invokeResponse",
      "",
      "http://SUService.chinaunicom.com"
    )}
  `,
  };
  return {
    invokeResult: {
      Response: {
        PK_Type: {
          Name: command,
          Code: `${code}`,
        },
        Info: {
          SUId: unit.unitId,
          SURid: unit.resourceId || "",
          ...data,
        },
      },
    },
  };
};

const getUnitInfo = async () => {
  const { cpu, mem } = await getSystemInfo();

  return getResponse("GET_SUINFO_ACK", 902, {
    TSUStatus: {
      CPUUsage: `${cpu}`,
      MEMUsage: `${mem}`,
    },
  });
};

const getFTP = async () => {
  return getResponse("GET_FTP_ACK", 702, {
    Result: 1,
    UserName: "ftp",
    Password: "ftp",
  });
};

const setFTP = async () => {
  return getResponse("GET_FTP", 702, {
    Result: 1,
    UserName: "ftp",
    Password: "ftp",
  });
};

const parser = new soap.WSDL(
  cliendSWDL,
  "http://127.0.0.1:8080/services/SUService?wsdl",
  {}
);

// 本地SOAP服务器
const SoapService = {
  SCServiceServiceImp: {
    BasicHttpBinding_ISCServiceSoapBinding: {
      invoke: async function ({
        xmlData,
      }: {
        xmlData: {
          $value: String;
        };
      }) {
        if (_.isString(xmlData?.$value)) {
          const command = parser.xmlToObject(xmlData?.$value) as {
            Request: {
              PK_Type: { Name: string; Code: string };
              Info: { SUId: string; SURId: string };
            };
          };
          console.log(command);
          switch (command.Request.PK_Type.Code) {
            case "901":
              return await getUnitInfo();
            case "801":
              return getResponse("SET_TIME_ACK", 802, { Result: 1 });
            case "701":
              return await getFTP();
          }
        }
        // switch (xmlData.Request.PK_Type.Code) {
        //   case "203":
        //     console.log("发送历史信息");
        //     break;
        //   default:
        //     console.log("未实现消息", xmlData.Request.PK_Type.Code);
        // }
        return xmlData;
      },
    },
  },
};

export const createSoapServer = (app: Express) => {
  const server = soap.listen(
    app,
    "/services/SUService",
    SoapService,
    cliendSWDL,
    function () {
      console.log("SOAP服务器已启动...");
    }
  );
  server.log = (type, data) => console.log(type, data);
  return server;
};

interface IinvokeInput {
  /** soapenc:string(undefined) */
  xmlData: string;
}

interface IinvokeOutput {
  /** soapenc:string(undefined) */
  invokeReturn: string;
}

interface ISCServiceSoap {
  invoke: (
    input: IinvokeInput,
    cb: (
      err: any | null,
      result: IinvokeOutput,
      raw: string,
      soapHeader: { [k: string]: any }
    ) => any,
    options?: any,
    extraHeaders?: any
  ) => void;
}

// 获取最快的服务器
const getEndpoint = async () => {
  const addresses = useUnitStore.getState().remoteAddress?.split(/[,，]/);
  if (addresses?.length) {
    return await Promise.race(addresses.map(createClient));
  } else {
    Events.emit(EVENT.ERROR_LOG, "SC地址未设置");
    return null;
  }
};

const wsdlOptions = {
  valueKey: "value",
  transformRequest: (data: any) => {
    console.log(data);
    return data;
  },
};

// const wsdlInstance = new soap.WSDL(wsdl, endpoint, {});

// 创建SOAP客户端
const createClient = async (endpoint: string) => {
  return new Promise(async (resolve, reject) => {
    if (endpoint) {
      soap.createClient(endpoint, wsdlOptions, (error, client) => {
        if (error) {
          setTimeout(() => {
            reject(error);
          }, 3000);
        } else {
          resolve(client);
        }
      });
    }
  });
};

// FSU注册
const bootstrap = async () => {
  const unit = useUnitStore.getState();
  const devices = await prisma.device.findMany();
  await SoapClient.invoke("LOGIN", 101, {
    UserName: unit.userName,
    PassWord: unit.password,
    SUIP: unit.localAddress,
    SUPort: unit.port,
    SUVendor: unit.manufacturer,
    SUModel: unit.model,
    SUHardVer: unit.unitVersion,
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
  });
};

// FSU注销
const dispose = async () => {
  await SoapClient.invoke("LOGOUT", 103, {}).catch((e) => {
    Events.emit(EVENT.ERROR_LOG, `FSU注销失败，错误信息:${e.message || e}`);
  });
};

// 发送本地缓存历史记录
export const transmitLocalRecords = async (command: string, code: number) => {
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
  await SoapClient.invoke(command, code, {
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
  });
  return values;
};

export class SoapClient {
  private static client: any;
  static bootstrap = bootstrap;
  static dispose = dispose;
  static async invoke(command: string, code: number, data: object) {
    return;
    if (!SoapClient.client) {
      try {
        SoapClient.client = await getEndpoint();
      } catch (error) {
        throw new Error("所有服务器地址均不可达");
      }
    }
    const unit = useUnitStore.getState();

    return new Promise((resolve, reject) => {
      SoapClient.client.invoke(
        {
          xmlData: {
            Request: {
              PK_Type: {
                Name: command,
                Code: code,
              },
              Info: {
                SUId: unit.unitId,
                SURId: unit.resourceId,
                ...data,
              },
            },
          },
        },
        (error: Error, result: any, raw: string) => {
          if (error) {
            reject(error);
          }
          resolve(result);
        }
      );
    });
  }
}

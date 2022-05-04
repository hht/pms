import _, { reject } from "lodash";
import * as soap from "soap";
import { Express, response } from "express";
import { useUnitStore } from "../store";
import { Events } from "./rx";
import { EVENT } from "../models/enum";
import { handle, handleRequest, handleResponse } from "./opetration";
import util from "util";
import { SoapClient as SC } from "../mock";
import { attempt, soapLogger } from "../utils";

util.inspect.defaultOptions.depth = null;

const wsdl = require("fs").readFileSync("./soap/SUService.wsdl", "utf8");

const parser = new soap.WSDL(
  wsdl,
  "http://127.0.0.1:8080/services/SUService?wsdl",
  {
    ignoredNamespaces: {
      namespaces: ["intf", "impl"],
      override: true,
    },
    escapeXML: false,
    useEmptyTag: true,
  }
);

const getRequest = (command: string, code: number | string, data: object) => {
  const unit = useUnitStore.getState();
  return {
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
    )}`,
  };
};

const getResponse = async (
  command: string,
  code: number | string,
  data: object
) => {
  const unit = useUnitStore.getState();
  try {
    // return payload.invokeReturn;
    const response = {
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
      )}`,
    };
    return response;
  } catch (e) {
    console.log(e);
    // throw e;
  }
};

// 本地SOAP服务器
const SoapService = {
  SUServiceService: {
    SUService: {
      invoke: async ({ xmlData }: { xmlData: string }) => {
        try {
          if (_.isString(xmlData)) {
            const payload = parser.xmlToObject(xmlData) as SoapRequest;
            const [command, code, data] = await handleRequest(payload);
            return await getResponse(command, code, data);
          } else {
            const [command, code, data] = await handleRequest(xmlData);
            return await getResponse(command, code, data);
          }
        } catch (e: any) {
          throw {
            Fault: {
              Code: {
                Value: 500,
              },
              Reason: {
                Text: e.message,
              },
            },
          };
        }
      },
    },
  },
};

export const createSoapServer = (app: Express) => {
  const server = soap.listen(
    app,
    "/services/SUService",
    SoapService,
    wsdl,
    function () {
      console.log("SOAP服务器已启动...");
    }
  );
  server.log = soapLogger;
  return server;
};

const wsdlOptions = {
  valueKey: "value",
  attributesKey: "attributes",
  useEmptyTag: true,
  ignoredNamespaces: ["inft", "impl"],
  escapeXML: false,
  // overrideImportLocation: (location: string) => {
  //   return "https://127.0.0.1:8081/services/SCService.wsdl";
  // },
};
// 获取最快的服务器
export const getEndpoint = async (ip?: string[]) => {
  const addresses =
    ip || useUnitStore.getState().remoteAddress?.split(/[,，]/) || [];
  if (addresses?.length) {
    for (const address of addresses) {
      try {
        const client = attempt(
          async () =>
            await soap.createClientAsync(
              `http://${address}:8081/services/SCService?wsdl`,
              wsdlOptions
            ),
          { timeout: 5000, maxAttempts: 3 }
        );
        return client;
      } catch (e) {
        // throw new Error("服务器连接失败");
      }
    }
  }
  Events.emit(EVENT.ERROR_LOG, "SC地址未设置");
};

// const wsdlInstance = new soap.WSDL(wsdl, endpoint, {});

// 调用函数
const invoke = async ([command, code, data]: [
  command: string,
  code: number | string,
  data: object
]) =>
  new Promise((resolve, reject) => {
    SoapClient.client?.invoke(
      getRequest(command, code, data),
      (error, result, raw) => {
        if (error) {
          reject(
            error.root?.Envelope.Body.Fault?.Reason?.Text ?? "服务器连接失败"
          );
        }
        try {
          const response = parser.xmlToObject(result.invokeReturn);
          resolve(response);
        } catch (e: any) {
          if (e.message.includes("ECONNREFUSED")) {
            Events.emit(EVENT.DISCONNECTED, "服务器连接失败");
            SoapClient.client = null;
          }
          reject(e.message);
        }
      }
    );
  });

export class SoapClient {
  static client?: IServiceSoap | null;
  static setClient = async (ip: string) => {
    SoapClient.client = (await getEndpoint([ip])) as unknown as IServiceSoap;
  };
  static async invoke([command, code, data]: [
    command: string,
    code: number | string,
    data: object
  ]) {
    if (!SoapClient.client) {
      Events.emit(EVENT.DISCONNECTED, "服务器连接失败");
      throw new Error("服务器连接失败");
    }
    return await invoke([command, code, data])
      .then((response) => {
        return handleResponse(code, response as InvokeOutput)
          .then(() => {
            console.log(
              `${command}指令执行成功`,
              `返回值:${JSON.stringify(response)}`
            );
            return response;
          })
          .catch((e) => {
            throw e;
          });
      })
      .catch((error) => {
        console.log(`${command}指令执行失败`, error.message);
        throw error;
      });
  }
}

export const handleInvoke = async (method: string, direction: boolean) => {
  if (!direction) {
    const payload = await handle(method);
    return await SC.invoke(payload);
  } else {
    const payload = await handle(method);
    return await SoapClient.invoke(payload);
  }
};

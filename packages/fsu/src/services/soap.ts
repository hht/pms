import _ from "lodash";
import * as soap from "soap";
import { Express } from "express";
import { useUnitStore } from "../store";
import { Events } from "./rx";
import { EVENT } from "../models/enum";
import { handleRequest, handleResponse } from "./opetration";
import util from "util";
util.inspect.defaultOptions.depth = null;

/* tslint:disable:max-line-length no-empty-interface */
export interface InvokeInput {
  /** soapenc:string(undefined) */
  xmlData: any;
}

export interface InvokeOutput {
  /** soapenc:string(undefined) */
  invokeReturn: any;
}

export interface IServiceSoap {
  invoke: (
    input: InvokeInput,
    cb: (
      err: any | null,
      result: InvokeOutput,
      raw: string,
      soapHeader: { [k: string]: any }
    ) => any,
    options?: any,
    extraHeaders?: any
  ) => void;
}

const wsdl = require("fs").readFileSync("./soap/SUService.wsdl", "utf8");

const parser = new soap.WSDL(
  wsdl,
  "http://127.0.0.1:8080/services/SUService?wsdl",
  {}
);

const getRequest = (command: string, code: number | string, data: object) => {
  const unit = useUnitStore.getState();
  return {
    xmlData: {
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
  };
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
    )}
  `,
  };
};

const getResponse = async (payload: InvokeOutput) => {
  try {
    return payload.invokeReturn;
    const response = parser.xmlToObject(payload?.invokeReturn) as {
      Request: {
        PK_Type: { Name: string; Code: string };
        Info: { SUId: string; SURId: string };
      };
    };
    return response;
  } catch (e) {
    throw payload?.invokeReturn;
  }
};

// 本地SOAP服务器
const SoapService = {
  SCServiceServiceImp: {
    BasicHttpBinding_ISCServiceSoapBinding: {
      invoke: async function ({
        xmlData,
      }: {
        xmlData: {
          $value: any;
        };
      }) {
        if (_.isString(xmlData?.$value)) {
          const command = parser.xmlToObject(xmlData?.$value) as {
            Request: {
              PK_Type: { Name: string; Code: string };
              Info: { SUId: string; SURId: string };
            };
          };
          return handleRequest(command);
        } else {
          return handleRequest(xmlData?.$value);
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
  server.log = (type, data) => console.log("FSU:", type, data);
  return server;
};

// 获取最快的服务器
const getEndpoint = async () => {
  const addresses = useUnitStore.getState().remoteAddress?.split(/[,，]/);
  if (addresses?.length) {
    return (await Promise.race(addresses.map(createClient))) as IServiceSoap;
  } else {
    Events.emit(EVENT.ERROR_LOG, "SC地址未设置");
    return null;
  }
};

const wsdlOptions = {
  valueKey: "value",
  attributesKey: "attributes",
  useEmptyTag: true,
  ignoredNamespaces: true,
  overrideImportLocation: (location: string) => {
    return "https://127.0.0.1:8081/services/SCService.wsdl";
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

const invoke = async ([command, code, data]: [
  command: string,
  code: number | string,
  data: object
]) =>
  new Promise((resolve, reject) => {
    SoapClient.client?.invoke(
      getRequest(command, code, data),
      async (error, result, raw) => {
        if (error) {
          reject(error);
        }
        getResponse(result).then(resolve).catch(reject);
      }
    );
  });

export class SoapClient {
  static client: IServiceSoap | null;
  static async invoke([command, code, data]: [
    command: string,
    code: number | string,
    data: object
  ]) {
    if (!SoapClient.client) {
      try {
        SoapClient.client = await getEndpoint();
      } catch (error) {
        Events.emit(EVENT.ERROR_LOG, "所有服务器地址均不可达");
        return;
      }
    }
    const unit = useUnitStore.getState();
    return await invoke([command, code, { ...data, SUId: unit.unitId }])
      .then((response) => {
        handleResponse(code, response as InvokeOutput).then(() =>
          console.log(
            `${command}指令执行成功`,
            `返回值:${JSON.stringify(response)}`
          )
        );
      })
      .catch((error) => {
        console.log(`${command}指令执行失败`, error);
      });
  }
}

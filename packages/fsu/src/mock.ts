import bodyParser from "body-parser";
import cors from "cors";
import express, { Express } from "express";
import _ from "lodash";
import { getSocketInstance } from "./services/socket";
import { ExpressErrorHandler } from "./utils";
import { getDeviceRoutes } from "./routes";
import { createServer } from "http";
import * as soap from "soap";
import util from "util";
import { useUnitStore } from "./store";

util.inspect.defaultOptions.depth = null;

/* tslint:disable:max-line-length no-empty-interface */
export interface InvokeInput {
  /** soapenc:string(undefined) */
  xmlData: any;
}

export interface InvokeOutput {
  /** soapenc:string(undefined) */
  invokeReturn: string;
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

export const app = express();

app.use(cors());
app.use(bodyParser.json());
const serverWSDL = require("fs").readFileSync("./soap/SCService.wsdl", "utf8");

const parser = new soap.WSDL(
  serverWSDL,
  "http://127.0.0.1:8081/services/SCService?wsdl",
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
  // return {
  //   xmlData: `<?xml version="1.0" encoding="UTF-8"?>${parser.objectToXML(
  //     {
  //       Request: {
  //         PK_Type: {
  //           Name: command,
  //           Code: `${code}`,
  //         },
  //         Info: {
  //           SUId: unit.unitId,
  //           SURid: unit.resourceId || "",
  //           ...data,
  //         },
  //       },
  //     },
  //     "invoke",
  //     "",
  //     "http://SUService.chinaunicom.com"
  //   )}
  // `,
  // };
};

const getResponse = (command: string, code: number | string, data: object) => {
  const unit = useUnitStore.getState();
  return {
    invokeReturn: {
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
};

const handleRequest = (payload: any) => {
  switch (`${payload.Request.PK_Type.Code}`) {
    case "101":
      return getResponse("LOGIN_ACK", "102", {});
  }
};

// 模拟SOAP服务器
const MockService = {
  SCServiceService: {
    SCService: {
      invoke: async function ({ xmlData }: { xmlData: any }) {
        console.log(xmlData);
        if (_.isString(xmlData)) {
          const command = parser.xmlToObject(xmlData) as {
            Request: {
              PK_Type: { Name: string; Code: string };
              Info: { SUId: string; SURId: string };
            };
          };
          return handleRequest(command);
        } else {
          return handleRequest(xmlData);
        }
        return {
          invokeReturn: {
            $value: "不支持的指令",
          },
        };
      },
    },
  },
};

const createSoapServer = (app: Express) => {
  const server = soap.listen(
    app,
    "/services/SCService",
    MockService,
    serverWSDL,
    function () {
      console.log("B接口WebService服务已启动，路径为/services/SCService...");
    }
  );
  server.log = (type, data) => console.log("SC:", type, data);
  return server;
};
const server = createServer(app);

const io = getSocketInstance(server);

getDeviceRoutes(app);

app.use(ExpressErrorHandler);

const wsdlOptions = {
  valueKey: "value",
  attributesKey: "attributes",
  useEmptyTag: true,
  ignoredNamespaces: true,
  overrideImportLocation: (location: string) => {
    return "https://127.0.0.1:8080/services/SUService.wsdl";
  },
};

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

export class SoapClient {
  private static client: IServiceSoap | null;
  static async invoke([command, code, data]: [
    command: string,
    code: number | string,
    data: object
  ]) {
    if (!SoapClient.client) {
      try {
        SoapClient.client = (await createClient(
          "https://127.0.0.1:8080/services/SUService.wsdl"
        )) as IServiceSoap;
      } catch (error) {
        throw new Error("所有服务器地址均不可达");
      }
    }

    return new Promise((resolve, reject) => {
      SoapClient.client?.invoke(
        getRequest(command, code, data),
        (error, result, raw) => {
          if (error) {
            reject(error);
          }
          resolve(result);
        }
      );
    });
  }
}

server.listen(8081, () => {
  console.log("B接口模拟服务器正在8081端口运行...");
  const soap = createSoapServer(app);
});

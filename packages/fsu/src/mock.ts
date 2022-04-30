import bodyParser from "body-parser";
import cors from "cors";
import express, { Express } from "express";
import _ from "lodash";
import { ExpressErrorHandler, soapLogger } from "./utils";
import { createServer } from "http";
import * as soap from "soap";
import util from "util";
import { useUnitStore } from "./store";
import { handleResponse } from "./services/opetration";

util.inspect.defaultOptions.depth = null;

/* tslint:disable:max-line-length no-empty-interface */

export const app = express();

app.use(cors());
app.use(bodyParser.json());
const serverWSDL = require("fs").readFileSync("./soap/SCService.wsdl", "utf8");

const parser = new soap.WSDL(
  serverWSDL,
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

const getResponse = (command: string, code: number | string, data: object) => {
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
    )}`,
  };
};

const handleRequest = (payload: SoapRequest) => {
  switch (`${payload.Request.PK_Type.Code}`) {
    default:
      return getResponse(
        `${payload.Request.PK_Type.Name}_ACK`,
        `${parseInt(payload.Request.PK_Type.Code, 10) + 1}`,
        {}
      );
  }
};

// 模拟SOAP服务器
const MockService = {
  SCServiceService: {
    SCService: {
      invoke: async function ({ xmlData }: { xmlData: string }) {
        if (_.isString(xmlData)) {
          const command = parser.xmlToObject(xmlData) as SoapRequest;
          return handleRequest(command);
        } else {
          return handleRequest(xmlData);
        }
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
  server.log = soapLogger;
  return server;
};
const server = createServer(app);

app.use(ExpressErrorHandler);

const wsdlOptions = {
  valueKey: "value",
  attributesKey: "attributes",
  useEmptyTag: true,
  ignoredNamespaces: ["inft", "impl"],
  overrideImportLocation: (location: string) => {
    return "http://127.0.0.1:8080/services/SUService?wsdl";
  },
};

// 创建SOAP客户端
const createClient = async (endpoint: string) => {
  return new Promise((resolve, reject) => {
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

// 调用函数
const invoke = async ([command, code, data]: [
  command: string,
  code: number | string,
  data: object
]) =>
  new Promise((resolve, reject) => {
    SoapClient.client?.invoke(
      getRequest(command, code, data),
      (error, result, raw, ...rest) => {
        if (error) {
          reject(new Error(`${error.root.Envelope.Body.Fault?.Reason?.Text}`));
        }
        try {
          const response = parser.xmlToObject(result.invokeReturn);
          resolve(response);
        } catch (e: any) {
          reject(e.message);
        }
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
        SoapClient.client = (await createClient(
          "http://127.0.0.1:8080/services/SUService?wsdl"
        )) as IServiceSoap;
      } catch (error: any) {
        throw new Error("客户端创建失败");
      }
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

server.listen(8081, () => {
  console.log("B接口模拟服务器正在8081端口运行...");
  const soap = createSoapServer(app);
});

import _, { reject } from "lodash";
import * as soap from "soap";
import { Express } from "express";
const wsdl = require("fs").readFileSync("./soap/LSCService.wsdl", "utf8");

const SoapService = {
  SCServiceServiceImp: {
    BasicHttpBinding_ISCServiceSoapBinding: {
      invoke: function ({ xmlData }: { xmlData: any }) {
        // console.log("请求信息:", xmlData);
        return xmlData;
      },
    },
  },
};

export const createSoapServer = (app: Express) => {
  const server = soap.listen(
    app,
    "/services/SCService",
    SoapService,
    wsdl,
    function () {
      console.log("SOAP服务器已启动...");
    }
  );
  // server.log = (type, data) => console.log(type, data);
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

// soap测试
const endpoint = "http://127.0.0.1:8080/services/SCService?wsdl";

const wsdlOptions = {
  valueKey: "value",
};

const wsdlInstance = new soap.WSDL(wsdl, endpoint, {});

const createClient = async () => {
  return new Promise((resolve, reject) => {
    soap.createClient(endpoint, wsdlOptions, (error, client) => {
      if (error) {
        reject(error);
      }
      resolve(client);
    });
  });
};

export class SoapClient {
  private static client: any;
  static async invoke(command: string, code: number, data: object) {
    if (!SoapClient.client) {
      SoapClient.client = await createClient();
    }
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
                SUId: "",
                SURid: "",
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

const sample = {
  Request: {
    PK_Type: {
      Name: "LOGIN",
      Code: "101",
    },
    Info: {
      UserName: "admin",
      PassWord: "chinamonile",
      SUId: "admin",
      SURId: "2222222",
      SUPort: 8080,
      SUVendor: "TTSC",
      SUModel: "PSM-X",
      SUHardVer: "1.0",
    },
    DeviceList: [],
    SUVer: "2.0",
  },
};

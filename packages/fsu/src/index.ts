import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import { createServer } from "http";
import _ from "lodash";
import { getSocketInstance } from "./socket";
import { ExpressErrorHandler } from "./utils";
import { getDeviceRoutes } from "./routes";
import { scheduleCron } from "./services/gather";
import { GLOBAL_INTERVAL } from "./protocols";
import * as soap from "soap";
import fs from "fs";
import { getTemplate } from "./templates/YDT";
import { DIRECT_VOLTAGE } from "./templates/signals";
export const app = express();
import protocols from "./protocols/Vertiv";
import { LowSync, JSONFileSync } from "lowdb";
import { join, dirname } from "path";

app.use(cors());
app.use(bodyParser.json());

const server = createServer(app);

// const io = getSocketInstance(server);

// getDeviceRoutes(app);

const wsdl = require("fs").readFileSync("./soap/SCService.wsdl", "utf8");

const SoapService = {
  SCServiceService: {
    SCService: {
      invoke: function ({ xmlData }) {
        console.log("请求信息:", xmlData);
        return xmlData;
      },
    },
  },
};

app.use(ExpressErrorHandler);
server.listen(8080, () => {
  console.log("动环系统目前正在8080端口运行...");
  // scheduleCron(GLOBAL_INTERVAL);
  soap.listen(app, "/services/SCService", SoapService, wsdl, function () {
    console.log("server initialized");
  });
});

/* tslint:disable:max-line-length no-empty-interface */
export interface IinvokeInput {
  /** soapenc:string(undefined) */
  xmlData: string;
}

export interface IinvokeOutput {
  /** soapenc:string(undefined) */
  invokeReturn: string;
}

export interface ISCServiceSoap {
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
  ignoredNamespaces: {
    namespaces: ["impl", "http://SCService.chinaunicom.com"],
    override: true,
  },
};

soap.createClient(endpoint, wsdlOptions, (err, client) => {
  client.SCServiceService.SCService.invoke(
    {
      xmlData: {
        Request: {
          PK_Type: {
            Name: "LOGIN",
            Code: "101",
          },
          Info: {
            UserName: "chinamoile",
            PassWord: "chinamonile",
            SUId: "20032203",
            SURId: "2222222",
            SUPort: 8080,
            SUVendor: "TTSC",
            SUModel: "PSM-X",
            SUHardVer: "1.0",
          },
          DeviceList: [],
          SUVer: "2.0",
        },
      },
    },
    (err, result, raw, header) => {
      console.log(err, result, raw, header);
    }
  );
});

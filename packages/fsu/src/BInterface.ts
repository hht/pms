import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import { createServer } from "http";
import _ from "lodash";
import * as soap from "soap";
import fs from "fs";
const app = express();

const { isString } = require("lodash");
app.use(cors());
app.use(bodyParser.json());

const server = createServer(app);
const wsdl = require("fs").readFileSync("./soap/SCService.wsdl", "utf8");

const SoapService = {
  SCServiceServiceImp: {
    BasicHttpBinding_ISCServiceSoapBinding: {
      invoke: function ({ xmlData }: { xmlData: any }) {
        console.log("请求信息:", xmlData);
        return xmlData;
      },
    },
  },
};

server.listen(8081, () => {
  console.log("动环系统目前正在8081端口运行...");
  soap.listen(app, "/services/SUService", SoapService, wsdl, function () {
    console.log("server initialized");
  });
});

// soap测试
const endpoint = "http://192.168.0.106:8080/services/SCService?wsdl";

const wsdlOptions = {};

setTimeout(() => {
  soap.createClient(endpoint, wsdlOptions, (err, client) => {
    client.invoke(
      {
        parameters: {
          xmlData: {
            Request: {
              PK_Type: {
                Name: "LOGIN",
                Code: "101",
              },
              Info: {
                UserName: "admin",
                PassWord: "admin",
                SUId: "02202203200001",
                SUIP: "192.168.0.106",
                SUPort: "8081",
                SUVendor: "电服中心",
                SUModel: "PSM-X",
                SUHardVer: "2.2",
                SUConfigTime: "2022-04-12 21:08:41",
                DeviceList: {
                  Decice: [
                    {
                      attributes: {
                        Id: "91106",
                        Rid: "",
                        DeviceVender: "电服中心",
                        DeviceType: "TH-01",
                        MFD: "2020-03-04",
                        ControllerType: "智能温湿度",
                        SoftwareVersion: "1.0",
                        BatchNo: "",
                      },
                    },
                    {
                      attributes: {
                        Id: "91107",
                        Rid: "",
                        DeviceVender: "",
                        DeviceType: "TH-01",
                        MFD: "2022-04-07",
                        ControllerType: "智能温湿度",
                        SoftwareVersion: "",
                        BatchNo: "",
                      },
                    },
                    {
                      attributes: {
                        Id: "91101",
                        Rid: "",
                        DeviceVender: "",
                        DeviceType: "TH-01",
                        MFD: "2022-04-09",
                        ControllerType: "智能温湿度",
                        SoftwareVersion: "",
                        BatchNo: "",
                      },
                    },
                  ],
                },
                SUVer: "0.1",
              },
            },
          },
        },
      },
      (err: Error, result: any, raw: Object | string) => {
        if (err) {
          console.log("错误:", err);
        }
        if (isString(raw)) {
          const parser = new soap.WSDL(wsdl, endpoint, {});
          console.log("获取数据:", parser.xmlToObject(result.invokeResult));
        } else {
          console.log("获取数据:", result.invokeResult);
        }
      }
    );
  });
}, 1000);

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
import {
  getACDistributionValues,
  parseAlternatingValuesOfYDT,
} from "./protocols/algorithm";
import * as soap from "soap";
import fs from "fs";
import { VERTIVE_PSMA } from "./protocols/templates";
export const app = express();

// app.use(cors());
// app.use(bodyParser.json());

// const server = createServer(app);

// const io = getSocketInstance(server);

// getDeviceRoutes(app);

// app.use(ExpressErrorHandler);
// server.listen(8080, () => {
//   console.log("动环系统目前正在8080端口运行...");
//   scheduleCron(GLOBAL_INTERVAL);
// });

const response = Buffer.from(
  fs.readFileSync("./emulation/电总交流屏模拟量/PSM-A多屏", {
    encoding: "utf8",
  })
);
console.log(response.toString());

console.log(
  parseAlternatingValuesOfYDT(response, VERTIVE_PSMA.components["交流屏模拟量"])
);

// soap测试
// const endpoint =
//   "http://www.webxml.com.cn/WebServices/WeatherWebService.asmx?wsdl";

// soap.createClient(endpoint, (err, client) => {
//   client.getSupportCity(
//     { byProvinceName: "黑龙江" },
//     (err: Error, result: any) => {
//       console.log(result);
//     }
//   );
// });

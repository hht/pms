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
  appendYDT1363Bytes,
  appendYDT1363LengthByte,
  checkLengthBytes,
  checkYDT1363Bytes,
  getACDistributionValues,
  removeYDY1363Divider,
} from "./protocols/algorithm";
import * as soap from "soap";
import { ACDistribution } from "./protocols/templates";

export const app = express();

app.use(cors());
app.use(bodyParser.json());

const server = createServer(app);

const io = getSocketInstance(server);

getDeviceRoutes(app);

app.use(ExpressErrorHandler);
server.listen(8080, () => {
  console.log("动环系统目前正在8080端口运行...");
  scheduleCron(GLOBAL_INTERVAL);
});
// // ~200141410000FDB3

// const response = `2001410010B41171C6564204000000000400000000000000000000000000000000000000000400000000000000000000000000000000000000000400000000000000000000000000000000000000000400000000000000000000000000000000`;

// console.log(
//   getACDistributionValues(Buffer.from("0102E57659432F215C43DE385943"))
// );

// const response = `~20014000A0600002B91EC343FCA3C34318DCC243E2E6474200DB42853FDB42053F79AEB13E        00CB96D142                EA9D
// `;

// console.log([...response].map((it) => it.charCodeAt(0).toString(16)));

// parseResponse([...response].map((it) => it.charCodeAt(0)));

// const command = {
//   name: "交流屏模拟量数据",
//   input: Buffer.from(`200140410002FF`),
//   process: (input: Buffer) => {
//     return _.reduce(
//       [appendYDT1363LengthByte(8), appendYDT1363Bytes],
//       (prev, curr) => curr(prev),
//       input
//     );
//   },
//   validate: (input: Buffer) =>
//     _.reduce(
//       [checkYDT1363Bytes, checkLengthBytes(8), removeYDY1363Divider],
//       (prev, curr) => curr(prev),
//       input
//     ),
//   parse: (input: Buffer) => {
//     return getACDistributionValues(input, ACDistribution);
//   },
//   labels: ["湿度", "温度"],
// };

// const parseResponse = (input: Buffer) => {
//   const response = _.attempt(command.validate, input);
//   // 如果数据校验不通过则报错
//   if (_.isError(response) || _.isNull(response)) {
//     console.log(response);
//   }
//   console.log(input.toString());
//   const values = command.parse(response as Buffer);
//   console.log(values);
// };
// parseResponse(Buffer.from(response));
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

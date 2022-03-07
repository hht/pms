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
const file = join(__dirname, "../database/db.json");

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
  fs.readFileSync("./emulation/电总交流屏模拟量/CUC-18HA", {
    encoding: "utf8",
  })
);

console.log("-----");
type Post = {
  id: number;
  title: string;
};

type Data = {
  posts: Post[];
};

class LowWithLodash<T> extends LowSync<T> {
  chain: _.ExpChain<this["data"]> = _.chain(this).get("data");
}

const adapter = new JSONFileSync<Data>(file);
export const db = new LowWithLodash(adapter);

db.read();
const post = db.chain
  .get("posts")
  .find({ id: 1 })
  .assign({ title: "hha" })
  .value();
console.log("good!", post);

const command = protocols[protocols.length - 1].commands[0];
try {
  const data = command.parser(getTemplate(command.name, command.options))(
    response
  );
  console.log(data, "id");
} catch (e: any) {
  console.log("出错啦", e.message);
}

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

import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import { createServer } from "http";
import _ from "lodash";
import { getSocketInstance } from "./services/socket";
import { ExpressErrorHandler } from "./utils";
import { getDeviceRoutes } from "./routes";
import { resetDevices, scheduleJob } from "./services";
import { createSoapServer } from "./services/soap";
import { Events } from "./services/rx";
import { EVENT } from "./models/enum";

export const app = express();

app.use(cors());
app.use(bodyParser.json({ limit: "50mb" }));

const server = createServer(app);

const io = getSocketInstance(server);

getDeviceRoutes(app);

app.use(ExpressErrorHandler);

server.listen(8080, async () => {
  console.log("PMS-X动环监控模块目前正在8080端口运行...");
  const soap = createSoapServer(app);
  Events.emit(EVENT.DISCONNECTED, "正在连接服务器");
  await resetDevices();
  scheduleJob();
});

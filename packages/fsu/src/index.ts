import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import { createServer } from "http";
import _ from "lodash";
import { getSocketInstance } from "./services/socket";
import { ExpressErrorHandler } from "./utils";
import { getDeviceRoutes } from "./routes";
import { scheduleCron } from "./services";
import { createSoapServer } from "./services/soap";
// import fs from "fs";
// import { DIRECT_VOLTAGE } from "./algorithm/signals";
export const app = express();
// import protocols from "./protocols/Vertiv";
// import { LowSync, JSONFileSync } from "lowdb";
// import { join, dirname } from "path";

app.use(cors());
app.use(bodyParser.json());

const server = createServer(app);

const io = getSocketInstance(server);

getDeviceRoutes(app);

app.use(ExpressErrorHandler);
server.listen(8080, () => {
  console.log("PMS-X动环监控模块目前正在8080端口运行...");
  const soap = createSoapServer(app);
  scheduleCron();
});

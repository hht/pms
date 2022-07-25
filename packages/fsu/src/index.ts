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

export const app = express();

app.use(cors());
app.use(bodyParser.json());

const server = createServer(app);

const io = getSocketInstance(server);

getDeviceRoutes(app);

app.use(ExpressErrorHandler);

server.listen(8080, () => {
  console.log("PMS-X动环监控模块目前正在8000端口运行...");
  const soap = createSoapServer(app);
  scheduleCron();
});

import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import { createServer } from "http";
import _ from "lodash";
import { SerialPort } from "serialport";
import { Device, getPorts } from "./Device";
import { ExpressAsyncNext, ExpressErrorHandler } from "./utils";

export const app = express();

app.use(cors());
app.use(bodyParser.json());

const server = createServer(app);

Device.initialize("/dev/tty.usbserial-110");

app.use(ExpressErrorHandler);
app.post(
  "/ports",
  ExpressAsyncNext(async (req, res) => {
    res.json(await getPorts());
  })
);

app.post(
  "/message",
  ExpressAsyncNext(async (req, res) => {
    const { type } = req.body;
    let message = "";
    switch (type) {
      case "SMS":
        const {
          phoneNumbers = ["15645102659"],
          templId = 1161739,
          params = ["PLC", "温度", "哈尔滨", "测试机房", "处理"],
        } = req.body;
        message = `{"type":"${type}","phoneNumbers":[${phoneNumbers
          .map((it: string) => `"${it}"`)
          .join(",")}],"templId":${templId},"params":[${params
          .map((it: string) => `"${escape(it).replace(/%/g, "\\")}"`)
          .join(",")}],"index": 0}`;
        break;
      case "dingtalk":
        const {
          robots = ["1"],
          text,
          isAtAll = false,
          atMobiles = [],
        } = req.body;
        message = `{"type":"${type}","msgtype":"text","robots":[${robots.map(
          (it: string) => `"${it}"`
        )}], 
        "text":{"content":"${escape(text).replace(/%/g, "\\")}"},
        "at":{"atMobiles":[${atMobiles.map(
          (it: string) => `"${it}"`
        )}],"atUserIds":[],"isAtAll":${isAtAll}},
        "index": 0}`;
        break;
      default:
        break;
    }
    console.log(message);
    await Device.send(message);

    res.json({ success: true });
  })
);

server.listen(8080, () => {
  console.log("PMS-X消息网关目前正在8080端口运行...");
});

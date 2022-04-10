import _ from "lodash";
import { Express } from "express";
import {
  deleteDevice,
  getSignals,
  getUnit,
  prisma,
  saveSignals,
  upsertDevice,
  upsertUnit,
} from "../services/orm";
import { ExpressAsyncNext } from "../utils";
import { changeFtpUser, getPorts } from "../services/system";
import { DEVICES, scheduleCron } from "../services";
import { transmitLocalRecords } from "../services/soap";

/**
 * 局站相关信息接口
 * @param app Express服务器
 */
export const getDeviceRoutes = (app: Express) => {
  app.post(
    "/system",
    ExpressAsyncNext(async (req, res) => {
      const unit = await getUnit();
      const ports = await getPorts();
      const protocols = ["电总", "Modbus"];
      res.json({
        unit,
        ports,
        protocols,
      });
    })
  );

  app.post(
    "/unit",
    ExpressAsyncNext(async (req, res) => {
      const unit = await upsertUnit(req.body);
      await scheduleCron();
      res.json(unit);
    })
  );

  app.post(
    "/devices",
    ExpressAsyncNext(async (req, res) => {
      const devices = DEVICES.map((it) => ({
        ...it.instance,
        commands: it.configuration["命令列表"],
      }));
      res.json(devices);
    })
  );

  app.post(
    "/device",
    ExpressAsyncNext(async (req, res) => {
      const devices = await upsertDevice(req.body);
      await scheduleCron();
      res.json(devices);
    })
  );

  app.post(
    "/device/:id",
    ExpressAsyncNext(async (req, res) => {
      const { id } = req.params;
      const devices = await deleteDevice(parseInt(id));
      await scheduleCron();
      res.json(devices);
    })
  );

  app.post(
    "/signal",
    ExpressAsyncNext(async (req, res) => {
      const { device } = req.body;
      const singals = await getSignals(parseInt(device));
      res.json(singals);
    })
  );

  app.post(
    "/config",
    ExpressAsyncNext(async (req, res) => {
      const { device, commands, values } = req.body;
      const instance = DEVICES.find((it) => it.instance.id === device);
      if (commands) {
        const { errors, values } =
          (await instance?.getDeviceValues(commands)) ?? {};
        res.json({
          errors,
          values: values?.map((it: Signal) => ({ ...it, enabled: true })),
        });
      }
      if (values) {
        await saveSignals(device, values);
        await scheduleCron();
        res.json({ code: true, msg: "保存成功" });
      }
    })
  );

  app.post(
    "/boot",
    ExpressAsyncNext(async (req, res) => {
      await scheduleCron();
      res.json({ code: true, msg: "系统已重启" });
    })
  );

  app.post(
    "/alarms",
    ExpressAsyncNext(async (req, res) => {
      const { current, pageSize } = req.body;
      const total = await prisma.alarm.count();
      const alarms = await prisma.alarm.findMany({
        skip: (current - 1) * pageSize,
        take: pageSize,
        orderBy: {
          id: "desc",
        },
      });
      res.json({ total, data: alarms ?? {} });
    })
  );

  app.post(
    "/logs",
    ExpressAsyncNext(async (req, res) => {
      const { current, pageSize } = req.body;
      const total = await prisma.log.count();
      const logs = await prisma.log.findMany({
        skip: (current - 1) * pageSize,
        take: pageSize,
        orderBy: {
          id: "desc",
        },
      });
      res.json({ total, data: logs ?? {} });
    })
  );

  app.post(
    "/log",
    ExpressAsyncNext(async (req, res) => {
      await prisma.log.deleteMany();
      res.json({});
    })
  );
  app.post(
    "/debug",
    ExpressAsyncNext(async (req, res) => {
      await changeFtpUser("test123", "123456");
      res.json({ message: "FTP用户保存成功" });
    })
  );
};

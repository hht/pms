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
  upsertFTP,
  DEVICES,
} from "../services/orm";
import { ExpressAsyncNext, wait } from "../utils";
import {
  changeFtpUser,
  configNetwork,
  getMacAddress,
  getPorts,
} from "../services/system";
import { resetDevices, scheduleJob, SETTINGS } from "../services";
import { handleInvoke } from "../services/soap";
import { Events } from "../services/rx";
import { EVENT } from "../models/enum";
import { recoverAlarms } from "../services/opetration";

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
        isDebug: SETTINGS.isDebug,
      });
    })
  );
  app.post(
    "/debug",
    ExpressAsyncNext(async (req, res) => {
      const { isDebug } = req.body;
      SETTINGS.isDebug = isDebug;
      SETTINGS.isRunning = false;
      while (!SETTINGS.isStopped) {
        await wait(1000);
      }
      if (!isDebug) {
        scheduleJob();
      }
      res.json({ isDebug });
    })
  );

  app.post(
    "/unit",
    ExpressAsyncNext(async (req, res) => {
      const unit = await upsertUnit(req.body);
      await resetDevices();
      scheduleJob();
      res.json(unit);
    })
  );

  app.post(
    "/devices",
    ExpressAsyncNext(async (req, res) => {
      for (const device of DEVICES) {
        device.instance = {
          ...device.instance,
          ...(await prisma.device.findFirst({
            where: {
              id: device.instance.id,
            },
          })),
        };
      }
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
      await resetDevices();
      res.json(devices);
    })
  );

  app.post(
    "/device/:id",
    ExpressAsyncNext(async (req, res) => {
      const { id } = req.params;
      const devices = await deleteDevice(parseInt(id));
      await resetDevices();
      res.json(devices);
    })
  );

  app.post(
    "/signal",
    ExpressAsyncNext(async (req, res) => {
      const { device } = req.body;
      const singals = await getSignals(device);
      res.json(singals);
    })
  );

  app.post(
    "/config",
    ExpressAsyncNext(async (req, res) => {
      const { device, commands, values } = req.body;
      const instance = DEVICES.find((it) => it.instance.deviceId === device);
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
        await resetDevices();
        res.json({ code: true, msg: "保存成功" });
      }
    })
  );

  app.post(
    "/boot",
    ExpressAsyncNext(async (req, res) => {
      Events.emit(EVENT.DISCONNECTED, "正在连接服务器");
      const alarms = await prisma.alarm.findMany({
        where: {
          state: {
            notIn: ["已清除", "已取消"],
          },
        },
      });
      await recoverAlarms(alarms, "采集器重置");
      await prisma.alarm.deleteMany();
      await prisma.signal.updateMany({
        data: {
          alarm: null,
        },
      });
      await resetDevices();
      res.json({ code: true, msg: "系统已重启" });
    })
  );

  app.post(
    "/mac",
    ExpressAsyncNext(async (req, res) => {
      const mac = await getMacAddress();
      res.json({ code: true, msg: mac });
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
    "/alarm",
    ExpressAsyncNext(async (req, res) => {
      const alarms = await prisma.alarm.findMany({
        where: {
          state: {
            notIn: ["已清除", "已取消"],
          },
        },
      });
      await recoverAlarms(alarms, "人工重置告警");
      await prisma.signal.updateMany({
        data: {
          alarm: null,
        },
      });
      await prisma.alarm.deleteMany();
      await prisma.history.deleteMany();
      res.json({});
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
    "/ftp",
    ExpressAsyncNext(async (req, res) => {
      const { id, userName, password } = req.body;
      await changeFtpUser(userName, password);
      await upsertFTP({ id, userName, password });
      res.json({ message: "FTP用户保存成功" });
    })
  );
  app.post(
    "/network",
    ExpressAsyncNext(async (req, res) => {
      const { ip, mask, gateway } = req.body;
      await configNetwork(ip, mask, gateway);
      res.json({ message: "采集器网络配置成功" });
    })
  );
  app.post(
    "/interface",
    ExpressAsyncNext(async (req, res) => {
      const { method, direction } = req.body;
      try {
        const response = await handleInvoke(method, direction);
        res.json(response);
      } catch (e: any) {
        res.json("接口调用失败:" + e.message);
      }
    })
  );
};

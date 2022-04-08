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
import { getPorts } from "../services/system";
import { useDeviceStore } from "../store";
import { DEVICES, scheduleCron } from "../services";

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
      scheduleCron();
      res.json(devices);
    })
  );

  app.post(
    "/device/:id",
    ExpressAsyncNext(async (req, res) => {
      const { id } = req.params;
      const devices = await deleteDevice(parseInt(id));
      scheduleCron();
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
        scheduleCron();
        res.json({ code: true, msg: "保存成功" });
      }
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
    "/monit/:id",
    ExpressAsyncNext(async (req, res) => {
      const { id } = req.params;
      const state = useDeviceStore.getState()[id];
      res.json(state ?? {});
    })
  );
};

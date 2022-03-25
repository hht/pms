import _ from "lodash";
import { Express } from "express";
import {
  deleteDevice,
  getDevices,
  getSignals,
  getUnit,
  saveSignals,
  upsertDevice,
  upsertUnit,
} from "../services/devices";
import { ExpressAsyncNext } from "../utils";
import { getPorts, getCommands } from "../services/system";
import { useDeviceStore } from "../store";
import { scheduleCron } from "../services/gather";

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
      const commands = await getCommands();
      res.json({
        unit,
        ports,
        commands,
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
      const devices = await getDevices();
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
      if (commands) {
        const response = await getDeviceConfig(device, commands);
        res.json(response);
      }
      if (values) {
        console.log(device, values);
        await saveSignals(device, values);
        scheduleCron();
        res.json({ code: true, msg: "保存成功" });
      }
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

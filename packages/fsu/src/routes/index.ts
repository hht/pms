import _ from "lodash";
import { Express } from "express";
import {
  deleteDevice,
  getDevices,
  getUnit,
  upsertDevice,
} from "../services/devices";
import { ExpressAsyncNext } from "../utils";
import { getPorts, getProtocols } from "../services/system";
import { useDeviceStore } from "../store";

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
      const protocols = await getProtocols();
      res.json({
        unit,
        ports,
        protocols,
      });
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
      res.json(devices);
    })
  );

  app.post(
    "/device/:id",
    ExpressAsyncNext(async (req, res) => {
      const { id } = req.params;
      const devices = await deleteDevice(parseInt(id));
      res.json(devices);
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

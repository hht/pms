import { AirConditioner } from "./AirConditioner";
import { Ammeter } from "./Ammeter";
import { Environment } from "./Environment";
import { Temprature } from "./Temprature";
import { YDT } from "./YDT";

export const bootstrapDevice = async (device: Device) => {
  if (device.controller === "组合开关电源") {
    switch (device.protocol) {
      default:
        return new YDT(device);
    }
  }
  if (device.controller === "智能温湿度") {
    switch (device.protocol) {
      default:
        return new Temprature(device);
    }
  }
  if (device.controller === "环境监测") {
    switch (device.protocol) {
      default:
        return new Environment(device);
    }
  }
  if (device.controller === "单元式空调") {
    switch (device.protocol) {
      default:
        return new AirConditioner(device);
    }
  }
  if (device.controller === "智能电表") {
    switch (device.protocol) {
      default:
        return new Ammeter(device);
    }
  }
  return null;
};

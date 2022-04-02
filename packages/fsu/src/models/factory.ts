import { YDT } from "./YDT";

export const bootstrapDevice = async (device: Device) => {
  if (device.controller === "开关电源") {
    switch (device.protocol) {
      default:
        return new YDT(device);
    }
  }
  return null;
};

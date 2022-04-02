import { YDT } from "./models/YDT";
import { getDevice } from "./services/orm";

const test = async () => {
  const device = await getDevice(1);
  // if (device) {
  //   const real = new YDT(device);
  //   real.getSimulationValues([
  //     "交流屏模拟量",
  //     "交流屏状态量",
  //     "交流屏告警量",
  //     "整流模块模拟量",
  //     "整流模块状态量",
  //     "整流模块告警量",
  //     "直流屏模拟量",
  //   ]);
  // }
};

test();

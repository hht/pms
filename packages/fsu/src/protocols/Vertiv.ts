/**
 * 维谛开关电源
 */

import _ from "lodash";
import { VERTIVE_PSMA } from "./templates";
import { assembleCommandOfYDT, parseAlternatingValuesOfYDT } from "./algorithm";
import { CUSTOM_RTN, RTN } from "./enum";
const PROTOCOLS: Protocol[] = [
  {
    id: "2CC0ED46-BC86-B5D6-4215-7F9F57857E03",
    name: "爱默生 PSM-A",
    type: "开关电源",
    model: "PSM-A",
    vendor: "维谛",
    commands: [
      {
        name: "交流屏模拟量数据",
        command: Buffer.from(`200140410002FF`),
        preprocessor: assembleCommandOfYDT,
        parser: parseAlternatingValuesOfYDT,
        options: VERTIVE_PSMA.components["交流屏模拟量"],
      },
    ],
  },
];

export default PROTOCOLS;

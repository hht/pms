/**
 * 维谛开关电源
 */
import {
  appendYDT1363Bytes,
  appendYDT1363LengthByte,
  checkLengthBytes,
  checkYDT1363Bytes,
  getACDistributionAlarms,
  getACDistributionParameters,
  getACDistributionStatus,
  getACDistributionValues,
  getDCDistributionAlarms,
  getDCDistributionStatus,
  getDCDistributionValues,
  getXDCDistributionParameters,
  getXDCDistributionValues,
  removeYDY1363Divider,
} from "./algorithm";
import _ from "lodash";
import { ACDistribution } from "./templates";
const PROTOCOLS: Protocol[] = [
  {
    id: "2CC0ED46-BC86-B5D6-4215-7F9F57857E03",
    name: "爱默生 PSM-11",
    model: "PSM-11",
    manufacturer: "维谛",
    commands: [
      {
        name: "交流屏模拟量数据",
        input: Buffer.from(`200140410002FF`),
        process: (input: Buffer) => {
          return _.reduce(
            [appendYDT1363LengthByte(8), appendYDT1363Bytes],
            (prev, curr) => curr(prev),
            input
          );
        },
        validate: (input: Buffer) =>
          _.reduce(
            [checkYDT1363Bytes, checkLengthBytes(8), removeYDY1363Divider],
            (prev, curr) => curr(prev),
            input
          ),
        parse: (input: Buffer) => {
          return getACDistributionValues(input, ACDistribution);
        },
      },
      {
        name: "交流屏状态量数据",
        input: Buffer.from(`200140430002FF`),
        process: (input: Buffer) => {
          return _.reduce(
            [appendYDT1363LengthByte(8), appendYDT1363Bytes],
            (prev, curr) => curr(prev),
            input
          );
        },
        validate: (input: Buffer) =>
          _.reduce(
            [checkYDT1363Bytes, checkLengthBytes(8), removeYDY1363Divider],
            (prev, curr) => curr(prev),
            input
          ),
        parse: (input: Buffer) => {
          return getACDistributionStatus(input);
        },
      },
      {
        name: "交流屏参数设置",
        input: Buffer.from(`200140460000`),
        process: (input: Buffer) => {
          return _.reduce(
            [appendYDT1363LengthByte(8), appendYDT1363Bytes],
            (prev, curr) => curr(prev),
            input
          );
        },
        validate: (input: Buffer) =>
          _.reduce(
            [checkYDT1363Bytes, checkLengthBytes(8)],
            (prev, curr) => curr(prev),
            input
          ),
        parse: (input: Buffer) => {
          return getACDistributionParameters(input);
        },
      },
      {
        name: "交流屏告警量数据",
        input: Buffer.from(`200140440002FF`),
        process: (input: Buffer) => {
          return _.reduce(
            [appendYDT1363LengthByte(8), appendYDT1363Bytes],
            (prev, curr) => curr(prev),
            input
          );
        },
        validate: (input: Buffer) =>
          _.reduce(
            [checkYDT1363Bytes, checkLengthBytes(8), removeYDY1363Divider],
            (prev, curr) => curr(prev),
            input
          ),
        parse: (input: Buffer) => {
          return getACDistributionAlarms(input);
        },
      },
      {
        name: "整流模块模拟量",
        input: Buffer.from(`200141410000`),
        process: (input: Buffer) => {
          return _.reduce(
            [appendYDT1363LengthByte(8), appendYDT1363Bytes],
            (prev, curr) => curr(prev),
            input
          );
        },
        validate: (input: Buffer) =>
          _.reduce(
            [checkYDT1363Bytes, checkLengthBytes(8), removeYDY1363Divider],
            (prev, curr) => curr(prev),
            input
          ),
        parse: (input: Buffer) => {
          return getDCDistributionValues(input);
        },
      },
      {
        name: "整流模块状态量",
        input: Buffer.from(`200141430000`),
        process: (input: Buffer) => {
          return _.reduce(
            [appendYDT1363LengthByte(8), appendYDT1363Bytes],
            (prev, curr) => curr(prev),
            input
          );
        },
        validate: (input: Buffer) =>
          _.reduce(
            [checkYDT1363Bytes, checkLengthBytes(8), removeYDY1363Divider],
            (prev, curr) => curr(prev),
            input
          ),
        parse: (input: Buffer) => {
          return getDCDistributionStatus(input);
        },
      },
      {
        name: "整流模块告警量",
        input: Buffer.from(`200141440000`),
        process: (input: Buffer) => {
          return _.reduce(
            [appendYDT1363LengthByte(8), appendYDT1363Bytes],
            (prev, curr) => curr(prev),
            input
          );
        },
        validate: (input: Buffer) =>
          _.reduce(
            [checkYDT1363Bytes, checkLengthBytes(8), removeYDY1363Divider],
            (prev, curr) => curr(prev),
            input
          ),
        parse: (input: Buffer) => {
          return getDCDistributionAlarms(input);
        },
      },
      {
        name: "直流模拟量",
        input: Buffer.from(`200142410000`),
        process: (input: Buffer) => {
          return _.reduce(
            [appendYDT1363LengthByte(8), appendYDT1363Bytes],
            (prev, curr) => curr(prev),
            input
          );
        },
        validate: (input: Buffer) =>
          _.reduce(
            [checkYDT1363Bytes, checkLengthBytes(8), removeYDY1363Divider],
            (prev, curr) => curr(prev),
            input
          ),
        parse: (input: Buffer) => {
          return getXDCDistributionValues(input);
        },
      },
      {
        name: "直流设置参数",
        input: Buffer.from(`200142460000`),
        process: (input: Buffer) => {
          return _.reduce(
            [appendYDT1363LengthByte(8), appendYDT1363Bytes],
            (prev, curr) => curr(prev),
            input
          );
        },
        validate: (input: Buffer) =>
          _.reduce(
            [checkYDT1363Bytes, checkLengthBytes(8)],
            (prev, curr) => curr(prev),
            input
          ),
        parse: (input: Buffer) => {
          return getXDCDistributionParameters(input);
        },
      },
    ],
  },
];

export default PROTOCOLS;

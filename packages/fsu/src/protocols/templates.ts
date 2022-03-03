/**
 * 每路交流模拟量的内容
 */
export const ACDistribution: Value[] = [
  { name: "输入线/相电压AB/A", value: "F" },
  { name: "输入线/相电压AB/A", value: "F" },
  { name: "输入线/相电压AB/A", value: "F" },
  { name: "输入频率", value: "F" },
  { name: "用户自定义数据", value: "B", skip: (value: number) => value },
];

/**
 * 每路交流状态量的内容
 */
//  export const ACDistribution: Value[] = [
//     { name: "输入线/相电压AB/A", value: "F" },
//     { name: "输入线/相电压AB/A", value: "F" },
//     { name: "输入线/相电压AB/A", value: "F" },
//     { name: "输入频率", value: "F" },
//     { name: "用户自定义数据", value: "B", skip: (value: number) => value },
//   ];

export const MODAL = {
  name: "PSM-A",
  type: "PSM-A",
  commands: [
    {
      name: "交流屏模拟量数据",
      command: "2022002",
      response: [
        { name: "DATAFLAG", length: 1 },
        { name: "交流屏数量", length: 2 },
      ],
    },
  ],
};

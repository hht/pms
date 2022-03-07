type T = Omit<Signal, "id">;
export const ALTERNATING_VOLTAGE: T = {
  name: "交流电压",
  unit: "V",
  length: 4,
  lowerMinorLimit: 200,
  lowerMajorLimit: 180,
  upperMinorLimit: 240,
  upperMajorLimit: 250,
};
export const ALTERNATING_CURRENT: T = {
  name: "交流电流",
  unit: "A",
  length: 4,
  lowerMinorLimit: 50,
  lowerMajorLimit: 48,
  upperMinorLimit: 54,
  upperMajorLimit: 56,
};
export const ALTERNATING_FREQUENCY: T = {
  name: "交流频率",
  unit: "Hz",
  length: 4,
  lowerMinorLimit: 200,
  lowerMajorLimit: 180,
  upperMinorLimit: 240,
  upperMajorLimit: 250,
};

export const DIRECT_VOLTAGE: T = {
  name: "直流电压",
  unit: "V",
  length: 4,
  lowerMinorLimit: 50,
  lowerMajorLimit: 48,
  upperMinorLimit: 54,
  upperMajorLimit: 56,
};

export const DIRECT_CURRENT: T = {
  name: "直流电流",
  unit: "A",
  length: 4,
  lowerMinorLimit: 50,
  lowerMajorLimit: 48,
  upperMinorLimit: 54,
  upperMajorLimit: 56,
};

import create from "zustand";
import _ from "lodash";
import { request, useRequest } from "../hooks/useRequest";
import shallow from "zustand/shallow";
import produce from "immer";

interface PmsStore {
  unit: Unit | null;
  protocols: string[];
  ports: Port[];
  timestamp: number;
}

interface DashboardStore {
  devices: {
    [key: string]: {
      device: string;
      deviceId: number;
      values: Signal[];
      errors: string[];
      status: string;
    };
  };
  update: (updated: {
    name: string;
    deviceId: number;
    values: Signal[];
    errors: string[];
    status: string;
  }) => void;
}

export const useStore = create<PmsStore>((set) => ({
  unit: null,
  protocols: [],
  ports: [],
  timestamp: new Date().getTime(),
}));

export const useDashboardStore = create<DashboardStore>((set) => ({
  devices: {},
  update: (device) =>
    set(
      produce((state: DashboardStore) => {
        console.log("set", device);
        state.devices = { ...state.devices, [device.deviceId]: device };
      })
    ),
}));

export const useSystem = () => {
  const timestamp = useStore((state) => state.timestamp, shallow);
  useRequest(
    () =>
      request<{
        unit: Unit;
        ports: Port[];
        protocols: string[];
      }>("/system"),
    {
      refreshDeps: [timestamp],
      onSuccess: (data) => {
        useStore.setState({ ...data });
      },
    }
  );
};

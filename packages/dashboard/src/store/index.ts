import create from "zustand";
import { request, useRequest } from "../hooks/useRequest";
import shallow from "zustand/shallow";
import produce from "immer";
import _ from "lodash";
interface PmsStore {
  unit: Unit | null;
  protocols: string[];
  ports: Port[];
  isDebug: boolean;
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

interface EventStore {
  events: { direction: string; data: any }[];
  append: (event: { direction: string; data: any }) => void;
}

export const useStore = create<PmsStore>((set) => ({
  unit: null,
  protocols: [],
  ports: [],
  isDebug: false,
  timestamp: new Date().getTime(),
}));

export const useDashboardStore = create<DashboardStore>((set) => ({
  devices: {},
  update: (device) =>
    set(
      produce((state: DashboardStore) => {
        state.devices = {
          ...state.devices,
          [device.deviceId]: {
            ...device,
            values: _.orderBy(device.values, ["command", "code"]),
          },
        };
      })
    ),
}));

export const useEventStore = create<EventStore>((set) => ({
  events: [],
  append: (evnet: { direction: string; data: any }) =>
    set(
      produce((state: EventStore) => {
        state.events = [evnet, ...state.events];
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
        isDebug: boolean;
      }>("/system"),
    {
      refreshDeps: [timestamp],
      onSuccess: (data) => {
        useStore.setState({
          ...data,
          ports: data.ports?.sort((a, b) => (a.path > b.path ? 1 : -1)),
        });
      },
    }
  );
};

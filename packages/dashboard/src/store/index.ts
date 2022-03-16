import { useEffect } from "react";
import create from "zustand";
import _ from "lodash";
import produce from "immer";
import { request, useRequest } from "../hooks/useRequest";
import shallow from "zustand/shallow";

interface PmsStore {
  unit: Unit | null;
  commands: Command[];
  ports: Port[];
  timestamp: number;
}

export const useStore = create<PmsStore>((set) => ({
  unit: null,
  commands: [],
  ports: [],
  timestamp: new Date().getTime(),
}));

export const useSystem = () => {
  const timestamp = useStore((state) => state.timestamp, shallow);
  useRequest(
    () =>
      request<{
        unit: Unit;
        ports: Port[];
        commands: Command[];
      }>("/system"),
    {
      refreshDeps: [timestamp],
      onSuccess: (data) => {
        useStore.setState({ ...data });
      },
    }
  );
};

interface SignalStore {
  items: Signal[];
}

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useDashboardStore, useEventStore } from "../store";

const STATE = [
  { key: 0, value: "正在链接中" },
  { key: 1, value: "已经链接并且可以通讯" },
  { key: 2, value: "连接正在关闭" },
  { key: 3, value: "连接已关闭或者没有链接成功" },
];

const useWebsocket = (url: string) => {
  const ws = useRef<Socket | null>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [readyState, setReadyState] = useState({ key: 0, value: "正在链接中" });

  const creatWebSocket = () => {
    try {
      const socket = io(url);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      socket.on("connect", () => {
        setReadyState(
          STATE.find((item) => item.key === 1) ?? {
            key: 0,
            value: "正在链接中",
          }
        );
      });

      socket.on("disconnect", () => {
        setReadyState(
          STATE.find((item) => item.key === 3) ?? {
            key: 0,
            value: "正在链接中",
          }
        );
      });
      socket.on("valueReceived", (data) => {
        useDashboardStore.getState().update(data);
      });

      socket.on("soapEvent", (data) => {
        useEventStore.getState().append(data);
      });

      socket.on("connect_error", () => {
        setTimeout(() => {
          socket.connect();
        }, 1000);
      });
      ws.current = socket;
    } catch (error) {
      console.log(error);
    }
  };
  useEffect(() => {
    creatWebSocket();
  }, []);
  return {
    message,
    readyState,
    emit: ws.current?.emit,
    socket: ws.current,
  };
};
export default useWebsocket;

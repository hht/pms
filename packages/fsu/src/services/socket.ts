/**
 * Socket通信
 */
import { Server } from "http";
import _ from "lodash";
import * as socketio from "socket.io";

export const SocketServer: {
  instance: socketio.Server | null;
} = {
  instance: null,
};

export const getSocketInstance = (server: Server) => {
  if (SocketServer.instance) {
    return SocketServer.instance;
  } else {
    const io = new socketio.Server(server, {
      cors: {
        origin: "*",
      },
    });
    SocketServer.instance = io;
    io.on("connection", (socket: socketio.Socket) => {});
    return io;
  }
};

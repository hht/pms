import { InterByteTimeoutParser, SerialPort } from "serialport";
import _ from "lodash";

/**
 * 获取系统所有串口信息
 * @returns
 */
export const getPorts = async () => {
  return await SerialPort.list();
};

export class Device {
  static port: SerialPort | null = null;
  static status: string = "工作正常";
  // 初始化
  static initialize = async (port: string) => {
    if (!Device.port) {
      Device.port = new SerialPort(
        {
          path: port,
          baudRate: 9600,
          autoOpen: true,
        },
        (error: Error | null) => {
          if (error) {
            Device.status = "串口初始化失败";
          } else {
            Device.port
              ?.pipe(new InterByteTimeoutParser({ interval: 100 }))
              .on("data", (data: Buffer) => {
                console.log(data.toString("utf-8"));
              });
          }
        }
      );
    }
  };
  public static send = async (data: string) => {
    await Device.port?.write(data, "utf8");
  };
  public dispose = async () => {};
}

/**
 * 获取系统信息
 */
import OS from "os-utils";
import { SerialPort } from "serialport";
import _ from "lodash";
import { wait } from "../utils";
import { Events } from "./rx";
import { EVENT } from "../models/enum";
import compressing from "compressing";
import { stat, watch, unlink } from "fs";
import dayjs from "dayjs";
/**
 * 获取CPU使用情况
 * @returns
 */
const getCpuUsage = () =>
  new Promise<number>((resolve) => OS.cpuUsage(resolve));

/**
 * 获取系统信息
 * @returns cpu及内存使用情况
 */
export const getSystemInfo = async () => {
  const cpu = await getCpuUsage();
  const mem = 1 - OS.freememPercentage();
  return { cpu, mem };
};

/**
 * 获取系统所有串口信息
 * @returns
 */
export const getPorts = async () => {
  return await SerialPort.list();
};

const deleteUser = async () => {
  console.log("修改FTP用户");
};

/**
 * 修改FTP用户名和口令
 */
export const changeFtpUser = async (username: string, password: string) => {
  return new Promise(async (resolve, reject) => {
    const { exec } = require("child_process");
    const { stdout } = await exec("/www/server/pure-ftpd/bin/pure-pw list");
    stdout.on("data", async (data: any) => {
      if (data) {
        const users = data.toString().split("\n");
        for (const line of users) {
          const user = line.split("\t");
          if (user[0]) {
            await exec(
              `/www/server/pure-ftpd/bin/pure-pw userdel ${user[0]}`,
              (err: Error | null) => {
                if (err) {
                  Events.emit(
                    EVENT.ERROR_LOG,
                    `删除FTP用户失败,错误信息:${err.message}`
                  );
                  reject(`删除用户失败,错误信息:${err.message}`);
                }
              }
            );
          }
        }
      }
    });
    stdout.on("end", async () => {
      const { stdout, stdin } = await exec(
        `/www/server/pure-ftpd/bin/pure-pw useradd ${username} -u www -d /opt/node/pms/firmware/`,
        (err: Error | null) => {
          if (err) {
            Events.emit(
              EVENT.ERROR_LOG,
              `添加FTP用户失败,错误信息:${err.message}`
            );
            reject(err);
          }
        }
      );
      await wait(200);
      stdin.write(`${password}\n`);
      await wait(200);
      stdin.write(`${password}\n`);
      stdout.on("end", async () => {
        await exec(
          `/www/server/pure-ftpd/bin/pure-pw mkdb`,
          async (err: Error | null) => {
            if (err) {
              Events.emit(
                EVENT.ERROR_LOG,
                `保存FTP数据失败,错误信息:${err.message}`
              );
              reject(err);
            } else {
              await exec("/etc/init.d/pure-ftpd restart");
              resolve(true);
            }
          }
        );
      });
    });
  });
};

/**
 * 修改系统时间
 */
export const setTime = async (time: string) => {
  const { exec } = require("child_process");
  return new Promise((resolve, reject) => {
    exec(`date -s "${time}"`, (err: Error | null) => {
      if (err) {
        Events.emit(
          EVENT.ERROR_LOG,
          `修改系统时间失败,错误信息:${err.message}`
        );
        reject(err);
      } else {
        resolve(true);
      }
    });
  });
};

/**
 * 如果上传了系统更新文件，则更新系统
 */

export const watchUpdate = async () => {
  watch(
    "/opt/node/pms/firmware/",
    {
      persistent: true,
      recursive: false,
    },
    async (event, filename) => {
      console.log(`事件类型是: ${event}`);
      switch (event) {
        case "change":
          try {
            if (filename && filename.endsWith(".zip")) {
              await compressing.zip.uncompress(
                "/opt/node/pms/firmware/" + filename,
                "/opt/node/pms/packages/"
              );
              unlink("/opt/node/pms/firmware/" + filename, (e) => {});
            }
          } catch (error: any) {
            if (
              error.message.includes(
                "end of central directory record signature not found"
              )
            ) {
              return;
            }
            Events.emit(
              EVENT.ERROR_LOG,
              `解压系统更新包失败,更新包名称${filename},错误信息:${
                error.message || error || "未知错误"
              }`
            );
          }
      }
    }
  );
};

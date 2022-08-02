import { EventEmitter } from "events";
import _ from "lodash";
import { fromEvent, map, mergeAll, toArray, windowTime } from "rxjs";
import { encodeAlarm, prisma } from "./orm";
import { EVENT } from "../models/enum";
import dayjs from "dayjs";
import { getEndpoint, SoapClient } from "./soap";
import {
  bootstrap,
  sendAlarm,
  sendLocalData,
  setAnalogValues,
  setDigitalValues,
} from "./opetration";
import { getIdentity, getSignalState } from "../utils";
export class Events {
  static events: EventEmitter = new EventEmitter();
  static emit(event: string, data: any) {
    Events.events.emit(event, data);
  }
}

const valueChanged = (data: Value) => {
  // 如果是设备采样失败，不上报采样点状态
  if (data.raw === 0xffff) {
    return false;
  }
  // 如果已到采样间隔时间，则发送采样消息,默认10分钟
  if (
    (data.interval || 10) * 60 +
      dayjs(data.reportAt || "1970-01-01 12:00:00").unix() <
    dayjs().unix()
  ) {
    return true;
  }
  // 如果采样点有阈值并且数据变化超过阈值，则发送采样消息
  if (data.threshold && Math.abs(data.prev - data.raw!) > data.threshold) {
    return true;
  }
  // 如果采样点有阈值百分比并且数据变化超过阈值，则发送采样消息
  if (
    data.thresholdPercent &&
    Math.abs(data.prev - data.raw!) / data.raw! > data.thresholdPercent
  ) {
    return true;
  }
  return false;
};

// 收到采样点信息
const valueRecieved$ = fromEvent(Events.events, EVENT.VALUE_RECEIVED).subscribe(
  async (data) => {
    const recieved = data as Value;
    const updated = {} as Partial<Signal>;
    // 更新采样值
    if (valueChanged(recieved)) {
      updated.reportAt = dayjs().toDate();
      Events.emit(
        recieved.length === 1
          ? EVENT.DIGITAL_VALIE_CHANGED
          : EVENT.ANALOG_VALUE_CHANGED,
        data
      );
    }
    // 更新采样点信息
    await prisma.signal.update({
      data: {
        value: `${recieved.value ?? ""}`,
        raw: recieved?.raw,
        reportAt: updated.reportAt ?? recieved.reportAt,
      },
      where: {
        id: recieved.id,
      },
    });

    // 采样点告警处理
    const prevState = getSignalState(recieved, recieved.prev);
    const currentState = getSignalState(recieved, recieved.raw!);
    // 如果是模拟量且状态发生变化
    if (
      recieved.length !== 1 &&
      (prevState !== currentState ||
        (currentState !== "00" && !recieved.alarm) ||
        (currentState === "00" && recieved.alarm))
    ) {
      Events.emit(EVENT.ALARM_CHANGED, [prevState, currentState, data]);
    }
    // 如果是信号量且有正常值且值发生变化
    if (
      recieved.length === 1 &&
      recieved.normalValue &&
      (recieved.prev !== recieved.raw ||
        (currentState !== "00" && !recieved.alarm) ||
        (currentState === "00" && recieved.alarm))
    ) {
      Events.emit(EVENT.ALARM_CHANGED, [prevState, currentState, data]);
    }
  }
);

const alarmDisappeared = async (data: Value, id: number, delay?: number) => {
  return new Promise((resolve) => {
    const clearedAt = dayjs().toDate();
    setTimeout(async () => {
      const signal = await prisma.signal.findFirst({
        where: {
          id: data.id,
        },
      });
      // 如果采样点告警未变化，则清除告警消息
      if (signal?.alarm === id) {
        const alarm = await prisma.alarm.findFirst({
          where: {
            id,
          },
        });
        if (alarm) {
          await prisma.alarm.update({
            data: {
              state: alarm?.state === "已上传" ? "已清除" : "已取消",
              clearedAt,
            },
            where: {
              id: signal.alarm,
            },
          });
          // 如果告警已上传，则需要发送告警清除消息
          if (alarm.state === "已上传") {
            Events.emit(EVENT.ALARM_SETTLE, encodeAlarm(alarm, "END"));
          }
        }
        // 清除采样点告警标志
        await prisma.signal.update({
          data: {
            alarm: null,
          },
          where: {
            id: signal.id,
          },
        });
        resolve(true);
      }
    }, (delay ?? (data.endDelay || 0)) * 1000);
  });
};

const alarmOccured = async (data: Value, id: number) => {
  setTimeout(async () => {
    const signal = await prisma.signal.findFirst({
      where: {
        id: data.id,
      },
    });
    // 如果采样点告警未变化，则发送告警发生消息
    if (signal?.alarm === id) {
      // 发送告警消息
      const alarm = await prisma.alarm.update({
        data: {
          state: "已上传",
        },
        where: {
          id: signal.alarm,
        },
      });
      Events.emit(EVENT.ALARM_SETTLE, encodeAlarm(alarm));
    }
  }, (data.startDelay || 0) * 1000);
};

// 模拟量采样点变化信息,每10秒批量上传一次
const analogValueChanged$ = fromEvent(Events.events, EVENT.ANALOG_VALUE_CHANGED)
  .pipe(windowTime(10000), map(toArray()), mergeAll())
  .subscribe(setAnalogValues);

// 数字量采样点变化信息,每10秒批量上传一次
const digitalValueChanged$ = fromEvent(
  Events.events,
  EVENT.DIGITAL_VALIE_CHANGED
)
  .pipe(windowTime(10000), map(toArray()), mergeAll())
  .subscribe(setDigitalValues);

// 告警
const stateChanged$ = fromEvent(Events.events, EVENT.ALARM_CHANGED).subscribe(
  async (data) => {
    const [, currentState, recieved] = data as [
      SIGNAL_STATE,
      SIGNAL_STATE,
      Value
    ];

    // 当前状态为正常，取消告警
    if (currentState === "00" && recieved.alarm) {
      // 发送告警清除消息
      await alarmDisappeared(recieved, recieved.alarm);
      return;
    }
    if (currentState !== "00") {
      // 发送告警清除消息
      if (recieved.alarm) {
        await alarmDisappeared(recieved, recieved.alarm, 0);
      }
      // 新增告警发生消息
      const { id } = await prisma.alarm.create({
        data: {
          state: "待上传",
          ...getIdentity(recieved),
          signal: recieved.name,
          value: `${recieved.value ?? ""}`,
          description: recieved.value?.toString().startsWith("采样失败")
            ? `${recieved.value}`
            : `${recieved.name}发生告警,告警值${recieved.value},原始值${recieved.raw}`,
        },
      });
      await prisma.signal.update({
        data: {
          alarm: id,
        },
        where: {
          id: recieved.id,
        },
      });
      alarmOccured(recieved, id);
    }
  }
);

// 告警变化消息，每10秒批量上传一次
const alarmChanged$ = fromEvent(Events.events, EVENT.ALARM_SETTLE)
  .pipe(windowTime(10000), map(toArray()), mergeAll())
  .subscribe(sendAlarm);

// 错误日志
const errorOccured$ = fromEvent(Events.events, EVENT.ERROR_LOG).subscribe(
  async (data) => {
    const value = data as string;
    await prisma.log.create({
      data: {
        description: value,
      },
    });
  }
);

// 中断后重新连接,间隔60秒
const reconnect$ = fromEvent(Events.events, EVENT.DISCONNECTED)
  .pipe(windowTime(10 * 1000), map(toArray()), mergeAll())
  .subscribe(async (data) => {
    if (data.length) {
      try {
        SoapClient.client = (await getEndpoint()) as unknown as IServiceSoap;
        if (!SoapClient.client) {
          Events.emit(EVENT.DISCONNECTED, "服务器连接失败");
          return;
        }
        await SoapClient.invoke(await bootstrap());
        await sendLocalData("SEND_HISAIDATA", 205);
        await sendLocalData("SEND_HISDIDATA", 305);
        await sendLocalData("SEND_HISALARM", 605);
      } catch (e) {
        Events.emit(EVENT.DISCONNECTED, "服务器连接失败");
      }
    }
  });

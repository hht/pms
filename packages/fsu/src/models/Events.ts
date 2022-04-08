import { EventEmitter } from "events";
import _ from "lodash";
import { fromEvent, map, mergeAll, toArray, windowTime } from "rxjs";
import { prisma } from "../services/orm";
import { EVENT } from "./enum";
import dayjs from "dayjs";
import { SoapClient } from "../services/soap";
export class Events {
  static events: EventEmitter = new EventEmitter();
  static emit(event: string, data: any) {
    Events.events.emit(event, data);
  }
}

type SIGNAL_STATE = "00" | "01" | "02" | "03" | "04";

type ALARM_STATE = "待上传" | "已上传" | "已清除" | "已取消";

const getSignalStates = (data: Value, value: number): SIGNAL_STATE => {
  // 信号量并且有正常值
  if (data.length === 1) {
    return value === data.normalValue ? "00" : "01";
  }
  if (data.upperMajorLimit && value > data.upperMajorLimit) {
    return "04";
  }
  if (data.upperMinorLimit && value > data.upperMinorLimit) {
    return "03";
  }
  if (data.lowerMajorLimit && value < data.lowerMajorLimit) {
    return "02";
  }
  if (data.lowerMinorLimit && value < data.lowerMinorLimit) {
    return "01";
  }
  return "00";
};

const valueChanged = (data: Value) => {
  // 如果已到采样间隔时间，则发送采样消息
  if (
    data.interval &&
    data.interval * 60 + dayjs(data.reportAt || "1970-01-01 12:00:00").unix() <
      dayjs().unix()
  ) {
    return true;
  }
  // 如果采样点有阈值并且数据变化超过阈值，则发送采样消息
  if (data.threshold && Math.abs(data.prev - data.current) > data.threshold) {
    return true;
  }
  // 如果采样点有阈值百分比并且数据变化超过阈值，则发送采样消息
  if (
    data.thresholdPercent &&
    Math.abs(data.prev - data.current) / data.current > data.thresholdPercent
  ) {
    return true;
  }
  return false;
};

const getIdentity = (data: Value) => {
  const [deviceCode, deviceSerial, signalType, signalCode, signalSerial] =
    data.id.split("-");

  return {
    deviceId: `${deviceCode}${deviceSerial}`,
    deviceResourceId: "",
    signalId: `${deviceCode}${signalType}${signalCode}${getSignalStates(
      data,
      data.current
    )}${signalSerial}`,
  };
};

// 收到采样点信息
const valueRecieved$ = fromEvent(Events.events, EVENT.VALUE_RECEIVED).subscribe(
  async (data) => {
    const recieved = data as Value;
    const updated = {} as Partial<Signal>;
    Events.emit(EVENT.VALUE_CHANGED, data);
    // 更新采样值
    if (valueChanged(recieved)) {
      updated.reportAt = dayjs().toDate();
      Events.emit(EVENT.VALUE_CHANGED, data);
    }

    // 更新采样点信息
    await prisma.signal.update({
      data: {
        value: `${recieved.value ?? ""}`,
        raw: recieved?.current,
        reportAt: updated.reportAt ?? recieved.reportAt,
      },
      where: {
        id: recieved.id,
      },
    });

    // 采样点告警处理
    const prevState = getSignalStates(recieved, recieved.prev);
    const currentState = getSignalStates(recieved, recieved.current);
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
      (recieved.prev !== recieved.current ||
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
      // 如果采样点告警未变化，则发送清除告警消息
      if (signal?.alarm === id) {
        const alarm = await prisma.alarm.findFirst({
          where: {
            id,
          },
        });
        if (alarm) {
          // 如果告警已上传，则需要发送告警清除消息
          if (alarm.state === "已上传") {
            // 发送告警清除消息
            const { deviceId, deviceResourceId, signalId } = getIdentity(
              signal as unknown as Value
            );
            Events.emit(EVENT.ALARM_SETTLE, {
              SerialNo: signal.alarm,
              DeviceId: deviceId,
              DeviceRId: deviceResourceId,
              AlarmTime: dayjs(clearedAt).format("YYYY-MM-DD HH:mm:ss"),
              TriggerVal: signal.value,
              AlarmFlag: "END",
              id: signalId,
              AlarmDesc: alarm.description,
            });
          }
          await prisma.alarm.update({
            data: {
              state: alarm?.state === "已上传" ? "已清除" : "已取消",
              clearedAt,
            },
            where: {
              id: signal.alarm,
            },
          });
        }

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
      const { deviceId, deviceResourceId, signalId } = getIdentity(
        signal as unknown as Value
      );
      Events.emit(EVENT.ALARM_SETTLE, {
        SerialNo: signal.alarm,
        DeviceId: deviceId,
        DeviceRId: deviceResourceId,
        AlarmTime: dayjs(alarm.occuredAt).format("YYYY-MM-DD HH:mm:ss"),
        TriggerVal: alarm.value,
        AlarmFlag: "BEGIN",
        id: signalId,
        AlarmDesc: alarm.description,
      });
    }
  }, (data.startDelay || 0) * 1000);
};

// 采样点变化信息,每五秒更新一次
const valueChanged$ = fromEvent(Events.events, EVENT.VALUE_CHANGED)
  .pipe(windowTime(5000), map(toArray()), mergeAll())
  .subscribe(async (data) => {
    const values = data as Value[];
    if (values.length) {
      const valuesByDeviceId = _.chain(values)
        .map((value) => ({ ...value, ...getIdentity(value) }))
        .groupBy("deviceId")
        .value();
      // 上报采样点信息
      SoapClient.invoke("SEND_AIDATA", 203, {
        DeviceList: _.keys(valuesByDeviceId).map((key) => {
          const signals = valuesByDeviceId[key];
          return {
            Device: {
              attributes: {
                Id: key,
                Rid: signals[0].deviceResourceId,
              },
              Signal: signals.map((it) => ({
                attributes: {
                  Id: it.signalId,
                  RecordTime: dayjs(it.updatedAt).format("YYYY-MM-DD HH:mm:ss"),
                },
                value: it.value,
              })),
            },
          };
        }),
      });
    }
  });

// 告警
const stateChanged$ = fromEvent(Events.events, EVENT.ALARM_CHANGED).subscribe(
  async (data) => {
    const [prevState, currentState, recieved] = data as [
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
        alarmDisappeared(recieved, recieved.alarm, 0);
      }
      // 新增告警发生消息
      const { id } = await prisma.alarm.create({
        data: {
          state: "待上传",
          ...getIdentity(recieved),
          signal: recieved.name,
          value: `${recieved.value ?? ""}`,
          description: `${recieved.name}发生告警,告警值${recieved.value},原始值${recieved.raw}`,
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

// 采样点变化信息,每五秒更新一次
const alarmChanged$ = fromEvent(Events.events, EVENT.ALARM_SETTLE)
  .pipe(windowTime(5000), map(toArray()), mergeAll())
  .subscribe(async (data) => {
    if (data.length) {
      const values = data.map((it) => ({ TAlarm: it }));
      // 上报采样点信息
      SoapClient.invoke("SEND_ALARM", 603, {
        TAlarmList: values,
      });
    }
  });

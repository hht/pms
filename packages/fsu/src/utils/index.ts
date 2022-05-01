/**
 * 工具函数
 */
import { NextFunction, Request, Response } from "express";
import _ from "lodash";
import { EVENT } from "../models/enum";
import { SocketServer } from "../services/socket";

/**
 * 异步请求处理
 * @param fn 下一步执行的函数
 * @returns
 */
export const ExpressAsyncNext = (
  fn: (req: Request, res: Response, next?: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};

/**
 * Express服务器全局错误处理函数
 * @param err
 * @param req
 * @param res
 * @param next
 */
export const ExpressErrorHandler = async (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.status(200).json({
    error: err.message ?? err,
  });
};

/**
 * 根据重试次数尝试执行函数
 * @param fn 尝试执行的函数
 * @param retries 重试次数，默认3次
 * @param delay 重试间隔时间，默认2000毫秒
 * @param err 错误
 * @returns
 */
interface AttemptContext {
  attemptNum: number;
  attemptsRemaining: number;
  aborted: boolean;
  abort: () => void;
}

type AttemptFunction<T> = (
  context: AttemptContext,
  options: AttemptOptions<T>
) => Promise<T>;
type BeforeAttempt<T> = (
  context: AttemptContext,
  options: AttemptOptions<T>
) => void;
type CalculateDelay<T> = (
  context: AttemptContext,
  options: AttemptOptions<T>
) => number;
type HandleError<T> = (
  err: any,
  context: AttemptContext,
  options: AttemptOptions<T>
) => Promise<void> | void;
type HandleTimeout<T> = (
  context: AttemptContext,
  options: AttemptOptions<T>
) => Promise<T>;

interface AttemptOptions<T> {
  readonly delay: number;
  readonly initialDelay: number;
  readonly minDelay: number;
  readonly maxDelay: number;
  readonly factor: number;
  readonly maxAttempts: number;
  readonly timeout: number;
  readonly jitter: boolean;
  readonly handleError: HandleError<T> | null;
  readonly handleTimeout: HandleTimeout<T> | null;
  readonly beforeAttempt: BeforeAttempt<T> | null;
  readonly calculateDelay: CalculateDelay<T> | null;
}

type PartialAttemptOptions<T> = {
  readonly [P in keyof AttemptOptions<T>]?: AttemptOptions<T>[P];
};

function applyDefaults<T>(
  options?: PartialAttemptOptions<T>
): AttemptOptions<T> {
  if (!options) {
    options = {};
  }

  return {
    delay: options.delay === undefined ? 200 : options.delay,
    initialDelay: options.initialDelay === undefined ? 0 : options.initialDelay,
    minDelay: options.minDelay === undefined ? 0 : options.minDelay,
    maxDelay: options.maxDelay === undefined ? 0 : options.maxDelay,
    factor: options.factor === undefined ? 0 : options.factor,
    maxAttempts: options.maxAttempts === undefined ? 3 : options.maxAttempts,
    timeout: options.timeout === undefined ? 0 : options.timeout,
    jitter: options.jitter === true,
    handleError: options.handleError === undefined ? null : options.handleError,
    handleTimeout:
      options.handleTimeout === undefined ? null : options.handleTimeout,
    beforeAttempt:
      options.beforeAttempt === undefined ? null : options.beforeAttempt,
    calculateDelay:
      options.calculateDelay === undefined ? null : options.calculateDelay,
  };
}

export async function sleep(delay: number) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, delay);
  });
}

export function defaultCalculateDelay<T>(
  context: AttemptContext,
  options: AttemptOptions<T>
): number {
  let delay = options.delay;

  if (delay === 0) {
    // no delay between attempts
    return 0;
  }

  if (options.factor) {
    delay *= Math.pow(options.factor, context.attemptNum - 1);

    if (options.maxDelay !== 0) {
      delay = Math.min(delay, options.maxDelay);
    }
  }

  if (options.jitter) {
    const min = Math.ceil(options.minDelay);
    const max = Math.floor(delay);
    delay = Math.floor(Math.random() * (max - min + 1)) + min;
  }

  return Math.round(delay);
}

export async function attempt<T>(
  attemptFunc: AttemptFunction<T>,
  attemptOptions?: PartialAttemptOptions<T>
): Promise<T> {
  const options = applyDefaults(attemptOptions);

  for (const prop of [
    "delay",
    "initialDelay",
    "minDelay",
    "maxDelay",
    "maxAttempts",
    "timeout",
  ]) {
    const value: any = (options as any)[prop];

    if (!Number.isInteger(value) || value < 0) {
      throw new Error(
        `Value for ${prop} must be an integer greater than or equal to 0`
      );
    }
  }

  if (options.factor.constructor !== Number || options.factor < 0) {
    throw new Error(
      `Value for factor must be a number greater than or equal to 0`
    );
  }

  if (options.delay < options.minDelay) {
    throw new Error(
      `delay cannot be less than minDelay (delay: ${options.delay}, minDelay: ${options.minDelay}`
    );
  }

  const context: AttemptContext = {
    attemptNum: 0,
    attemptsRemaining: options.maxAttempts ? options.maxAttempts : -1,
    aborted: false,
    abort() {
      context.aborted = true;
    },
  };

  const calculateDelay = options.calculateDelay || defaultCalculateDelay;

  async function makeAttempt(): Promise<any> {
    if (options.beforeAttempt) {
      options.beforeAttempt(context, options);
    }

    if (context.aborted) {
      const err: any = new Error(`Attempt aborted`);
      err.code = "ATTEMPT_ABORTED";
      throw err;
    }

    const onError = async (err: any) => {
      if (options.handleError) {
        await options.handleError(err, context, options);
      }

      if (context.aborted || context.attemptsRemaining === 0) {
        throw err;
      }

      // We are about to try again so increment attempt number
      context.attemptNum++;

      const delay = calculateDelay(context, options);
      if (delay) {
        await sleep(delay);
      }

      return makeAttempt();
    };

    if (context.attemptsRemaining > 0) {
      context.attemptsRemaining--;
    }

    if (options.timeout) {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          if (options.handleTimeout) {
            // If calling handleTimeout throws an error that is not wrapped in a promise
            // we want to catch the error and reject.
            try {
              resolve(options.handleTimeout(context, options));
            } catch (e) {
              reject(e);
            }
          } else {
            const err: any = new Error(
              `Retry timeout (attemptNum: ${context.attemptNum}, timeout: ${options.timeout})`
            );
            err.code = "ATTEMPT_TIMEOUT";
            reject(err);
          }
        }, options.timeout);

        attemptFunc(context, options)
          .then((result: T) => {
            clearTimeout(timer);
            resolve(result);
          })
          .catch((err: any) => {
            clearTimeout(timer);
            resolve(onError(err));
          });
      });
    } else {
      // No timeout provided so wait indefinitely for the returned promise
      // to be resolved.
      return attemptFunc(context, options).catch(onError);
    }
  }

  const initialDelay = options.calculateDelay
    ? options.calculateDelay(context, options)
    : options.initialDelay;

  if (initialDelay) {
    await sleep(initialDelay);
  }

  return makeAttempt();
}

export const wait = (delay: number) =>
  new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, delay);
  });

const inspect = (type: string, data: any) => {
  console.log("\x1b[35m%s\x1b[0m", `${type}:`);

  console.log(
    "\x1b[34m%s\x1b[0m",
    JSON.stringify(data)
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
  );
};

export const soapLogger = (type: string, data: any) => {
  if (type === "received") {
    inspect("发送消息", data);
  }
  if (type === "replied") {
    inspect("接收消息", data);
  }
  if (["received", "replied"].includes(type)) {
    SocketServer.instance?.emit(EVENT.SOAP_EVENT, {
      direction: type === "received" ? "发送消息" : "接收消息",
      data: JSON.stringify(data)
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"'),
    });
  }
};

export const getSignalState = (data: Signal, value: number): SIGNAL_STATE => {
  if (value === 0xffff) {
    return "05";
  }
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

export const getIdentity = (data: Signal) => {
  const [deviceCode, deviceSerial, signalType, signalCode, signalSerial] =
    data.id.split("-");

  return {
    deviceId: `${deviceCode}${deviceSerial}`,
    deviceResourceId: "",
    signalId: `${deviceCode}${signalType}${signalCode}${getSignalState(
      data,
      data.raw!
    )}${signalSerial}`,
  };
};

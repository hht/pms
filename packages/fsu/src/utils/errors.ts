/**
 * 自定义错误信息
 */
class BaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BaseError";
    Error.captureStackTrace(this, BaseError);
  }
}

export class DeviceError extends BaseError {
  data?: Buffer;
  message: string;
  constructor({ message, data }: { message: string; data?: Buffer }) {
    super(message);
    this.message = message;
    this.data = data;
    BaseError.captureStackTrace(this, DeviceError);
  }
}

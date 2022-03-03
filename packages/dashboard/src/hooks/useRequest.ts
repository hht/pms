import { useRequest as useFetch } from 'ahooks';
import { Options, Service } from 'ahooks/lib/useRequest/src/types';
import { message } from 'antd';
import axios from 'axios';

import { baseURL } from '../config';

axios.defaults.baseURL = baseURL;

axios.interceptors.response.use(
  (response) => {
    const { data } = response;
    if (data.error) {
      throw data.error;
    }
    return data;
  },
  (error) => {
    console.log(error);
    if (error) {
      return Promise.reject(error);
    } else {
      return Promise.resolve({});
    }
  }
);

export const request = async <T>(service: string, body?: any): Promise<T> => {
  return await axios.post<any, T>(service, body).catch((error) => {
    message.error(error.message ?? error);
    return Promise.reject(error);
  });
};

export const useRequest = <T>(
  service: Service<T, any[]>,
  options?: Options<T, any[]> | undefined
) => {
  return useFetch<T, any[]>(service, {
    loadingDelay: 300,
    throttleWait: 500,
    onError: (error) => {
      console.log(error);
    },
    ...options,
  });
};

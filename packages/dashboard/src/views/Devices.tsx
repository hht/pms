import { Button, Card, Drawer, message, Modal, Tag } from "antd";
import _ from "lodash";
import { FC, Fragment, useRef } from "react";

import { PlusOutlined } from "@ant-design/icons";
import {
  BetaSchemaForm,
  ProFormColumnsType,
  ProFormInstance,
} from "@ant-design/pro-form";
import ProTable, { ActionType } from "@ant-design/pro-table";

import { request, useRequest } from "../hooks/useRequest";

import type { ProColumns } from "@ant-design/pro-table";
import { useStore } from "../store";
import { useReactive } from "ahooks";
import Signals from "./Signals";

const getModelList = (controller: string) => {
  switch (controller) {
    case "组合开关电源":
      return ["通用设备(电总协议)", "爱默生PSM-A", "爱默生M810G"];
    case "智能温湿度":
      return ["TH-01"];
    case "环境监测":
      return ["PSX-01"];
    default:
      return [];
  }
};

const upsertDevice = (values: Device) =>
  request("/device", values).then(() => {
    message.success("设备信息修改成功");
  });

const Devices: FC = () => {
  const { ports, protocols, isDebug } = useStore((state) => state);
  const actionRef = useRef<ActionType>();
  const values = useReactive<{ current?: Partial<Device> }>({
    current: undefined,
  });

  const formRef = useRef<ProFormInstance>();

  const columns: ProColumns<Partial<Device>>[] = [
    {
      title: "#",
      dataIndex: "id",
      align: "center",
      valueType: "indexBorder",
    },
    {
      title: "顺序号",
      dataIndex: "serial",
    },
    {
      title: "设备类型",
      dataIndex: "controller",
    },
    {
      title: "设备名称",
      dataIndex: "name",
    },
    {
      title: "协议",
      dataIndex: "protocol",
    },
    {
      title: "状态",
      dataIndex: "activite",
      valueEnum: {
        false: { text: "未采集", status: "Error" },
        true: { text: "采集中", status: "Success" },
      },
    },
    {
      title: "生产厂家",
      dataIndex: "manufacturer",
      hideInTable: true,
    },
    {
      title: "当前监控点数量",
      dataIndex: "signals",
      hideInForm: true,
      align: "center",
      render: (_, record) => {
        return (
          <Tag
            style={{ width: "50%", textAlign: "center" }}
            color={record.signals?.length === 0 ? "orange" : "green"}
          >
            {record.signals?.length}
          </Tag>
        );
      },
    },
    {
      title: "产品型号",
      dataIndex: "model",
    },
    {
      title: "串口号",
      dataIndex: "port",
    },
    {
      title: "地址/局码",
      dataIndex: "address",
    },
    {
      title: "超时设置",
      dataIndex: "timeout",
      render: (timeout) => {
        return <span>{timeout}毫秒</span>;
      },
    },

    {
      title: "操作",
      valueType: "option",
      hideInForm: true,
      render: (_, record) => [
        <BetaSchemaForm
          formRef={formRef}
          title="编辑设备"
          key="edit"
          columns={proColumns}
          layoutType="DrawerForm"
          initialValues={{ timeout: 2000, ...record }}
          onFinish={async (values) => {
            await upsertDevice({ ...record, ...values });
            actionRef.current?.reload();
            return true;
          }}
          trigger={
            <Button disabled={!isDebug} type="primary">
              编辑
            </Button>
          }
        ></BetaSchemaForm>,
        <Fragment key="config">
          <Button
            disabled={!isDebug}
            onClick={() => {
              values.current = record;
            }}
          >
            配置
          </Button>
        </Fragment>,
        <Button
          key="delete"
          disabled={!isDebug}
          danger
          onClick={() => {
            Modal.confirm({
              title: "确认删除",
              content: "确认删除该设备吗？",
              onOk: async () => {
                await request(`/device/${record.id}`).then(() => {
                  message.success("设备删除成功");
                  actionRef.current?.reload();
                });
              },
            });
          }}
        >
          删除
        </Button>,
      ],
    },
  ];

  const proColumns: ProFormColumnsType<Device>[] = [
    {
      title: "设备名称",
      dataIndex: "name",
      formItemProps: {
        rules: [
          {
            required: true,
            message: "此项为必填项",
          },
        ],
      },
      width: "m",
    },
    {
      title: "顺序号",
      dataIndex: "serial",
      tooltip: "该设备在本基站中的顺序号",
      formItemProps: {
        rules: [
          {
            required: true,
            message: "必须为两位数字",
            pattern: /^[0-9]{2}$/,
          },
        ],
      },
      width: "m",
    },
    {
      title: "协议",
      dataIndex: "protocol",
      width: "m",
      valueEnum: _.keyBy(protocols),
      formItemProps: {
        rules: [
          {
            required: true,
            message: "此项为必填项",
          },
        ],
      },
    },

    {
      dataIndex: "address",
      title: "地址/局码",
      width: "m",
      valueType: "digit",
      initialValue: 1,
      formItemProps: {
        rules: [
          {
            required: true,
            message: "此项为必填项",
          },
        ],
      },
    },

    {
      title: "设备类型",
      dataIndex: "controller",
      width: "m",
      valueEnum: {
        组合开关电源: "组合开关电源",
        智能温湿度: "智能温湿度",
        环境监测: "环境监测",
      },
      formItemProps: {
        rules: [
          {
            required: true,
            message: "此项为必填项",
          },
        ],
      },
    },
    {
      valueType: "dependency",
      width: "m",
      fieldProps: {
        name: ["controller"],
      },
      columns: ({ controller }) => {
        return [
          {
            dataIndex: "model",
            title: "产品型号",
            width: "m",
            valueType: "select",
            fieldProps: { options: getModelList(controller) },
            formItemProps: {
              rules: [
                {
                  required: true,
                  message: "此项为必填项",
                },
              ],
            },
          },
        ];
      },
    },
    {
      title: "串口号",
      dataIndex: "port",
      valueType: "select",
      fieldProps: {
        options: ports?.map(({ path }) => path),
      },
      formItemProps: {
        rules: [
          {
            required: true,
            message: "此项为必填项",
          },
        ],
      },
      width: "m",
    },
    {
      title: "生产厂家",
      dataIndex: "manufacturer",
      width: "m",
    },
    {
      title: "生产日期",
      dataIndex: "productionAt",
      width: "m",
      valueType: "date",
    },
    {
      title: "软件版本",
      dataIndex: "version",
      width: "m",
    },
    {
      title: "超时设置",
      dataIndex: "timeout",
      valueType: "digit",
      fieldProps: {
        addonAfter: "毫秒",
        precision: 0,
      },
      formItemProps: {
        rules: [
          {
            required: true,
            message: "此项为必填项",
          },
        ],
      },
      width: "m",
    },
    {
      title: "采集状态",
      dataIndex: "activite",
      valueType: "switch",
      fieldProps: {
        checkedChildren: "开",
        unCheckedChildren: "关",
      },
      valueEnum: {
        false: { text: "未采集", status: "Error" },
        true: { text: "采集中", status: "Success" },
      },
    },
  ];
  const { run: toggleMode, loading } = useRequest(
    () => request("/debug", { isDebug: !useStore.getState().isDebug }),
    {
      manual: true,
      onSuccess: ({ isDebug }: any) => {
        useStore.setState({ isDebug });
        message.success(isDebug ? "调试模式已打开" : "调试模式已关闭");
      },
    }
  );

  return (
    <>
      <Card>
        <ProTable<Partial<Device>>
          headerTitle="设备列表"
          rowKey="id"
          bordered
          columns={columns}
          request={async (params) => {
            const data = await request<Device[]>("/devices");
            return {
              data: data.map((it) => ({
                ...it,
                signals: it.signals.sort((a, b) => {
                  return (a.offset ?? 0) < (b.offset ?? 0) ? -1 : 1;
                }),
              })),
            };
          }}
          actionRef={actionRef}
          search={false}
          style={{ marginTop: 24 }}
          toolBarRender={() => [
            <Button
              key="button"
              danger={isDebug}
              type="primary"
              loading={loading}
              onClick={toggleMode}
            >
              {!isDebug ? "采集模式" : "配置模式"}
            </Button>,
            <BetaSchemaForm
              formRef={formRef}
              style={{ width: 200 }}
              title="新增设备"
              columns={proColumns}
              layoutType="DrawerForm"
              onFinish={async (values) => {
                await upsertDevice(values);
                actionRef.current?.reload();
                return true;
              }}
              trigger={
                <Button
                  disabled={!isDebug}
                  key="button"
                  icon={<PlusOutlined />}
                  type="primary"
                >
                  新建
                </Button>
              }
            ></BetaSchemaForm>,
          ]}
        />
      </Card>
      <Drawer
        visible={!!values.current}
        onClose={() => (values.current = undefined)}
        width="100%"
        title="采样点配置"
        destroyOnClose
      >
        <Signals
          device={values.current}
          onRequest={() => actionRef.current?.reload()}
        />
      </Drawer>
    </>
  );
};

export default Devices;

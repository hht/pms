import "../styles/index.scss";

import {
  Alert,
  Button,
  Card,
  Descriptions,
  Drawer,
  message,
  Modal,
  Skeleton,
} from "antd";
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
  return _.chain(useStore.getState().commands)
    .filter((it) => it.controller === controller)
    .map((it) => it.model)
    .flatten()
    .uniq()
    .value();
};

const Devices: FC = () => {
  const { ports } = useStore((state) => state);
  const actionRef = useRef<ActionType>();
  const values = useReactive({
    visible: false,
  });
  const { run: upsertDevice } = useRequest(
    (values) => request("/device", values),
    {
      manual: true,
      onSuccess: () => {
        message.success("设备更新成功");
      },
    }
  );

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
          initialValues={record}
          onFinish={async (values) => {
            await upsertDevice({ ...record, ...values });
            actionRef.current?.reload();
            return true;
          }}
          trigger={<Button type="primary">编辑</Button>}
        ></BetaSchemaForm>,
        <Fragment key="config">
          <Button
            onClick={() => {
              values.visible = true;
            }}
          >
            配置
          </Button>
          <Drawer
            visible={values.visible}
            onClose={() => (values.visible = false)}
            width={800}
            destroyOnClose
          >
            <Signals device={record} />
          </Drawer>
        </Fragment>,
        <Button
          key="delete"
          danger
          onClick={() => {
            Modal.confirm({
              title: "确认删除",
              content: "确认删除该设备吗？",
              onOk: async () => {
                await request(`/device/${record.id}`).then(() => {
                  message.success("设备删除成功");
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
      title: "设备类型",
      dataIndex: "controller",
      valueEnum: { 开关电源: "开关电源", 智能温湿度: "智能温湿度" },
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
      fieldProps: {
        name: ["controller"],
      },
      columns: ({ controller }) => {
        if (controller) {
          return [
            {
              dataIndex: "model",
              title: "产品型号",
              width: "m",
              valueType: "select",
              fieldProps: {
                options: getModelList(controller),
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
          ];
        }
        return [];
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
      title: "状态",
      dataIndex: "activite",
      valueType: "radio",
      valueEnum: {
        false: { text: "未采集", status: "Error" },
        true: { text: "采集中", status: "Success" },
      },
    },
  ];

  return (
    <Card>
      <ProTable<Partial<Device>>
        headerTitle="设备列表"
        rowKey="id"
        bordered
        columns={columns}
        request={async (params) => {
          const data = await request<Device[]>("/devices");
          return { data };
        }}
        actionRef={actionRef}
        search={false}
        style={{ marginTop: 24 }}
        toolBarRender={() => [
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
              <Button key="button" icon={<PlusOutlined />} type="primary">
                新建
              </Button>
            }
          ></BetaSchemaForm>,
        ]}
      />
    </Card>
  );
};

export default Devices;

import "../styles/index.scss";

import {
  Alert,
  Button,
  Card,
  Descriptions,
  message,
  Modal,
  Skeleton,
} from "antd";
import _ from "lodash";
import { FC, useRef } from "react";

import { PlusOutlined } from "@ant-design/icons";
import {
  BetaSchemaForm,
  ProFormColumnsType,
  ProFormInstance,
} from "@ant-design/pro-form";
import ProTable, { ActionType } from "@ant-design/pro-table";

import { request, useRequest } from "../hooks/useRequest";

import type { ProColumns } from "@ant-design/pro-table";

const Points: FC<{ id: number }> = ({ id }) => {
  const { refresh, data } = useRequest<{
    values: { name: string; value: number | string }[];
    times: number;
    error: string;
  }>((values) => request(`/monit/${id}`, values), {
    onSuccess: () => {
      message.success("获取设备数据成功");
    },
  });
  if (data?.error) {
    return <Alert message={data.error} type="error" />;
  }
  return (
    <Card>
      {data?.values ? (
        <Descriptions
          bordered
          title="设备数据"
          size="small"
          extra={
            <Button type="primary" onClick={refresh}>
              刷新
            </Button>
          }
        >
          {data?.values?.map((it) => (
            <Descriptions.Item key={it.name} label={it.name}>
              {it.value}
            </Descriptions.Item>
          ))}
        </Descriptions>
      ) : (
        <Skeleton active></Skeleton>
      )}
    </Card>
  );
};

const Devices: FC<{
  ports?: Port[];
  protocols?: { [key: string]: Protocol[] };
}> = ({ ports, protocols }) => {
  const actionRef = useRef<ActionType>();
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
      title: "设备ID",
      dataIndex: "deviceId",
    },

    {
      title: "设备名称",
      dataIndex: "name",
    },
    {
      title: "状态",
      dataIndex: "active",
      valueEnum: {
        false: { text: "暂停", status: "Error" },
        true: { text: "运行中", status: "Success" },
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
      title: "设备ID",
      dataIndex: "deviceId",
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
      title: "资源ID",
      dataIndex: "resourceId",
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
        addonAfter: "秒",
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
      dataIndex: "active",
      valueType: "switch",
      valueEnum: {
        false: { text: "暂停", status: "Error" },
        true: { text: "运行中", status: "Success" },
      },
    },
    {
      title: "生产厂家",
      valueType: "select",
      dataIndex: "manufacturer",
      fieldProps: {
        options: _.keys(protocols),
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
      valueType: "dependency",
      fieldProps: {
        name: ["manufacturer"],
      },
      columns: ({ manufacturer }) => {
        if (manufacturer) {
          return [
            {
              dataIndex: "model",
              title: "产品型号",
              width: "m",
              valueType: "select",
              fieldProps: {
                options: protocols?.[manufacturer]?.map(({ model }) => model),
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
        expandable={{
          expandedRowRender: (record) => <Points id={record.id!} />,
          rowExpandable: () => true,
        }}
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

import "../styles/index.scss";

import { Button, Card, Drawer, message, Modal } from "antd";
import _ from "lodash";
import { FC, Fragment, useRef } from "react";

import {
  DeleteOutlined,
  InfoCircleOutlined,
  PlusOutlined,
} from "@ant-design/icons";
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

const Log: FC = () => {
  const actionRef = useRef<ActionType>();

  const { run: clearLog } = useRequest(() => request("/log"), {
    manual: true,
    onSuccess: () => {
      message.success("日志已清除");
      actionRef.current?.reload();
    },
  });

  const columns: ProColumns<Partial<Log>>[] = [
    {
      title: "#",
      dataIndex: "id",
      align: "center",
      valueType: "indexBorder",
    },
    {
      title: "错误信息",
      dataIndex: "description",
    },
    {
      title: "发生时间",
      dataIndex: "createdAt",
    },
  ];
  return (
    <>
      <Card>
        <ProTable<Partial<Log>>
          headerTitle="错误日志"
          rowKey="id"
          bordered
          columns={columns}
          request={async (params) => {
            return await request("/logs", params);
          }}
          actionRef={actionRef}
          pagination={{ pageSize: 10 }}
          search={false}
          style={{ marginTop: 24 }}
          toolBarRender={() => [
            <Button
              key="button"
              icon={<DeleteOutlined />}
              danger
              onClick={() => {
                Modal.confirm({
                  title: "清除日志",
                  icon: <InfoCircleOutlined />,
                  content: "您确认要清除所有错误日志吗？",
                  okText: "确认",
                  cancelText: "取消",
                  onOk: clearLog,
                });
              }}
            >
              清除日志
            </Button>,
          ]}
        />
      </Card>
    </>
  );
};

export default Log;

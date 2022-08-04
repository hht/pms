import { Button, Card, message, Modal, Tag } from "antd";
import { FC, useRef } from "react";

import ProTable, { ActionType } from "@ant-design/pro-table";

import { request, useRequest } from "../hooks/useRequest";

import type { ProColumns } from "@ant-design/pro-table";
import dayjs from "dayjs";
import { DeleteOutlined, InfoCircleOutlined } from "@ant-design/icons";

const COLORS: { [key: string]: string } = {
  已上传: "blue",
  已清除: "green",
  已取消: "default",
  待上传: "valcano",
};

const Alarms: FC = () => {
  const actionRef = useRef<ActionType>();

  const columns: ProColumns<Partial<Alarm>>[] = [
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
      title: "采样点ID",
      dataIndex: "signalId",
    },
    {
      title: "采样点名称",
      dataIndex: "signal",
    },
    {
      title: "告警值",
      dataIndex: "value",
    },
    {
      title: "告警描述",
      dataIndex: "description",
      ellipsis: true,
      copyable: true,
    },
    {
      title: "当前状态",
      dataIndex: "state",
      render: (__, record) => {
        return <Tag color={COLORS[record.state!]}>{record.state}</Tag>;
      },
    },

    {
      title: "发生时间",
      dataIndex: "occuredAt",
      render: (__, record) =>
        record.occuredAt
          ? dayjs(record.occuredAt).format("YY/MM/DD HH:mm:ss")
          : "-",
    },
    {
      title: "清除时间",
      dataIndex: "clearedAt",
      render: (__, record) =>
        record.clearedAt
          ? dayjs(record.clearedAt).format("YY/MM/DD HH:mm:ss")
          : "-",
    },
  ];
  const { run: clearAlarm } = useRequest(() => request("/alarm"), {
    manual: true,
    onSuccess: () => {
      message.success("采集器本地告警记录已清除");
      actionRef.current?.reload();
    },
  });
  return (
    <>
      <Card>
        <ProTable<Partial<Alarm>>
          headerTitle="告警日志"
          rowKey="id"
          bordered
          columns={columns}
          request={async (params) => {
            return await request("/alarms", params);
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
                  title: "清除告警",
                  icon: <InfoCircleOutlined />,
                  content:
                    "您确认要清除所有错误日志吗？这将清除采集器中的历史告警及未上报告警",
                  okText: "确认",
                  cancelText: "取消",
                  onOk: clearAlarm,
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

export default Alarms;

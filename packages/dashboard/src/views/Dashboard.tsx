import "../styles/index.scss";

import {
  Alert,
  Button,
  Card,
  Drawer,
  message,
  Modal,
  Statistic,
  Tag,
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
import { useDashboardStore } from "../store";
import { useReactive } from "ahooks";
import shallow from "zustand/shallow";

const getModelList = () => {
  return ["PSM-A"];
};

const getColor = (data: Signal) => {
  // 信号量并且有正常值
  if (data.length === 1) {
    return data.raw === data.normalValue ? "#388E3C" : "#E64A19";
  }
  if (data.upperMajorLimit && data.raw! > data.upperMajorLimit) {
    return "#E64A19";
  }
  if (data.upperMinorLimit && data.raw! > data.upperMinorLimit) {
    return "#FF8F00";
  }
  if (data.lowerMajorLimit && data.raw! < data.lowerMajorLimit) {
    return "#E64A19";
  }
  if (data.lowerMinorLimit && data.raw! < data.lowerMinorLimit) {
    return "#FF8F00";
  }
  return "#388E3C";
};

const Dashboard: FC = () => {
  const devices = useDashboardStore((state) => state.devices, shallow);
  return (
    <>
      {_.values(devices).map((device) => (
        <Card
          key={device.deviceId}
          title={device.device}
          extra={
            <div>
              <Tag>{device.status}</Tag>
            </div>
          }
        >
          {device.errors.length ? (
            <Card style={{ padding: 24 }}>
              {device.errors.map((it) => (
                <Alert>{it}</Alert>
              ))}
            </Card>
          ) : (
            <Card style={{ padding: 24 }}>
              {device.errors.map((it) => (
                <Alert>{it}</Alert>
              ))}
            </Card>
          )}
          {device.values.map((value) => (
            <Card.Grid
              hoverable={false}
              key={value.id}
              style={{ width: "25%", textAlign: "center", cursor: "pointer" }}
            >
              <Statistic
                title={value.name}
                value={value.value}
                precision={2}
                valueStyle={{ color: getColor(value) }}
              />
            </Card.Grid>
          ))}
        </Card>
      ))}
    </>
  );
};

export default Dashboard;

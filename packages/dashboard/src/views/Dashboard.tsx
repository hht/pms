import { Alert, Card, Result, Skeleton, Tag } from "antd";
import _ from "lodash";
import { FC } from "react";
import { useDashboardStore } from "../store";
import shallow from "zustand/shallow";
import ProTable, { ProColumns } from "@ant-design/pro-table";

const getColor = (data: Partial<Signal>) => {
  // 信号量并且有正常值
  if (data.length === 1) {
    return _.isNumber(data.normalValue) && data.raw !== data.normalValue
      ? "#E64A19"
      : "#388E3C";
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

const columns: ProColumns<Partial<Signal>>[] = [
  {
    title: "#",
    align: "center",
    valueType: "indexBorder",
    editable: false,
    width: 60,
    fixed: "left",
  },
  {
    title: "监控点名称",
    dataIndex: "name",
    fixed: "left",
    render: (text, record) => {
      return <span style={{ fontWeight: "bold" }}>{text}</span>;
    },
  },
  {
    title: "监控点实时数据",
    dataIndex: "value",
    fixed: "left",
    render: (text, record) => {
      return (
        <span style={{ color: getColor(record), fontWeight: "bold" }}>
          {text}
        </span>
      );
    },
  },
  {
    title: "命令",
    dataIndex: "command",
    editable: false,
  },
  {
    title: "采样点顺序号",
    dataIndex: "index",
    valueType: "digit",
  },
  {
    title: "采样点正常值(信号量)",
    dataIndex: "normalValue",
    valueType: "digit",
  },
  {
    title: "单位",
    dataIndex: "unit",
  },

  {
    title: "过低阈值",
    dataIndex: "lowerMajorLimit",
    valueType: "digit",
  },
  {
    title: "较低阈值",
    dataIndex: "lowerMinorLimit",
    valueType: "digit",
  },

  {
    title: "较高阈值",
    dataIndex: "upperMinorLimit",
    valueType: "digit",
  },
  {
    title: "过高阈值",
    dataIndex: "upperMajorLimit",
    valueType: "digit",
  },
  {
    title: "变化阈值",
    dataIndex: "threshold",
    valueType: "digit",
  },
  {
    title: "变化阈值百分比",
    dataIndex: "thresholdPercent",
    valueType: "digit",
    fieldProps: {
      addonAfter: "%",
    },
  },
  {
    title: "告警开始延迟(秒)",
    dataIndex: "startDelay",
    valueType: "digit",
  },
  {
    title: "告警结束延迟(秒)",
    dataIndex: "endDelay",
    valueType: "digit",
  },
];

const Dashboard: FC = () => {
  const devices = useDashboardStore((state) => state.devices, shallow);
  if (_.keys(devices).length === 0) {
    return (
      <Card>
        <Result
          icon={<Skeleton active />}
          title="实时数据"
          subTitle="实时数据将于下一采样周期更新，请稍后..."
        />
      </Card>
    );
  }
  console.log(devices);
  return (
    <>
      {_.values(devices).map((device) => (
        <Card
          style={{ marginTop: 20 }}
          key={device.deviceId}
          title={device.device}
          extra={
            <div>
              <Tag color={device.status === "工作正常" ? "success" : "warning"}>
                {device.status}
              </Tag>
            </div>
          }
        >
          {device.errors.length
            ? device.errors.map((it, index) => (
                <Alert
                  description={it}
                  style={{ marginBottom: 10 }}
                  type="error"
                  key={index}
                ></Alert>
              ))
            : null}
          <ProTable<Partial<Signal>>
            rowKey="id"
            bordered
            columns={columns}
            dataSource={device.values}
            search={false}
            scroll={{ x: 2200 }}
            style={{ margin: -24, marginTop: 0 }}
            options={false}
          />
        </Card>
      ))}
    </>
  );
};

export default Dashboard;

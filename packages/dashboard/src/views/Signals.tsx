import "../styles/index.scss";

import { Alert, Button, Card, Checkbox, ConfigProvider, Empty } from "antd";
import _ from "lodash";
import { FC, useRef } from "react";

import {
  MinusCircleOutlined,
  SaveOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import ProTable, { ActionType } from "@ant-design/pro-table";

import { request, useRequest } from "../hooks/useRequest";

import type { ProColumns } from "@ant-design/pro-table";
import { useStore } from "../store";
import { useReactive } from "ahooks";

const renderEmpty = () => (
  <Empty
    image={Empty.PRESENTED_IMAGE_SIMPLE}
    description="该设备未配置采样点, 请首先配置设备"
  />
);

const Signals: FC<{ device?: Partial<Device> }> = ({ device }) => {
  const actionRef = useRef<ActionType>();
  const { commands } = useStore((state) => state);
  const store = useReactive<{
    commands: string[];
    values: Signal[];
    errors: { name: string; error: string }[];
  }>({
    commands: [],
    values: [],
    errors: [],
  });
  const {
    run: getConfig,
    loading,
    data,
  } = useRequest<{
    values: Signal[];
    errors: { name: string; error: string }[];
  }>(
    (commands: string[]) => {
      return request("/config", { commands, device: device!.id! });
    },
    {
      manual: true,
      onSuccess: ({ values, errors }) => {
        store.values = values;
        store.errors = errors;
      },
    }
  );
  const columns: ProColumns<Partial<Signal>>[] = [
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
  ];

  return (
    <>
      <Alert
        description="如未配置过采样点，请先选择设备命令点击配置按钮，配置完成后，请点击保存按钮;如需设备配置已更改，请点击重置按钮删除所有采样点重新配置"
        type="info"
        showIcon
      />
      <Card
        title={loading ? "正在与设备通讯获取配置,请稍后.." : "设备支持命令列表"}
        style={{ marginTop: 20 }}
        extra={
          <Button
            key="fetch"
            loading={loading}
            icon={<SyncOutlined />}
            type="primary"
            disabled={store.commands.length === 0}
            onClick={() => {
              getConfig(store.commands);
            }}
          >
            获取配置
          </Button>
        }
      >
        {commands
          .filter(
            (it) =>
              it.controller === device?.controller &&
              it.model.includes(device.model!)
          )
          .map((it) => (
            <Card.Grid key={it.id} style={{ width: "25%", textAlign: "left" }}>
              <Checkbox
                checked={store.commands.includes(it.id)}
                onChange={() => {
                  store.commands = _.xor(store.commands, [it.id]);
                }}
              >
                {it.name}
              </Checkbox>
            </Card.Grid>
          ))}
      </Card>
      <ConfigProvider renderEmpty={renderEmpty}>
        <ProTable<Partial<Signal>>
          headerTitle="采样点列表"
          rowKey="id"
          bordered
          columns={columns}
          dataSource={store.values}
          actionRef={actionRef}
          search={false}
          style={{ margin: -24, marginTop: 0 }}
          toolBarRender={() => [
            <Button key="fetch" icon={<SaveOutlined />} type="primary">
              保存
            </Button>,
            <Button key="reset" icon={<MinusCircleOutlined />} danger>
              重置
            </Button>,
          ]}
        />
      </ConfigProvider>
    </>
  );
};

export default Signals;

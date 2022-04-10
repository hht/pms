import {
  Alert,
  Button,
  Card,
  Checkbox,
  ConfigProvider,
  Empty,
  Input,
  InputNumber,
  message,
  Switch,
} from "antd";
import _ from "lodash";
import { FC, useRef, useState } from "react";
import {
  MinusCircleOutlined,
  SaveOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import ProTable, { ActionType } from "@ant-design/pro-table";

import { request, useRequest } from "../hooks/useRequest";

import type { ProColumns } from "@ant-design/pro-table";
import { useReactive } from "ahooks";

const renderEmpty = () => (
  <Empty
    image={Empty.PRESENTED_IMAGE_SIMPLE}
    description="该设备未配置采样点, 请首先配置设备"
  />
);

const Signals: FC<{ device?: Partial<Device>; onRequest: () => void }> = ({
  device,
  onRequest,
}) => {
  const [editableKeys, setEditableRowKeys] = useState<React.Key[]>([]);
  const actionRef = useRef<ActionType>();
  const store = useReactive<{
    commands: string[];
    values: Signal[];
    errors: { name: string; error: string }[];
  }>({
    commands: [],
    values: device?.signals || [],
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
      return request("/config", {
        commands: _.keys(device!.commands).filter((it) =>
          commands.includes(it)
        ),
        device: device!.id!,
      });
    },
    {
      manual: true,
      onSuccess: ({ values, errors }) => {
        store.values = values;
        store.errors = errors;
      },
    }
  );

  const { run: saveConfig } = useRequest(
    () =>
      request("/config", {
        values: store.values,
        device: device!.id!,
      }),
    {
      manual: true,
      onSuccess: () => {
        message.success("保存配置成功");
        onRequest();
      },
    }
  );
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
    },
    {
      title: "监控点ID",
      dataIndex: "id",
      render: (id: any) => id.split("-").join(""),
      editable: false,
    },
    {
      title: "命令",
      dataIndex: "command",
      editable: false,
    },
    {
      title: "告警抑制",
      dataIndex: "ignore",
      valueType: "switch",
      editable: false,
      render: (text, record, _, action) => (
        <Switch
          checked={record.ignore}
          checkedChildren="是"
          unCheckedChildren="否"
          onChange={(checked) => {
            store.values = store.values.map((it) =>
              it.id === record.id ? { ...it, ignore: checked } : it
            );
          }}
        />
      ),
    },
    {
      title: "是否上报",
      dataIndex: "enabled",
      valueType: "switch",
      editable: false,
      render: (text, record, _, action) =>
        record.code?.startsWith("X") ? (
          "未配置"
        ) : (
          <Switch
            checked={record.enabled}
            checkedChildren="是"
            unCheckedChildren="否"
            onChange={(checked) => {
              store.values = store.values.map((it) =>
                it.id === record.id ? { ...it, enabled: checked } : it
              );
            }}
          />
        ),
    },
    {
      title: "单位",
      dataIndex: "unit",
      formItemProps: {
        style: {
          width: "80px",
        },
      },
      renderFormItem: (_, { isEditable, record }) => {
        return record?.length !== 1 && isEditable ? (
          <Input />
        ) : (
          record?.unit ?? "-"
        );
      },
    },

    {
      title: "过低阈值",
      dataIndex: "lowerMajorLimit",
      valueType: "digit",
      formItemProps: {
        style: {
          width: "80px",
        },
      },
      renderFormItem: (_, { isEditable, record }) => {
        return record?.length !== 1 && isEditable ? (
          <InputNumber />
        ) : (
          record?.lowerMajorLimit ?? "-"
        );
      },
    },
    {
      title: "较低阈值",
      dataIndex: "lowerMinorLimit",
      valueType: "digit",
      formItemProps: {
        style: {
          width: "80px",
        },
      },
      renderFormItem: (_, { isEditable, record }) => {
        return record?.length !== 1 && isEditable ? (
          <InputNumber />
        ) : (
          record?.lowerMinorLimit ?? "-"
        );
      },
    },

    {
      title: "较高阈值",
      dataIndex: "upperMinorLimit",
      valueType: "digit",
      formItemProps: {
        style: {
          width: "80px",
        },
      },
      renderFormItem: (_, { isEditable, record }) => {
        return record?.length !== 1 && isEditable ? (
          <InputNumber />
        ) : (
          record?.upperMinorLimit ?? "-"
        );
      },
    },
    {
      title: "过高阈值",
      dataIndex: "upperMajorLimit",
      valueType: "digit",
      formItemProps: {
        style: {
          width: "80px",
        },
      },
      renderFormItem: (_, { isEditable, record }) => {
        return record?.length !== 1 && isEditable ? (
          <InputNumber />
        ) : (
          record?.upperMajorLimit ?? "-"
        );
      },
    },
    {
      title: "变化阈值",
      dataIndex: "threshold",
      valueType: "digit",
      formItemProps: {
        style: {
          width: "100px",
        },
      },
      renderFormItem: (_, { isEditable, record }) => {
        return record?.length !== 1 && isEditable ? (
          <InputNumber />
        ) : (
          record?.threshold ?? "-"
        );
      },
    },
    {
      title: "变化阈值百分比",
      dataIndex: "thresholdPercent",
      valueType: "digit",
      fieldProps: {
        addonAfter: "%",
      },
      formItemProps: {
        style: {
          width: "120px",
        },
      },
      renderFormItem: (_, { isEditable, record }) => {
        return record?.length !== 1 && isEditable ? (
          <InputNumber addonAfter="%" />
        ) : (
          record?.thresholdPercent ?? "-"
        );
      },
    },
    {
      title: "告警开始延迟(秒)",
      dataIndex: "startDelay",
      valueType: "digit",
      formItemProps: {
        style: {
          width: "120px",
        },
      },
    },
    {
      title: "告警结束延迟(秒)",
      dataIndex: "endDelay",
      valueType: "digit",
    },
    {
      title: "操作",
      valueType: "option",
      width: 120,
      fixed: "right",
      render: (text, record, _, action) => [
        <a
          key="editable"
          onClick={() => {
            action?.startEditable?.(record.id!);
          }}
        >
          编辑
        </a>,
      ],
    },
  ];

  return (
    <>
      <Alert
        description="如未配置过采样点，请先选择设备命令点击配置按钮，配置完成后，请点击保存按钮;如需设备配置已更改，请点击重置按钮删除所有采样点重新配置"
        type="warning"
        showIcon
      />
      {store.errors.length ? (
        <>
          <Card style={{ marginTop: 20 }}>
            {store.errors.map((error, index) => (
              <Alert type="error" key={index} description={error}></Alert>
            ))}
          </Card>
        </>
      ) : null}

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
        {_.keys(device?.commands).map((it) => (
          <Card.Grid key={it} style={{ width: "25%", textAlign: "left" }}>
            <Checkbox
              checked={store.commands.includes(it)}
              onChange={() => {
                store.commands = _.xor(store.commands, [it]);
              }}
            >
              {it}
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
          scroll={{ x: 2200 }}
          style={{ margin: -24, marginTop: 0 }}
          editable={{
            type: "single",
            editableKeys,
            onSave: async (rowKey, data, row) => {
              store.values = store.values.map((it) =>
                it.id === data.id! ? (data as Signal) : it
              );
            },
            onChange: setEditableRowKeys,
            actionRender: (row, config, dom) => [dom.save, dom.cancel],
          }}
          options={false}
          toolBarRender={() => [
            <Button
              key="fetch"
              icon={<SaveOutlined />}
              type="primary"
              onClick={() => {
                saveConfig();
              }}
            >
              保存
            </Button>,
            <Button
              key="reset"
              icon={<SyncOutlined />}
              onClick={() => {
                store.values = device?.signals || [];
              }}
            >
              还原
            </Button>,
            <Button
              key="clear"
              icon={<MinusCircleOutlined />}
              danger
              onClick={() => {
                store.values = [];
                store.errors = [];
              }}
            >
              清空
            </Button>,
          ]}
        />
      </ConfigProvider>
    </>
  );
};

export default Signals;

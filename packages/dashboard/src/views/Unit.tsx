import { Button, Card, Descriptions, message } from "antd";
import { FC, useRef } from "react";

import {
  BetaSchemaForm,
  ProFormColumnsType,
  ProFormInstance,
} from "@ant-design/pro-form";
import { useStore } from "../store";
import { useRequest, request } from "../hooks/useRequest";

const Widget: FC = () => {
  const { unit } = useStore((state) => state);
  const { run: upsertUnit } = useRequest((values) => request("/unit", values), {
    manual: true,
    onSuccess: () => {
      message.success("局站信息更新成功");
    },
  });
  const { run: upsertFTP, loading } = useRequest(
    (values) => request("/ftp", values),
    {
      manual: true,
      onSuccess: () => {
        message.success("FTP信息更新成功");
      },
    }
  );
  const { run } = useRequest(() => request("/debug"), {
    manual: true,
  });
  const formRef = useRef<ProFormInstance>();

  const proColumns: ProFormColumnsType<Unit>[] = [
    {
      valueType: "group",
      columns: [
        { title: "局站序号", dataIndex: "id", hideInForm: true },
        {
          title: "局站ID",
          dataIndex: "unitId",
          width: "s",
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
          title: "采样间隔(秒)",
          width: "s",
          tooltip:
            "采样间隔取决于设备数量，最低60秒，如设备比较多，可以适当增加此数值",
          dataIndex: "interval",
          valueType: "digit",
          fieldProps: {
            min: 10,
            precision: 0,
          },
        },
        {
          title: "心跳间隔(秒)",
          width: "s",
          dataIndex: "heartBeat",
          valueType: "digit",
          fieldProps: {
            min: 10,
            precision: 0,
          },
        },
      ],
    },
    {
      title: "服务器信息",
      valueType: "group",
      columns: [
        {
          valueType: "textarea",
          tooltip:
            "以逗号分隔,格式示例:http://127.0.0.1:8080/services/SCService?wsdl",
          width: "xl",
          dataIndex: "remoteAddress",
        },
      ],
    },
  ];
  const columns: ProFormColumnsType<Unit>[] = [
    {
      valueType: "group",
      columns: [
        {
          title: "用户名",
          width: "s",
          dataIndex: "userName",
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
          title: "密码",
          width: "s",
          valueType: "password",
          dataIndex: "password",
          formItemProps: {
            rules: [
              {
                required: true,
                message: "此项为必填项",
              },
            ],
          },
        },
      ],
    },
  ];

  return (
    <>
      <Card
        extra={
          <Button
            htmlType="button"
            danger
            onClick={() => {
              upsertUnit(unit);
            }}
          >
            重启采集
          </Button>
        }
        title="设备信息"
        style={{ marginBottom: 20 }}
      >
        <Descriptions column={2} bordered>
          <Descriptions.Item label="产品型号">{unit?.model}</Descriptions.Item>
          <Descriptions.Item label="生产厂家">
            {unit?.manufacturer}
          </Descriptions.Item>
          <Descriptions.Item label="软件版本号">
            {unit?.version}
          </Descriptions.Item>
          <Descriptions.Item label="基站版本号">
            {unit?.unitVersion}
          </Descriptions.Item>
        </Descriptions>
      </Card>
      <Card title="运行信息">
        {unit ? (
          <BetaSchemaForm<Unit>
            formRef={formRef}
            columns={proColumns}
            initialValues={{ ...unit }}
            onFinish={async (values) => {
              await upsertUnit({ ...values, id: unit.id });
              useStore.setState({ timestamp: new Date().getTime() });
              return true;
            }}
            layoutType="Form"
          ></BetaSchemaForm>
        ) : null}
      </Card>
      <Card title="FTP配置" style={{ marginTop: 20 }}>
        {unit ? (
          <BetaSchemaForm<Unit>
            formRef={formRef}
            columns={columns}
            initialValues={{ ...unit }}
            onFinish={async (values) => {
              await upsertFTP({ ...values, id: unit.id });
              useStore.setState({ timestamp: new Date().getTime() });
              return true;
            }}
            layoutType="Form"
          ></BetaSchemaForm>
        ) : null}
      </Card>
    </>
  );
};
export default Widget;

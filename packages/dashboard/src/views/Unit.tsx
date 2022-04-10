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
  const { run } = useRequest(() => request("/debug"), {
    manual: true,
  });
  const formRef = useRef<ProFormInstance>();

  const proColumns: ProFormColumnsType<Unit>[] = [
    {
      title: "运行信息",
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
      title: "FTP配置",
      valueType: "group",
      columns: [
        {
          title: "IP地址",
          dataIndex: "localAddress",
          width: "s",
          formItemProps: {
            rules: [
              {
                required: true,
                message: "请输入合法的IP地址",
                pattern:
                  /([0,1]?\d{1,2}|2([0-4][0-9]|5[0-5]))(\.([0,1]?\d{1,2}|2([0-4][0-9]|5[0-5]))){3}/,
              },
            ],
          },
        },
        {
          title: "端口号",
          dataIndex: "port",
          valueType: "digit",
          width: "s",
          formItemProps: {
            rules: [
              {
                required: true,
                message: "请输入正确的端口号",
                pattern:
                  /^(6553[0-5]|655[0-2]\d|65[0-4]\d{2}|6[0-4]\d{3}|[0-5]\d{4}|[1-9]\d{0,3})$/,
              },
            ],
          },
        },
        {
          title: "用户名",
          width: "s",
          dataIndex: "userName",
        },
        {
          title: "密码",
          width: "s",
          dataIndex: "password",
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
  return (
    <>
      <Card
        extra={
          <Button htmlType="button" danger onClick={run} key="debug">
            测试
          </Button>
        }
      >
        <Descriptions column={2} title="设备信息" bordered>
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
      <Card>
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
            submitter={{
              render: (props, doms) => {
                return [
                  ...doms,
                  <Button
                    htmlType="button"
                    danger
                    onClick={() => {
                      upsertUnit(unit);
                    }}
                    key="restart"
                  >
                    重启采集
                  </Button>,
                ];
              },
            }}
          ></BetaSchemaForm>
        ) : null}
      </Card>
    </>
  );
};
export default Widget;

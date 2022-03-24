import { Button, Card, message } from "antd";
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
          title: "IP地址",
          dataIndex: "ipAddress",
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
          title: "采样间隔",
          width: "s",
          dataIndex: "interval",
          valueType: "digit",
        },
      ],
    },

    {
      title: "设备信息",
      valueType: "group",
      columns: [
        {
          title: "生产厂家",
          width: "s",
          dataIndex: "manufacturer",
        },
        {
          title: "产品型号",
          width: "s",
          dataIndex: "model",
        },
        {
          title: "软件版本号",
          width: "s",
          dataIndex: "version",
        },
        {
          title: "基站版本号",
          width: "s",
          dataIndex: "unitVersion",
        },
      ],
    },
  ];
  return (
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
                  onClick={() => {}}
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
  );
};
export default Widget;

import { Alert, Button, Card, Descriptions, message, Modal } from "antd";
import { FC, useRef } from "react";
import {
  BetaSchemaForm,
  ProFormColumnsType,
  ProFormInstance,
} from "@ant-design/pro-form";
import { useStore } from "../store";
import { request } from "../hooks/useRequest";
import dayjs from "dayjs";
import { useRequest } from "ahooks";

const Widget: FC = () => {
  const { unit } = useStore((state) => state);
  const { run: upsertUnit } = useRequest(
    (values: Partial<Unit> | null) => request("/unit", values),
    {
      manual: true,
      onSuccess: () => {
        useStore.setState({ timestamp: new Date().getTime() });
        message.success("局站信息修改成功");
      },
    }
  );
  const { run: boot, loading: booting } = useRequest(() => request("/boot"), {
    manual: true,
    onSuccess: () => {
      useStore.setState({ timestamp: new Date().getTime() });
      message.success("系统已重置");
    },
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
          title: "局站IP",
          dataIndex: "localAddress",
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
          title: "局站端口",
          dataIndex: "port",
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
          tooltip: "采样间隔为两轮采样之间的时间间隔，单位为秒",
          dataIndex: "interval",
          valueType: "digit",
          fieldProps: {
            min: 10,
            precision: 0,
          },
        },
        {
          title: "经度",
          width: "s",
          dataIndex: "longitude",
        },
        {
          title: "纬度",
          width: "s",
          dataIndex: "latitude",
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
        extra={[
          <Button
            htmlType="button"
            type="primary"
            ghost
            key="update"
            style={{ marginRight: 20 }}
            onClick={() => {
              upsertUnit({ ...unit, updatedAt: dayjs().toDate() });
            }}
          >
            更新配置
          </Button>,
          <Button
            htmlType="button"
            danger
            loading={booting}
            key="reset"
            onClick={() => {
              Modal.confirm({
                title: "确认重置",
                content:
                  "您确认要重置采集器吗？重置后所有的本地告警信息将被清除，如确认，系统将在本采样周期结束后执行重置操作",
                onOk: async () => {
                  boot();
                },
              });
            }}
          >
            重置系统
          </Button>,
        ]}
        title="设备信息"
        style={{ marginBottom: 20 }}
      >
        <Alert
          type="warning"
          description="如果您更新了系统配置，如增减设备，配置采样点等，请点击更新配置按钮设置系统更新时间"
          style={{ marginBottom: 20 }}
          showIcon
        ></Alert>
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
              await request("/ftp", { ...values, id: unit.id });
              useStore.setState({ timestamp: new Date().getTime() });
              message.success("FTP信息更新成功");
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

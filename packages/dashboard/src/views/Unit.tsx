import { Button, Card, message, Skeleton } from "antd";
import { FC } from "react";

import ProForm, { ProFormText } from "@ant-design/pro-form";

const Widget: FC<{ unit?: Unit }> = ({ unit }) => {
  return unit ? (
    <Card>
      <ProForm<{
        name: string;
        company: string;
      }>
        onFinish={async (values) => {
          message.success("数据提交成功");
        }}
        submitter={{
          render: (props, doms) => {
            return [
              ...doms,
              <Button htmlType="button" danger onClick={() => {}} key="restart">
                重启采集
              </Button>,
            ];
          },
        }}
        initialValues={unit ?? {}}
      >
        <ProForm.Group>
          <ProFormText
            width="md"
            name="name"
            label="局站名称"
            placeholder="请输入名称"
          />
          <ProFormText
            width="md"
            name="unitId"
            label="局站编号"
            placeholder="请输入局站编号"
          />
        </ProForm.Group>
      </ProForm>
    </Card>
  ) : (
    <Skeleton active />
  );
};
export default Widget;

import { Alert, Button, Card, Col, Layout, Row } from "antd";
import { FC, useRef } from "react";

import { request, useRequest } from "../hooks/useRequest";
import { useState } from "react";
import { useEventStore } from "../store";
import { Content } from "antd/lib/layout/layout";

const gridStyle: React.CSSProperties = {
  width: "33%",
  textAlign: "center",
  cursor: "pointer",
};

const uplink = ["登录", "注销", "告警", "采样点更新"];

const downlink = [
  "设置IP",
  "获取FTP参数",
  "设置FTP参数",
  "获取遥测量信息",
  "获取遥信量信息",
  "获取遥调量信息",
  "设置遥调量信息",
  "获取遥控量报文",
  "获取当前告警",
  "获取告警量设置",
  "设置告警量设置",
  "重启",
  "获取端口信息",
  "设置时间",
  "获取时间",
];

const Widget: FC = () => {
  const [data, setData] = useState<any>("");
  const [direction, setDirection] = useState(false);
  const events = useEventStore((state) => state.events);
  const { run } = useRequest(
    (method: string) =>
      request("/interface", {
        method,
        direction,
      }),
    {
      manual: true,
      onSuccess: (data) => {
        setData(data);
      },
    }
  );
  return (
    <Card
      title={`FSU${direction ? "->" : "<-"}SC`}
      extra={[
        <Button key="switch" onClick={() => setDirection(!direction)}>
          切换方向
        </Button>,
        <Button
          key="reset"
          danger
          style={{ marginLeft: 10 }}
          onClick={() => useEventStore.setState({ events: [] })}
        >
          清空日志
        </Button>,
      ]}
    >
      <Row gutter={10}>
        <Col span={12}>
          {(direction ? uplink : downlink).map((it) => (
            <Card.Grid style={gridStyle} key={it} onClick={() => run(it)}>
              {it}
            </Card.Grid>
          ))}
        </Col>
        <Col span={12}>
          <div style={{ overflowY: "scroll", height: "calc(100vh - 240px)" }}>
            {events.map((it, index) => (
              <Alert
                key={index}
                message={it.direction}
                style={{ marginBottom: 10 }}
                type={it.direction === "发送消息" ? "info" : "success"}
                description={it.data}
              ></Alert>
            ))}
          </div>
        </Col>
      </Row>
    </Card>
  );
};
export default Widget;

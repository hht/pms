import { useReactive } from "ahooks";
import { Button, Card, Col, InputNumber, Row, Select, Tag } from "antd";
import { FC } from "react";
import HexEditor from "react-hex-editor";
import oneDarkPro from "react-hex-editor/themes/oneDarkPro";
import { useStore } from "../store";

import useWebsocket from "../hooks/useSocket";

const Widget: FC = () => {
  const { ports } = useStore((state) => state);
  const state = useReactive<{
    data: number[];
    nonce: number;
    length: number;
    baudRate: string;
    port?: Port;
    timeout: number;
    protocol?: string;
  }>({
    data: new Array(2).fill(0),
    nonce: 3,
    length: 2,
    baudRate: "9600",
    port: undefined,
    timeout: 3000,
    protocol: undefined,
  });

  const { message, socket, readyState } = useWebsocket(`http://localhost:8080`);
  return (
    <Card title="串口调试" extra={[<Tag key="state">{readyState.value}</Tag>]}>
      <Row gutter={16}>
        <Col span={8}>
          <Select
            style={{ width: "100%" }}
            value={state.port?.path}
            allowClear
            onChange={(path) =>
              (state.port = ports?.find((it) => it.path === path))
            }
            onClear={() => (state.port = undefined)}
          >
            {ports?.map((port) => (
              <Select.Option key={port.path} value={port.path}>
                {port.path}
              </Select.Option>
            ))}
          </Select>
        </Col>
        <Col span={2}>
          <Select
            style={{ width: "100%" }}
            defaultValue={state.baudRate}
            value={state.baudRate}
            onChange={(baudRate) => (state.baudRate = baudRate)}
          >
            {[1200, 2400, 4800, 9600, 115200].map((baudRate) => (
              <Select.Option key={baudRate} value={`${baudRate}`}>
                {baudRate}
              </Select.Option>
            ))}
          </Select>
        </Col>
        <Col span={2}>
          <InputNumber
            value={state.length}
            onChange={(length) => {
              state.length = length;
              state.data = new Array(length)
                .fill(0)
                .map((it, index) => state.data[index] || 0);
            }}
          />
        </Col>
        <Col span={2}>
          <InputNumber
            value={state.timeout}
            onChange={(timeout) => {
              state.timeout = timeout;
            }}
          />
        </Col>
        <Col span={4}>
          <Button
            type="primary"
            disabled={
              state.data.every((it) => it === 0) ||
              !state.port?.path ||
              !state.baudRate
            }
            style={{ width: "100%" }}
            onClick={() => {
              socket?.emit(
                "command",
                {
                  path: state.port?.path,
                  baudRate: state.baudRate,
                  data: state.data,
                  timeout: state.timeout,
                },
                ({ status }: { status: number }) => console.log(status)
              );
            }}
          >
            发送
          </Button>
        </Col>
      </Row>
      <Row gutter={16} style={{ paddingTop: 8, paddingBottom: 8 }}>
        <Col span={12}>
          <HexEditor
            showAscii
            showColumnLabels
            showRowLabels
            highlightColumn
            data={state.data}
            nonce={state.nonce}
            rows={10}
            onSetValue={(index: number, value: number) => {
              state.data[index] = value;
              state.nonce = state.nonce + 1;
            }}
            theme={{ hexEditor: oneDarkPro }}
          />
        </Col>
        <Col span={12}>
          <HexEditor
            showAscii
            showColumnLabels
            showRowLabels
            highlightColumn
            readonly
            data={message?.data ?? []}
            rows={10}
            onSetValue={(index: number, value: number) => {
              state.data[index] = value;
              state.nonce = state.nonce + 1;
            }}
            theme={{ hexEditor: oneDarkPro }}
          />
        </Col>
      </Row>
    </Card>
  );
};

export default Widget;

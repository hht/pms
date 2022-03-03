import "./styles/index.scss";

import { Layout, Menu } from "antd";
import { FC, useState } from "react";

import Emulator from "./views/Emulator";
import Devices from "./views/Devices";
import Unit from "./views/Unit";
import { request, useRequest } from "./hooks/useRequest";

const { Header, Content } = Layout;

const App: FC = () => {
  const { data } = useRequest(() =>
    request<{
      unit: Unit;
      ports: Port[];
      protocols: { [key: string]: Protocol[] };
    }>("/system")
  );
  const [current, setCurrent] = useState("1");
  return (
    <Layout>
      <Header>
        <div className="logo">动环采集器 PMS-X</div>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[current]}
          onSelect={({ key }) => setCurrent(key)}
        >
          <Menu.Item key="1">局站信息</Menu.Item>
          <Menu.Item key="2">设备信息</Menu.Item>
          <Menu.Item key="3">串口调试</Menu.Item>
        </Menu>
      </Header>
      <Content style={{ padding: 48 }}>
        {current === "1" ? <Unit unit={data?.unit} /> : null}
        {current === "2" ? (
          <Devices ports={data?.ports} protocols={data?.protocols} />
        ) : null}
        {current === "3" ? <Emulator ports={data?.ports} /> : null}
      </Content>
    </Layout>
  );
};

export default App;

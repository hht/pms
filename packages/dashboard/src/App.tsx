import "./styles/index.scss";

import { Layout, Menu } from "antd";
import { FC, useState } from "react";

import Emulator from "./views/Emulator";
import Devices from "./views/Devices";
import Unit from "./views/Unit";
import Dashboard from "./views/Dashboard";
import { useSystem } from "./store";
import useWebsocket from "./hooks/useSocket";

const { Header, Content } = Layout;

const App: FC = () => {
  const [current, setCurrent] = useState("1");
  useSystem();
  const { message, socket, readyState } = useWebsocket(`http://localhost:8080`);
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
          <Menu.Item key="0">实时数据</Menu.Item>
          <Menu.Item key="1">局站信息</Menu.Item>
          <Menu.Item key="2">设备信息</Menu.Item>
          <Menu.Item key="3">串口调试</Menu.Item>
        </Menu>
      </Header>
      <Content style={{ padding: 48 }}>
        {current === "0" ? <Dashboard /> : null}
        {current === "1" ? <Unit /> : null}
        {current === "2" ? <Devices /> : null}
        {current === "3" ? (
          <Emulator {...{ message, socket, readyState }} />
        ) : null}
      </Content>
    </Layout>
  );
};

export default App;

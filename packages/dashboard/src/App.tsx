import "./styles/index.scss";

import { Layout, Menu } from "antd";
import { FC, useState } from "react";

import Emulator from "./views/Emulator";
import Devices from "./views/Devices";
import Unit from "./views/Unit";
import Dashboard from "./views/Dashboard";
import { useSystem } from "./store";
import useWebsocket from "./hooks/useSocket";
import Log from "./views/Log";
import { baseURL } from "./config";
import Alarms from "./views/Alarms";

const { Header, Content } = Layout;

const App: FC = () => {
  const [current, setCurrent] = useState("0");
  useSystem();
  const { message, socket, readyState } = useWebsocket(baseURL);
  return (
    <Layout>
      <Header style={{ position: "fixed", zIndex: 1, width: "100%" }}>
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
          <Menu.Item key="3">告警日志</Menu.Item>
          <Menu.Item key="4">错误日志</Menu.Item>
          <Menu.Item key="5">串口调试</Menu.Item>
        </Menu>
      </Header>
      <Content style={{ padding: 48, paddingTop: 112 }}>
        {current === "0" ? <Dashboard /> : null}
        {current === "1" ? <Unit /> : null}
        {current === "2" ? <Devices /> : null}
        {current === "3" ? <Alarms /> : null}
        {current === "4" ? <Log /> : null}
        {current === "5" ? (
          <Emulator {...{ message, socket, readyState }} />
        ) : null}
      </Content>
    </Layout>
  );
};

export default App;

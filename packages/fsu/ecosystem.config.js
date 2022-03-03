module.exports = {
  apps: [
    {
      name: "动环监控系统",
      script: "dist/index.js",
      cwd: "./",
      watch: ["dist", "src/protocols"],
      instances: 1,
      exec_mode: "cluster",
      merge_logs: true,
      ignore_watch: ["node_modules", "logs", "database"],
      args: "--no-warnings",
      node_args: "--no-warnings",
    },
    {
      name: "系统更新服务",
      script: "npx",
      cwd: "./",
      watch: ["src"],
      instances: 1,
      exec_mode: "cluster",
      merge_logs: true,
      ignore_watch: ["node_modules", "logs", "database"],
      args: "tsc --watch",
      node_args: "--no-warnings",
    },
  ],

  deploy: {
    production: {
      user: "SSH_USERNAME",
      host: "SSH_HOSTMACHINE",
      ref: "origin/master",
      repo: "GIT_REPOSITORY",
      path: "DESTINATION_PATH",
      "pre-deploy-local": "",
      "post-deploy":
        "npm install && pm2 reload ecosystem.config.js --env production",
      "pre-setup": "",
    },
  },
};

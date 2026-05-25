module.exports = {
  apps: [
    {
      name: "drift-minigame",
      script: "server/static-server.mjs",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: process.env.PORT ?? "4001",
        HOSTS: process.env.HOSTS ?? "127.0.0.1,::1",
      },
    },
  ],
};

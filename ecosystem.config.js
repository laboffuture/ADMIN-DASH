// PM2 configuration — run from the repo root on the VPS: pm2 start ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'admin-link',
      script: './server/index.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      env: { NODE_ENV: 'production' },
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
};

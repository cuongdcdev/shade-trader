module.exports = {
  apps: [{
    name: "order-processor-script",
    script: "npx tsx scripts/order-processor-service.ts",
    watch: true,
    autorestart: true,
    restart_delay: 5000,
    env: {
      NODE_ENV: "production",
    }
  }]
};
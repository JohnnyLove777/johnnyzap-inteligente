module.exports = {
    apps: [
      {
        name: 'johnnyzap',
        script: 'johnnyzap.js',
        instances: 1,
        autorestart: true,
        watch: false,
        max_memory_restart: '1G',
        env: {
          NODE_ENV: 'development'
        },
        env_production: {
          NODE_ENV: 'production'
        },
        cron_restart: '0 3 */2 * *'
      }
    ]
  };
  
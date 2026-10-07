// ecosystem.config.js — PM2 para GeoVisor Santander CP-001
module.exports = {
  apps: [
    {
      name:    'gv-santander',
      script:  'src/server.js',
      cwd:     '/var/www/geovisores/santander/backend',
      env: {
        PORT:     4005,
        NODE_ENV: 'production',
      },
      watch:               false,
      max_memory_restart:  '200M',
      error_file:          '/var/log/pm2/gv-santander-error.log',
      out_file:            '/var/log/pm2/gv-santander-out.log',
      log_date_format:     'YYYY-MM-DD HH:mm:ss',
    },
  ],
};

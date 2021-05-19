module.exports = {
    publicPath: process.env.NODE_ENV === 'production'
    ? '/Scrollery'
    : '/',
    configureWebpack: config => {
    if (process.env.NODE_ENV === 'development') {
      config.devtool = 'eval-source-map'
    }
  },
    devServer: {
      proxy: {
        '/v1': {
          target: 'https://api.qumranica.org',
          ws: true,
          changeOrigin: true
        }
      }
    }
  }
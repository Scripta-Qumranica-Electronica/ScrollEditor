module.exports = {
  /* publicPath reequites vue CLI version 3.3, we haven't upgraded yet
    publicPath: process.env.NODE_ENV === 'production'
    ? '/production/path'
    : '/', */
    configureWebpack: config => {
    if (process.env.NODE_ENV === 'development') {
      config.devtool = 'eval-source-map'
    }
  },
    devServer: {
      proxy: {
        '/v1': {
          target: 'http://localhost:5000',
          ws: true,
          changeOrigin: true
        }
      }
    }
  }
module.exports = {
  entry: './index.js',
  output: {
    filename: 'serialport-service.bundle.js'
  },
  node: {
  	fs: 'empty'
  }
}
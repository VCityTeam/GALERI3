const path = require('path');
const webpack = require('webpack');

const result = {
  entry: './src/index.js',
  output: {
    path: './public',
    filename: 'bundle.js',
    library: 'galeri3',
    libraryTarget: 'umd',
    umdNamedDefine: true,
  },
  module: {
    rules: [],
  },
  resolve: {
    modules: ['node_modules', 'src'],
    fallback: {
      buffer: false,
    },
  },
  plugins: [
    new webpack.ProvidePlugin({
      Buffer: [require.resolve('buffer/'), 'Buffer'],
    }),
  ],
};

// inject css in bundle (show_room and game_browser_template are using css)
result.module.rules.push({
  test: /\.css$/,
  use: [
    'style-loader', // Tells webpack how to append CSS to the DOM as a style tag.
    'css-loader', // Tells webpack how to read a CSS file.
  ],
});

// production or development
if (process.env.NODE_ENV == 'production') {
  result.output.path = path.resolve(process.cwd(), './public/dist/production');
  result.mode = 'production';
} else {
  result.mode = 'development';
  result.devtool = 'source-map';
  result.output.path = path.resolve(process.cwd(), './public/dist/development');
}

module.exports = result;

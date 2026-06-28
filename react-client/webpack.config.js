const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  mode: "development",

  entry: {
    index: path.resolve(__dirname, "src/main.tsx"),
    code: path.resolve(__dirname, "public/code.js"),
  },

  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
    clean: true,
    module: true,
  },

  experiments: {
    outputModule: true,
    topLevelAwait: true,
  },

  externalsType: "module",
  externalsPresets: { web: true },
  externals: {
    "add-on-sdk-document-sandbox": "add-on-sdk-document-sandbox",
    "express-document-sdk": "express-document-sdk",
    "add-on-ui-sdk":
      "https://new.express.adobe.com/static/add-on-sdk/sdk.js",
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: "./index.html",
      scriptLoading: "module",
      excludeChunks: ["code"],
    }),
    new CopyWebpackPlugin({
      patterns: [{ from: "public/manifest.json", to: "manifest.json" }],
    }),
  ],

  module: {
    rules: [
      {
        test: /\.(ts|tsx|js|jsx)$/,
        exclude: /node_modules/,
        use: "babel-loader",
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader", "postcss-loader"],
      },
      {
        test: /\.svg$/,
        type: "asset/resource",
      },
    ],
  },

  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx"],
  },
};

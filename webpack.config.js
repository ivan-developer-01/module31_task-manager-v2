const path = require("path");
const HTMLPlugin = require("html-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
	entry: "./src/app.js",
	output: {
		filename: "bundle.[chunkhash].js",
		path: path.resolve(__dirname, "public"),
	},
	devServer: {
		port: 3000,
	},
	plugins: [
		new HTMLPlugin({
			template: "./src/index.html",
		}),
		new CleanWebpackPlugin(),
		new CopyPlugin({
			patterns: [
				{
					from: "src/locales",
					to: "locales",
				},
			],
		}),
	],
	module: {
		rules: [
			{
				test: /\.css$/i,
				use: ["style-loader", "css-loader"],
			},
			{
				test: /\.html$/,
				use: [
					{
						loader: "html-loader",
						options: {
							minimize: true,
						},
					},
				],
			},
		],
	},
	experiments: { topLevelAwait: true },
};

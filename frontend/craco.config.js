const path = require('path');

module.exports = {
  babel: {
    presets: [
      ['@babel/preset-react', { runtime: 'automatic' }],
    ],
  },
  webpack: {
    alias: {
      'react-native$': 'react-native-web',
      'react-native-vector-icons': 'react-native-web',
    },
    configure: (webpackConfig) => {
      // Add react-native-web extensions
      webpackConfig.resolve.extensions = [
        '.web.js',
        '.web.jsx',
        '.web.ts',
        '.web.tsx',
        ...webpackConfig.resolve.extensions,
      ];

      // Add react-native-web alias for platform-specific code
      webpackConfig.resolve.alias = {
        ...webpackConfig.resolve.alias,
        'react-native': 'react-native-web',
        'react-native-vector-icons': path.resolve(__dirname, 'src/components/MockIcons'),
      };

      // Ignore react-native-vector-icons in node_modules during compilation
      webpackConfig.module.rules.push({
        test: /node_modules[\/\\]react-native-vector-icons/,
        use: 'null-loader',
      });

      return webpackConfig;
    },
  },
};
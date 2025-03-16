const path = require('path');
const CracoLessPlugin = require('craco-less'); // v2.0.0

module.exports = {
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@pages': path.resolve(__dirname, 'src/pages'),
      '@hooks': path.resolve(__dirname, 'src/hooks'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@services': path.resolve(__dirname, 'src/services'),
      '@context': path.resolve(__dirname, 'src/context'),
      '@styles': path.resolve(__dirname, 'src/styles'),
      '@assets': path.resolve(__dirname, 'src/assets'),
      '@config': path.resolve(__dirname, 'src/config')
    },
    configure: (webpackConfig, { env, paths }) => {
      // Add custom webpack configurations based on environment
      if (env === 'production') {
        // Optimize production builds
        webpackConfig.optimization = {
          ...webpackConfig.optimization,
          splitChunks: {
            chunks: 'all',
            name: false,
            cacheGroups: {
              defaultVendors: {
                test: /[\\/]node_modules[\\/]/,
                name: 'vendors',
                chunks: 'all',
                priority: -10
              },
              materialUI: {
                test: /[\\/]node_modules[\\/]@material-ui[\\/]/,
                name: 'material-ui',
                chunks: 'all',
                priority: -5
              },
              commons: {
                name: 'commons',
                minChunks: 2,
                priority: -20,
                reuseExistingChunk: true
              }
            }
          },
          runtimeChunk: {
            name: entrypoint => `runtime-${entrypoint.name}`
          }
        };
      }
      return webpackConfig;
    },
    plugins: [
      // Add webpack plugins based on environment
      ...(process.env.NODE_ENV === 'production' 
        ? [
            // Only add BundleAnalyzerPlugin in production with ANALYZE flag
            ...(process.env.ANALYZE === 'true' 
              ? [new (require('webpack-bundle-analyzer').BundleAnalyzerPlugin)({
                  analyzerMode: 'static',
                  reportFilename: 'bundle-report.html',
                })]
              : []),
            // Add additional production plugins
            new (require('compression-webpack-plugin'))({
              algorithm: 'gzip',
              test: /\.(js|css|html|svg)$/,
              threshold: 10240,
              minRatio: 0.8,
            })
          ] 
        : []
      )
    ]
  },
  plugins: [
    {
      plugin: CracoLessPlugin,
      options: {
        lessLoaderOptions: {
          lessOptions: {
            javascriptEnabled: true,
            modifyVars: {
              // Brand colors and theme customization
              '@primary-color': '#1976D2',        // Primary brand color
              '@secondary-color': '#03A9F4',      // Secondary color
              '@accent-color': '#FF4081',         // Accent color for highlights
              '@success-color': '#4CAF50',        // Success state color
              '@warning-color': '#FFC107',        // Warning state color
              '@error-color': '#F44336',          // Error state color
              '@font-family': 'Roboto, sans-serif',
              '@font-size-base': '16px',          // Base font size
              '@border-radius-base': '4px',       // Base border radius
              '@box-shadow-base': '0 3px 5px -1px rgba(0, 0, 0, 0.2), 0 6px 10px 0 rgba(0, 0, 0, 0.14), 0 1px 18px 0 rgba(0, 0, 0, 0.12)',
              '@layout-header-background': '#ffffff',
              '@layout-body-background': '#f0f2f5',
              '@layout-footer-background': '#f0f2f5',
              '@menu-dark-bg': '#212121',
              '@menu-dark-submenu-bg': '#303030'
            }
          }
        }
      }
    }
  ],
  jest: {
    configure: {
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@components/(.*)$': '<rootDir>/src/components/$1',
        '^@pages/(.*)$': '<rootDir>/src/pages/$1',
        '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
        '^@utils/(.*)$': '<rootDir>/src/utils/$1',
        '^@services/(.*)$': '<rootDir>/src/services/$1',
        '^@context/(.*)$': '<rootDir>/src/context/$1',
        '^@styles/(.*)$': '<rootDir>/src/styles/$1',
        '^@assets/(.*)$': '<rootDir>/src/assets/$1',
        '^@config/(.*)$': '<rootDir>/src/config/$1'
      },
      moduleDirectories: ['node_modules', 'src'],
      transformIgnorePatterns: [
        '/node_modules/(?!(@material-ui|react-flow|d3-*|internmap|delaunator|robust-predicates)/)'
      ]
    }
  }
};
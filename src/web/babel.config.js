module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        useBuiltIns: 'usage', // Adds specific imports for polyfills when they are used
        corejs: 3, // Specify core-js version
        targets: {
          browsers: ['>0.2%', 'not dead', 'not op_mini all'] // Browser compatibility targets
        }
      }
    ],
    [
      '@babel/preset-react',
      {
        runtime: 'automatic' // Uses the new JSX transform from React 17+
      }
    ],
    '@babel/preset-typescript' // TypeScript support
  ],
  plugins: [
    [
      '@babel/plugin-transform-runtime',
      {
        regenerator: true // Enable regenerator runtime for async/await
      }
    ],
    '@babel/plugin-proposal-class-properties', // Support for class properties
    '@babel/plugin-proposal-object-rest-spread' // Support for object spread operators
  ],
  // Environment-specific configurations
  env: {
    // Jest testing environment
    test: {
      presets: [
        [
          '@babel/preset-env',
          {
            targets: {
              node: 'current' // Use current Node.js version in tests
            }
          }
        ]
      ],
      plugins: ['babel-plugin-dynamic-import-node'] // Support for dynamic imports in Node environment
    },
    // Production optimizations
    production: {
      plugins: [
        'transform-react-remove-prop-types', // Remove PropTypes in production for smaller bundles
        '@babel/plugin-transform-react-inline-elements', // Optimize React elements
        '@babel/plugin-transform-react-constant-elements' // Hoist React elements to improve performance
      ]
    }
  }
};
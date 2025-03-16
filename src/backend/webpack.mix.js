const mix = require('laravel-mix'); // laravel-mix v6.0.49
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

/*
 |--------------------------------------------------------------------------
 | Mix Asset Management
 |--------------------------------------------------------------------------
 |
 | Mix provides a clean, fluent API for defining some Webpack build steps
 | for the Student Admissions Enrollment Platform backend. By default, we are 
 | compiling the Sass file for the application as well as bundling up all the 
 | JS files.
 |
 */

// Process main JavaScript for the backend
mix.js('resources/js/app.js', 'public/js')
    
    // Process SASS styles
    .sass('resources/sass/app.scss', 'public/css')
    
    // Process additional CSS with PostCSS plugins
    .postCss('resources/css/utilities.css', 'public/css', [
        require('autoprefixer')
    ])
    
    // Process admin-specific JavaScript with React components for the workflow editor
    .js('resources/js/admin/workflow-editor.js', 'public/js/admin')
    .react() // Add React support for admin interfaces
    
    // Add TypeScript support for complex components like the WYSIWYG workflow editor
    .ts('resources/js/admin/workflow-components.ts', 'public/js/admin');

// Extract vendor libraries to separate files for better caching
mix.extract([
    'vue', 
    'axios', 
    'lodash',
    'chart.js',
    'react-flow-renderer' // For workflow editor as mentioned in tech specs
]);

// Configure Webpack additional options
mix.webpackConfig({
    resolve: {
        alias: {
            '@': path.resolve('resources/js'),
        }
    },
    optimization: {
        // Configure TerserPlugin to remove console logs in production
        minimizer: [
            new TerserPlugin({
                terserOptions: {
                    compress: {
                        drop_console: mix.inProduction()
                    }
                }
            })
        ]
    }
});

// In production, version and optimize assets
if (mix.inProduction()) {
    mix.version()
       .options({
           // Optimize images during production build
           processCssUrls: true,
           terser: {
               extractComments: false,
           }
       });
} else {
    // In development, use source maps and BrowserSync
    mix.sourceMaps()
       .browserSync({
           proxy: 'localhost:8000',
           open: false,
           notify: false
       });
}

// Disable notifications if running in CI environment
if (process.env.CI) {
    mix.disableNotifications();
}
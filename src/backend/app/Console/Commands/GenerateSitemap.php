<?php

namespace App\Console\Commands;

use App\Services\StorageService;
use Illuminate\Console\Command; // illuminate/console ^10.0
use Illuminate\Support\Facades\Log; // illuminate/support ^10.0
use Illuminate\Support\Facades\Route; // illuminate/support ^10.0
use Illuminate\Support\Facades\URL; // illuminate/support ^10.0
use Illuminate\Support\Facades\Config; // illuminate/support ^10.0
use Carbon\Carbon; // nesbot/carbon ^2.0
use Illuminate\Http\UploadedFile;

/**
 * Console command to generate an XML sitemap for the application.
 * 
 * This command creates a sitemap.xml file for search engine optimization,
 * containing all public-facing routes in the application to improve search
 * engine indexing and visibility.
 */
class GenerateSitemap extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sitemap:generate';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Generate an XML sitemap for the application';

    /**
     * The storage service.
     *
     * @var StorageService
     */
    protected StorageService $storageService;

    /**
     * The public path for storing the sitemap.
     *
     * @var string
     */
    protected string $publicPath;

    /**
     * The routes that should be excluded from the sitemap.
     *
     * @var array
     */
    protected array $excludedRoutes;

    /**
     * Create a new command instance.
     *
     * @param StorageService $storageService
     * @return void
     */
    public function __construct(StorageService $storageService)
    {
        parent::__construct();
        $this->storageService = $storageService;
        $this->publicPath = Config::get('app.sitemap_path', 'public');
        $this->excludedRoutes = [
            'login',
            'logout',
            'register',
            'password.request',
            'password.reset',
            'password.email',
            'password.update',
            'verification.notice',
            'verification.verify',
            'verification.resend',
            'dashboard',
            'admin',
            'api',
            'sanctum',
            'sitemap',
        ];
    }

    /**
     * Execute the console command to generate the sitemap.
     *
     * @return int
     */
    public function handle()
    {
        $this->info('Starting sitemap generation...');
        Log::info('Starting sitemap generation process');

        try {
            $content = $this->generateSitemapXml();
            $success = $this->storeSitemapFile($content);

            if ($success) {
                $this->info('Sitemap generated successfully!');
                Log::info('Sitemap generation completed successfully');
                return 0; // Return success exit code
            } else {
                $this->error('Failed to store sitemap file.');
                Log::error('Failed to store sitemap file');
                return 1; // Return error exit code
            }
        } catch (\Exception $e) {
            $this->error('Error generating sitemap: ' . $e->getMessage());
            Log::error('Error generating sitemap', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return 1; // Return error exit code
        }
    }

    /**
     * Generate the XML content for the sitemap.
     *
     * @return string
     */
    protected function generateSitemapXml(): string
    {
        // Initialize XML with sitemap header and namespace
        $xml = '<?xml version="1.0" encoding="UTF-8"?>' . PHP_EOL;
        $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . PHP_EOL;

        // Get all public-facing routes from the application
        $routes = $this->getPublicRoutes();

        // Filter out excluded routes and non-GET routes
        foreach ($routes as $route) {
            $url = URL::to($route['uri']);
            $lastmod = Carbon::now()->toDateString();
            $changefreq = 'weekly';
            $priority = '0.8';

            $xml .= '  <url>' . PHP_EOL;
            $xml .= '    <loc>' . $url . '</loc>' . PHP_EOL;
            $xml .= '    <lastmod>' . $lastmod . '</lastmod>' . PHP_EOL;
            $xml .= '    <changefreq>' . $changefreq . '</changefreq>' . PHP_EOL;
            $xml .= '    <priority>' . $priority . '</priority>' . PHP_EOL;
            $xml .= '  </url>' . PHP_EOL;
        }

        // Add static pages that are not defined as routes
        $this->addStaticPages($xml);

        // Close the XML document
        $xml .= '</urlset>';

        return $xml;
    }

    /**
     * Get all public-facing routes from the application.
     *
     * @return array
     */
    protected function getPublicRoutes(): array
    {
        $publicRoutes = [];
        $routes = Route::getRoutes();

        foreach ($routes as $route) {
            // Filter routes to include only GET methods
            if (!in_array('GET', $route->methods()) || $this->shouldExcludeRoute($route)) {
                continue;
            }

            $publicRoutes[] = [
                'uri' => $route->uri(),
                'name' => $route->getName(),
                'methods' => $route->methods(),
                'middleware' => $route->middleware(),
            ];
        }

        return $publicRoutes;
    }

    /**
     * Add static pages to the sitemap that are not defined as routes.
     *
     * @param string &$xml The XML string to append to
     * @return void
     */
    protected function addStaticPages(string &$xml): void
    {
        // Define an array of static pages
        $staticPages = [
            '/about',
            '/contact',
            '/faq',
            '/terms-of-service',
            '/privacy-policy',
            '/accessibility',
            '/help',
        ];

        // For each static page, add a URL entry to the sitemap XML
        foreach ($staticPages as $page) {
            $url = URL::to($page);
            $lastmod = Carbon::now()->toDateString();
            $changefreq = 'monthly';
            $priority = '0.5';

            $xml .= '  <url>' . PHP_EOL;
            $xml .= '    <loc>' . $url . '</loc>' . PHP_EOL;
            $xml .= '    <lastmod>' . $lastmod . '</lastmod>' . PHP_EOL;
            $xml .= '    <changefreq>' . $changefreq . '</changefreq>' . PHP_EOL;
            $xml .= '    <priority>' . $priority . '</priority>' . PHP_EOL;
            $xml .= '  </url>' . PHP_EOL;
        }
    }

    /**
     * Store the generated sitemap XML to the public directory.
     *
     * @param string $content The sitemap XML content
     * @return bool True if the file was stored successfully
     */
    protected function storeSitemapFile(string $content): bool
    {
        $filename = 'sitemap.xml';
        $path = $this->publicPath . '/' . $filename;
        
        // Check if the file already exists
        $fileExists = $this->storageService->fileExists($path);
        if ($fileExists) {
            $this->info("Sitemap file already exists. Overwriting...");
        }
        
        // Create a temporary file
        $tempFile = tempnam(sys_get_temp_dir(), 'sitemap');
        file_put_contents($tempFile, $content);
        
        // Create an UploadedFile instance
        $uploadedFile = new UploadedFile(
            $tempFile, 
            $filename, 
            'application/xml', 
            null, 
            true // Test mode allows creating from existing file
        );
        
        try {
            // Use the storage service to store the file
            $storedPath = $this->storageService->storeFile($uploadedFile, $path);
            $this->info("Sitemap stored at: " . $storedPath);
            
            // Clean up temporary file
            @unlink($tempFile);
            
            return true;
        } catch (\Exception $e) {
            $this->error("Failed to store sitemap: " . $e->getMessage());
            
            // Clean up temporary file
            @unlink($tempFile);
            
            return false;
        }
    }

    /**
     * Determine if a route should be excluded from the sitemap.
     *
     * @param mixed $route The route to check
     * @return bool True if the route should be excluded
     */
    protected function shouldExcludeRoute($route): bool
    {
        // Check if the route URI is in the excluded routes array
        if ($route->getName() && in_array($route->getName(), $this->excludedRoutes)) {
            return true;
        }

        // Check if the route has parameters (dynamic route)
        if (preg_match('/{.*}/', $route->uri())) {
            return true;
        }

        // Check if the route has middleware that indicates non-public pages
        $excludedMiddleware = ['auth', 'admin', 'api'];
        foreach ($excludedMiddleware as $middleware) {
            if (in_array($middleware, $route->middleware())) {
                return true;
            }
        }

        // Exclude specific URI patterns
        $excludedPatterns = [
            '^admin',
            '^api/',
            '^_debugbar',
            '^sanctum',
        ];

        foreach ($excludedPatterns as $pattern) {
            if (preg_match('/' . $pattern . '/', $route->uri())) {
                return true;
            }
        }

        return false;
    }
}
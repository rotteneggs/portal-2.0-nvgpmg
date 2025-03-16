<?php

/**
 * Student Admissions Enrollment Platform - Development Server
 *
 * This file serves as a router script for PHP's built-in development server.
 * It directly serves static files that exist in the public directory,
 * and routes all other requests to the Laravel application entry point.
 *
 * @package    StudentAdmissionsEnrollmentPlatform
 * @version    1.0.0
 */

// Parse the URI from the request
$uri = urldecode(
    parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH)
);

// Construct the path to the requested file in the public directory
$requested = __DIR__ . '/../public' . $uri;

// If the file exists, let the built-in server handle it directly
// This allows static files like CSS, JS, and images to be served efficiently
if ($uri !== '/' && file_exists($requested)) {
    return false;
}

// Otherwise, route the request through Laravel
require_once __DIR__ . '/../public/index.php';
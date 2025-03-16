import React, { useState, useCallback } from 'react'; // react v18.2.0
import { Typography, Box, Paper } from '@mui/material'; // @mui/material v5.11.11

import AdminLayout from '../../layouts/AdminLayout';
import ReportingDashboard from '../../components/Admin/ReportingDashboard';
import { exportReport } from '../../api/admin';
import { Breadcrumbs } from '../../components/Common';

/**
 * Main component for the admin reports page
 * @returns Rendered reports page component
 */
const ReportsPage: React.FC = () => {
  // Define state for export loading status
  const [isExporting, setIsExporting] = useState(false);

  /**
   * Handles exporting reports in different formats
   * @param reportType 
   * @param format 
   * @returns Promise that resolves when export is complete
   */
  const handleExport = useCallback(async (reportType: string, format: string): Promise<void> => {
    setIsExporting(true);
    try {
      // Try to export the report using the exportReport API function
      const blob = await exportReport(reportType, { format });

      // Create a download link for the exported file
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}-report.${format}`;

      // Trigger the download
      document.body.appendChild(a);
      a.click();

      // Clean up the temporary download link
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting report:', error);
      // Handle any errors during export
      alert('Failed to export report. Please try again.');
    } finally {
      // Ensure loading state is reset regardless of success or failure
      setIsExporting(false);
    }
  }, []);

  // Define breadcrumbs for the page
  const breadcrumbItems = [
    { label: 'Admin', path: '/admin' },
    { label: 'Reports', path: '/admin/reports' },
  ];

  // Render AdminLayout with appropriate title and breadcrumbs
  return (
    <AdminLayout title="Reports">
      <Breadcrumbs items={breadcrumbItems} />
      {/* Render page header with title and description */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Reporting Dashboard
        </Typography>
        <Typography variant="body1">
          View comprehensive reports and analytics for the Student Admissions Enrollment Platform.
        </Typography>
      </Box>

      {/* Render ReportingDashboard component with export handler */}
      <ReportingDashboard onExport={handleExport} />
    </AdminLayout>
  );
};

export default ReportsPage;
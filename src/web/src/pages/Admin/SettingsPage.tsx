import React, { useState, useCallback, useEffect } from 'react'; // react ^18.0.0
import { useNavigate } from 'react-router-dom'; // react-router-dom v6.8.1
import { Box, Typography } from '@mui/material'; // @mui/material v5.11.10
import AdminLayout from '../../layouts/AdminLayout';
import SystemSettings from '../../components/Admin/SystemSettings';
import useNotification from '../../hooks/useNotification';

/**
 * @function SettingsPage
 * @description Main component for the admin settings page
 * @returns {JSX.Element} Rendered settings page component
 */
const SettingsPage: React.FC = () => {
  // Initialize notification hook for displaying success/error messages
  const { showNotification } = useNotification();

  // Initialize state for tracking settings save status
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  // Initialize useNavigate hook for navigation
  const navigate = useNavigate();

  /**
   * @function handleSettingsSaved
   * @description Function to handle successful settings save
   * @returns {void} No return value
   */
  const handleSettingsSaved = useCallback(() => {
    // Display success notification using the notification hook
    showNotification({ type: 'success', message: 'Settings saved successfully!' });

    // Update save status state
    setSaveStatus('success');

    // Reset save status after a delay if needed
    setTimeout(() => {
      setSaveStatus('idle');
    }, 3000);
  }, [showNotification]);

  // Render AdminLayout with appropriate title
  return (
    <AdminLayout title="System Settings">
      {/* Render page header with description */}
      <Box mb={3}>
        <Typography variant="h4" component="h1" gutterBottom>
          System Settings
        </Typography>
        <Typography variant="body1">
          Manage system-wide settings for the Student Admissions Enrollment Platform.
        </Typography>
      </Box>

      {/* Render SystemSettings component with save handler */}
      <SystemSettings onSave={handleSettingsSaved} />

      {/* Handle any loading or error states */}
    </AdminLayout>
  );
};

export default SettingsPage;
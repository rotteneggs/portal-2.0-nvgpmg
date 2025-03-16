import React, { useState, useEffect, useCallback } from 'react'; // react v18.2.0
import { Box, Typography, Grid, Divider, FormControlLabel, Switch } from '@mui/material'; // @mui/material v5.11.10
import DashboardLayout from '../../layouts/DashboardLayout';
import { Card, Button, Checkbox, Form, LoadingSkeleton, Notification } from '../../components/Common';
import {
  NotificationType,
  NotificationChannel,
  NotificationPreferences,
  UpdateNotificationPreferencesRequest,
} from '../../types/notification';
import { useAuthContext } from '../../contexts/AuthContext';
import { userService } from '../../services/UserService';

/**
 * Props for the NotificationSettingsSection component
 */
interface NotificationSettingsSectionProps {
  type: NotificationType;
  preferences: NotificationPreferences;
  onChange: (type: NotificationType, channel: NotificationChannel, enabled: boolean) => void;
}

/**
 * Component for a single notification type section with channel toggles
 */
const NotificationSettingsSection: React.FC<NotificationSettingsSectionProps> = ({ type, preferences, onChange }) => {
  return (
    <Box mb={3}>
      <Typography variant="h6" gutterBottom>
        {getNotificationTypeLabel(type)}
      </Typography>
      <Typography variant="body2" color="textSecondary" paragraph>
        {getNotificationTypeDescription(type)}
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
          <FormControlLabel
            control={
              <Switch
                checked={preferences.email}
                onChange={(e) => onChange(type, NotificationChannel.EMAIL, e.target.checked)}
                name={`${type}-email`}
              />
            }
            label="Email"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <FormControlLabel
            control={
              <Switch
                checked={preferences.sms}
                onChange={(e) => onChange(type, NotificationChannel.SMS, e.target.checked)}
                name={`${type}-sms`}
              />
            }
            label="SMS"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <FormControlLabel
            control={
              <Switch
                checked={preferences.in_app}
                onChange={(e) => onChange(type, NotificationChannel.IN_APP, e.target.checked)}
                name={`${type}-in_app`}
              />
            }
            label="In-App"
          />
        </Grid>
      </Grid>
    </Box>
  );
};

/**
 * Component for managing user notification preferences
 */
const NotificationSettingsPage: React.FC = () => {
  // Get current user from authentication context
  const { user } = useAuthContext();

  // Initialize state for notification preferences
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences | null>(null);

  // Initialize state for loading status
  const [loading, setLoading] = useState<boolean>(false);

  // Initialize state for success/error notifications
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load current notification preferences from user profile on component mount
  useEffect(() => {
    const loadPreferences = async () => {
      setLoading(true);
      try {
        if (user?.profile?.notification_preferences) {
          setNotificationPreferences(user.profile.notification_preferences);
        } else {
          // If no preferences are stored, initialize with default values
          setNotificationPreferences({
            email: true,
            sms: false,
            in_app: true,
            application_updates: [],
            document_updates: [],
            payment_updates: [],
            marketing: false,
          });
        }
      } catch (error: any) {
        setNotification({ type: 'error', message: error.message || 'Failed to load notification preferences' });
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, [user]);

  // Handle form submission to update notification preferences
  const handleSubmit = useCallback(
    async () => {
      if (!notificationPreferences) return;

      setLoading(true);
      try {
        // Prepare the request data
        const requestData: UpdateNotificationPreferencesRequest = {
          email: notificationPreferences.email,
          sms: notificationPreferences.sms,
          in_app: notificationPreferences.in_app,
          application_updates: notificationPreferences.application_updates,
          document_updates: notificationPreferences.document_updates,
          payment_updates: notificationPreferences.payment_updates,
          marketing: notificationPreferences.marketing,
        };

        // Call the user service to update notification preferences
        await userService.updateUserNotificationPreferences(requestData);
        setNotification({ type: 'success', message: 'Notification preferences updated successfully' });
      } catch (error: any) {
        setNotification({ type: 'error', message: error.message || 'Failed to update notification preferences' });
      } finally {
        setLoading(false);
      }
    },
    [notificationPreferences]
  );

  // Function to handle changes in notification preferences
  const handlePreferenceChange = (type: NotificationType, channel: NotificationChannel, enabled: boolean) => {
    setNotificationPreferences((prevPreferences: any) => {
      if (!prevPreferences) return prevPreferences;

      return {
        ...prevPreferences,
        [channel.toLowerCase()]: enabled,
      };
    });
  };

  return (
    <DashboardLayout title="Notification Settings">
      <Card>
        <Typography variant="h5" gutterBottom>
          Notification Preferences
        </Typography>
        <Typography variant="body1" paragraph>
          Manage your notification settings to stay informed about important updates.
        </Typography>
        <Divider sx={{ my: 2 }} />

        {loading ? (
          <LoadingSkeleton variant="text" height={40} count={5} />
        ) : (
          notificationPreferences && (
            <Form onSubmit={handleSubmit}>
              <Box>
                <Typography variant="h6" gutterBottom>
                  Channel Preferences
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  Choose how you want to receive notifications.
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={notificationPreferences.email}
                          onChange={(e) =>
                            setNotificationPreferences({
                              ...notificationPreferences,
                              email: e.target.checked,
                            })
                          }
                          name="email"
                        />
                      }
                      label="Email"
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={notificationPreferences.sms}
                          onChange={(e) =>
                            setNotificationPreferences({
                              ...notificationPreferences,
                              sms: e.target.checked,
                            })
                          }
                          name="sms"
                        />
                      }
                      label="SMS"
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={notificationPreferences.in_app}
                          onChange={(e) =>
                            setNotificationPreferences({
                              ...notificationPreferences,
                              in_app: e.target.checked,
                            })
                          }
                          name="in_app"
                        />
                      }
                      label="In-App"
                    />
                  </Grid>
                </Grid>
              </Box>

              <Divider sx={{ my: 3 }} />

              <NotificationSettingsSection
                type={NotificationType.APPLICATION_STATUS_CHANGE}
                preferences={notificationPreferences}
                onChange={handlePreferenceChange}
              />

              <NotificationSettingsSection
                type={NotificationType.DOCUMENT_VERIFIED}
                preferences={notificationPreferences}
                onChange={handlePreferenceChange}
              />

              <NotificationSettingsSection
                type={NotificationType.PAYMENT_RECEIVED}
                preferences={notificationPreferences}
                onChange={handlePreferenceChange}
              />

              <Box mt={3}>
                <Button type="submit" variant="contained" color="primary" disabled={loading}>
                  Save Changes
                </Button>
              </Box>
            </Form>
          )
        )}
      </Card>
      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          open={!!notification}
          onClose={() => setNotification(null)}
        />
      )}
    </DashboardLayout>
  );
};

/**
 * Helper function to get human-readable labels for notification types
 */
const getNotificationTypeLabel = (type: NotificationType): string => {
  switch (type) {
    case NotificationType.APPLICATION_STATUS_CHANGE:
      return 'Application Updates';
    case NotificationType.DOCUMENT_VERIFIED:
      return 'Document Verification';
    case NotificationType.PAYMENT_RECEIVED:
      return 'Payment Updates';
    default:
      return 'General Notifications';
  }
};

/**
 * Helper function to get descriptions for notification types
 */
const getNotificationTypeDescription = (type: NotificationType): string => {
  switch (type) {
    case NotificationType.APPLICATION_STATUS_CHANGE:
      return 'Receive updates on your application status.';
    case NotificationType.DOCUMENT_VERIFIED:
      return 'Get notified when your documents are verified.';
    case NotificationType.PAYMENT_RECEIVED:
      return 'Receive confirmation when your payments are processed.';
    default:
      return 'Receive general notifications and updates.';
  }
};

export default NotificationSettingsPage;
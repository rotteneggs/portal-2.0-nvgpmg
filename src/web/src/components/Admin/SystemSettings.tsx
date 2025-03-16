import React, { useState, useEffect, useCallback } from 'react'; // react ^18.0.0
import { Typography, Box, Grid, Paper, Divider, CircularProgress, Alert, Switch } from '@mui/material'; // @mui/material ^5.0.0
import { Card, TextField, Select, Button, Tabs, Checkbox, FileUploader, LoadingSkeleton, Modal } from '../Common';
import {
  getSystemSettings,
  updateSystemSettings,
  getEmailTemplates,
  updateEmailTemplate,
  getIntegrationSettings,
  updateIntegrationSettings,
  getSecuritySettings,
  updateSecuritySettings,
  getAppearanceSettings,
  updateAppearanceSettings,
  resetSettingsToDefaults
} from '../../api/admin';
import useForm from '../../hooks/useForm';
import useNotification from '../../hooks/useNotification';

/**
 * Interface defining the props for the SystemSettings component
 */
interface SystemSettingsProps {
  onSave?: () => void;
  initialTab?: string;
}

/**
 * Interface for general system settings
 */
interface GeneralSettings {
  institution_name: string;
  application_deadline: string;
  timezone: string;
  date_format: string;
  language: string;
  enable_email_notifications: boolean;
  support_email: string;
  admin_email: string;
}

/**
 * Interface for email template data
 */
interface EmailTemplate {
  name: string;
  subject: string;
  body: string;
  variables: Record<string, string>;
}

/**
 * Interface for integration settings
 */
interface IntegrationSettings {
  sis_integration: {
    enabled: boolean;
    api_url: string;
    api_key: string;
    sync_frequency: string;
  };
  lms_integration: {
    enabled: boolean;
    api_url: string;
    api_key: string;
    client_id: string;
    client_secret: string;
  };
  payment_gateway: {
    provider: string;
    api_key: string;
    secret_key: string;
    sandbox_mode: boolean;
  };
  email_service: {
    provider: string;
    api_key: string;
    from_email: string;
    from_name: string;
  };
  sms_service: {
    enabled: boolean;
    provider: string;
    api_key: string;
    from_number: string;
  };
}

/**
 * Interface for security settings
 */
interface SecuritySettings {
  password_policy: {
    min_length: number;
    require_uppercase: boolean;
    require_lowercase: boolean;
    require_numbers: boolean;
    require_special_chars: boolean;
    password_expiry_days: number;
    prevent_password_reuse: boolean;
    password_history_count: number;
  };
  mfa: {
    enabled: boolean;
    required_for_admins: boolean;
    required_for_staff: boolean;
    required_for_students: boolean;
    methods: string[];
  };
  session: {
    timeout_minutes: number;
    max_concurrent_sessions: number;
    remember_me_days: number;
  };
  account_lockout: {
    enabled: boolean;
    max_attempts: number;
    lockout_duration_minutes: number;
    reset_attempts_after_minutes: number;
  };
  ip_restrictions: {
    enabled: boolean;
    allowed_ips: string[];
    blocked_ips: string[];
  };
  audit_logging: {
    enabled: boolean;
    log_user_actions: boolean;
    log_admin_actions: boolean;
    log_system_events: boolean;
    retention_days: number;
  };
}

/**
 * Interface for appearance settings
 */
interface AppearanceSettings {
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  font_family: string;
  enable_dark_mode: boolean;
  custom_css: string;
}

/**
 * Main component for system settings management
 */
const SystemSettings: React.FC<SystemSettingsProps> = ({ onSave, initialTab }) => {
  // State for active tab
  const [activeTab, setActiveTab] = useState(initialTab || 'general');

  // State for loading status
  const [loading, setLoading] = useState(false);

  // State for settings data
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings | null>(null);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[] | null>(null);
  const [integrationSettings, setIntegrationSettings] = useState<IntegrationSettings | null>(null);
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings | null>(null);
  const [appearanceSettings, setAppearanceSettings] = useState<AppearanceSettings | null>(null);

  // State for file uploads (logo)
  const [logoFile, setLogoFile] = useState<File | null>(null);

  // Form handling with useForm hook
  const formMethods = useForm({
    initialValues: {
      institution_name: '',
      application_deadline: '',
      timezone: '',
      date_format: '',
      language: '',
      enable_email_notifications: false,
      support_email: '',
      admin_email: '',
      sis_integration: { enabled: false, api_url: '', api_key: '', sync_frequency: '' },
      lms_integration: { enabled: false, api_url: '', api_key: '', client_id: '', client_secret: '' },
      payment_gateway: { provider: '', api_key: '', secret_key: '', sandbox_mode: false },
      email_service: { provider: '', api_key: '', from_email: '', from_name: '' },
      sms_service: { enabled: false, provider: '', api_key: '', from_number: '' },
      password_policy: { min_length: 8, require_uppercase: false, require_lowercase: false, require_numbers: false, require_special_chars: false, password_expiry_days: 90, prevent_password_reuse: true, password_history_count: 5 },
      mfa: { enabled: false, required_for_admins: true, required_for_staff: false, required_for_students: false, methods: [] },
      session: { timeout_minutes: 30, max_concurrent_sessions: 5, remember_me_days: 30 },
      account_lockout: { enabled: true, max_attempts: 5, lockout_duration_minutes: 15, reset_attempts_after_minutes: 30 },
      ip_restrictions: { enabled: false, allowed_ips: [], blocked_ips: [] },
      audit_logging: { enabled: true, log_user_actions: true, log_admin_actions: true, log_system_events: true, retention_days: 365 },
      logo_url: '',
      primary_color: '',
      secondary_color: '',
      accent_color: '',
      font_family: '',
      enable_dark_mode: false,
      custom_css: ''
    },
    onSubmit: handleSaveSettings
  });

  // Notification handling with useNotification hook
  const { showNotification } = useNotification();

  // Fetch all settings data on component mount
  useEffect(() => {
    fetchSettings();
  }, []);

  // Function to fetch all system settings
  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const general = await getSystemSettings({ group: 'general' });
      const templates = await getEmailTemplates();
      const integrations = await getIntegrationSettings();
      const security = await getSecuritySettings();
      const appearance = await getAppearanceSettings();

      setGeneralSettings(general);
      setEmailTemplates(templates);
      setIntegrationSettings(integrations);
      setSecuritySettings(security);
      setAppearanceSettings(appearance);

      formMethods.setValues({
        ...general,
        ...integrations,
        ...security,
        ...appearance
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
      showNotification({ type: 'error', message: 'Failed to fetch settings.' });
    } finally {
      setLoading(false);
    }
  }, [showNotification, formMethods]);

  // Handle tab change function
  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue);
  };

  // Function to save updated system settings
  const handleSaveSettings = useCallback(async () => {
    formMethods.setSubmitting(true);
    try {
      if (activeTab === 'general') {
        await updateSystemSettings(formMethods.values);
      } else if (activeTab === 'email') {
        // Assuming only one email template is being edited at a time
        if (emailTemplates && emailTemplates.length > 0) {
          await updateEmailTemplate(emailTemplates[0].name, formMethods.values);
        }
      } else if (activeTab === 'integrations') {
        await updateIntegrationSettings('all', formMethods.values);
      } else if (activeTab === 'security') {
        await updateSecuritySettings(formMethods.values);
      } else if (activeTab === 'appearance') {
        // Handle file uploads for appearance settings
        if (logoFile) {
          await updateAppearanceSettings(formMethods.values, logoFile);
        } else {
          await updateAppearanceSettings(formMethods.values);
        }
      }

      showNotification({ type: 'success', message: 'Settings updated successfully.' });
      onSave?.();
    } catch (error) {
      console.error('Error saving settings:', error);
      showNotification({ type: 'error', message: 'Failed to update settings.' });
    } finally {
      formMethods.setSubmitting(false);
    }
  }, [activeTab, formMethods, showNotification, onSave, emailTemplates, logoFile]);

  // Function to reset settings to system defaults
  const handleResetToDefaults = useCallback(async () => {
    const confirmReset = window.confirm('Are you sure you want to reset these settings to their defaults?');
    if (confirmReset) {
      try {
        await resetSettingsToDefaults({ group: activeTab });
        await fetchSettings();
        showNotification({ type: 'success', message: 'Settings reset to defaults.' });
      } catch (error) {
        console.error('Error resetting settings:', error);
        showNotification({ type: 'error', message: 'Failed to reset settings.' });
      }
    }
  }, [activeTab, fetchSettings, showNotification]);

  // Function to handle logo file uploads
  const handleFileUpload = (file: File) => {
    if (file.type.startsWith('image/')) {
      if (file.size <= 2000000) {
        setLogoFile(file);
      } else {
        showNotification({ type: 'warning', message: 'Logo file size should be less than 2MB.' });
      }
    } else {
      showNotification({ type: 'warning', message: 'Only image files are allowed for the logo.' });
    }
  };

  // Function to render general system settings form
  const renderGeneralSettings = () => (
    <Card title="General Settings">
      <TextField
        name="institution_name"
        label="Institution Name"
        value={formMethods.values.institution_name || ''}
        onChange={formMethods.handleChange}
        fullWidth
      />
      {/* Add other general settings fields here */}
    </Card>
  );

  // Function to render email template settings
  const renderEmailTemplates = () => (
    <Card title="Email Templates">
      {/* Add email template settings fields here */}
    </Card>
  );

  // Function to render integration settings
  const renderIntegrationSettings = () => (
    <Card title="Integration Settings">
      {/* Add integration settings fields here */}
    </Card>
  );

  // Function to render security settings
  const renderSecuritySettings = () => (
    <Card title="Security Settings">
      {/* Add security settings fields here */}
    </Card>
  );

  // Function to render appearance settings
  const renderAppearanceSettings = () => (
    <Card title="Appearance Settings">
      <FileUploader
        label="Upload Logo"
        onFileSelect={(files) => handleFileUpload(files[0])}
      />
      {/* Add other appearance settings fields here */}
    </Card>
  );

  return (
    <Box>
      <Tabs value={activeTab} onChange={handleTabChange} aria-label="system settings tabs">
        <Tab label="General" value="general" />
        <Tab label="Email Templates" value="email" />
        <Tab label="Integrations" value="integrations" />
        <Tab label="Security" value="security" />
        <Tab label="Appearance" value="appearance" />
      </Tabs>

      {loading ? (
        <LoadingSkeleton variant="rectangular" height={300} />
      ) : (
        <formMethods.Form>
          {activeTab === 'general' && renderGeneralSettings()}
          {activeTab === 'email' && renderEmailTemplates()}
          {activeTab === 'integrations' && renderIntegrationSettings()}
          {activeTab === 'security' && renderSecuritySettings()}
          {activeTab === 'appearance' && renderAppearanceSettings()}

          <Box mt={3} display="flex" justifyContent="flex-end">
            <Button variant="contained" color="primary" type="submit" disabled={formMethods.isSubmitting}>
              {formMethods.isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Save'}
            </Button>
            <Button variant="outlined" onClick={handleResetToDefaults} disabled={formMethods.isSubmitting} style={{ marginLeft: 10 }}>
              Reset to Defaults
            </Button>
          </Box>
        </formMethods.Form>
      )}
    </Box>
  );
};

export default SystemSettings;
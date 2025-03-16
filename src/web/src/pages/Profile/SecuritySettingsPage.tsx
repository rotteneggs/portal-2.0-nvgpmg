import React, { useState, useEffect, useCallback } from 'react'; // react v18.2.0
import { Box, Typography, Grid, Divider, Tabs, Tab, Alert, FormControlLabel, Switch } from '@mui/material'; // @mui/material v5.11.10
import { styled } from '@mui/material/styles'; // @mui/material/styles v5.11.10
import { LockOutlined, SecurityOutlined, VpnKeyOutlined } from '@mui/icons-material'; // @mui/icons-material v5.11.9
import DashboardLayout from '../../layouts/DashboardLayout';
import { Card, TextField, Button, Form, LoadingSkeleton, Notification } from '../../components/Common';
import { useAuthContext } from '../../contexts/AuthContext';
import useForm from '../../hooks/useForm';
import useNotification from '../../hooks/useNotification';
import { authService, userService } from '../../services/AuthService';
import { required, passwordComplexity, match } from '../../utils/validationUtils';

/**
 * Interface for MFA setup data
 */
interface MfaSetupData {
  method: string;
  secret: string;
  qr_code: string;
}

// Styled components
const SettingsContainer = styled(Box)`
  padding: ${theme => theme.spacing(3)};
  maxWidth: 800px;
  margin: '0 auto';
`;

const TabContent = styled(Box)`
  padding: ${theme => theme.spacing(3)};
  backgroundColor: ${theme => theme.palette.background.paper};
  borderRadius: ${theme => theme.shape.borderRadius}px;
  borderTopLeftRadius: 0;
`;

const FormSection = styled(Box)`
  marginBottom: ${theme => theme.spacing(3)};
`;

const RecoveryCodeContainer = styled(Box)`
  padding: ${theme => theme.spacing(2)};
  backgroundColor: ${theme => theme.palette.grey[100]};
  borderRadius: ${theme => theme.shape.borderRadius}px;
  fontFamily: 'monospace';
  marginBottom: ${theme => theme.spacing(2)};
`;

const QrCodeContainer = styled(Box)`
  display: 'flex';
  flexDirection: 'column';
  alignItems: 'center';
  marginBottom: ${theme => theme.spacing(3)};
`;

/**
 * Main component for the security settings page
 */
const SecuritySettingsPage: React.FC = () => {
  // Get current user from auth context
  const { user } = useAuthContext();

  // Initialize state for active tab
  const [activeTab, setActiveTab] = useState(0);

  // Initialize state for loading states
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSettingUpMfa, setIsSettingUpMfa] = useState(false);
  const [isVerifyingMfa, setIsVerifyingMfa] = useState(false);
  const [isDisablingMfa, setIsDisablingMfa] = useState(false);
  const [isGeneratingCodes, setIsGeneratingCodes] = useState(false);

  // Initialize state for MFA setup data
  const [mfaSetupData, setMfaSetupData] = useState<MfaSetupData | null>(null);

  // Initialize state for recovery codes
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  // Set up form validation schema for password change form
  const passwordValidationSchema = {
    current_password: required('Current password is required'),
    new_password: [
      required('New password is required'),
      passwordComplexity('Password must be at least 12 characters long and include lowercase, uppercase, number, and special character'),
    ],
    confirm_password: [
      required('Please confirm your new password'),
      match('new_password', 'Passwords must match'),
    ],
  };

  // Initialize form hook for password change form
  const {
    values: passwordValues,
    errors: passwordErrors,
    touched: passwordTouched,
    handleChange: handlePasswordChange,
    handleBlur: handlePasswordBlur,
    handleSubmit: handlePasswordSubmit,
    isSubmitting: isPasswordSubmitting,
  } = useForm({
    initialValues: {
      current_password: '',
      new_password: '',
      confirm_password: '',
    },
    validationSchema: passwordValidationSchema,
    onSubmit: handlePasswordChangeSubmit,
  });

  // Get showNotification function from useNotification hook
  const { showNotification } = useNotification();

  // Handle password change form submission
  async function handlePasswordChangeSubmit(values: any, formHelpers: { setSubmitting: (isSubmitting: boolean) => void }) {
    setIsChangingPassword(true);
    try {
      await userService.changeUserPassword(values);
      showNotification({ type: 'success', message: 'Password changed successfully' });
    } catch (error: any) {
      showNotification({ type: 'error', message: error.message || 'Failed to change password' });
    } finally {
      setIsChangingPassword(false);
      formHelpers.setSubmitting(false);
    }
  }

  // Handle MFA setup initiation
  const handleSetupMfa = async (method: string) => {
    setIsSettingUpMfa(true);
    try {
      const setupData = await authService.setupMfa(method, {});
      setMfaSetupData(setupData);
    } catch (error: any) {
      showNotification({ type: 'error', message: error.message || 'Failed to initiate MFA setup' });
    } finally {
      setIsSettingUpMfa(false);
    }
  };

  // Handle MFA verification
  const handleVerifyMfa = async (code: string) => {
    setIsVerifyingMfa(true);
    try {
      if (!mfaSetupData) {
        throw new Error('MFA setup data is missing');
      }
      await authService.verifyMfaSetup(mfaSetupData.method, code);
      showNotification({ type: 'success', message: 'MFA setup verified successfully' });
    } catch (error: any) {
      showNotification({ type: 'error', message: error.message || 'Failed to verify MFA setup' });
    } finally {
      setIsVerifyingMfa(false);
      setMfaSetupData(null);
    }
  };

  // Handle MFA disabling
  const handleDisableMfa = async (password: string) => {
    setIsDisablingMfa(true);
    try {
      await authService.disableMfa(password);
      showNotification({ type: 'success', message: 'MFA disabled successfully' });
    } catch (error: any) {
      showNotification({ type: 'error', message: error.message || 'Failed to disable MFA' });
    } finally {
      setIsDisablingMfa(false);
    }
  };

  // Handle recovery codes generation
  const handleGenerateCodes = async () => {
    setIsGeneratingCodes(true);
    try {
      const codes = await authService.getRecoveryCodes();
      setRecoveryCodes(codes);
      showNotification({ type: 'success', message: 'Recovery codes generated successfully' });
    } catch (error: any) {
      showNotification({ type: 'error', message: error.message || 'Failed to generate recovery codes' });
    } finally {
      setIsGeneratingCodes(false);
    }
  };

  // Render DashboardLayout with security settings content
  return (
    <DashboardLayout title="Security Settings">
      <SettingsContainer>
        <Tabs value={activeTab} onChange={(event, newValue) => setActiveTab(newValue)} aria-label="security settings tabs">
          <Tab label="Password" {...a11yProps(0)} icon={<LockOutlined />} iconPosition="start" />
          <Tab label="Multi-Factor Authentication" {...a11yProps(1)} icon={<SecurityOutlined />} iconPosition="start" />
          <Tab label="Recovery Options" {...a11yProps(2)} icon={<VpnKeyOutlined />} iconPosition="start" />
        </Tabs>

        <TabContent>
          {activeTab === 0 && (
            <Card title="Change Password">
              <PasswordChangeForm
                formProps={{
                  values: passwordValues,
                  errors: passwordErrors,
                  touched: passwordTouched,
                  handleChange: handlePasswordChange,
                  handleBlur: handlePasswordBlur,
                  handleSubmit: handlePasswordSubmit,
                }}
                isSubmitting={isChangingPassword}
                onSubmit={handlePasswordChangeSubmit}
              />
            </Card>
          )}

          {activeTab === 1 && (
            <Card title="Multi-Factor Authentication">
              {user ? (
                <MfaSetupForm
                  mfaEnabled={user.has_mfa_enabled}
                  mfaSetupData={mfaSetupData}
                  isSettingUp={isSettingUpMfa}
                  isVerifying={isVerifyingMfa}
                  isDisabling={isDisablingMfa}
                  onSetupMfa={handleSetupMfa}
                  onVerifyMfa={handleVerifyMfa}
                  onDisableMfa={handleDisableMfa}
                />
              ) : (
                <LoadingSkeleton variant="text" />
              )}
            </Card>
          )}

          {activeTab === 2 && (
            <Card title="Recovery Options">
              {user ? (
                <RecoveryOptionsForm
                  mfaEnabled={user.has_mfa_enabled}
                  recoveryCodes={recoveryCodes}
                  isGeneratingCodes={isGeneratingCodes}
                  onGenerateCodes={handleGenerateCodes}
                />
              ) : (
                <LoadingSkeleton variant="text" />
              )}
            </Card>
          )}
        </TabContent>
      </SettingsContainer>
    </DashboardLayout>
  );
};

/**
 * Form component for changing password
 */
interface PasswordChangeFormProps {
  formProps: any;
  isSubmitting: boolean;
  onSubmit: (values: any, formHelpers: { setSubmitting: (isSubmitting: boolean) => void }) => void | Promise<void>;
}

const PasswordChangeForm: React.FC<PasswordChangeFormProps> = ({ formProps, isSubmitting, onSubmit }) => {
  // Destructure form props (values, errors, touched, handleChange, handleBlur, handleSubmit)
  const { values, errors, touched, handleChange, handleBlur, handleSubmit } = formProps;

  return (
    <FormSection>
      <TextField
        fullWidth
        label="Current Password"
        type="password"
        name="current_password"
        value={values.current_password}
        onChange={handleChange}
        onBlur={handleBlur}
        error={touched.current_password && errors.current_password}
        helperText={touched.current_password && errors.current_password}
      />
      <TextField
        fullWidth
        label="New Password"
        type="password"
        name="new_password"
        value={values.new_password}
        onChange={handleChange}
        onBlur={handleBlur}
        error={touched.new_password && errors.new_password}
        helperText={touched.new_password && errors.new_password}
      />
      <TextField
        fullWidth
        label="Confirm New Password"
        type="password"
        name="confirm_password"
        value={values.confirm_password}
        onChange={handleChange}
        onBlur={handleBlur}
        error={touched.confirm_password && errors.confirm_password}
        helperText={touched.confirm_password && errors.confirm_password}
      />
      <Typography variant="caption" color="textSecondary">
        Password must be at least 12 characters long and include lowercase, uppercase, number, and special character.
      </Typography>
      <Box mt={2}>
        <Button
          variant="contained"
          color="primary"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Changing Password...' : 'Change Password'}
        </Button>
      </Box>
    </FormSection>
  );
};

/**
 * Form component for setting up multi-factor authentication
 */
interface MfaSetupFormProps {
  mfaEnabled: boolean;
  mfaSetupData: MfaSetupData | null;
  isSettingUp: boolean;
  isVerifying: boolean;
  isDisabling: boolean;
  onSetupMfa: (method: string) => void;
  onVerifyMfa: (code: string) => void;
  onDisableMfa: (password: string) => void;
}

const MfaSetupForm: React.FC<MfaSetupFormProps> = ({
  mfaEnabled,
  mfaSetupData,
  isSettingUp,
  isVerifying,
  isDisabling,
  onSetupMfa,
  onVerifyMfa,
  onDisableMfa,
}) => {
  // Initialize state for selected MFA method
  const [selectedMethod, setSelectedMethod] = useState('totp');

  // Initialize state for verification code
  const [verificationCode, setVerificationCode] = useState('');

  // Initialize state for disable password
  const [disablePassword, setDisablePassword] = useState('');

  return (
    <FormSection>
      <FormControlLabel
        control={
          <Switch
            checked={mfaEnabled}
            disabled={isDisabling}
            onChange={(e) => {
              if (e.target.checked) {
                // Do nothing for now, let the user choose a method
              } else {
                // Prompt for password to disable MFA
                const password = prompt('Please enter your password to disable MFA:');
                if (password) {
                  onDisableMfa(password);
                }
              }
            }}
            name="mfaEnabled"
          />
        }
        label={mfaEnabled ? 'Multi-Factor Authentication Enabled' : 'Multi-Factor Authentication Disabled'}
      />

      {!mfaEnabled && (
        <>
          <Typography variant="body1">
            Select a method to set up multi-factor authentication:
          </Typography>
          <Grid container spacing={2} mt={2}>
            <Grid item xs={6}>
              <Button
                variant={selectedMethod === 'totp' ? 'contained' : 'outlined'}
                color="primary"
                fullWidth
                onClick={() => setSelectedMethod('totp')}
                disabled={isSettingUp}
              >
                Authenticator App
              </Button>
            </Grid>
            <Grid item xs={6}>
              <Button
                variant={selectedMethod === 'sms' ? 'contained' : 'outlined'}
                color="primary"
                fullWidth
                onClick={() => setSelectedMethod('sms')}
                disabled={isSettingUp}
              >
                SMS Code
              </Button>
            </Grid>
          </Grid>
          <Box mt={2}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => onSetupMfa(selectedMethod)}
              disabled={isSettingUp}
            >
              {isSettingUp ? 'Setting Up...' : 'Setup MFA'}
            </Button>
          </Box>
        </>
      )}

      {mfaSetupData && mfaSetupData.method === 'totp' && (
        <Box mt={2}>
          <Typography variant="body1">
            Scan the QR code with your authenticator app:
          </Typography>
          <QrCodeContainer>
            <img src={mfaSetupData.qr_code} alt="QR Code" />
            <Typography variant="caption">
              Or enter this secret key: {mfaSetupData.secret}
            </Typography>
          </QrCodeContainer>
          <TextField
            fullWidth
            label="Verification Code"
            type="text"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
          />
          <Box mt={2}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => onVerifyMfa(verificationCode)}
              disabled={isVerifying}
            >
              {isVerifying ? 'Verifying...' : 'Verify MFA'}
            </Button>
          </Box>
        </Box>
      )}

      {mfaEnabled && (
        <Box mt={2}>
          <TextField
            fullWidth
            label="Password"
            type="password"
            value={disablePassword}
            onChange={(e) => setDisablePassword(e.target.value)}
          />
          <Box mt={2}>
            <Button
              variant="contained"
              color="error"
              onClick={() => onDisableMfa(disablePassword)}
              disabled={isDisabling}
            >
              {isDisabling ? 'Disabling...' : 'Disable MFA'}
            </Button>
          </Box>
        </Box>
      )}
    </FormSection>
  );
};

/**
 * Form component for managing recovery options
 */
interface RecoveryOptionsFormProps {
  mfaEnabled: boolean;
  recoveryCodes: string[] | null;
  isGeneratingCodes: boolean;
  onGenerateCodes: () => void;
}

const RecoveryOptionsForm: React.FC<RecoveryOptionsFormProps> = ({
  mfaEnabled,
  recoveryCodes,
  isGeneratingCodes,
  onGenerateCodes,
}) => {
  return (
    <FormSection>
      <Typography variant="body1">
        Recovery codes can be used to access your account if you lose access to your primary MFA method.
      </Typography>
      {mfaEnabled ? (
        <>
          {recoveryCodes ? (
            <>
              <Typography variant="body1" mt={2}>
                Here are your recovery codes. Keep them in a safe place. Each code can only be used once.
              </Typography>
              <Grid container spacing={2} mt={2}>
                {recoveryCodes.map((code, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <RecoveryCodeContainer>
                      {code}
                    </RecoveryCodeContainer>
                  </Grid>
                ))}
              </Grid>
            </>
          ) : (
            <Typography variant="body1" mt={2}>
              No recovery codes generated yet.
            </Typography>
          )}
          <Box mt={2}>
            <Button
              variant="contained"
              color="primary"
              onClick={onGenerateCodes}
              disabled={isGeneratingCodes}
            >
              {isGeneratingCodes ? 'Generating Codes...' : 'Generate New Recovery Codes'}
            </Button>
          </Box>
          <Typography variant="caption" color="textSecondary" mt={1}>
            Generating new recovery codes will invalidate your existing codes.
          </Typography>
        </>
      ) : (
        <Typography variant="body1" mt={2}>
          Recovery options are only available when multi-factor authentication is enabled.
        </Typography>
      )}
    </FormSection>
  );
};

export default SecuritySettingsPage;
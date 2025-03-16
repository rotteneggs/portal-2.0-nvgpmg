import React, { useState, useEffect, useCallback } from 'react'; // react v18.2.0
import { Box, Typography, Grid, Divider, Avatar } from '@mui/material'; // @mui/material v5.11.10
import { styled } from '@mui/material/styles'; // @mui/material/styles v5.11.10
import { PersonOutlined, EditOutlined, DeleteOutline } from '@mui/icons-material'; // @mui/icons-material v5.11.9

import DashboardLayout from '../../layouts/DashboardLayout';
import { useAuthContext } from '../../contexts/AuthContext';
import {
  Card,
  TextField,
  Button,
  DatePicker,
  LoadingSkeleton,
  FileUploader,
  Tabs,
  Notification,
} from '../../components/Common';
import { User, UpdateProfileRequest, UserProfile } from '../../types/user';
import userService from '../../services/UserService';
import useForm from '../../hooks/useForm';
import useNotification from '../../hooks/useNotification';
import { isRequired, isEmail, isPhone } from '../../utils/validationUtils';
import { formatDate } from '../../utils/dateUtils';

// Styled components
const ProfileContainer = styled(Box)`
  padding: ${theme => theme.spacing(3)};
  max-width: 800px;
  margin: '0 auto';
`;

const TabContent = styled(Box)`
  padding: ${theme => theme.spacing(3)};
  backgroundColor: ${theme => theme.palette.background.paper};
  borderRadius: ${theme => theme.shape.borderRadius}px;
  borderTopLeftRadius: 0;
`;

const FormSection = styled(Box)`
  margin-bottom: ${theme => theme.spacing(3)};
`;

const ProfilePictureContainer = styled(Box)`
  display: 'flex';
  flexDirection: 'column';
  alignItems: 'center';
  marginBottom: ${theme => theme.spacing(3)};
`;

const LargeAvatar = styled(Avatar)`
  width: 120px;
  height: 120px;
  marginBottom: ${theme => theme.spacing(2)};
`;

/**
 * Component for displaying and managing profile picture
 */
const ProfilePictureSection: React.FC<{
  profilePictureUrl: string | null | undefined;
  onUpload: (file: File) => void;
  onDelete: () => void;
  isUploading: boolean;
}> = ({ profilePictureUrl, onUpload, onDelete, isUploading }) => {
  return (
    <ProfilePictureContainer>
      <LargeAvatar
        src={profilePictureUrl || undefined}
        alt="Profile Picture"
      >
        {!profilePictureUrl && <PersonOutlined />}
      </LargeAvatar>
      <FileUploader
        onFileSelect={(files) => {
          if (files && files.length > 0) {
            onUpload(files[0]);
          }
        }}
        acceptedFileTypes={['image/jpeg', 'image/png']}
        maxFileSize={2 * 1024 * 1024} // 2MB
        label="Change Profile Picture"
        multiple={false}
        disabled={isUploading}
      />
      {profilePictureUrl && (
        <Button
          variant="text"
          color="error"
          startIcon={<DeleteOutline />}
          onClick={onDelete}
          disabled={isUploading}
        >
          Delete Profile Picture
        </Button>
      )}
    </ProfilePictureContainer>
  );
};

/**
 * Form component for personal information
 */
const PersonalInformationForm: React.FC<{
  formProps: any;
  isSubmitting: boolean;
  onSubmit: () => void;
}> = ({ formProps, isSubmitting, onSubmit }) => {
  const { values, errors, touched, handleChange, handleBlur, handleSubmit } = formProps;

  return (
    <form onSubmit={handleSubmit}>
      <FormSection>
        <TextField
          fullWidth
          id="first_name"
          name="first_name"
          label="First Name"
          value={values.first_name}
          onChange={handleChange}
          onBlur={handleBlur}
          error={touched.first_name && !!errors.first_name}
          helperText={touched.first_name && errors.first_name}
        />
      </FormSection>
      <FormSection>
        <TextField
          fullWidth
          id="last_name"
          name="last_name"
          label="Last Name"
          value={values.last_name}
          onChange={handleChange}
          onBlur={handleBlur}
          error={touched.last_name && !!errors.last_name}
          helperText={touched.last_name && errors.last_name}
        />
      </FormSection>
      <FormSection>
        <DatePicker
          fullWidth
          id="date_of_birth"
          name="date_of_birth"
          label="Date of Birth"
          value={values.date_of_birth}
          onChange={(date) => formProps.setFieldValue('date_of_birth', date)}
          onBlur={handleBlur}
        />
      </FormSection>
      <Button
        type="submit"
        variant="contained"
        color="primary"
        disabled={isSubmitting}
        onClick={onSubmit}
      >
        {isSubmitting ? 'Updating...' : 'Update Personal Information'}
      </Button>
    </form>
  );
};

/**
 * Form component for contact details
 */
const ContactDetailsForm: React.FC<{
  formProps: any;
  isSubmitting: boolean;
  onSubmit: () => void;
}> = ({ formProps, isSubmitting, onSubmit }) => {
  const { values, errors, touched, handleChange, handleBlur, handleSubmit } = formProps;

  return (
    <form onSubmit={handleSubmit}>
      <FormSection>
        <TextField
          fullWidth
          id="phone_number"
          name="phone_number"
          label="Phone Number"
          value={values.phone_number}
          onChange={handleChange}
          onBlur={handleBlur}
          error={touched.phone_number && !!errors.phone_number}
          helperText={touched.phone_number && errors.phone_number}
        />
      </FormSection>
      <FormSection>
        <TextField
          fullWidth
          id="address_line1"
          name="address_line1"
          label="Address Line 1"
          value={values.address_line1}
          onChange={handleChange}
          onBlur={handleBlur}
        />
      </FormSection>
      <FormSection>
        <TextField
          fullWidth
          id="address_line2"
          name="address_line2"
          label="Address Line 2"
          value={values.address_line2}
          onChange={handleChange}
          onBlur={handleBlur}
        />
      </FormSection>
      <FormSection>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              id="city"
              name="city"
              label="City"
              value={values.city}
              onChange={handleChange}
              onBlur={handleBlur}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              id="state"
              name="state"
              label="State"
              value={values.state}
              onChange={handleChange}
              onBlur={handleBlur}
            />
          </Grid>
        </Grid>
      </FormSection>
      <FormSection>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              id="postal_code"
              name="postal_code"
              label="Postal Code"
              value={values.postal_code}
              onChange={handleChange}
              onBlur={handleBlur}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              id="country"
              name="country"
              label="Country"
              value={values.country}
              onChange={handleChange}
              onBlur={handleBlur}
            />
          </Grid>
        </Grid>
      </FormSection>
      <Button
        type="submit"
        variant="contained"
        color="primary"
        disabled={isSubmitting}
        onClick={onSubmit}
      >
        {isSubmitting ? 'Updating...' : 'Update Contact Details'}
      </Button>
    </form>
  );
};

/**
 * Component for displaying account information
 */
const AccountInformationSection: React.FC<{ user: User }> = ({ user }) => {
  return (
    <Box>
      <FormSection>
        <Typography variant="subtitle1">Email Address: {user.email}</Typography>
      </FormSection>
      <FormSection>
        <Typography variant="subtitle1">Account Created: {formatDate(user.created_at, 'MMMM dd, yyyy')}</Typography>
      </FormSection>
      <FormSection>
        <Typography variant="subtitle1">Last Login: {user.last_login_at ? formatDate(user.last_login_at, 'MMMM dd, yyyy hh:mm a') : 'Never'}</Typography>
      </FormSection>
      <FormSection>
        <Typography variant="subtitle1">Email Verified: {user.email_verified_at ? 'Yes' : 'No'}</Typography>
      </FormSection>
      <FormSection>
        <Typography variant="subtitle1">MFA Enabled: {user.has_mfa_enabled ? 'Yes' : 'No'}</Typography>
      </FormSection>
      <Button variant="outlined" color="primary" onClick={() => alert('Navigating to security settings')}>
        Manage Security Settings
      </Button>
      <Button variant="outlined" color="primary" onClick={() => alert('Navigating to notification settings')}>
        Manage Notification Settings
      </Button>
    </Box>
  );
};

// Styled components
const ProfileContainer = styled(Box)`
  padding: ${theme => theme.spacing(3)};
  max-width: 800px;
  margin: '0 auto';
`;

const TabContent = styled(Box)`
  padding: ${theme => theme.spacing(3)};
  backgroundColor: ${theme => theme.palette.background.paper};
  borderRadius: ${theme => theme.shape.borderRadius}px;
  borderTopLeftRadius: 0;
`;

const FormSection = styled(Box)`
  margin-bottom: ${theme => theme.spacing(3)};
`;

const ProfilePictureContainer = styled(Box)`
  display: 'flex';
  flexDirection: 'column';
  alignItems: 'center';
  marginBottom: ${theme => theme.spacing(3)};
`;

const LargeAvatar = styled(Avatar)`
  width: 120px;
  height: 120px;
  marginBottom: ${theme => theme.spacing(2)};
`;

/**
 * Main component for the user profile page
 */
const ProfilePage: React.FC = () => {
  // Get current user from auth context
  const { user } = useAuthContext();

  // Initialize state for active tab, loading states, and form data
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [profilePicture, setProfilePicture] = useState<string | null | undefined>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Set up form validation schema for profile form
  const validationSchema = {
    first_name: isRequired('First name is required'),
    last_name: isRequired('Last name is required'),
    phone_number: isPhone('Please enter a valid phone number'),
    email: isEmail('Please enter a valid email address'),
  };

  // Initialize form hook for profile form with user profile data
  const formProps = useForm({
    initialValues: {
      first_name: user?.profile?.first_name || '',
      last_name: user?.profile?.last_name || '',
      date_of_birth: user?.profile?.date_of_birth || null,
      phone_number: user?.profile?.phone_number || '',
      address_line1: user?.profile?.address_line1 || '',
      address_line2: user?.profile?.address_line2 || '',
      city: user?.profile?.city || '',
      state: user?.profile?.state || '',
      postal_code: user?.profile?.postal_code || '',
      country: user?.profile?.country || '',
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      setSubmitting(true);
      try {
        await userService.updateUserProfile(values);
        showNotification('Profile updated successfully', 'success');
      } catch (error: any) {
        showNotification(error.message || 'Failed to update profile', 'error');
      } finally {
        setSubmitting(false);
      }
    },
  });

  // Get showNotification function from useNotification hook
  const { showNotification } = useNotification();

  // Initialize state for profile picture upload
  const [profilePicture, setProfilePicture] = useState<string | null | undefined>(null);

  // Load user profile data when component mounts
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        setLoading(true);
        if (user?.profile_picture_url) {
          setProfilePicture(user.profile_picture_url);
        }
      } catch (error: any) {
        showNotification(error.message || 'Failed to load profile', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
  }, [user?.profile_picture_url, showNotification]);

  // Handle profile form submission
  const handleProfileSubmit = async () => {
    formProps.handleSubmit();
  };

  // Handle profile picture upload
  const handleProfilePictureUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const result = await userService.uploadUserProfilePicture(file);
      setProfilePicture(result.profile_picture_url);
      showNotification('Profile picture updated successfully', 'success');
    } catch (error: any) {
      showNotification(error.message || 'Failed to upload profile picture', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle profile picture deletion
  const handleProfilePictureDelete = async () => {
    setIsUploading(true);
    try {
      await userService.deleteUserProfilePicture();
      setProfilePicture(null);
      showNotification('Profile picture deleted successfully', 'success');
    } catch (error: any) {
      showNotification(error.message || 'Failed to delete profile picture', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Tabs configuration
  const tabs = [
    { label: 'Personal Information', content: <PersonalInformationForm formProps={formProps} isSubmitting={formProps.isSubmitting} onSubmit={handleProfileSubmit} /> },
    { label: 'Contact Details', content: <ContactDetailsForm formProps={formProps} isSubmitting={formProps.isSubmitting} onSubmit={handleProfileSubmit} /> },
    { label: 'Account Information', content: <AccountInformationSection user={user!} /> },
  ];

  return (
    <DashboardLayout title="Profile">
      <ProfileContainer>
        <Typography variant="h4" component="h1" gutterBottom>
          My Profile
        </Typography>
        <Divider />
        {loading ? (
          <LoadingSkeleton variant="rectangular" height={200} />
        ) : (
          <>
            <ProfilePictureSection
              profilePictureUrl={profilePicture}
              onUpload={handleProfilePictureUpload}
              onDelete={handleProfilePictureDelete}
              isUploading={isUploading}
            />
            <Tabs
              tabs={tabs}
              value={activeTab}
              onChange={(event, newValue) => setActiveTab(newValue)}
            />
          </>
        )}
      </ProfileContainer>
    </DashboardLayout>
  );
};

export default ProfilePage;
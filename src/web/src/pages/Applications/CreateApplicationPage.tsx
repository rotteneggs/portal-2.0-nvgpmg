# src/web/src/pages/Applications/CreateApplicationPage.tsx
```typescript
import React, { useState, useCallback } from 'react'; // react v18.2.0
import { useNavigate, useLocation } from 'react-router-dom'; // react-router-dom v6.8.1
import { Box, Typography, Paper, FormControl, InputLabel, Select, MenuItem, Button } from '@mui/material'; // @mui/material v5.11.10
import { styled } from '@mui/material/styles'; // @mui/material/styles v5.11.10
import DashboardLayout from '../../layouts/DashboardLayout';
import ApplicationForm from '../../components/Applications/ApplicationForm';
import { Breadcrumbs } from '../../components/Common';
import { ApplicationType, AcademicTerm } from '../../types/application';

// Styled components for layout and styling
const PageHeader = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  paddingBottom: theme.spacing(2),
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const FormContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
}));

const FormActions = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: theme.spacing(2),
  marginTop: theme.spacing(3),
}));

// Constants for academic year selection
const CURRENT_YEAR = new Date().getFullYear();
const ACADEMIC_YEARS = [
  { value: `${CURRENT_YEAR}-${CURRENT_YEAR + 1}`, label: `${CURRENT_YEAR}-${CURRENT_YEAR + 1}` },
  { value: `${CURRENT_YEAR + 1}-${CURRENT_YEAR + 2}`, label: `${CURRENT_YEAR + 1}-${CURRENT_YEAR + 2}` },
  { value: `${CURRENT_YEAR + 2}-${CURRENT_YEAR + 3}`, label: `${CURRENT_YEAR + 2}-${CURRENT_YEAR + 3}` }
];

/**
 * Page component for creating a new application
 */
const CreateApplicationPage: React.FC = () => {
  // Define state variables
  const [applicationType, setApplicationType] = useState<string>('');
  const [academicTerm, setAcademicTerm] = useState<string>('');
  const [academicYear, setAcademicYear] = useState<string>('');

  // Get navigate function from useNavigate hook for programmatic navigation
  const navigate = useNavigate();

  // Get location object from useLocation hook
  const location = useLocation();

  // Define breadcrumbs configuration for navigation
  const breadcrumbs = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Applications', path: '/applications' },
    { label: 'Create Application', path: location.pathname }
  ];

  // Define handleTypeChange function to update application type state
  const handleTypeChange = (event: React.ChangeEvent<{ value: any }>) => {
    setApplicationType(event.target.value as string);
  };

  // Define handleTermChange function to update academic term state
  const handleTermChange = (event: React.ChangeEvent<{ value: any }>) => {
    setAcademicTerm(event.target.value as string);
  };

  // Define handleYearChange function to update academic year state
  const handleYearChange = (event: React.ChangeEvent<{ value: any }>) => {
    setAcademicYear(event.target.value as string);
  };

  // Define handleContinue function to proceed to the application form
  const handleContinue = () => {
    // Navigate to the application form page with selected parameters
    navigate(`/applications/new?type=${applicationType}&term=${academicTerm}&year=${academicYear}`);
  };

  // Define handleCancel function to navigate back to applications list
  const handleCancel = () => {
    navigate('/applications');
  };

  // Define handleSubmitSuccess function to navigate to the application status page after successful submission
  const handleSubmitSuccess = useCallback((application: any) => {
    navigate(`/applications/${application.id}/status`);
  }, [navigate]);

  // Render DashboardLayout with appropriate title and breadcrumbs
  return (
    <DashboardLayout title="Create Application">
      <PageHeader>
        <Typography variant="h4">Create Application</Typography>
        <Breadcrumbs items={breadcrumbs} />
      </PageHeader>

      {/* If application type, term, and year are selected, render ApplicationForm component */}
      {applicationType && academicTerm && academicYear ? (
        <ApplicationForm
          applicationId={null}
          initialData={null}
          applicationType={applicationType}
          academicTerm={academicTerm}
          academicYear={academicYear}
          onSubmitSuccess={handleSubmitSuccess}
          onCancel={handleCancel}
        />
      ) : (
        // Otherwise, render the initial application setup form with type, term, and year selection
        <FormContainer>
          <Typography variant="h6" gutterBottom>
            Select Application Details
          </Typography>
          <FormControl fullWidth margin="normal" required>
            <InputLabel id="application-type-label">Application Type</InputLabel>
            <Select
              labelId="application-type-label"
              id="application-type"
              value={applicationType}
              onChange={handleTypeChange}
              onBlur={() => {}}
            >
              <MenuItem value={ApplicationType.UNDERGRADUATE}>Undergraduate</MenuItem>
              <MenuItem value={ApplicationType.GRADUATE}>Graduate</MenuItem>
              <MenuItem value={ApplicationType.TRANSFER}>Transfer</MenuItem>
              <MenuItem value={ApplicationType.INTERNATIONAL}>International</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal" required>
            <InputLabel id="academic-term-label">Academic Term</InputLabel>
            <Select
              labelId="academic-term-label"
              id="academic-term"
              value={academicTerm}
              onChange={handleTermChange}
              onBlur={() => {}}
            >
              <MenuItem value={AcademicTerm.FALL}>Fall</MenuItem>
              <MenuItem value={AcademicTerm.SPRING}>Spring</MenuItem>
              <MenuItem value={AcademicTerm.SUMMER}>Summer</MenuItem>
              <MenuItem value={AcademicTerm.WINTER}>Winter</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal" required>
            <InputLabel id="academic-year-label">Academic Year</InputLabel>
            <Select
              labelId="academic-year-label"
              id="academic-year"
              value={academicYear}
              onChange={handleYearChange}
              onBlur={() => {}}
            >
              {ACADEMIC_YEARS.map((year) => (
                <MenuItem key={year.value} value={year.value}>
                  {year.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormActions>
            <Button variant="contained" color="primary" onClick={handleContinue} disabled={!applicationType || !academicTerm || !academicYear}>
              Continue
            </Button>
            <Button variant="text" color="secondary" onClick={handleCancel}>
              Cancel
            </Button>
          </FormActions>
        </FormContainer>
      )}
    </DashboardLayout>
  );
};

export default CreateApplicationPage;
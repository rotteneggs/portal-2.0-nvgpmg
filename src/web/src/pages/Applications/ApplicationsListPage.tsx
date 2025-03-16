import React, { useMemo } from 'react'; // react v18.2.0
import { Box, Typography } from '@mui/material'; // @mui/material v5.11.10
import DashboardLayout from '../../layouts/DashboardLayout';
import ApplicationList from '../../components/Applications';
import { Breadcrumbs } from '../../components/Common';
import { styled } from '@mui/material/styles';

// Define styled components
const PageHeader = styled(Box)`
  margin-bottom: ${theme => theme.spacing(3)};
  padding-bottom: ${theme => theme.spacing(2)};
  border-bottom: 1px solid ${theme => theme.palette.divider};
`;

/**
 * Page component that displays a list of user applications
 */
const ApplicationsListPage: React.FC = () => {
  // Define breadcrumbs configuration
  const breadcrumbs = useMemo(() => [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Applications', path: '/applications' },
  ], []);

  return (
    <DashboardLayout title="Applications" showBreadcrumbs>
      <PageHeader>
        <Typography variant="h4" component="h1">
          Applications
        </Typography>
        <Typography variant="body1">
          Manage your applications and track their progress.
        </Typography>
      </PageHeader>
      <ApplicationList />
    </DashboardLayout>
  );
};

export default ApplicationsListPage;
import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { 
  Box, 
  Typography, 
  Divider, 
  Accordion, 
  AccordionSummary, 
  AccordionDetails 
} from '@mui/material';
import { 
  ExpandMore, 
  Person, 
  ContactMail, 
  School, 
  Assignment, 
  Description, 
  People 
} from '@mui/icons-material';

import Card from '../Common/Card';
import StatusBadge from '../Common/StatusBadge';
import LoadingSkeleton from '../Common/LoadingSkeleton';
import { Application, ApplicationData } from '../../types/application';
import { formatDate } from '../../utils/dateUtils';
import useFetch from '../../hooks/useFetch';
import { getApplication } from '../../api/applications';

// Props interface for the ApplicationReview component
interface ApplicationReviewProps {
  applicationId: number;
  applicationData: ApplicationData | null;
  isReadOnly?: boolean;
}

// Interface for formatted section data
interface SectionData {
  title: string;
  icon: React.ReactNode;
  data: Array<{label: string, value: string}> | Array<any>;
}

// Mapping of section titles to their corresponding icons
const SECTION_ICONS = {
  'Personal Information': <Person />,
  'Contact Details': <ContactMail />,
  'Academic History': <School />,
  'Test Scores': <Assignment />,
  'Personal Statement': <Description />,
  'Recommendations': <People />
};

// Styled components for visual presentation
const ReviewContainer = styled(Box)`
  width: 100%;
  padding: ${props => props.theme.spacing(2)};
`;

const SectionContainer = styled(Box)`
  margin-bottom: ${props => props.theme.spacing(3)};
`;

const SectionHeader = styled(Box)`
  display: flex;
  align-items: center;
`;

const SectionIcon = styled(Box)`
  color: ${props => props.theme.palette.primary.main};
  margin-right: ${props => props.theme.spacing(1.5)};
`;

const SectionTitle = styled(Typography)`
  font-weight: 500;
`;

const FieldRow = styled(Box)`
  display: flex;
  margin-bottom: ${props => props.theme.spacing(1)};
`;

const FieldLabel = styled(Typography)`
  font-weight: 500;
  width: 200px;
  flex-shrink: 0;
`;

const FieldValue = styled(Typography)`
  flex-grow: 1;
`;

const InstitutionHeader = styled(Typography)`
  font-weight: 500;
  margin-bottom: ${props => props.theme.spacing(1)};
`;

const TestHeader = styled(Typography)`
  font-weight: 500;
  margin-bottom: ${props => props.theme.spacing(0.5)};
`;

const RecommenderHeader = styled(Typography)`
  font-weight: 500;
  margin-bottom: ${props => props.theme.spacing(1)};
`;

/**
 * Formats personal information data for display in the review section
 */
const formatPersonalInformation = (data: ApplicationData) => {
  const { personal_information } = data;
  return [
    { label: 'First Name', value: personal_information.first_name },
    { label: 'Middle Name', value: personal_information.middle_name || 'N/A' },
    { label: 'Last Name', value: personal_information.last_name },
    { label: 'Date of Birth', value: formatDate(personal_information.date_of_birth, 'MM/dd/yyyy') },
    { label: 'Gender', value: personal_information.gender },
    { label: 'Citizenship', value: personal_information.citizenship },
    { label: 'SSN', value: personal_information.ssn ? '***-**-' + personal_information.ssn.slice(-4) : 'Not provided' }
  ];
};

/**
 * Formats contact details data for display in the review section
 */
const formatContactDetails = (data: ApplicationData) => {
  const { contact_details } = data;
  return [
    { label: 'Email', value: contact_details.email },
    { label: 'Phone Number', value: contact_details.phone_number },
    { label: 'Address', value: `${contact_details.address_line1}${contact_details.address_line2 ? ', ' + contact_details.address_line2 : ''}` },
    { label: 'City', value: contact_details.city },
    { label: 'State/Province', value: contact_details.state },
    { label: 'Postal Code', value: contact_details.postal_code },
    { label: 'Country', value: contact_details.country }
  ];
};

/**
 * Formats academic history data for display in the review section
 */
const formatAcademicHistory = (data: ApplicationData) => {
  return data.academic_history.institutions.map(institution => ({
    institution: institution.name,
    details: [
      { label: 'Location', value: `${institution.city}, ${institution.state}, ${institution.country}` },
      { label: 'Dates Attended', value: `${formatDate(institution.start_date, 'MM/dd/yyyy')} - ${formatDate(institution.end_date, 'MM/dd/yyyy')}` },
      { label: 'Degree', value: institution.degree || 'N/A' },
      { label: 'Major', value: institution.major || 'N/A' },
      { label: 'GPA', value: institution.gpa ? institution.gpa.toFixed(2) : 'N/A' }
    ]
  }));
};

/**
 * Formats test scores data for display in the review section
 */
const formatTestScores = (data: ApplicationData) => {
  const { test_scores } = data;
  
  if (!test_scores.has_taken_tests || test_scores.scores.length === 0) {
    return [];
  }
  
  return test_scores.scores.map(score => ({
    test: score.test_type,
    date: formatDate(score.test_date, 'MM/dd/yyyy'),
    scores: Object.entries(score.scores).map(([key, value]) => ({
      label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
      value: value.toString()
    }))
  }));
};

/**
 * Formats recommendations data for display in the review section
 */
const formatRecommendations = (data: ApplicationData) => {
  return data.recommendations.recommendations.map(rec => ({
    recommender: rec.recommender_name,
    details: [
      { label: 'Title', value: rec.recommender_title },
      { label: 'Institution', value: rec.recommender_institution },
      { label: 'Relationship', value: rec.relationship },
      { label: 'Status', value: rec.status },
      { label: 'Requested', value: rec.requested_at ? formatDate(rec.requested_at, 'MM/dd/yyyy') : 'N/A' },
      { label: 'Received', value: rec.received_at ? formatDate(rec.received_at, 'MM/dd/yyyy') : 'N/A' }
    ]
  }));
};

/**
 * Component for displaying a comprehensive review of an application's details
 */
const ApplicationReview: React.FC<ApplicationReviewProps> = ({
  applicationId,
  applicationData = null,
  isReadOnly = true
}) => {
  const [application, setApplication] = useState<Application | null>(null);
  const [sections, setSections] = useState<SectionData[]>([]);
  
  // Fetch application data if not provided as props
  const { data, loading, error } = useFetch(
    () => getApplication(applicationId), 
    [applicationId], 
    !!applicationData
  );
  
  // Set application data from props or API response and format sections
  useEffect(() => {
    if (applicationData) {
      formatSections(applicationData);
    } else if (data) {
      setApplication(data);
      formatSections(data.application_data);
    }
  }, [applicationData, data]);
  
  // Formats application data into sections for display
  const formatSections = (data: ApplicationData) => {
    const formattedSections: SectionData[] = [
      {
        title: 'Personal Information',
        icon: SECTION_ICONS['Personal Information'],
        data: formatPersonalInformation(data)
      },
      {
        title: 'Contact Details',
        icon: SECTION_ICONS['Contact Details'],
        data: formatContactDetails(data)
      },
      {
        title: 'Academic History',
        icon: SECTION_ICONS['Academic History'],
        data: formatAcademicHistory(data)
      },
      {
        title: 'Test Scores',
        icon: SECTION_ICONS['Test Scores'],
        data: formatTestScores(data)
      },
      {
        title: 'Personal Statement',
        icon: SECTION_ICONS['Personal Statement'],
        data: data.personal_statement.statement
      },
      {
        title: 'Recommendations',
        icon: SECTION_ICONS['Recommendations'],
        data: formatRecommendations(data)
      }
    ];
    
    setSections(formattedSections);
  };
  
  // Renders the personal information section
  const renderPersonalInformation = (data: Array<{label: string, value: string}>) => (
    <Box>
      {data.map((field, index) => (
        <FieldRow key={index}>
          <FieldLabel variant="body2">{field.label}:</FieldLabel>
          <FieldValue variant="body2">{field.value}</FieldValue>
        </FieldRow>
      ))}
    </Box>
  );
  
  // Renders the contact details section
  const renderContactDetails = (data: Array<{label: string, value: string}>) => (
    <Box>
      {data.map((field, index) => (
        <FieldRow key={index}>
          <FieldLabel variant="body2">{field.label}:</FieldLabel>
          <FieldValue variant="body2">{field.value}</FieldValue>
        </FieldRow>
      ))}
    </Box>
  );
  
  // Renders the academic history section
  const renderAcademicHistory = (data: Array<{institution: string, details: Array<{label: string, value: string}>}>) => (
    <Box>
      {data.map((institution, index) => (
        <Box key={index} mb={index < data.length - 1 ? 3 : 0}>
          <InstitutionHeader variant="subtitle1">
            {institution.institution}
          </InstitutionHeader>
          {institution.details.map((field, fieldIndex) => (
            <FieldRow key={fieldIndex}>
              <FieldLabel variant="body2">{field.label}:</FieldLabel>
              <FieldValue variant="body2">{field.value}</FieldValue>
            </FieldRow>
          ))}
          {index < data.length - 1 && <Divider sx={{ my: 2 }} />}
        </Box>
      ))}
    </Box>
  );
  
  // Renders the test scores section
  const renderTestScores = (data: Array<{test: string, date: string, scores: Array<{label: string, value: string}>}>) => (
    <Box>
      {data.length === 0 ? (
        <Typography variant="body2">No test scores provided</Typography>
      ) : (
        data.map((test, index) => (
          <Box key={index} mb={index < data.length - 1 ? 3 : 0}>
            <TestHeader variant="subtitle1">
              {test.test} ({test.date})
            </TestHeader>
            {test.scores.map((score, scoreIndex) => (
              <FieldRow key={scoreIndex}>
                <FieldLabel variant="body2">{score.label}:</FieldLabel>
                <FieldValue variant="body2">{score.value}</FieldValue>
              </FieldRow>
            ))}
            {index < data.length - 1 && <Divider sx={{ my: 2 }} />}
          </Box>
        ))
      )}
    </Box>
  );
  
  // Renders the personal statement section
  const renderPersonalStatement = (statement: string) => (
    <Box>
      <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
        {statement}
      </Typography>
    </Box>
  );
  
  // Renders the recommendations section
  const renderRecommendations = (data: Array<{recommender: string, details: Array<{label: string, value: string}>}>) => (
    <Box>
      {data.length === 0 ? (
        <Typography variant="body2">No recommendations provided</Typography>
      ) : (
        data.map((rec, index) => (
          <Box key={index} mb={index < data.length - 1 ? 3 : 0}>
            <RecommenderHeader variant="subtitle1">
              {rec.recommender}
            </RecommenderHeader>
            {rec.details.map((field, fieldIndex) => (
              <FieldRow key={fieldIndex}>
                <FieldLabel variant="body2">{field.label}:</FieldLabel>
                <FieldValue variant="body2">{field.value}</FieldValue>
              </FieldRow>
            ))}
            {index < data.length - 1 && <Divider sx={{ my: 2 }} />}
          </Box>
        ))
      )}
    </Box>
  );
  
  // Renders a section of the application review
  const renderSection = (section: SectionData, index: number) => (
    <Accordion key={index} defaultExpanded={index === 0}>
      <AccordionSummary expandIcon={<ExpandMore />}>
        <SectionHeader>
          <SectionIcon>{section.icon}</SectionIcon>
          <SectionTitle variant="h6">{section.title}</SectionTitle>
        </SectionHeader>
      </AccordionSummary>
      <AccordionDetails>
        {section.title === 'Personal Information' && renderPersonalInformation(section.data as Array<{label: string, value: string}>)}
        {section.title === 'Contact Details' && renderContactDetails(section.data as Array<{label: string, value: string}>)}
        {section.title === 'Academic History' && renderAcademicHistory(section.data as Array<{institution: string, details: Array<{label: string, value: string}>}>)}
        {section.title === 'Test Scores' && renderTestScores(section.data as Array<{test: string, date: string, scores: Array<{label: string, value: string}>}>)}
        {section.title === 'Personal Statement' && renderPersonalStatement(section.data as string)}
        {section.title === 'Recommendations' && renderRecommendations(section.data as Array<{recommender: string, details: Array<{label: string, value: string}>}>)}
      </AccordionDetails>
    </Accordion>
  );
  
  // Show loading state while fetching data
  if (loading && !applicationData) {
    return (
      <Box p={2}>
        <LoadingSkeleton variant="rectangular" height={60} />
        <Box mt={2}>
          <LoadingSkeleton variant="rectangular" height={400} />
        </Box>
      </Box>
    );
  }
  
  // Show error state if data fetch fails
  if (error && !applicationData) {
    return (
      <Card>
        <Typography color="error">
          Error loading application data. Please try again later.
        </Typography>
      </Card>
    );
  }
  
  // Render the application review
  return (
    <ReviewContainer>
      {application && application.current_status && (
        <Box mb={3} display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h5">Application Review</Typography>
          <StatusBadge 
            status={application.current_status.status} 
            type="APPLICATION" 
          />
        </Box>
      )}
      
      {sections.map((section, index) => renderSection(section, index))}
    </ReviewContainer>
  );
};

export default ApplicationReview;
import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { Box, Typography, Alert, Divider } from '@mui/material';
import { CheckCircleOutline, ErrorOutline } from '@mui/icons-material';

import Button from '../../Common/Button';
import Card from '../../Common/Card';
import { 
  checkApplicationComplete, 
  getMissingDocuments 
} from '../../../api/applications';
import { ApplicationData, ApplicationCompletionStatus } from '../../../types/application';

interface ReviewSubmitProps {
  applicationId: number;
  formData: ApplicationData;
  onSubmit: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}

interface SectionStatus {
  name: string;
  title: string;
  isComplete: boolean;
  missingItems: string[];
}

// Helper function to format personal information for display
const formatPersonalInformation = (data: ApplicationData) => {
  const { personal_information } = data;
  return [
    { label: 'First Name', value: personal_information.first_name },
    { label: 'Middle Name', value: personal_information.middle_name || '-' },
    { label: 'Last Name', value: personal_information.last_name },
    { 
      label: 'Date of Birth', 
      value: new Date(personal_information.date_of_birth).toLocaleDateString() 
    },
    { label: 'Gender', value: personal_information.gender },
    { label: 'Citizenship', value: personal_information.citizenship },
    { label: 'SSN', value: personal_information.ssn ? '********' : 'Not provided' },
  ];
};

// Helper function to format contact details for display
const formatContactDetails = (data: ApplicationData) => {
  const { contact_details } = data;
  return [
    { label: 'Email', value: contact_details.email },
    { label: 'Phone Number', value: contact_details.phone_number },
    { 
      label: 'Address', 
      value: `${contact_details.address_line1}${contact_details.address_line2 ? ', ' + contact_details.address_line2 : ''}, ${contact_details.city}, ${contact_details.state} ${contact_details.postal_code}, ${contact_details.country}` 
    },
  ];
};

// Helper function to format academic history for display
const formatAcademicHistory = (data: ApplicationData) => {
  return data.academic_history.institutions.map(institution => ({
    institution: institution.name,
    details: [
      { label: 'Location', value: `${institution.city}, ${institution.state}, ${institution.country}` },
      { 
        label: 'Dates Attended', 
        value: `${new Date(institution.start_date).toLocaleDateString()} - ${new Date(institution.end_date).toLocaleDateString()}` 
      },
      { label: 'Degree', value: institution.degree || 'N/A' },
      { label: 'Major', value: institution.major || 'N/A' },
      { label: 'GPA', value: institution.gpa ? institution.gpa.toString() : 'N/A' },
    ]
  }));
};

// Helper function to format test scores for display
const formatTestScores = (data: ApplicationData) => {
  if (!data.test_scores.has_taken_tests) {
    return [];
  }
  
  return data.test_scores.scores.map(test => ({
    test: test.test_type,
    date: new Date(test.test_date).toLocaleDateString(),
    scores: Object.entries(test.scores).map(([key, value]) => ({
      label: key,
      value: value.toString()
    }))
  }));
};

// Helper function to format recommendations for display
const formatRecommendations = (data: ApplicationData) => {
  return data.recommendations.recommendations.map(rec => ({
    recommender: rec.recommender_name,
    details: [
      { label: 'Title', value: rec.recommender_title },
      { label: 'Institution', value: rec.recommender_institution },
      { label: 'Relationship', value: rec.relationship },
      { label: 'Email', value: rec.recommender_email },
      { 
        label: 'Status', 
        value: rec.status.charAt(0).toUpperCase() + rec.status.slice(1) 
      },
      { 
        label: 'Requested Date', 
        value: rec.requested_at ? new Date(rec.requested_at).toLocaleDateString() : 'Not yet requested' 
      },
      { 
        label: 'Received Date', 
        value: rec.received_at ? new Date(rec.received_at).toLocaleDateString() : 'Not yet received' 
      },
    ]
  }));
};

// Helper function to check if a section is complete based on missing items
const checkSectionCompleteness = (sectionName: string, missingItems: string[]): boolean => {
  const sectionMissingItems = missingItems.filter(item => item.startsWith(`${sectionName}:`));
  return sectionMissingItems.length === 0;
};

const ReviewContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  padding: 24px;
`;

const SectionContainer = styled(Box)`
  margin-bottom: 32px;
`;

const SectionHeader = styled(Box)`
  display: flex;
  align-items: center;
  margin-bottom: 16px;
`;

const SectionContent = styled(Box)`
  padding: 0 16px;
`;

const FieldRow = styled(Box)`
  display: flex;
  margin-bottom: 12px;
  padding: 4px 0;
`;

const FieldLabel = styled(Typography)`
  width: 180px;
  min-width: 180px;
  font-weight: 500;
  color: ${props => props.theme.palette.text.secondary};
`;

const FieldValue = styled(Typography)`
  flex: 1;
`;

const ButtonContainer = styled(Box)`
  display: flex;
  justify-content: space-between;
  margin-top: 32px;
`;

const StatusIcon = styled(Box)`
  display: flex;
  align-items: center;
  margin-right: 8px;
`;

const ReviewSubmit: React.FC<ReviewSubmitProps> = ({
  applicationId,
  formData,
  onSubmit,
  onBack,
  isSubmitting
}) => {
  const [completionStatus, setCompletionStatus] = useState<ApplicationCompletionStatus | null>(null);
  const [missingDocuments, setMissingDocuments] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sectionStatuses, setSectionStatuses] = useState<SectionStatus[]>([]);

  // Fetch application completion status and missing documents when component mounts
  useEffect(() => {
    const fetchCompletionStatus = async () => {
      try {
        setLoading(true);
        const status = await checkApplicationComplete(applicationId);
        const documents = await getMissingDocuments(applicationId);
        
        setCompletionStatus(status);
        setMissingDocuments(documents);
        setLoading(false);
      } catch (err) {
        setError('Failed to check application completeness. Please try again.');
        setLoading(false);
      }
    };

    fetchCompletionStatus();
  }, [applicationId]);

  // Update section statuses when completion status or missing documents change
  useEffect(() => {
    if (completionStatus && missingDocuments) {
      updateSectionStatuses();
    }
  }, [completionStatus, missingDocuments]);

  // Updates the status of each application section based on completion and missing items
  const updateSectionStatuses = () => {
    const sections: SectionStatus[] = [
      {
        name: 'personal_information',
        title: 'Personal Information',
        isComplete: checkSectionCompleteness('personal_information', missingDocuments),
        missingItems: missingDocuments.filter(item => item.startsWith('personal_information:'))
      },
      {
        name: 'contact_details',
        title: 'Contact Details',
        isComplete: checkSectionCompleteness('contact_details', missingDocuments),
        missingItems: missingDocuments.filter(item => item.startsWith('contact_details:'))
      },
      {
        name: 'academic_history',
        title: 'Academic History',
        isComplete: checkSectionCompleteness('academic_history', missingDocuments),
        missingItems: missingDocuments.filter(item => item.startsWith('academic_history:'))
      },
      {
        name: 'test_scores',
        title: 'Test Scores',
        isComplete: checkSectionCompleteness('test_scores', missingDocuments),
        missingItems: missingDocuments.filter(item => item.startsWith('test_scores:'))
      },
      {
        name: 'personal_statement',
        title: 'Personal Statement',
        isComplete: checkSectionCompleteness('personal_statement', missingDocuments),
        missingItems: missingDocuments.filter(item => item.startsWith('personal_statement:'))
      },
      {
        name: 'recommendations',
        title: 'Recommendations',
        isComplete: checkSectionCompleteness('recommendations', missingDocuments),
        missingItems: missingDocuments.filter(item => item.startsWith('recommendations:'))
      }
    ];

    setSectionStatuses(sections);
  };

  // Handles application submission after final review
  const handleSubmit = () => {
    onSubmit();
  };

  // Handles navigation back to previous step
  const handleBack = () => {
    onBack();
  };

  if (loading) {
    return (
      <ReviewContainer>
        <Typography variant="h5" align="center">
          Preparing your application for review...
        </Typography>
      </ReviewContainer>
    );
  }

  if (error) {
    return (
      <ReviewContainer>
        <Alert severity="error">{error}</Alert>
        <ButtonContainer>
          <Button onClick={handleBack} variant="outlined">
            Back
          </Button>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </ButtonContainer>
      </ReviewContainer>
    );
  }

  const personalInfo = formatPersonalInformation(formData);
  const contactDetails = formatContactDetails(formData);
  const academicHistory = formatAcademicHistory(formData);
  const testScores = formatTestScores(formData);
  const recommendations = formatRecommendations(formData);

  return (
    <ReviewContainer>
      <Typography variant="h4" gutterBottom>
        Review Your Application
      </Typography>

      {completionStatus && !completionStatus.isComplete && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Your application is incomplete. Please review the sections below and provide any missing information before submitting.
        </Alert>
      )}

      {completionStatus && completionStatus.isComplete && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Your application is complete and ready for submission. Please review the information below before submitting.
        </Alert>
      )}

      {/* Personal Information Section */}
      <Card
        title={sectionStatuses.find(s => s.name === 'personal_information')?.title}
        headerAction={
          <StatusIcon>
            {sectionStatuses.find(s => s.name === 'personal_information')?.isComplete ? (
              <CheckCircleOutline color="success" />
            ) : (
              <ErrorOutline color="error" />
            )}
          </StatusIcon>
        }
      >
        <SectionContent>
          {personalInfo.map((field, index) => (
            <FieldRow key={`personal-${index}`}>
              <FieldLabel variant="body2">{field.label}:</FieldLabel>
              <FieldValue variant="body2">{field.value}</FieldValue>
            </FieldRow>
          ))}

          {!sectionStatuses.find(s => s.name === 'personal_information')?.isComplete && (
            <Alert severity="error" sx={{ mt: 2 }}>
              <Typography variant="body2" fontWeight="bold">Missing Information:</Typography>
              <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                {sectionStatuses.find(s => s.name === 'personal_information')?.missingItems.map((item, idx) => (
                  <li key={idx}>{item.split(':')[1]}</li>
                ))}
              </ul>
            </Alert>
          )}
        </SectionContent>
      </Card>

      {/* Contact Details Section */}
      <Card
        title={sectionStatuses.find(s => s.name === 'contact_details')?.title}
        headerAction={
          <StatusIcon>
            {sectionStatuses.find(s => s.name === 'contact_details')?.isComplete ? (
              <CheckCircleOutline color="success" />
            ) : (
              <ErrorOutline color="error" />
            )}
          </StatusIcon>
        }
      >
        <SectionContent>
          {contactDetails.map((field, index) => (
            <FieldRow key={`contact-${index}`}>
              <FieldLabel variant="body2">{field.label}:</FieldLabel>
              <FieldValue variant="body2">{field.value}</FieldValue>
            </FieldRow>
          ))}

          {!sectionStatuses.find(s => s.name === 'contact_details')?.isComplete && (
            <Alert severity="error" sx={{ mt: 2 }}>
              <Typography variant="body2" fontWeight="bold">Missing Information:</Typography>
              <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                {sectionStatuses.find(s => s.name === 'contact_details')?.missingItems.map((item, idx) => (
                  <li key={idx}>{item.split(':')[1]}</li>
                ))}
              </ul>
            </Alert>
          )}
        </SectionContent>
      </Card>

      {/* Academic History Section */}
      <Card
        title={sectionStatuses.find(s => s.name === 'academic_history')?.title}
        headerAction={
          <StatusIcon>
            {sectionStatuses.find(s => s.name === 'academic_history')?.isComplete ? (
              <CheckCircleOutline color="success" />
            ) : (
              <ErrorOutline color="error" />
            )}
          </StatusIcon>
        }
      >
        <SectionContent>
          {academicHistory.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              No academic history provided.
            </Typography>
          )}

          {academicHistory.map((school, schoolIndex) => (
            <Box key={`school-${schoolIndex}`} sx={{ mb: 3 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                {school.institution}
              </Typography>

              {school.details.map((field, fieldIndex) => (
                <FieldRow key={`school-${schoolIndex}-field-${fieldIndex}`}>
                  <FieldLabel variant="body2">{field.label}:</FieldLabel>
                  <FieldValue variant="body2">{field.value}</FieldValue>
                </FieldRow>
              ))}

              {schoolIndex < academicHistory.length - 1 && (
                <Divider sx={{ my: 2 }} />
              )}
            </Box>
          ))}

          {!sectionStatuses.find(s => s.name === 'academic_history')?.isComplete && (
            <Alert severity="error" sx={{ mt: 2 }}>
              <Typography variant="body2" fontWeight="bold">Missing Information:</Typography>
              <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                {sectionStatuses.find(s => s.name === 'academic_history')?.missingItems.map((item, idx) => (
                  <li key={idx}>{item.split(':')[1]}</li>
                ))}
              </ul>
            </Alert>
          )}
        </SectionContent>
      </Card>

      {/* Test Scores Section */}
      <Card
        title={sectionStatuses.find(s => s.name === 'test_scores')?.title}
        headerAction={
          <StatusIcon>
            {sectionStatuses.find(s => s.name === 'test_scores')?.isComplete ? (
              <CheckCircleOutline color="success" />
            ) : (
              <ErrorOutline color="error" />
            )}
          </StatusIcon>
        }
      >
        <SectionContent>
          {!formData.test_scores.has_taken_tests && (
            <Typography variant="body2" color="text.secondary">
              Applicant has not taken standardized tests.
            </Typography>
          )}

          {testScores.map((test, testIndex) => (
            <Box key={`test-${testIndex}`} sx={{ mb: 3 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                {test.test} - {test.date}
              </Typography>

              {test.scores.map((score, scoreIndex) => (
                <FieldRow key={`test-${testIndex}-score-${scoreIndex}`}>
                  <FieldLabel variant="body2">{score.label}:</FieldLabel>
                  <FieldValue variant="body2">{score.value}</FieldValue>
                </FieldRow>
              ))}

              {testIndex < testScores.length - 1 && (
                <Divider sx={{ my: 2 }} />
              )}
            </Box>
          ))}

          {!sectionStatuses.find(s => s.name === 'test_scores')?.isComplete && (
            <Alert severity="error" sx={{ mt: 2 }}>
              <Typography variant="body2" fontWeight="bold">Missing Information:</Typography>
              <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                {sectionStatuses.find(s => s.name === 'test_scores')?.missingItems.map((item, idx) => (
                  <li key={idx}>{item.split(':')[1]}</li>
                ))}
              </ul>
            </Alert>
          )}
        </SectionContent>
      </Card>

      {/* Personal Statement Section */}
      <Card
        title={sectionStatuses.find(s => s.name === 'personal_statement')?.title}
        headerAction={
          <StatusIcon>
            {sectionStatuses.find(s => s.name === 'personal_statement')?.isComplete ? (
              <CheckCircleOutline color="success" />
            ) : (
              <ErrorOutline color="error" />
            )}
          </StatusIcon>
        }
      >
        <SectionContent>
          {formData.personal_statement.statement ? (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {formData.personal_statement.statement}
              </Typography>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              No personal statement provided.
            </Typography>
          )}

          {!sectionStatuses.find(s => s.name === 'personal_statement')?.isComplete && (
            <Alert severity="error" sx={{ mt: 2 }}>
              <Typography variant="body2" fontWeight="bold">Missing Information:</Typography>
              <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                {sectionStatuses.find(s => s.name === 'personal_statement')?.missingItems.map((item, idx) => (
                  <li key={idx}>{item.split(':')[1]}</li>
                ))}
              </ul>
            </Alert>
          )}
        </SectionContent>
      </Card>

      {/* Recommendations Section */}
      <Card
        title={sectionStatuses.find(s => s.name === 'recommendations')?.title}
        headerAction={
          <StatusIcon>
            {sectionStatuses.find(s => s.name === 'recommendations')?.isComplete ? (
              <CheckCircleOutline color="success" />
            ) : (
              <ErrorOutline color="error" />
            )}
          </StatusIcon>
        }
      >
        <SectionContent>
          {recommendations.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              No recommendations provided.
            </Typography>
          )}

          {recommendations.map((rec, recIndex) => (
            <Box key={`rec-${recIndex}`} sx={{ mb: 3 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                {rec.recommender}
              </Typography>

              {rec.details.map((field, fieldIndex) => (
                <FieldRow key={`rec-${recIndex}-field-${fieldIndex}`}>
                  <FieldLabel variant="body2">{field.label}:</FieldLabel>
                  <FieldValue variant="body2">{field.value}</FieldValue>
                </FieldRow>
              ))}

              {recIndex < recommendations.length - 1 && (
                <Divider sx={{ my: 2 }} />
              )}
            </Box>
          ))}

          {!sectionStatuses.find(s => s.name === 'recommendations')?.isComplete && (
            <Alert severity="error" sx={{ mt: 2 }}>
              <Typography variant="body2" fontWeight="bold">Missing Information:</Typography>
              <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                {sectionStatuses.find(s => s.name === 'recommendations')?.missingItems.map((item, idx) => (
                  <li key={idx}>{item.split(':')[1]}</li>
                ))}
              </ul>
            </Alert>
          )}
        </SectionContent>
      </Card>

      <ButtonContainer>
        <Button onClick={handleBack} variant="outlined" color="secondary">
          Back
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary"
          disabled={!completionStatus?.isComplete || isSubmitting}
          loading={isSubmitting}
        >
          Submit Application
        </Button>
      </ButtonContainer>
    </ReviewContainer>
  );
};

export default ReviewSubmit;
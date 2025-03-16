import React from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { 
  Typography, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText 
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { 
  CheckCircle, 
  RadioButtonUnchecked, 
  Assignment, 
  Payment 
} from '@mui/icons-material';

import Card from '../Common/Card';
import Button from '../Common/Button';
import { ApplicationStatus } from '../../types/application';
import { 
  selectCurrentApplication, 
  selectMissingDocuments, 
  selectCompletionStatus 
} from '../../redux/slices/applicationsSlice';

// Interface for the component props
interface NextStepsProps {
  className?: string;
  onCompleteProfile?: () => void;
  onUploadDocuments?: () => void;
  onPayFee?: () => void;
  onProvideInfo?: () => void;
}

// Interface for a next step item
interface NextStepItem {
  id: string;
  text: string;
  completed: boolean;
  actionType: string;
  icon: string;
}

// Styled components for the UI
const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%'
}));

const StyledList = styled(List)(({ theme }) => ({
  padding: 0
}));

const ActionButton = styled(Button)(({ theme }) => ({
  marginLeft: theme.spacing ? theme.spacing(2) : '16px'
}));

const CompletedIcon = styled(CheckCircle)(({ theme }) => ({
  color: theme.palette.success.main
}));

const PendingIcon = styled(RadioButtonUnchecked)(({ theme }) => ({
  color: theme.palette.text.secondary
}));

/**
 * Determines the next steps based on application status and missing requirements
 * 
 * @param application - The current application
 * @param missingDocuments - Array of missing document types
 * @param completionStatus - Application completion status
 * @returns Array of next step items with text, completed status, and action type
 */
const getNextSteps = (
  application: any,
  missingDocuments: string[],
  completionStatus: any
): NextStepItem[] => {
  const nextSteps: NextStepItem[] = [];

  // If no application exists, return empty array
  if (!application) {
    return nextSteps;
  }

  // Get current application status
  const status = application.current_status?.status || application.status || ApplicationStatus.DRAFT;

  // If status is DRAFT, add 'Complete Profile' step
  if (status === ApplicationStatus.DRAFT) {
    nextSteps.push({
      id: 'complete-profile',
      text: 'Complete Profile',
      completed: completionStatus?.isComplete || false,
      actionType: 'profile',
      icon: 'profile'
    });
  }

  // If application is not complete, add steps for incomplete sections
  if (completionStatus && !completionStatus.isComplete) {
    completionStatus.missingItems?.forEach((item: string, index: number) => {
      // Skip if we already added complete profile step
      if (item.toLowerCase().includes('profile') && 
          nextSteps.some(step => step.id === 'complete-profile')) {
        return;
      }
    });
  }

  // If missing documents exist, add 'Upload Required Documents' step
  if (missingDocuments && missingDocuments.length > 0) {
    nextSteps.push({
      id: 'upload-documents',
      text: 'Upload Required Documents',
      completed: false,
      actionType: 'documents',
      icon: 'documents'
    });
  }

  // Add status-specific steps
  if (status === ApplicationStatus.SUBMITTED) {
    nextSteps.push({
      id: 'wait-verification',
      text: 'Wait for Document Verification',
      completed: false,
      actionType: 'none',
      icon: 'waiting'
    });
  } else if (status === ApplicationStatus.ADDITIONAL_INFO_REQUESTED) {
    nextSteps.push({
      id: 'provide-info',
      text: 'Provide Additional Information',
      completed: false,
      actionType: 'info',
      icon: 'info'
    });
  }

  // Add 'Pay Application Fee' step if not already paid
  nextSteps.push({
    id: 'pay-fee',
    text: 'Pay Application Fee',
    completed: false,
    actionType: 'payment',
    icon: 'payment'
  });

  return nextSteps;
};

/**
 * A dashboard component that displays a list of action items and next steps for the student
 * to complete their application process. It shows tasks based on the current application status
 * and missing requirements.
 */
const NextSteps: React.FC<NextStepsProps> = ({
  className,
  onCompleteProfile,
  onUploadDocuments,
  onPayFee,
  onProvideInfo
}) => {
  const application = useSelector(selectCurrentApplication);
  const missingDocuments = useSelector(selectMissingDocuments);
  const completionStatus = useSelector(selectCompletionStatus);
  
  // Generate next steps based on application state
  const nextSteps = React.useMemo(() => 
    getNextSteps(application, missingDocuments || [], completionStatus),
    [application, missingDocuments, completionStatus]
  );

  // Handle action button clicks
  const handleAction = (actionType: string) => {
    switch (actionType) {
      case 'profile':
        if (onCompleteProfile) onCompleteProfile();
        break;
      case 'documents':
        if (onUploadDocuments) onUploadDocuments();
        break;
      case 'payment':
        if (onPayFee) onPayFee();
        break;
      case 'info':
        if (onProvideInfo) onProvideInfo();
        break;
    }
  };

  // Render appropriate icon based on step type and completion status
  const renderIcon = (item: NextStepItem) => {
    if (item.completed) {
      return <CompletedIcon />;
    }
    
    switch (item.icon) {
      case 'profile':
      case 'waiting':
      case 'info':
        return <PendingIcon />;
      case 'documents':
        return <Assignment color="action" />;
      case 'payment':
        return <Payment color="action" />;
      default:
        return <PendingIcon />;
    }
  };

  return (
    <StyledCard title="Next Steps" className={className}>
      <StyledList>
        {nextSteps.length > 0 ? (
          nextSteps.map((step) => (
            <ListItem key={step.id} divider>
              <ListItemIcon>
                {renderIcon(step)}
              </ListItemIcon>
              <ListItemText primary={step.text} />
              {step.actionType !== 'none' && (
                <ActionButton 
                  size="small" 
                  variant="outlined" 
                  color="primary"
                  onClick={() => handleAction(step.actionType)}
                >
                  {step.actionType === 'profile' && 'Complete'}
                  {step.actionType === 'documents' && 'Upload'}
                  {step.actionType === 'payment' && 'Pay Now'}
                  {step.actionType === 'info' && 'Provide'}
                </ActionButton>
              )}
            </ListItem>
          ))
        ) : (
          <ListItem>
            <ListItemText primary="No actions required at this time." />
          </ListItem>
        )}
      </StyledList>
    </StyledCard>
  );
};

export default NextSteps;
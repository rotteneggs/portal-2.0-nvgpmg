import React from 'react';
import styled from '@emotion/styled';
import { Breadcrumbs as MuiBreadcrumbs, Typography, Link } from '@mui/material';
import { NavigateNext, Home } from '@mui/icons-material';
import { useLocation, Link as RouterLink } from 'react-router-dom';
import { colors, spacing } from '../../styles/variables';

// Interface for breadcrumb item structure
export interface BreadcrumbItem {
  label: string;
  path: string;
  icon?: React.ReactNode;
}

// Props interface for the Breadcrumbs component
export interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  maxItems?: number;
  showHomeIcon?: boolean;
  className?: string;
  'aria-label'?: string;
}

// Map path segments to human-readable labels
const PATH_LABEL_MAP: Record<string, string> = {
  dashboard: 'Dashboard',
  applications: 'Applications',
  documents: 'Documents',
  messages: 'Messages',
  payments: 'Payments',
  'financial-aid': 'Financial Aid',
  profile: 'Profile',
  admin: 'Admin',
  create: 'Create',
  edit: 'Edit',
  view: 'View',
  status: 'Status',
  upload: 'Upload'
};

// Styled components for consistent appearance
const StyledBreadcrumbs = styled(MuiBreadcrumbs)`
  margin: ${spacing.md} 0;
  color: ${colors.neutralMedium};
  font-size: 14px;
  
  .MuiBreadcrumbs-separator {
    margin-left: ${spacing.xs};
    margin-right: ${spacing.xs};
  }
`;

const BreadcrumbLink = styled(RouterLink)`
  color: ${colors.neutralMedium};
  text-decoration: none;
  display: flex;
  align-items: center;
  
  &:hover {
    color: ${colors.primary};
    text-decoration: underline;
  }
`;

const HomeIcon = styled(Home)`
  font-size: 1.2rem;
  margin-right: ${spacing.xs};
`;

const CurrentPageText = styled(Typography)`
  color: ${colors.primary};
  font-weight: 500;
`;

/**
 * Helper function to generate breadcrumb items based on the current path
 * @param pathname - Current URL path
 * @returns Array of breadcrumb items with labels and paths
 */
const generateBreadcrumbs = (pathname: string): BreadcrumbItem[] => {
  // Split the pathname into segments and filter out empty strings
  const pathSegments = pathname.split('/').filter(segment => segment);
  
  // Initialize breadcrumbs with Home
  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Home', path: '/' }
  ];
  
  // Build up breadcrumb items by iterating through path segments
  let currentPath = '';
  
  pathSegments.forEach(segment => {
    currentPath += `/${segment}`;
    
    // Generate human-readable label from path segment
    const label = PATH_LABEL_MAP[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
    
    breadcrumbs.push({
      label,
      path: currentPath
    });
  });
  
  return breadcrumbs;
};

/**
 * Breadcrumbs navigation component that shows the current location in the application hierarchy
 * Provides context about navigation path and allows navigation to parent pages
 */
const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  items,
  maxItems = 8,
  showHomeIcon = true,
  className,
  'aria-label': ariaLabel = 'Breadcrumb navigation',
  ...rest
}) => {
  const location = useLocation();
  
  // Generate breadcrumb items from current path if custom items not provided
  const breadcrumbItems = items || generateBreadcrumbs(location.pathname);
  
  return (
    <StyledBreadcrumbs 
      separator={<NavigateNext fontSize="small" />}
      aria-label={ariaLabel}
      maxItems={maxItems}
      className={className}
      {...rest}
    >
      {breadcrumbItems.map((item, index) => {
        const isLast = index === breadcrumbItems.length - 1;
        
        // Add home icon for the first item if enabled
        if (index === 0 && showHomeIcon && !item.icon) {
          item.icon = <HomeIcon aria-hidden="true" />;
        }
        
        // Last item is current page (not clickable)
        if (isLast) {
          return (
            <CurrentPageText key={item.path} aria-current="page">
              {item.icon}
              {item.label}
            </CurrentPageText>
          );
        }
        
        // All other items are links to parent pages
        return (
          <BreadcrumbLink 
            key={item.path} 
            to={item.path}
            component={RouterLink}
          >
            {item.icon}
            {item.label}
          </BreadcrumbLink>
        );
      })}
    </StyledBreadcrumbs>
  );
};

export default Breadcrumbs;
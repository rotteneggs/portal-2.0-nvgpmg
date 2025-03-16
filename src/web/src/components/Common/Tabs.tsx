import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { Tabs as MuiTabs, Tab as MuiTab, Box, useTheme } from '@mui/material'; // @mui/material ^5.11.0
import useBreakpoint from '../../hooks/useBreakpoint';

/**
 * Interface for the TabPanel component props
 */
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

/**
 * Props for the Tabs component
 */
export interface TabsProps {
  /**
   * Array of tab objects containing label, content, and optional disabled flag
   */
  tabs: Array<{
    label: string;
    content: React.ReactNode;
    disabled?: boolean;
  }>;
  /**
   * Currently selected tab index
   */
  value: number;
  /**
   * Callback function called when tab selection changes
   */
  onChange: (event: React.SyntheticEvent, newValue: number) => void;
  /**
   * Tab display variant
   * @default "standard"
   */
  variant?: 'standard' | 'fullWidth' | 'scrollable';
  /**
   * Tab orientation
   * @default "horizontal"
   */
  orientation?: 'horizontal' | 'vertical';
  /**
   * Additional CSS class name
   */
  className?: string;
}

/**
 * Styled wrapper for MUI Tabs component
 */
const StyledTabs = styled(MuiTabs)`
  border-bottom: 1px solid ${props => props.theme.palette.divider};
  margin-bottom: 16px;
  & .MuiTabs-indicator {
    background-color: ${props => props.theme.palette.primary.main};
    height: 3px;
  }
`;

/**
 * Styled wrapper for MUI Tab component
 */
const StyledTab = styled(MuiTab)`
  text-transform: none;
  font-weight: 500;
  font-size: 16px;
  padding: 12px 16px;
  &.Mui-selected {
    color: ${props => props.theme.palette.primary.main};
    font-weight: 600;
  }
  &.Mui-disabled {
    color: ${props => props.theme.palette.text.disabled};
  }
`;

/**
 * Styled container for tab panels
 */
const TabPanelContainer = styled(Box)`
  padding: 16px 0;
  width: 100%;
`;

/**
 * Generates accessibility props for tabs and tab panels
 * @param index - Index of the tab
 * @returns Object containing aria-controls and id attributes
 */
function a11yProps(index: number) {
  return {
    id: `tab-${index}`,
    'aria-controls': `tabpanel-${index}`,
  };
}

/**
 * Component to render the content of a tab panel
 * @param props - The TabPanel props
 * @returns The rendered tab panel
 */
function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <TabPanelContainer
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && children}
    </TabPanelContainer>
  );
}

/**
 * A customized tabs component that wraps Material-UI Tabs with
 * application-specific styling and behavior
 */
const Tabs: React.FC<TabsProps> = ({
  tabs,
  value,
  onChange,
  variant = 'standard',
  orientation = 'horizontal',
  className,
}) => {
  const theme = useTheme();
  const { breakpoint } = useBreakpoint();
  
  // State for the active variant which might change based on screen size
  const [activeVariant, setActiveVariant] = useState(variant);
  const [showScrollButtons, setShowScrollButtons] = useState(false);
  
  // Update the variant and scroll buttons based on screen size changes
  useEffect(() => {
    const isSmallScreen = ['xs', 'sm'].includes(breakpoint);
    setShowScrollButtons(isSmallScreen);
    
    if (isSmallScreen && tabs.length > 3) {
      setActiveVariant('scrollable');
    } else {
      setActiveVariant(variant);
    }
  }, [breakpoint, tabs.length, variant]);

  return (
    <div className={className}>
      <StyledTabs
        value={value}
        onChange={onChange}
        variant={activeVariant}
        scrollButtons={showScrollButtons ? 'auto' : false}
        orientation={orientation}
        aria-label="tabs"
      >
        {tabs.map((tab, index) => (
          <StyledTab
            key={index}
            label={tab.label}
            disabled={tab.disabled}
            {...a11yProps(index)}
          />
        ))}
      </StyledTabs>
      
      {tabs.map((tab, index) => (
        <TabPanel key={index} value={value} index={index}>
          {tab.content}
        </TabPanel>
      ))}
    </div>
  );
};

export default Tabs;
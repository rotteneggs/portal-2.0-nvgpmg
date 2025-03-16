import React, { useState, useEffect, useMemo } from 'react';
import { Grid, Box, Typography, Tabs, Tab, FormControl, InputLabel, MenuItem } from '@mui/material'; // Material-UI v5.11.11
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2'; // react-chartjs-2 v5.2.0
import { Chart, registerables } from 'chart.js/auto'; // chart.js/auto v4.2.1
import { subDays, format } from 'date-fns'; // date-fns v2.29.3

import Card from '../Common/Card';
import Select from '../Common/Select';
import DatePicker from '../Common/DatePicker';
import Button from '../Common/Button';
import LoadingSkeleton from '../Common/LoadingSkeleton';
import {
  getApplicationStats,
  getApplicationTrends,
  getDocumentStats,
  getDocumentVerificationTrends,
  getConversionFunnel,
  getWorkflowEfficiency,
  getAIPerformance,
  exportReport
} from '../../api/admin';
import {
  ReportingDashboardProps,
  FilterState,
  ApplicationStats,
  DocumentStats,
  TrendData,
  ConversionFunnelData,
  WorkflowEfficiencyData,
  AIPerformanceData
} from '../../types/api';

Chart.register(...registerables);

/**
 * Formats a number with commas as thousands separators
 * @param value - The number to format
 * @returns Formatted number string
 */
const formatNumber = (value: number): string => {
  if (typeof value !== 'number') {
    return '0';
  }
  return value.toLocaleString();
};

/**
 * Formats a number as a percentage with specified decimal places
 * @param value - The number to format
 * @param decimalPlaces - Number of decimal places to include
 * @returns Formatted percentage string
 */
const formatPercentage = (value: number, decimalPlaces: number): string => {
  if (typeof value !== 'number') {
    return '0%';
  }
  const percentage = (value * 100).toFixed(decimalPlaces);
  return `${percentage}%`;
};

/**
 * Returns default date range for reports (last 30 days)
 * @returns Object containing start and end dates
 */
const getDefaultDateRange = (): { startDate: Date; endDate: Date } => {
  const endDate = new Date();
  const startDate = subDays(endDate, 30);
  return { startDate, endDate };
};

/**
 * Tab component for application-related metrics and charts
 */
const ApplicationsTab: React.FC<{
  stats: ApplicationStats;
  trends: TrendData[];
  conversionFunnel: ConversionFunnelData[];
  filters: FilterState;
  onFilterChange: (filterName: string, value: any) => void;
  onExport: (reportType: string, format: string) => void;
  isLoading: boolean;
}> = ({ stats, trends, conversionFunnel, filters, onFilterChange, onExport, isLoading }) => {
  const applicationTrendData = useMemo(() => ({
    labels: trends.map(item => item.date),
    datasets: [{
      label: 'Applications',
      data: trends.map(item => item.value),
      fill: false,
      borderColor: '#1976D2',
      tension: 0.1
    }]
  }), [trends]);

  const conversionFunnelChartData = useMemo(() => ({
    labels: conversionFunnel.map(item => item.stage),
    datasets: [{
      label: 'Conversion',
      data: conversionFunnel.map(item => item.count),
      backgroundColor: [
        'rgba(255, 99, 132, 0.2)',
        'rgba(255, 159, 64, 0.2)',
        'rgba(255, 205, 86, 0.2)',
        'rgba(75, 192, 192, 0.2)',
        'rgba(54, 162, 235, 0.2)',
        'rgba(153, 102, 255, 0.2)',
        'rgba(201, 203, 207, 0.2)'
      ],
      borderColor: [
        'rgb(255, 99, 132)',
        'rgb(255, 159, 64)',
        'rgb(255, 205, 86)',
        'rgb(75, 192, 192)',
        'rgb(54, 162, 235)',
        'rgb(153, 102, 255)',
        'rgb(201, 203, 207)'
      ],
      borderWidth: 1,
    }]
  }), [conversionFunnel]);

  const availableFilters = useMemo(() => [
    { value: 'undergraduate', label: 'Undergraduate' },
    { value: 'graduate', label: 'Graduate' },
    { value: 'transfer', label: 'Transfer' }
  ], []);

  return (
    <Box>
      <FilterBar
        filters={filters}
        onFilterChange={onFilterChange}
        availableFilters={availableFilters}
        onExport={(format) => onExport('applications', format)}
      />
      <Grid container spacing={3}>
        <Grid item xs={12} md={6} lg={4}>
          <StatCard
            title="Total Applications"
            value={isLoading ? <LoadingSkeleton width={80} /> : formatNumber(stats.totalApplications)}
          />
        </Grid>
        <Grid item xs={12} md={6} lg={4}>
          <StatCard
            title="Submitted Applications"
            value={isLoading ? <LoadingSkeleton width={80} /> : formatNumber(stats.submittedApplications)}
          />
        </Grid>
        <Grid item xs={12} md={6} lg={4}>
          <StatCard
            title="Conversion Rate"
            value={isLoading ? <LoadingSkeleton width={80} /> : formatPercentage(stats.conversionRate, 2)}
          />
        </Grid>
        <Grid item xs={12}>
          <Card title="Application Trends">
            {isLoading ? <LoadingSkeleton variant="rectangular" height={300} /> : (
              <Line data={applicationTrendData} />
            )}
          </Card>
        </Grid>
        <Grid item xs={12}>
          <Card title="Conversion Funnel">
            {isLoading ? <LoadingSkeleton variant="rectangular" height={400} /> : (
              <Bar data={conversionFunnelChartData} />
            )}
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

/**
 * Tab component for document-related metrics and charts
 */
const DocumentsTab: React.FC<{
  stats: DocumentStats;
  trends: TrendData[];
  filters: FilterState;
  onFilterChange: (filterName: string, value: any) => void;
  onExport: (reportType: string, format: string) => void;
  isLoading: boolean;
}> = ({ stats, trends, filters, onFilterChange, onExport, isLoading }) => {
  const documentTrendData = useMemo(() => ({
    labels: trends.map(item => item.date),
    datasets: [{
      label: 'Documents Verified',
      data: trends.map(item => item.value),
      fill: false,
      borderColor: '#4CAF50',
      tension: 0.1
    }]
  }), [trends]);

  const documentTypeData = useMemo(() => ({
    labels: ['Verified', 'Pending', 'Rejected'],
    datasets: [{
      label: 'Documents',
      data: [stats.verifiedDocuments, stats.pendingDocuments, stats.rejectedDocuments],
      backgroundColor: [
        'rgba(75, 192, 192, 0.2)',
        'rgba(255, 205, 86, 0.2)',
        'rgba(255, 99, 132, 0.2)'
      ],
      borderColor: [
        'rgb(75, 192, 192)',
        'rgb(255, 205, 86)',
        'rgb(255, 99, 132)'
      ],
      borderWidth: 1
    }]
  }), [stats]);

  const availableFilters = useMemo(() => [
    { value: 'transcript', label: 'Transcript' },
    { value: 'recommendation', label: 'Recommendation' },
    { value: 'personal_statement', label: 'Personal Statement' }
  ], []);

  return (
    <Box>
      <FilterBar
        filters={filters}
        onFilterChange={onFilterChange}
        availableFilters={availableFilters}
        onExport={(format) => onExport('documents', format)}
      />
      <Grid container spacing={3}>
        <Grid item xs={12} md={6} lg={4}>
          <StatCard
            title="Total Documents"
            value={isLoading ? <LoadingSkeleton width={80} /> : formatNumber(stats.totalDocuments)}
          />
        </Grid>
        <Grid item xs={12} md={6} lg={4}>
          <StatCard
            title="Verified Documents"
            value={isLoading ? <LoadingSkeleton width={80} /> : formatNumber(stats.verifiedDocuments)}
          />
        </Grid>
        <Grid item xs={12} md={6} lg={4}>
          <StatCard
            title="AI Verified Percentage"
            value={isLoading ? <LoadingSkeleton width={80} /> : formatPercentage(stats.aiVerifiedPercentage, 2)}
          />
        </Grid>
        <Grid item xs={12}>
          <Card title="Document Verification Trends">
            {isLoading ? <LoadingSkeleton variant="rectangular" height={300} /> : (
              <Line data={documentTrendData} />
            )}
          </Card>
        </Grid>
        <Grid item xs={12}>
          <Card title="Document Type Distribution">
            {isLoading ? <LoadingSkeleton variant="rectangular" height={400} /> : (
              <Doughnut data={documentTypeData} />
            )}
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

/**
 * Tab component for workflow efficiency metrics and charts
 */
const WorkflowTab: React.FC<{
  data: WorkflowEfficiencyData[];
  filters: FilterState;
  onFilterChange: (filterName: string, value: any) => void;
  onExport: (reportType: string, format: string) => void;
  isLoading: boolean;
}> = ({ data, filters, onFilterChange, onExport, isLoading }) => {
  // Placeholder for workflow efficiency chart
  return (
    <Box>
      <Typography variant="h6">Workflow Efficiency</Typography>
      <Typography variant="body1">
        This section will display workflow efficiency metrics and charts.
      </Typography>
    </Box>
  );
};

/**
 * Tab component for AI performance metrics and charts
 */
const AIPerformanceTab: React.FC<{
  data: AIPerformanceData[];
  filters: FilterState;
  onFilterChange: (filterName: string, value: any) => void;
  onExport: (reportType: string, format: string) => void;
  isLoading: boolean;
}> = ({ data, filters, onFilterChange, onExport, isLoading }) => {
  // Placeholder for AI performance chart
  return (
    <Box>
      <Typography variant="h6">AI Performance</Typography>
      <Typography variant="body1">
        This section will display AI performance metrics and charts.
      </Typography>
    </Box>
  );
};

/**
 * Card component for displaying a single statistic with label and optional trend indicator
 */
const StatCard: React.FC<{
  title: string;
  value: string | number | React.ReactNode;
  trend?: number;
  trendDirection?: 'up' | 'down';
  isLoading?: boolean;
}> = ({ title, value, trend, trendDirection, isLoading }) => {
  return (
    <Card title={title}>
      <Typography variant="h5">
        {value}
      </Typography>
    </Card>
  );
};

/**
 * Component for dashboard filter controls
 */
const FilterBar: React.FC<{
  filters: FilterState;
  onFilterChange: (filterName: string, value: any) => void;
  availableFilters: { value: string; label: string }[];
  onExport: (format: string) => void;
}> = ({ filters, onFilterChange, availableFilters, onExport }) => {
  const { startDate, endDate } = filters.Date || getDefaultDateRange();

  return (
    <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
      <FormControl>
        <InputLabel id="application-type-label">Application Type</InputLabel>
        <Select
          labelId="application-type-label"
          id="application-type"
          value={filters.applicationType || ''}
          onChange={(e) => onFilterChange('applicationType', e.target.value)}
          label="Application Type"
        >
          <MenuItem value=""><em>All</em></MenuItem>
          {availableFilters.map((filter) => (
            <MenuItem key={filter.value} value={filter.value}>{filter.label}</MenuItem>
          ))}
        </Select>
      </FormControl>
      <DatePicker
        label="Start Date"
        value={startDate}
        onChange={(date) => onFilterChange('Date', { ...filters.Date, startDate: date })}
      />
      <DatePicker
        label="End Date"
        value={endDate}
        onChange={(date) => onFilterChange('Date', { ...filters.Date, endDate: date })}
      />
      <Button variant="contained" onClick={() => onExport('csv')}>Export CSV</Button>
      <Button variant="contained" onClick={() => onExport('pdf')}>Export PDF</Button>
    </Box>
  );
};

/**
 * Default export of the ReportingDashboard component
 */
const ReportingDashboard: React.FC<ReportingDashboardProps> = ({ onExport }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [filters, setFilters] = useState<FilterState>({
    Date: getDefaultDateRange(),
    applicationType: '',
    documentType: '',
    grouping: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [applicationStats, setApplicationStats] = useState<ApplicationStats>({
    totalApplications: 0,
    submittedApplications: 0,
    inProgressApplications: 0,
    acceptedApplications: 0,
    rejectedApplications: 0,
    waitlistedApplications: 0,
    conversionRate: 0
  });
  const [applicationTrends, setApplicationTrends] = useState<TrendData[]>([]);
  const [documentStats, setDocumentStats] = useState<DocumentStats>({
    totalDocuments: 0,
    verifiedDocuments: 0,
    pendingDocuments: 0,
    rejectedDocuments: 0,
    averageVerificationTime: 0,
    aiVerifiedPercentage: 0
  });
  const [documentTrends, setDocumentTrends] = useState<TrendData[]>([]);
  const [conversionFunnel, setConversionFunnel] = useState<ConversionFunnelData[]>([]);
  const [workflowEfficiency, setWorkflowEfficiency] = useState<WorkflowEfficiencyData[]>([]);
  const [aiPerformance, setAIPerformance] = useState<AIPerformanceData[]>([]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleFilterChange = (filterName: string, value: any) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      [filterName]: value
    }));
  };

  const handleExport = (reportType: string, format: string) => {
    console.log(`Exporting ${reportType} report in ${format} format`);
    // Implement export logic here
  };

  const fetchApplicationStats = async () => {
    setIsLoading(true);
    try {
      const data = await getApplicationStats({
        start_date: format(filters.Date.startDate, 'yyyy-MM-dd'),
        end_date: format(filters.Date.endDate, 'yyyy-MM-dd'),
        application_type: filters.applicationType
      });
      setApplicationStats(data);
    } catch (error) {
      console.error('Error fetching application stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchApplicationTrends = async () => {
    setIsLoading(true);
    try {
      const data = await getApplicationTrends({
        start_date: format(filters.Date.startDate, 'yyyy-MM-dd'),
        end_date: format(filters.Date.endDate, 'yyyy-MM-dd'),
        grouping: filters.grouping,
        application_type: filters.applicationType
      });
      setApplicationTrends(data);
    } catch (error) {
      console.error('Error fetching application trends:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDocumentStats = async () => {
    setIsLoading(true);
    try {
      const data = await getDocumentStats({
        start_date: format(filters.Date.startDate, 'yyyy-MM-dd'),
        end_date: format(filters.Date.endDate, 'yyyy-MM-dd'),
        document_type: filters.documentType
      });
      setDocumentStats(data);
    } catch (error) {
      console.error('Error fetching document stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDocumentTrends = async () => {
    setIsLoading(true);
    try {
      const data = await getDocumentVerificationTrends({
        start_date: format(filters.Date.startDate, 'yyyy-MM-dd'),
        end_date: format(filters.Date.endDate, 'yyyy-MM-dd'),
        grouping: filters.grouping,
        document_type: filters.documentType
      });
      setDocumentTrends(data);
    } catch (error) {
      console.error('Error fetching document trends:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchConversionFunnel = async () => {
    setIsLoading(true);
    try {
      const data = await getConversionFunnel({
        start_date: format(filters.Date.startDate, 'yyyy-MM-dd'),
        end_date: format(filters.Date.endDate, 'yyyy-MM-dd'),
        application_type: filters.applicationType
      });
      setConversionFunnel(data);
    } catch (error) {
      console.error('Error fetching conversion funnel:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWorkflowEfficiency = async () => {
    setIsLoading(true);
    try {
      const data = await getWorkflowEfficiency({
        start_date: format(filters.Date.startDate, 'yyyy-MM-dd'),
        end_date: format(filters.Date.endDate, 'yyyy-MM-dd')
      });
      setWorkflowEfficiency(data);
    } catch (error) {
      console.error('Error fetching workflow efficiency:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAIPerformance = async () => {
    setIsLoading(true);
    try {
      const data = await getAIPerformance({
        start_date: format(filters.Date.startDate, 'yyyy-MM-dd'),
        end_date: format(filters.Date.endDate, 'yyyy-MM-dd')
      });
      setAIPerformance(data);
    } catch (error) {
      console.error('Error fetching AI performance:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplicationStats();
    fetchApplicationTrends();
    fetchDocumentStats();
    fetchDocumentTrends();
    fetchConversionFunnel();
    fetchWorkflowEfficiency();
    fetchAIPerformance();
  }, [filters]);

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Reporting Dashboard
      </Typography>
      <Tabs value={activeTab} onChange={handleTabChange} aria-label="dashboard tabs">
        <Tab label="Applications" id="applications-tab" aria-controls="applications-panel" />
        <Tab label="Documents" id="documents-tab" aria-controls="documents-panel" />
        <Tab label="Workflow" id="workflow-tab" aria-controls="workflow-panel" />
        <Tab label="AI Performance" id="ai-performance-tab" aria-controls="ai-performance-panel" />
      </Tabs>
      <Box role="tabpanel" hidden={activeTab !== 0} id="applications-panel" aria-labelledby="applications-tab">
        {activeTab === 0 && (
          <ApplicationsTab
            stats={applicationStats}
            trends={applicationTrends}
            conversionFunnel={conversionFunnel}
            filters={filters}
            onFilterChange={handleFilterChange}
            onExport={handleExport}
            isLoading={isLoading}
          />
        )}
      </Box>
      <Box role="tabpanel" hidden={activeTab !== 1} id="documents-panel" aria-labelledby="documents-tab">
        {activeTab === 1 && (
          <DocumentsTab
            stats={documentStats}
            trends={documentTrends}
            filters={filters}
            onFilterChange={handleFilterChange}
            onExport={handleExport}
            isLoading={isLoading}
          />
        )}
      </Box>
      <Box role="tabpanel" hidden={activeTab !== 2} id="workflow-panel" aria-labelledby="workflow-tab">
        {activeTab === 2 && (
          <WorkflowTab
            data={workflowEfficiency}
            filters={filters}
            onFilterChange={handleFilterChange}
            onExport={handleExport}
            isLoading={isLoading}
          />
        )}
      </Box>
      <Box role="tabpanel" hidden={activeTab !== 3} id="ai-performance-panel" aria-labelledby="ai-performance-tab">
        {activeTab === 3 && (
          <AIPerformanceTab
            data={aiPerformance}
            filters={filters}
            onFilterChange={handleFilterChange}
            onExport={handleExport}
            isLoading={isLoading}
          />
        )}
      </Box>
    </Box>
  );
};

export default ReportingDashboard;
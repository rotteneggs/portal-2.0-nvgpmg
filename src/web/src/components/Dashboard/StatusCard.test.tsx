import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react'; // @testing-library/react ^14.0.0
import userEvent from '@testing-library/user-event'; // @testing-library/user-event ^14.4.3
import StatusCard from './StatusCard';
import { renderWithProviders } from '../../utils/testUtils';
import { ApplicationStatus } from '../../types/application';
import { formatStatus } from '../../utils/formatUtils';
import { formatDate } from '../../utils/dateUtils';

describe('StatusCard component', () => {
  it('renders correctly with default props', () => {
    renderWithProviders(<StatusCard status={ApplicationStatus.DRAFT} updatedAt="2023-10-26T12:00:00.000Z" />);

    const cardElement = screen.getByRole('button');
    expect(cardElement).toBeInTheDocument();

    const completionPercentageElement = screen.getByText('0%');
    expect(completionPercentageElement).toBeInTheDocument();

    const statusElement = screen.getByText(formatStatus(ApplicationStatus.DRAFT));
    expect(statusElement).toBeInTheDocument();
  });

  it('displays the correct status text', () => {
    renderWithProviders(<StatusCard status={ApplicationStatus.IN_REVIEW} updatedAt="2023-10-26T12:00:00.000Z" />);
    expect(screen.getByText(formatStatus(ApplicationStatus.IN_REVIEW))).toBeInTheDocument();

    renderWithProviders(<StatusCard status={ApplicationStatus.ADDITIONAL_INFO_REQUESTED} updatedAt="2023-10-26T12:00:00.000Z" />);
    expect(screen.getByText(formatStatus(ApplicationStatus.ADDITIONAL_INFO_REQUESTED))).toBeInTheDocument();
  });

  it('displays the correct completion percentage', () => {
    renderWithProviders(<StatusCard status={ApplicationStatus.DRAFT} completionPercentage={75} updatedAt="2023-10-26T12:00:00.000Z" />);
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('displays the formatted updated date', () => {
    const testDate = '2023-10-26T12:00:00.000Z';
    renderWithProviders(<StatusCard status={ApplicationStatus.DRAFT} updatedAt={testDate} />);
    expect(screen.getByText(`Last updated: ${formatDate(testDate, 'MMM d, yyyy')}`)).toBeInTheDocument();
  });

  it('displays the appropriate status description based on status', () => {
    renderWithProviders(<StatusCard status={ApplicationStatus.DRAFT} updatedAt="2023-10-26T12:00:00.000Z" />);
    expect(screen.getByText(/Complete all required sections/i)).toBeInTheDocument();

    renderWithProviders(<StatusCard status={ApplicationStatus.SUBMITTED} updatedAt="2023-10-26T12:00:00.000Z" />);
    expect(screen.getByText(/Your application has been received/i)).toBeInTheDocument();

    renderWithProviders(<StatusCard status={ApplicationStatus.IN_REVIEW} updatedAt="2023-10-26T12:00:00.000Z" />);
    expect(screen.getByText(/Your application is being reviewed/i)).toBeInTheDocument();

    renderWithProviders(<StatusCard status={ApplicationStatus.ADDITIONAL_INFO_REQUESTED} updatedAt="2023-10-26T12:00:00.000Z" />);
    expect(screen.getByText(/Additional information is needed/i)).toBeInTheDocument();

    renderWithProviders(<StatusCard status={ApplicationStatus.DECISION_PENDING} updatedAt="2023-10-26T12:00:00.000Z" />);
    expect(screen.getByText(/A decision on your application is being finalized/i)).toBeInTheDocument();

    renderWithProviders(<StatusCard status={ApplicationStatus.ACCEPTED} updatedAt="2023-10-26T12:00:00.000Z" />);
    expect(screen.getByText(/Congratulations! Your application has been accepted/i)).toBeInTheDocument();

    renderWithProviders(<StatusCard status={ApplicationStatus.REJECTED} updatedAt="2023-10-26T12:00:00.000Z" />);
    expect(screen.getByText(/We regret to inform you that your application has not been accepted/i)).toBeInTheDocument();

    renderWithProviders(<StatusCard status={ApplicationStatus.WAITLISTED} updatedAt="2023-10-26T12:00:00.000Z" />);
    expect(screen.getByText(/Your application has been placed on our waitlist/i)).toBeInTheDocument();
  });

  it('displays the appropriate next steps guidance based on status', () => {
    renderWithProviders(<StatusCard status={ApplicationStatus.DRAFT} updatedAt="2023-10-26T12:00:00.000Z" />);
    expect(screen.getByText(/Complete all required sections/i)).toBeInTheDocument();

    renderWithProviders(<StatusCard status={ApplicationStatus.SUBMITTED} updatedAt="2023-10-26T12:00:00.000Z" />);
    expect(screen.getByText(/Monitor your application status/i)).toBeInTheDocument();

    renderWithProviders(<StatusCard status={ApplicationStatus.IN_REVIEW} updatedAt="2023-10-26T12:00:00.000Z" />);
    expect(screen.getByText(/Please be patient while we review/i)).toBeInTheDocument();

    renderWithProviders(<StatusCard status={ApplicationStatus.ADDITIONAL_INFO_REQUESTED} updatedAt="2023-10-26T12:00:00.000Z" />);
    expect(screen.getByText(/Please provide the requested additional information/i)).toBeInTheDocument();

    renderWithProviders(<StatusCard status={ApplicationStatus.DECISION_PENDING} updatedAt="2023-10-26T12:00:00.000Z" />);
    expect(screen.getByText(/A decision will be made soon/i)).toBeInTheDocument();

    renderWithProviders(<StatusCard status={ApplicationStatus.ACCEPTED} updatedAt="2023-10-26T12:00:00.000Z" />);
    expect(screen.getByText(/Complete enrollment steps and pay your deposit/i)).toBeInTheDocument();

    renderWithProviders(<StatusCard status={ApplicationStatus.REJECTED} updatedAt="2023-10-26T12:00:00.000Z" />);
    expect(screen.getByText(/Contact the admissions office if you have questions/i)).toBeInTheDocument();

    renderWithProviders(<StatusCard status={ApplicationStatus.WAITLISTED} updatedAt="2023-10-26T12:00:00.000Z" />);
    expect(screen.getByText(/Monitor your status regularly for potential updates/i)).toBeInTheDocument();
  });

  it('calls onClick handler when clicked', async () => {
    const onClickMock = jest.fn();
    renderWithProviders(<StatusCard status={ApplicationStatus.DRAFT} onClick={onClickMock} updatedAt="2023-10-26T12:00:00.000Z" />);
    const cardElement = screen.getByRole('button');
    await userEvent.click(cardElement);
    expect(onClickMock).toHaveBeenCalledTimes(1);
  });

  it('applies custom className when provided', () => {
    renderWithProviders(<StatusCard status={ApplicationStatus.DRAFT} className="custom-class" updatedAt="2023-10-26T12:00:00.000Z" />);
    const cardElement = screen.getByRole('button');
    expect(cardElement).toHaveClass('custom-class');
  });

  it('is accessible', () => {
    renderWithProviders(<StatusCard status={ApplicationStatus.DRAFT} updatedAt="2023-10-26T12:00:00.000Z" />);
    const statusInformation = screen.getByText(formatStatus(ApplicationStatus.DRAFT));
    expect(statusInformation).toBeInTheDocument();

    const progressIndicator = screen.getByRole('progressbar');
    expect(progressIndicator).toHaveAttribute('aria-valuenow');
    expect(progressIndicator).toHaveAttribute('aria-valuemin');
    expect(progressIndicator).toHaveAttribute('aria-valuemax');
  });
});
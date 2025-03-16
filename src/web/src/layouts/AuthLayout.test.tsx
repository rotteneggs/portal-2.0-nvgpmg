import React from 'react'; // react v18.2.0
import { render, screen } from '@testing-library/react'; // @testing-library/react v14.0.0
import AuthLayout from './AuthLayout';
import { renderWithProviders } from '../utils/testUtils';

describe('AuthLayout', () => {
  it('renders with children', () => {
    // Arrange
    const testContent = <div data-testid="child-content">Test Content</div>;

    // Act
    renderWithProviders(<AuthLayout>{testContent}</AuthLayout>);

    // Assert
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.getByAltText('Institution Logo')).toBeInTheDocument();
    expect(screen.getByText('Need help? Contact support@institution.edu')).toBeInTheDocument();
  });

  it('renders with a title when provided', () => {
    // Arrange
    const testTitle = 'Test Title';
    const testContent = <div data-testid="child-content">Test Content</div>;

    // Act
    renderWithProviders(<AuthLayout title={testTitle}>{testContent}</AuthLayout>);

    // Assert
    expect(screen.getByText(testTitle)).toBeInTheDocument();
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
  });

  it('applies responsive styling based on screen size', () => {
    // Arrange
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: query === '(max-width:600px)',
        media: query,
        onchange: null,
        addListener: jest.fn(), // Deprecated
        removeListener: jest.fn(), // Deprecated
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
    const testContent = <div data-testid="child-content">Test Content</div>;

    // Act
    renderWithProviders(<AuthLayout>{testContent}</AuthLayout>);

    // Assert
    expect(window.matchMedia).toHaveBeenCalled();

    // Clean up mock
    (window.matchMedia as jest.Mock).mockClear();
  });

  it('maintains accessibility requirements', () => {
    // Arrange
    const testContent = <div data-testid="child-content">Test Content</div>;

    // Act
    renderWithProviders(<AuthLayout>{testContent}</AuthLayout>);

    // Assert
    expect(screen.getByRole('img', { name: 'Institution Logo' })).toBeInTheDocument();
  });
});
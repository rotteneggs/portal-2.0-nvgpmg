import React from 'react'; // react ^18.2.0
import { render, screen, fireEvent } from '@testing-library/react'; // @testing-library/react ^14.0.0
import userEvent from '@testing-library/user-event'; // @testing-library/user-event ^14.4.3
import Button from './Button';
import { renderWithProviders } from '../../utils/testUtils';

describe('Button component', () => {
  // Test suite for the Button component
  it('renders correctly with default props', () => {
    // Test that Button renders with default props
    renderWithProviders(<Button>Click me</Button>);

    // Verify button element is in the document
    const buttonElement = screen.getByRole('button', { name: 'Click me' });
    expect(buttonElement).toBeInTheDocument();

    // Verify button has correct default styling (contained, primary)
    expect(buttonElement).toHaveClass('MuiButton-contained');
    expect(buttonElement).toHaveClass('MuiButton-primary');
  });

  it('renders with different variants', () => {
    // Test that Button renders with different variant props
    // Render Button with 'contained' variant
    renderWithProviders(<Button variant="contained">Contained</Button>);
    const containedButton = screen.getByRole('button', { name: 'Contained' });
    // Verify button has contained styling
    expect(containedButton).toHaveClass('MuiButton-contained');

    // Render Button with 'outlined' variant
    renderWithProviders(<Button variant="outlined">Outlined</Button>);
    const outlinedButton = screen.getByRole('button', { name: 'Outlined' });
    // Verify button has outlined styling
    expect(outlinedButton).toHaveClass('MuiButton-outlined');

    // Render Button with 'text' variant
    renderWithProviders(<Button variant="text">Text</Button>);
    const textButton = screen.getByRole('button', { name: 'Text' });
    // Verify button has text styling
    expect(textButton).toHaveClass('MuiButton-text');
  });

  it('renders with different colors', () => {
    // Test that Button renders with different color props
    // Render Button with 'primary' color
    renderWithProviders(<Button color="primary">Primary</Button>);
    const primaryButton = screen.getByRole('button', { name: 'Primary' });
    // Verify button has primary color styling
    expect(primaryButton).toHaveClass('MuiButton-primary');

    // Render Button with 'secondary' color
    renderWithProviders(<Button color="secondary">Secondary</Button>);
    const secondaryButton = screen.getByRole('button', { name: 'Secondary' });
    // Verify button has secondary color styling
    expect(secondaryButton).toHaveClass('MuiButton-secondary');

    // Render Button with 'accent' color
    renderWithProviders(<Button color="accent">Accent</Button>);
    const accentButton = screen.getByRole('button', { name: 'Accent' });
    // Verify button has accent color styling
    expect(accentButton).toHaveClass('MuiButton-accent');

    // Render Button with 'error' color
    renderWithProviders(<Button color="error">Error</Button>);
    const errorButton = screen.getByRole('button', { name: 'Error' });
    // Verify button has error color styling
    expect(errorButton).toHaveClass('MuiButton-error');
  });

  it('renders with different sizes', () => {
    // Test that Button renders with different size props
    // Render Button with 'small' size
    renderWithProviders(<Button size="small">Small</Button>);
    const smallButton = screen.getByRole('button', { name: 'Small' });
    // Verify button has small size styling
    expect(smallButton).toHaveClass('MuiButton-sizeSmall');

    // Render Button with 'medium' size
    renderWithProviders(<Button size="medium">Medium</Button>);
    const mediumButton = screen.getByRole('button', { name: 'Medium' });
    // Verify button has medium size styling
    expect(mediumButton).toHaveClass('MuiButton-sizeMedium');

    // Render Button with 'large' size
    renderWithProviders(<Button size="large">Large</Button>);
    const largeButton = screen.getByRole('button', { name: 'Large' });
    // Verify button has large size styling
    expect(largeButton).toHaveClass('MuiButton-sizeLarge');
  });

  it('renders as full width when fullWidth prop is true', () => {
    // Test that Button renders full width when specified
    // Render Button with fullWidth prop set to true
    renderWithProviders(<Button fullWidth>Full Width</Button>);
    const buttonElement = screen.getByRole('button', { name: 'Full Width' });
    // Verify button has full width styling
    expect(buttonElement).toHaveStyle('width: 100%');
  });

  it('renders in disabled state when disabled prop is true', () => {
    // Test that Button renders in disabled state
    // Render Button with disabled prop set to true
    renderWithProviders(<Button disabled>Disabled</Button>);
    const buttonElement = screen.getByRole('button', { name: 'Disabled' });
    // Verify button has disabled attribute
    expect(buttonElement).toBeDisabled();
    // Verify button has disabled styling
    expect(buttonElement).toHaveStyle('opacity: 0.7');
  });

  it('renders with loading state when loading prop is true', () => {
    // Test that Button shows loading indicator when loading
    // Render Button with loading prop set to true
    renderWithProviders(<Button loading>Loading</Button>);
    const buttonElement = screen.getByRole('button', { name: 'Loading' });
    // Verify loading indicator is visible
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    // Verify button is disabled during loading
    expect(buttonElement).toBeDisabled();
  });

  it('renders with start icon when startIcon prop is provided', () => {
    // Test that Button renders with start icon
    // Render Button with startIcon prop
    const icon = <span data-testid="start-icon">Icon</span>;
    renderWithProviders(<Button startIcon={icon}>Start Icon</Button>);
    const buttonElement = screen.getByRole('button', { name: 'Start Icon' });
    const iconElement = screen.getByTestId('start-icon');
    // Verify icon is rendered before button text
    expect(buttonElement.firstChild).toBe(iconElement);
  });

  it('renders with end icon when endIcon prop is provided', () => {
    // Test that Button renders with end icon
    // Render Button with endIcon prop
    const icon = <span data-testid="end-icon">Icon</span>;
    renderWithProviders(<Button endIcon={icon}>End Icon</Button>);
    const buttonElement = screen.getByRole('button', { name: 'End Icon' });
    const iconElement = screen.getByTestId('end-icon');
    // Verify icon is rendered after button text
    expect(buttonElement.lastChild).toBe(iconElement);
  });

  it('calls onClick handler when clicked', () => {
    // Test that Button calls onClick handler when clicked
    // Create mock function for onClick handler
    const onClick = jest.fn();
    // Render Button with onClick prop set to mock function
    renderWithProviders(<Button onClick={onClick}>Clickable</Button>);
    const buttonElement = screen.getByRole('button', { name: 'Clickable' });
    // Simulate click on button
    fireEvent.click(buttonElement);
    // Verify onClick mock was called
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', () => {
    // Test that disabled Button does not call onClick
    // Create mock function for onClick handler
    const onClick = jest.fn();
    // Render Button with onClick prop and disabled prop set to true
    renderWithProviders(<Button onClick={onClick} disabled>Disabled</Button>);
    const buttonElement = screen.getByRole('button', { name: 'Disabled' });
    // Simulate click on button
    fireEvent.click(buttonElement);
    // Verify onClick mock was not called
    expect(onClick).not.toHaveBeenCalled();
  });

  it('does not call onClick when loading', () => {
    // Test that loading Button does not call onClick
    // Create mock function for onClick handler
    const onClick = jest.fn();
    // Render Button with onClick prop and loading prop set to true
    renderWithProviders(<Button onClick={onClick} loading>Loading</Button>);
    const buttonElement = screen.getByRole('button', { name: 'Loading' });
    // Simulate click on button
    fireEvent.click(buttonElement);
    // Verify onClick mock was not called
    expect(onClick).not.toHaveBeenCalled();
  });

  it('applies custom className when provided', () => {
    // Test that Button applies custom className
    // Render Button with custom className prop
    renderWithProviders(<Button className="custom-class">Custom</Button>);
    const buttonElement = screen.getByRole('button', { name: 'Custom' });
    // Verify button has the custom class applied
    expect(buttonElement).toHaveClass('custom-class');
  });

  it('sets the correct button type when type prop is provided', () => {
    // Test that Button sets the correct type attribute
    // Render Button with type='submit'
    renderWithProviders(<Button type="submit">Submit</Button>);
    const buttonElement = screen.getByRole('button', { name: 'Submit' });
    // Verify button has type attribute set to 'submit'
    expect(buttonElement).toHaveAttribute('type', 'submit');
  });

  it('sets aria-label when ariaLabel prop is provided', () => {
    // Test that Button sets aria-label for accessibility
    // Render Button with ariaLabel prop
    renderWithProviders(<Button ariaLabel="Close dialog">Close</Button>);
    const buttonElement = screen.getByRole('button', { name: 'Close dialog' });
    // Verify button has aria-label attribute set correctly
    expect(buttonElement).toHaveAttribute('aria-label', 'Close dialog');
  });

  it('is keyboard accessible', () => {
    // Test that Button can be triggered with keyboard
    // Create mock function for onClick handler
    const onClick = jest.fn();
    // Render Button with onClick prop
    renderWithProviders(<Button onClick={onClick}>Keyboard</Button>);
    const buttonElement = screen.getByRole('button', { name: 'Keyboard' });
    // Focus on button
    buttonElement.focus();
    // Simulate pressing Enter key
    fireEvent.keyDown(buttonElement, { key: 'Enter', code: 'Enter' });
    // Verify onClick mock was called
    expect(onClick).toHaveBeenCalledTimes(1);
    // Simulate pressing Space key
    fireEvent.keyDown(buttonElement, { key: ' ', code: 'Space' });
    // Verify onClick mock was called again
    expect(onClick).toHaveBeenCalledTimes(2);
  });
});
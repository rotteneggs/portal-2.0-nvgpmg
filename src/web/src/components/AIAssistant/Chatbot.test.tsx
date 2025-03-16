import React from 'react'; // react ^18.0.0
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'; // @testing-library/react ^14.0.0
import { vi } from 'vitest'; // vitest ^0.34.0
import Chatbot from './Chatbot';
import AIService from '../../services/AIService';
import { renderWithProviders } from '../../utils/testUtils';

// Mock AIService.getChatbotResponse
vi.mock('../../services/AIService');

describe('Chatbot Component', () => {
  const getChatbotResponseMock = vi.mocked(AIService.getChatbotResponse);

  const setup = () => {
    // Mock the AIService.getChatbotResponse method
    getChatbotResponseMock.mockClear();

    // Reset all mocks before each test
    vi.clearAllMocks();
  };

  it('renders chatbot when isOpen is true', () => {
    setup();
    // Render the Chatbot component with isOpen set to true
    renderWithProviders(<Chatbot isOpen={true} onClose={() => {}} />);

    // Check that the chatbot header with title is visible
    expect(screen.getByText('Admissions Assistant')).toBeVisible();

    // Check that the input field is rendered
    expect(screen.getByRole('textbox', { name: 'Type your message' })).toBeInTheDocument();

    // Check that the send button is rendered
    expect(screen.getByRole('button', { name: 'Send message' })).toBeInTheDocument();
  });

  it('does not render chatbot when isOpen is false', () => {
    setup();
    // Render the Chatbot component with isOpen set to false
    renderWithProviders(<Chatbot isOpen={false} onClose={() => {}} />);

    // Check that the chatbot elements are not in the document
    expect(screen.queryByText('Admissions Assistant')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Type your message' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send message' })).not.toBeInTheDocument();
  });

  it('displays initial greeting message when opened', async () => {
    setup();
    // Mock AIService.getChatbotResponse to return a greeting response
    getChatbotResponseMock.mockResolvedValue({
      data: {
        response: "Hello! I'm your admissions assistant.",
        suggestions: []
      }
    });

    // Render the Chatbot component with isOpen set to true
    renderWithProviders(<Chatbot isOpen={true} onClose={() => {}} />);

    // Wait for the greeting message to appear
    await waitFor(() => {
      expect(screen.getByText("Hello! I'm your admissions assistant.")).toBeVisible();
    });

    // Check that the greeting message is displayed
    expect(screen.getByText("Hello! I'm your admissions assistant.")).toBeVisible();
  });

  it('sends user message and displays AI response', async () => {
    setup();
    // Mock AIService.getChatbotResponse to return a specific response
    getChatbotResponseMock.mockResolvedValue({
      data: {
        response: 'This is a mock AI response.',
        suggestions: []
      }
    });

    // Render the Chatbot component with isOpen set to true
    renderWithProviders(<Chatbot isOpen={true} onClose={() => {}} />);

    // Type a message in the input field
    const inputElement = screen.getByRole('textbox', { name: 'Type your message' });
    fireEvent.change(inputElement, { target: { value: 'Test message' } });

    // Click the send button
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    // Check that the user message is displayed
    expect(screen.getByText('Test message')).toBeVisible();

    // Wait for the AI response to appear
    await waitFor(() => {
      expect(screen.getByText('This is a mock AI response.')).toBeVisible();
    });

    // Check that the AI response is displayed
    expect(screen.getByText('This is a mock AI response.')).toBeVisible();
  });

  it('handles sending message with Enter key', async () => {
    setup();
    // Mock AIService.getChatbotResponse to return a specific response
    getChatbotResponseMock.mockResolvedValue({
      data: {
        response: 'This is a mock AI response.',
        suggestions: []
      }
    });

    // Render the Chatbot component with isOpen set to true
    renderWithProviders(<Chatbot isOpen={true} onClose={() => {}} />);

    // Type a message in the input field
    const inputElement = screen.getByRole('textbox', { name: 'Type your message' });
    fireEvent.change(inputElement, { target: { value: 'Test message' } });

    // Press Enter key
    fireEvent.keyPress(inputElement, { key: 'Enter', code: 'Enter', charCode: 13 });

    // Check that the user message is displayed
    expect(screen.getByText('Test message')).toBeVisible();

    // Wait for the AI response to appear
    await waitFor(() => {
      expect(screen.getByText('This is a mock AI response.')).toBeVisible();
    });

    // Check that the AI response is displayed
    expect(screen.getByText('This is a mock AI response.')).toBeVisible();
  });

  it('displays loading indicator while waiting for AI response', async () => {
    setup();
    // Create a delayed mock response for AIService.getChatbotResponse
    const delayedResponse = new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          data: {
            response: 'This is a mock AI response.',
            suggestions: []
          }
        });
      }, 500);
    });
    getChatbotResponseMock.mockImplementation(() => delayedResponse as any);

    // Render the Chatbot component with isOpen set to true
    renderWithProviders(<Chatbot isOpen={true} onClose={() => {}} />);

    // Type a message in the input field
    const inputElement = screen.getByRole('textbox', { name: 'Type your message' });
    fireEvent.change(inputElement, { target: { value: 'Test message' } });

    // Click the send button
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    // Check that the loading indicator is displayed
    expect(screen.getByLabelText('Assistant is typing')).toBeVisible();

    // Wait for the AI response to appear
    await waitFor(() => {
      expect(screen.getByText('This is a mock AI response.')).toBeVisible();
    });

    // Check that the loading indicator is no longer displayed
    expect(screen.queryByLabelText('Assistant is typing')).not.toBeInTheDocument();
  });

  it('displays suggestion buttons from AI response', async () => {
    setup();
    // Mock AIService.getChatbotResponse to return a response with suggestions
    getChatbotResponseMock.mockResolvedValue({
      data: {
        response: 'Here are some suggestions:',
        suggestions: ['Suggestion 1', 'Suggestion 2']
      }
    });

    // Render the Chatbot component with isOpen set to true
    renderWithProviders(<Chatbot isOpen={true} onClose={() => {}} />);

    // Type a message in the input field
    const inputElement = screen.getByRole('textbox', { name: 'Type your message' });
    fireEvent.change(inputElement, { target: { value: 'Test message' } });

    // Click the send button
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    // Wait for the AI response to appear
    await waitFor(() => {
      expect(screen.getByText('Here are some suggestions:')).toBeVisible();
    });

    // Check that suggestion buttons are displayed with correct text
    expect(screen.getByRole('button', { name: 'Suggestion 1' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Suggestion 2' })).toBeVisible();
  });

  it('handles clicking on suggestion buttons', async () => {
    setup();
    // Mock AIService.getChatbotResponse to return responses with suggestions
    getChatbotResponseMock
      .mockResolvedValueOnce({
        data: {
          response: 'Here are some suggestions:',
          suggestions: ['Suggestion 1']
        }
      })
      .mockResolvedValueOnce({
        data: {
          response: 'Response to suggestion 1',
          suggestions: []
        }
      });

    // Render the Chatbot component with isOpen set to true
    renderWithProviders(<Chatbot isOpen={true} onClose={() => {}} />);

    // Wait for initial AI response with suggestions
    await waitFor(() => {
      expect(screen.getByText('Here are some suggestions:')).toBeVisible();
    });

    // Click on a suggestion button
    fireEvent.click(screen.getByRole('button', { name: 'Suggestion 1' }));

    // Check that the suggestion text is sent as a user message
    expect(screen.getByText('Suggestion 1')).toBeVisible();

    // Wait for the AI response to the suggestion
    await waitFor(() => {
      expect(screen.getByText('Response to suggestion 1')).toBeVisible();
    });

    // Check that the AI response to the suggestion is displayed
    expect(screen.getByText('Response to suggestion 1')).toBeVisible();
  });

  it('calls onClose when close button is clicked', () => {
    setup();
    // Create a mock function for onClose
    const onCloseMock = vi.fn();

    // Render the Chatbot component with isOpen set to true and the mock onClose function
    renderWithProviders(<Chatbot isOpen={true} onClose={onCloseMock} />);

    // Click the close button
    fireEvent.click(screen.getByLabelText('Close assistant'));

    // Check that the onClose function was called
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('handles error from AI service gracefully', async () => {
    setup();
    // Mock AIService.getChatbotResponse to throw an error
    getChatbotResponseMock.mockRejectedValue(new Error('AI service error'));

    // Render the Chatbot component with isOpen set to true
    renderWithProviders(<Chatbot isOpen={true} onClose={() => {}} />);

    // Type a message in the input field
    const inputElement = screen.getByRole('textbox', { name: 'Type your message' });
    fireEvent.change(inputElement, { target: { value: 'Test message' } });

    // Click the send button
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    // Wait for the error message to appear
    await waitFor(() => {
      expect(screen.getByText("I'm sorry, I'm having trouble connecting right now. Please try again later.")).toBeVisible();
    });

    // Check that an appropriate error message is displayed to the user
    expect(screen.getByText("I'm sorry, I'm having trouble connecting right now. Please try again later.")).toBeVisible();
  });
});
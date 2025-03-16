import React, { useState, useEffect, useRef } from 'react';
import styled from '@emotion/styled';
import { Typography, IconButton, Box, Divider } from '@mui/material';
import { Close, Send } from '@mui/icons-material';
import Button from '../Common/Button';
import TextField from '../Common/TextField';
import Card from '../Common/Card';
import LoadingSkeleton from '../Common/LoadingSkeleton';
import AIService from '../../services/AIService';
import { AsyncStatus, ID } from '../../types/common';
import { colors, spacing, borderRadius } from '../../styles/variables';

/**
 * Props interface for the Chatbot component
 */
interface ChatbotProps {
  /** Whether the chatbot is open/visible */
  isOpen: boolean;
  /** Function to close the chatbot */
  onClose: () => void;
  /** Optional ID of the current application for context-aware responses */
  applicationId?: ID;
  /** Optional CSS class name */
  className?: string;
}

/**
 * Interface for chat message objects
 */
interface Message {
  /** Unique identifier for the message */
  id: string;
  /** Message content */
  text: string;
  /** Who sent the message - user or AI */
  sender: 'user' | 'ai';
  /** When the message was sent */
  timestamp: string;
  /** Optional suggested responses for the user */
  suggestions?: string[];
}

// Styled components
const ChatbotContainer = styled(Card)`
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 350px;
  height: 500px;
  z-index: 1000;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border-radius: ${borderRadius.md};
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 0;
`;

const ChatbotHeader = styled(Box)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${spacing.md};
  background-color: ${colors.primary};
  color: ${colors.white};
  border-bottom: 1px solid ${colors.neutralLight};
`;

const MessagesContainer = styled(Box)`
  flex-grow: 1;
  padding: ${spacing.md};
  overflow-y: auto;
  display: flex;
  flex-direction: column;
`;

const MessageBubble = styled(Box)<{ $sender: 'user' | 'ai' }>`
  margin: ${spacing.xs} 0;
  padding: ${spacing.sm} ${spacing.md};
  border-radius: ${borderRadius.md};
  max-width: 80%;
  background-color: ${props => props.$sender === 'user' ? colors.primary : colors.neutralLight};
  color: ${props => props.$sender === 'user' ? colors.white : colors.neutralDark};
  align-self: ${props => props.$sender === 'user' ? 'flex-end' : 'flex-start'};
  word-break: break-word;
`;

const SuggestionsContainer = styled(Box)`
  display: flex;
  flex-wrap: wrap;
  gap: ${spacing.xs};
  margin-top: ${spacing.sm};
`;

const SuggestionButton = styled(Button)`
  margin: ${spacing.xs} ${spacing.xs} 0 0;
`;

const InputContainer = styled(Box)`
  display: flex;
  align-items: center;
  padding: ${spacing.md};
  border-top: 1px solid ${colors.neutralLight};
`;

const StyledTextField = styled(TextField)`
  flex-grow: 1;
  margin-right: ${spacing.sm};
`;

const SendButton = styled(IconButton)`
  color: ${colors.primary};
  &:hover {
    background-color: rgba(25, 118, 210, 0.08);
  }
`;

const LoadingIndicator = styled(Box)`
  display: flex;
  align-items: center;
  padding: ${spacing.sm};
  margin: ${spacing.xs} 0;
`;

const InfoFooter = styled(Box)`
  padding: ${spacing.xs};
  text-align: center;
  color: ${colors.neutralMedium};
  font-size: 12px;
  border-top: 1px solid ${colors.neutralLight};
`;

/**
 * A React component that implements an AI-powered chatbot interface
 * for the Student Admissions Enrollment Platform. This component provides
 * contextual assistance to users, answers common questions about the
 * admissions process, and guides applicants through various tasks.
 */
const Chatbot: React.FC<ChatbotProps> = ({
  isOpen,
  onClose,
  applicationId,
  className,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Send initial greeting when chatbot opens
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const initialMessage: Message = {
        id: Date.now().toString(),
        text: "Hello! I'm your admissions assistant. How can I help you today?",
        sender: 'ai',
        timestamp: new Date().toISOString(),
        suggestions: [
          "When will I receive my admission decision?",
          "What documents do I need to submit?",
          "How do I check my application status?"
        ]
      };
      setMessages([initialMessage]);
    }
  }, [isOpen, messages.length]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Don't render anything if chatbot is closed
  if (!isOpen) return null;

  /**
   * Sends the current message to the AI service and processes the response
   */
  const handleSendMessage = async () => {
    // Prevent sending empty messages
    if (!inputValue.trim()) return;

    // Create a new user message object
    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue.trim(),
      sender: 'user',
      timestamp: new Date().toISOString()
    };

    // Add the user message to the messages state
    setMessages(prev => [...prev, userMessage]);
    
    // Clear the input field
    setInputValue('');
    
    // Set loading state to true
    setIsLoading(true);

    try {
      // Try to get response from AIService.getChatbotResponse
      const context = applicationId ? { applicationId } : {};
      const response = await AIService.getChatbotResponse(inputValue, context);

      // Create a new AI message object with the response
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.data.response,
        sender: 'ai',
        timestamp: new Date().toISOString(),
        suggestions: response.data.suggestions
      };

      // Add the AI message to the messages state
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      // Handle any errors by displaying an error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'm sorry, I'm having trouble connecting right now. Please try again later.",
        sender: 'ai',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      // Set loading state to false
      setIsLoading(false);
    }
  };

  /**
   * Updates the input state as the user types
   */
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  /**
   * Handles keyboard events in the input field
   */
  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSendMessage();
    }
  };

  /**
   * Handles clicks on suggested responses
   */
  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    handleSendMessage();
  };

  return (
    <ChatbotContainer 
      className={className} 
      variant="elevation"
      elevation="md"
    >
      <ChatbotHeader role="banner">
        <Typography variant="h6">Admissions Assistant</Typography>
        <IconButton 
          onClick={onClose} 
          color="inherit" 
          aria-label="Close assistant"
        >
          <Close />
        </IconButton>
      </ChatbotHeader>

      <MessagesContainer 
        role="log" 
        aria-live="polite" 
        aria-label="Conversation"
      >
        {messages.map(message => (
          <MessageBubble 
            key={message.id} 
            $sender={message.sender}
            role="listitem"
            aria-label={`${message.sender === 'user' ? 'You' : 'Assistant'}: ${message.text}`}
          >
            <Typography variant="body1">{message.text}</Typography>
          </MessageBubble>
        ))}

        {isLoading && (
          <LoadingIndicator aria-label="Assistant is typing">
            <LoadingSkeleton 
              variant="text" 
              width="60%" 
              height="20px" 
            />
          </LoadingIndicator>
        )}

        {/* Only show suggestions from the last AI message */}
        {messages.length > 0 && 
          messages[messages.length - 1].sender === 'ai' && 
          messages[messages.length - 1].suggestions && 
          messages[messages.length - 1].suggestions!.length > 0 && (
            <SuggestionsContainer role="group" aria-label="Suggested questions">
              {messages[messages.length - 1].suggestions!.map((suggestion, index) => (
                <SuggestionButton
                  key={index}
                  variant="outlined"
                  size="small"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion}
                </SuggestionButton>
              ))}
            </SuggestionsContainer>
          )
        }

        <div ref={messagesEndRef} />
      </MessagesContainer>

      <InputContainer role="form">
        <StyledTextField
          value={inputValue}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder="Type your message here..."
          fullWidth
          disabled={isLoading}
          inputProps={{
            'aria-label': 'Type your message',
          }}
        />
        <SendButton 
          onClick={handleSendMessage} 
          disabled={isLoading || !inputValue.trim()}
          aria-label="Send message"
        >
          <Send />
        </SendButton>
      </InputContainer>
      <InfoFooter>
        <Typography variant="caption">
          You can ask about application status, deadlines, required documents, and more.
        </Typography>
      </InfoFooter>
    </ChatbotContainer>
  );
};

export default Chatbot;
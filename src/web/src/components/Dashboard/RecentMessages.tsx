import React, { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom'; // react-router-dom v6.8.1
import { useDispatch, useSelector } from 'react-redux'; // react-redux v8.0.5
import {
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Button,
} from '@mui/material'; // @mui/material v5.11.10
import { styled } from '@mui/material/styles'; // @mui/material/styles v5.11.10
import { Email, FiberManualRecord } from '@mui/icons-material'; // @mui/icons-material v5.11.10
import {
  Card,
  LoadingSkeleton,
  EmptyState,
} from '../Common';
import {
  fetchMessages,
  selectMessages,
  selectMessagesLoading,
} from '../../redux/slices/messagesSlice';
import { Message } from '../../types/message';

/**
 * Props interface for the RecentMessages component
 */
interface RecentMessagesProps {
  limit?: number;
  onViewAll?: () => void;
  className?: string;
}

// Styled ListItem with hover effects, cursor pointer, and padding
const MessageListItem = styled(ListItem)`
  cursor: pointer;
  padding: 12px 16px;
  &:hover {
    background-color: rgba(0, 0, 0, 0.04);
  }
`;

// Styled Typography with text truncation, gray color, and smaller font size
const MessagePreview = styled(Typography)`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #757575;
  font-size: 0.875rem;
`;

// Styled Typography for timestamp with smaller font size and gray color
const MessageTime = styled(Typography)`
  font-size: 0.75rem;
  color: #757575;
`;

// Styled icon for unread messages with primary color and small size
const UnreadIndicator = styled(FiberManualRecord)`
  color: #1976d2;
  font-size: 0.75rem;
  margin-right: 4px;
`;

// Styled Button for 'View All' action with text transform and size adjustments
const ViewAllButton = styled(Button)`
  text-transform: none;
  font-size: 0.875rem;
  padding: 6px 12px;
`;

/**
 * Component that displays recent messages in the student dashboard
 */
const RecentMessages: React.FC<RecentMessagesProps> = ({ limit = 3, className }) => {
  // Initialize navigate function from useNavigate hook
  const navigate = useNavigate();

  // Initialize dispatch function from useDispatch hook
  const dispatch = useDispatch();

  // Get messages and loading state from Redux store using useSelector
  const messages = useSelector(selectMessages);
  const loading = useSelector(selectMessagesLoading);

  // Define handleViewAllMessages function to navigate to messages page
  const handleViewAllMessages = useCallback(() => {
    navigate('/messages');
  }, [navigate]);

  // Define handleViewMessage function to navigate to specific message
  const handleViewMessage = useCallback((messageId: number) => {
    navigate(`/messages/${messageId}`);
  }, [navigate]);

  // Use useEffect to fetch messages with limit parameter when component mounts
  useEffect(() => {
    dispatch(fetchMessages({ per_page: limit }));
  }, [dispatch, limit]);

  return (
    <Card title="Recent Messages" className={className} actions={<ViewAllButton onClick={handleViewAllMessages}>View All</ViewAllButton>}>
      {/* If loading, display LoadingSkeleton with list variant */}
      {loading ? (
        <LoadingSkeleton variant="list" count={limit} />
      ) : (
        <>
          {/* If no messages and not loading, display EmptyState with message icon */}
          {messages.length === 0 ? (
            <EmptyState
              message="No messages yet"
              description="Check back later for updates from the admissions team."
              illustration={<Email />}
            />
          ) : (
            /* If messages exist, render List component with message items */
            <List>
              {messages.map((message) => (
                <MessageListItem
                  key={message.id}
                  alignItems="flex-start"
                  onClick={() => handleViewMessage(message.id)}
                >
                  <ListItemAvatar>
                    <Avatar alt={message.sender.profile?.first_name || 'Sender'} src={message.sender.profile_picture_url || ''}>
                      {message.sender.profile?.first_name?.charAt(0) || 'U'}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center">
                        {/* Display unread indicator for unread messages */}
                        {!message.is_read && <UnreadIndicator />}
                        <Typography variant="subtitle2" fontWeight="bold">
                          {message.subject}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <React.Fragment>
                        {/* Truncate message preview text to fit in the available space */}
                        <MessagePreview component="span" variant="body2" color="text.primary">
                          {message.message_body}
                        </MessagePreview>
                        <MessageTime display="block" variant="caption" align="right">
                          {message.formatted_created_at}
                        </MessageTime>
                      </React.Fragment>
                    }
                  />
                </MessageListItem>
              ))}
            </List>
          )}
        </>
      )}
    </Card>
  );
};

export default RecentMessages;
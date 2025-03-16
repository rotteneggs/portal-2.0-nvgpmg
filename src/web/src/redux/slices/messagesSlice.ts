import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'; // v1.9.3
import {
  Message, 
  MessageResponse, 
  MessagePaginationOptions, 
  MessageCreateRequest, 
  MessageReplyRequest, 
  UnreadCountResponse
} from '../../types/message';
import {
  getMessages,
  getMessage,
  sendMessage as apiSendMessage,
  replyToMessage as apiReplyToMessage,
  markAsRead as apiMarkAsRead,
  markAsUnread as apiMarkAsUnread,
  getUnreadCount,
  getApplicationMessages,
  deleteMessage as apiDeleteMessage,
  searchMessages as apiSearchMessages
} from '../../api/messages';

// Define the state structure for messages management
export interface MessagesState {
  messages: Message[];
  currentMessage: Message | null;
  unreadCount: number;
  pagination: MessageResponse['meta'] | null;
  loading: boolean;
  error: string | null;
}

// Define initial state
const initialState: MessagesState = {
  messages: [],
  currentMessage: null,
  unreadCount: 0,
  pagination: null,
  loading: false,
  error: null
};

// Async thunks for message operations
export const fetchMessagesThunk = createAsyncThunk(
  'messages/fetchMessages',
  async (params: MessagePaginationOptions) => {
    try {
      const response = await getMessages(params);
      return response;
    } catch (error) {
      throw error instanceof Error ? error.message : 'Failed to fetch messages';
    }
  }
);

export const fetchMessageThunk = createAsyncThunk(
  'messages/fetchMessage',
  async (messageId: number) => {
    try {
      const response = await getMessage(messageId);
      return response;
    } catch (error) {
      throw error instanceof Error ? error.message : 'Failed to fetch message';
    }
  }
);

export const fetchUnreadCountThunk = createAsyncThunk(
  'messages/fetchUnreadCount',
  async () => {
    try {
      const response = await getUnreadCount();
      return response.count;
    } catch (error) {
      throw error instanceof Error ? error.message : 'Failed to fetch unread count';
    }
  }
);

export const sendMessageThunk = createAsyncThunk(
  'messages/sendMessage',
  async (messageData: MessageCreateRequest) => {
    try {
      const response = await apiSendMessage(messageData);
      return response;
    } catch (error) {
      throw error instanceof Error ? error.message : 'Failed to send message';
    }
  }
);

export const replyToMessageThunk = createAsyncThunk(
  'messages/replyToMessage',
  async (payload: { messageId: number, replyData: MessageReplyRequest }) => {
    try {
      const { messageId, replyData } = payload;
      const response = await apiReplyToMessage(messageId, replyData);
      return response;
    } catch (error) {
      throw error instanceof Error ? error.message : 'Failed to reply to message';
    }
  }
);

export const markMessageAsReadThunk = createAsyncThunk(
  'messages/markAsRead',
  async (messageId: number) => {
    try {
      await apiMarkAsRead(messageId);
      return messageId;
    } catch (error) {
      throw error instanceof Error ? error.message : 'Failed to mark message as read';
    }
  }
);

export const markMessageAsUnreadThunk = createAsyncThunk(
  'messages/markAsUnread',
  async (messageId: number) => {
    try {
      await apiMarkAsUnread(messageId);
      return messageId;
    } catch (error) {
      throw error instanceof Error ? error.message : 'Failed to mark message as unread';
    }
  }
);

export const fetchApplicationMessagesThunk = createAsyncThunk(
  'messages/fetchApplicationMessages',
  async (payload: { applicationId: number, options: MessagePaginationOptions }) => {
    try {
      const { applicationId, options } = payload;
      const response = await getApplicationMessages(applicationId, options);
      return response;
    } catch (error) {
      throw error instanceof Error ? error.message : 'Failed to fetch application messages';
    }
  }
);

export const deleteMessageThunk = createAsyncThunk(
  'messages/deleteMessage',
  async (messageId: number) => {
    try {
      await apiDeleteMessage(messageId);
      return messageId;
    } catch (error) {
      throw error instanceof Error ? error.message : 'Failed to delete message';
    }
  }
);

export const searchMessagesThunk = createAsyncThunk(
  'messages/searchMessages',
  async (payload: { searchTerm: string, options: MessagePaginationOptions }) => {
    try {
      const { searchTerm, options } = payload;
      const response = await apiSearchMessages(searchTerm, options);
      return response;
    } catch (error) {
      throw error instanceof Error ? error.message : 'Failed to search messages';
    }
  }
);

// Create the messages slice
const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    clearCurrentMessage: (state) => {
      state.currentMessage = null;
    },
    clearMessagesError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Handle fetchMessages
    builder.addCase(fetchMessagesThunk.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchMessagesThunk.fulfilled, (state, action: PayloadAction<MessageResponse>) => {
      state.loading = false;
      state.messages = action.payload.data;
      state.pagination = action.payload.meta;
    });
    builder.addCase(fetchMessagesThunk.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to fetch messages';
    });

    // Handle fetchMessage
    builder.addCase(fetchMessageThunk.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchMessageThunk.fulfilled, (state, action: PayloadAction<Message>) => {
      state.loading = false;
      state.currentMessage = action.payload;
      
      // Update the message in the messages array if it exists
      const index = state.messages.findIndex(msg => msg.id === action.payload.id);
      if (index !== -1) {
        state.messages[index] = action.payload;
      }
    });
    builder.addCase(fetchMessageThunk.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to fetch message';
    });

    // Handle fetchUnreadCount
    builder.addCase(fetchUnreadCountThunk.fulfilled, (state, action: PayloadAction<number>) => {
      state.unreadCount = action.payload;
    });

    // Handle sendMessage
    builder.addCase(sendMessageThunk.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(sendMessageThunk.fulfilled, (state, action: PayloadAction<Message>) => {
      state.loading = false;
      // Add the new message to the top of the messages array
      state.messages = [action.payload, ...state.messages];
      state.currentMessage = action.payload;
    });
    builder.addCase(sendMessageThunk.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to send message';
    });

    // Handle replyToMessage
    builder.addCase(replyToMessageThunk.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(replyToMessageThunk.fulfilled, (state, action: PayloadAction<Message>) => {
      state.loading = false;
      // Add the reply to the top of the messages array
      state.messages = [action.payload, ...state.messages];
      state.currentMessage = action.payload;
    });
    builder.addCase(replyToMessageThunk.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to reply to message';
    });

    // Handle markAsRead
    builder.addCase(markMessageAsReadThunk.fulfilled, (state, action: PayloadAction<number>) => {
      const messageId = action.payload;
      
      // Update the message in the list
      const index = state.messages.findIndex(msg => msg.id === messageId);
      if (index !== -1 && !state.messages[index].is_read) {
        state.messages[index].is_read = true;
        state.messages[index].read_at = new Date().toISOString();
        // Decrement unread count
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
      
      // Update the current message if it matches
      if (state.currentMessage && state.currentMessage.id === messageId) {
        state.currentMessage.is_read = true;
        state.currentMessage.read_at = new Date().toISOString();
      }
    });

    // Handle markAsUnread
    builder.addCase(markMessageAsUnreadThunk.fulfilled, (state, action: PayloadAction<number>) => {
      const messageId = action.payload;
      
      // Update the message in the list
      const index = state.messages.findIndex(msg => msg.id === messageId);
      if (index !== -1 && state.messages[index].is_read) {
        state.messages[index].is_read = false;
        state.messages[index].read_at = null;
        // Increment unread count
        state.unreadCount += 1;
      }
      
      // Update the current message if it matches
      if (state.currentMessage && state.currentMessage.id === messageId) {
        state.currentMessage.is_read = false;
        state.currentMessage.read_at = null;
      }
    });

    // Handle fetchApplicationMessages
    builder.addCase(fetchApplicationMessagesThunk.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchApplicationMessagesThunk.fulfilled, (state, action: PayloadAction<MessageResponse>) => {
      state.loading = false;
      state.messages = action.payload.data;
      state.pagination = action.payload.meta;
    });
    builder.addCase(fetchApplicationMessagesThunk.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to fetch application messages';
    });

    // Handle deleteMessage
    builder.addCase(deleteMessageThunk.fulfilled, (state, action: PayloadAction<number>) => {
      const messageId = action.payload;
      
      // Find the message before removing it
      const deletedMsg = state.messages.find(msg => msg.id === messageId);
      
      // Remove the message from the list
      state.messages = state.messages.filter(msg => msg.id !== messageId);
      
      // Clear current message if it matches
      if (state.currentMessage && state.currentMessage.id === messageId) {
        state.currentMessage = null;
      }
      
      // Update unread count if the deleted message was unread
      if (deletedMsg && !deletedMsg.is_read) {
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    });

    // Handle searchMessages
    builder.addCase(searchMessagesThunk.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(searchMessagesThunk.fulfilled, (state, action: PayloadAction<MessageResponse>) => {
      state.loading = false;
      state.messages = action.payload.data;
      state.pagination = action.payload.meta;
    });
    builder.addCase(searchMessagesThunk.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to search messages';
    });
  }
});

// Export actions from the slice
export const { clearCurrentMessage, clearMessagesError } = messagesSlice.actions;

// Export selectors for accessing message state
export const selectMessages = (state: { messages: MessagesState }) => state.messages.messages;
export const selectCurrentMessage = (state: { messages: MessagesState }) => state.messages.currentMessage;
export const selectUnreadCount = (state: { messages: MessagesState }) => state.messages.unreadCount;
export const selectPagination = (state: { messages: MessagesState }) => state.messages.pagination;
export const selectMessagesLoading = (state: { messages: MessagesState }) => state.messages.loading;
export const selectMessagesError = (state: { messages: MessagesState }) => state.messages.error;

// Export named thunks for external usage
export const fetchMessages = fetchMessagesThunk;
export const fetchMessage = fetchMessageThunk;
export const fetchUnreadCount = fetchUnreadCountThunk;
export const sendMessage = sendMessageThunk;
export const replyToMessage = replyToMessageThunk;
export const markAsRead = markMessageAsReadThunk;
export const markAsUnread = markMessageAsUnreadThunk;
export const fetchApplicationMessages = fetchApplicationMessagesThunk;
export const deleteMessage = deleteMessageThunk;
export const searchMessages = searchMessagesThunk;

// Export the slice as default
export default messagesSlice;
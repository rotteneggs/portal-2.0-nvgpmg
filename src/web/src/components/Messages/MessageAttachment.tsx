import React, { useState } from 'react';
import styled from '@emotion/styled';
import { Typography, CircularProgress } from '@mui/material';
import {
  InsertDriveFileOutlined,
  PictureAsPdfOutlined,
  ImageOutlined,
  DescriptionOutlined,
  GetAppOutlined
} from '@mui/icons-material';

import MessageService from '../../services/MessageService';
import { MessageAttachment } from '../../types/message';
import { isImageFile, isPdfFile, formatFileSize } from '../../utils/fileUtils';
import { colors, spacing } from '../../styles/variables';
import useNotification from '../../hooks/useNotification';

interface MessageAttachmentProps {
  attachment: MessageAttachment;
  className?: string;
}

const AttachmentContainer = styled.div`
  display: flex;
  align-items: center;
  padding: ${spacing.md};
  border: 1px solid ${colors.border.light};
  border-radius: 4px;
  margin-bottom: ${spacing.sm};
  background-color: ${colors.background.paper};
  transition: all 0.2s ease-in-out;
  
  &:hover {
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  @media (max-width: 600px) {
    padding: ${spacing.sm};
  }
`;

const FileIconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  color: ${colors.primary};
  margin-right: ${spacing.md};
  
  @media (max-width: 600px) {
    width: 32px;
    height: 32px;
    margin-right: ${spacing.sm};
  }
`;

const FileInfo = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
`;

const FileName = styled(Typography)`
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const FileSize = styled(Typography)`
  color: ${colors.text.secondary};
`;

const DownloadButton = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  color: ${colors.primary};
  margin-left: ${spacing.sm};
  transition: background-color 0.2s ease;
  
  &:hover {
    background-color: rgba(25, 118, 210, 0.08);
  }
  
  &:active {
    background-color: rgba(25, 118, 210, 0.16);
  }
  
  @media (max-width: 600px) {
    width: 32px;
    height: 32px;
  }
`;

const MessageAttachmentComponent: React.FC<MessageAttachmentProps> = ({ attachment, className }) => {
  const [loading, setLoading] = useState(false);
  const notification = useNotification();

  const handleDownload = async (): Promise<void> => {
    setLoading(true);
    try {
      const downloadUrl = await MessageService.getAttachmentUrl(attachment.id);
      window.open(downloadUrl, '_blank');
    } catch (error) {
      console.error('Failed to download attachment:', error);
      // Since we don't have direct notification methods, we'll just log the error
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (mimeType: string): JSX.Element => {
    if (isImageFile(mimeType)) {
      return <ImageOutlined />; 
    } else if (isPdfFile(mimeType)) {
      return <PictureAsPdfOutlined />;
    } else if (mimeType.includes('word') || mimeType.includes('document')) {
      return <DescriptionOutlined />;
    } else {
      return <InsertDriveFileOutlined />;
    }
  };

  return (
    <AttachmentContainer className={className}>
      <FileIconWrapper>
        {getFileIcon(attachment.mime_type)}
      </FileIconWrapper>
      <FileInfo>
        <FileName variant="body1" noWrap>
          {attachment.file_name}
        </FileName>
        <FileSize variant="caption">
          {formatFileSize(attachment.file_size)}
        </FileSize>
      </FileInfo>
      <DownloadButton onClick={handleDownload}>
        {loading ? <CircularProgress size={20} /> : <GetAppOutlined />}
      </DownloadButton>
    </AttachmentContainer>
  );
};

export default MessageAttachmentComponent;
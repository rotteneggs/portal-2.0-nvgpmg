import React from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import Grid from '@mui/material/Grid';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { styled } from '@mui/material/styles';

// Styled components
const FooterContainer = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  padding: theme.spacing(6, 0),
  borderTop: `1px solid ${theme.palette.divider}`,
}));

const FooterContent = styled(Container)(({ theme }) => ({
  maxWidth: 'lg',
  padding: theme.spacing(0, 2),
}));

const FooterSection = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
}));

const FooterLink = styled(Link)(({ theme }) => ({
  color: theme.palette.text.secondary,
  '&:hover': {
    color: theme.palette.primary.main,
    textDecoration: 'underline',
  },
  '&:focus': {
    color: theme.palette.primary.main,
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: '2px',
  },
  marginBottom: theme.spacing(1),
  display: 'block',
  textDecoration: 'none',
}));

const CopyrightSection = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(4),
  paddingTop: theme.spacing(2),
  borderTop: `1px solid ${theme.palette.divider}`,
}));

// Constants
const CURRENT_YEAR = new Date().getFullYear();

const QUICK_LINKS = [
  { text: 'Home', href: '/' },
  { text: 'Applications', href: '/applications' },
  { text: 'Documents', href: '/documents' },
  { text: 'Financial Aid', href: '/financial-aid' },
  { text: 'Messages', href: '/messages' },
];

const RESOURCES = [
  { text: 'Application Guide', href: '/resources/application-guide' },
  { text: 'Document Requirements', href: '/resources/document-requirements' },
  { text: 'Financial Aid Info', href: '/resources/financial-aid' },
  { text: 'FAQ', href: '/resources/faq' },
];

const HELP_LINKS = [
  { text: 'Contact Support', href: '/support' },
  { text: 'Report an Issue', href: '/support/report-issue' },
  { text: 'Privacy Policy', href: '/privacy-policy' },
  { text: 'Terms of Service', href: '/terms-of-service' },
];

const Footer: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <FooterContainer component="footer" aria-labelledby="footer-heading">
      <FooterContent>
        <Typography 
          id="footer-heading" 
          sx={{ 
            position: 'absolute',
            width: '1px',
            height: '1px',
            padding: '0',
            margin: '-1px',
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
            border: '0'
          }}
        >
          Footer
        </Typography>
        <Grid container spacing={4} justifyContent="space-between">
          {/* Institution Information */}
          <Grid item xs={12} sm={6} md={3}>
            <FooterSection>
              <Typography variant="h6" color="text.primary" gutterBottom>
                Student Admissions
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Your pathway to academic excellence
              </Typography>
              <Box mt={2}>
                <Typography variant="body2" color="text.secondary">
                  123 University Avenue
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Collegetown, ST 12345
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Email: admissions@university.edu
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Phone: (123) 456-7890
                </Typography>
              </Box>
            </FooterSection>
          </Grid>

          {/* Quick Links */}
          <Grid item xs={6} sm={6} md={3}>
            <FooterSection>
              <Typography variant="h6" color="text.primary" gutterBottom>
                Quick Links
              </Typography>
              <nav aria-label="Quick links navigation">
                {QUICK_LINKS.map((link) => (
                  <FooterLink key={link.text} href={link.href}>
                    {link.text}
                  </FooterLink>
                ))}
              </nav>
            </FooterSection>
          </Grid>

          {/* Resources */}
          <Grid item xs={6} sm={6} md={3}>
            <FooterSection>
              <Typography variant="h6" color="text.primary" gutterBottom>
                Resources
              </Typography>
              <nav aria-label="Resources navigation">
                {RESOURCES.map((link) => (
                  <FooterLink key={link.text} href={link.href}>
                    {link.text}
                  </FooterLink>
                ))}
              </nav>
            </FooterSection>
          </Grid>

          {/* Help & Support */}
          <Grid item xs={6} sm={6} md={3}>
            <FooterSection>
              <Typography variant="h6" color="text.primary" gutterBottom>
                Help & Support
              </Typography>
              <nav aria-label="Help and support navigation">
                {HELP_LINKS.map((link) => (
                  <FooterLink key={link.text} href={link.href}>
                    {link.text}
                  </FooterLink>
                ))}
              </nav>
            </FooterSection>
          </Grid>
        </Grid>

        {/* Copyright Section */}
        <CopyrightSection>
          <Grid container spacing={1} direction={isMobile ? 'column' : 'row'} alignItems={isMobile ? 'flex-start' : 'center'}>
            <Grid item xs={12} sm="auto">
              <Typography variant="body2" color="text.secondary">
                © {CURRENT_YEAR} Student Admissions Enrollment Platform. All rights reserved.
              </Typography>
            </Grid>
            <Grid item xs={12} sm="auto" sx={{ marginLeft: isMobile ? 0 : 'auto' }}>
              <Box display="flex" flexWrap="wrap">
                <FooterLink href="/privacy-policy" sx={{ mr: 2 }}>
                  Privacy Policy
                </FooterLink>
                <FooterLink href="/terms-of-service" sx={{ mr: 2 }}>
                  Terms of Service
                </FooterLink>
                <FooterLink href="/accessibility">
                  Accessibility
                </FooterLink>
              </Box>
            </Grid>
          </Grid>
        </CopyrightSection>
      </FooterContent>
    </FooterContainer>
  );
};

export default Footer;
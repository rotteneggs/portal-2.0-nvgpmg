import { Global, css } from '@emotion/react'; // @emotion/react ^11.10.0
import { colors, typography } from './variables';
import { mediaQueries } from './breakpoints';
import { focusOutline } from './mixins';

/**
 * GlobalStyles component that applies consistent base styling throughout the application.
 * Implements design system specifications and ensures accessibility standards are met.
 */
const GlobalStyles: React.FC = () => {
  return (
    <Global
      styles={css`
        /* CSS Reset */
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        /* Base HTML styling */
        html, body {
          height: 100%;
          font-family: ${typography.fontFamily};
          font-size: ${typography.fontSizes.body1};
          line-height: ${typography.lineHeights.normal};
          color: ${colors.neutralDark};
          background-color: ${colors.white};
          scroll-behavior: smooth;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        body {
          overflow-x: hidden;
        }

        /* Typography */
        h1, h2, h3, h4, h5, h6 {
          margin-bottom: 0.5em;
          font-weight: ${typography.fontWeights.medium};
          line-height: ${typography.lineHeights.tight};
        }

        /* Links */
        a {
          color: ${colors.primary};
          text-decoration: none;
          transition: color 0.2s ease-in-out;
        }

        a:hover {
          text-decoration: underline;
        }

        /* Form elements */
        button,
        input,
        select,
        textarea {
          font-family: inherit;
          font-size: inherit;
          line-height: inherit;
        }

        /* Hide default focus outlines in favor of custom ones */
        button:focus,
        input:focus,
        select:focus,
        textarea:focus,
        a:focus {
          outline: none;
        }
        
        /* Apply custom focus outline for accessibility */
        button,
        input,
        select,
        textarea,
        a {
          ${focusOutline}
        }

        /* Image handling */
        img {
          max-width: 100%;
          height: auto;
        }

        /* Root element for React app */
        #root {
          height: 100%;
        }

        /* Responsive typography */
        ${mediaQueries.sm} {
          html {
            font-size: 17px; /* Slight increase for small screens */
          }
        }

        ${mediaQueries.md} {
          html {
            font-size: 18px; /* Further increase for medium screens */
          }
        }
      `}
    />
  );
};

export default GlobalStyles;
// AppShell/index.ts
/**
 * Index file that exports all components from the AppShell directory, providing a centralized entry point for importing AppShell components throughout the application.
 * This simplifies imports by allowing consumers to import from the directory rather than individual files.
 */

import AppShell, { AppShellProps } from './AppShell';
import Header, { HeaderProps } from './Header';
import Sidebar, { SidebarProps } from './Sidebar';
import Footer from './Footer';
import MobileNavigation from './MobileNavigation';
import React from 'react'; // react v18.2.0

// Export the AppShell component
export { AppShell };

// Export the Header component
export { Header };

// Export the Sidebar component
export { Sidebar };

// Export the Footer component
export { Footer };

// Export the MobileNavigation component
export { MobileNavigation };

// Export the AppShell component as the default export
export default AppShell;

// Export React.FC<React.PropsWithChildren<AppShellProps>>
export type AppShellType = React.FC<React.PropsWithChildren<AppShellProps>>;

// Export HeaderProps
export type HeaderType = React.FC<HeaderProps>;

// Export SidebarProps
export type SidebarType = React.FC<SidebarProps>;

// Export FooterProps
export type FooterType = React.FC;

// Export MobileNavigationProps
export type MobileNavigationType = React.FC;
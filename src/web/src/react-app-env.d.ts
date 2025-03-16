/// <reference types="react-scripts" />

// Image file declarations
declare module "*.svg" {
  import React = require("react");
  export const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  const src: string;
  export default src;
}

declare module "*.png" {
  const src: string;
  export default src;
}

declare module "*.jpg" {
  const src: string;
  export default src;
}

declare module "*.jpeg" {
  const src: string;
  export default src;
}

declare module "*.gif" {
  const src: string;
  export default src;
}

declare module "*.bmp" {
  const src: string;
  export default src;
}

declare module "*.pdf" {
  const src: string;
  export default src;
}

// Style module declarations
declare module "*.module.css" {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module "*.module.scss" {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module "*.module.less" {
  const classes: { readonly [key: string]: string };
  export default classes;
}

// JSON declaration
declare module "*.json" {
  const value: any;
  export default value;
}

// Extend NodeJS namespace for environment variables
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: string;
    REACT_APP_API_URL: string;
    REACT_APP_STORAGE_URL: string;
    REACT_APP_WEBSOCKET_URL: string;
  }
}
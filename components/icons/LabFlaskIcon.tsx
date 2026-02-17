
import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {}

export const LabFlaskIcon: React.FC<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M10 2v7.31l-4.5 8.437a2 2 0 0 0 1.76 2.938h9.48a2 2 0 0 0 1.76-2.938l-4.5-8.437V2" />
    <path d="M8.5 2h7" />
    <path d="M7 15h10" />
    <circle cx="11" cy="18" r="1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="11" r="1" fill="currentColor" stroke="none" />
  </svg>
);

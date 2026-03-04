import React from 'react';
interface IconProps extends React.SVGProps<SVGSVGElement> { }

export const NetworkIcon: React.FC<IconProps> = (props) => (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        {/* Grey connections */}
        <line x1="50" y1="50" x2="50" y2="15" stroke="#9ca3af" strokeWidth="6" strokeLinecap="round" />
        <line x1="50" y1="50" x2="75" y2="25" stroke="#9ca3af" strokeWidth="6" strokeLinecap="round" />
        <line x1="50" y1="50" x2="85" y2="50" stroke="#9ca3af" strokeWidth="6" strokeLinecap="round" />
        <line x1="50" y1="50" x2="50" y2="85" stroke="#9ca3af" strokeWidth="6" strokeLinecap="round" />
        <line x1="50" y1="50" x2="25" y2="75" stroke="#9ca3af" strokeWidth="6" strokeLinecap="round" />
        <line x1="50" y1="50" x2="15" y2="50" stroke="#9ca3af" strokeWidth="6" strokeLinecap="round" />

        {/* Blue connections */}
        <line x1="50" y1="50" x2="25" y2="25" stroke="#1d4ed8" strokeWidth="6" strokeLinecap="round" />
        <line x1="50" y1="50" x2="75" y2="75" stroke="#1d4ed8" strokeWidth="6" strokeLinecap="round" />

        {/* Center node */}
        <circle cx="50" cy="50" r="18" fill="#1d4ed8" />

        {/* Grey nodes */}
        <circle cx="50" cy="15" r="9" fill="#9ca3af" />
        <circle cx="75" cy="25" r="9" fill="#9ca3af" />
        <circle cx="85" cy="50" r="9" fill="#9ca3af" />
        <circle cx="50" cy="85" r="9" fill="#9ca3af" />
        <circle cx="25" cy="75" r="9" fill="#9ca3af" />
        <circle cx="15" cy="50" r="9" fill="#9ca3af" />

        {/* Blue nodes */}
        <circle cx="25" cy="25" r="9" fill="#1d4ed8" />
        <circle cx="75" cy="75" r="9" fill="#1d4ed8" />
    </svg>
);

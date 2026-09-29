import { SVGAttributes } from 'react';

export default function ApplicationLogo(props: SVGAttributes<SVGElement>) {
    return (
        <svg
            {...props}
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={props.className || "h-10 w-10 text-indigo-600"}
        >
            <rect width="48" height="48" rx="12" fill="currentColor" fillOpacity="0.1" />
            <path
                d="M24 12L36 20V32L24 40L12 32V20L24 12Z"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M24 24V40M12 20L24 28L36 20"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

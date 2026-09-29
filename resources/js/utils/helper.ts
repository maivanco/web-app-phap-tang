import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function admin_url(path: string = ''): string {
    const base = '/admin'; // your admin base
    return `${base}/${path}`.replace(/\/+$/, ''); // clean trailing slashes
}
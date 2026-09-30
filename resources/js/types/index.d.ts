export interface User {
    id: number;
    name: string;
    email: string;
    role?: 'admin' | 'manager' | 'seller' | string;
    telegram_user_id?: number | null;
    email_verified_at?: string;
    created_at?: string;
    updated_at?: string;
}

export type PageProps<T extends Record<string, unknown> = Record<string, unknown>> = T & {
    auth: {
        user: User;
    };
    translations?: Record<string, any>;
};

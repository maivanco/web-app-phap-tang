import { usePage } from '@inertiajs/react';

type TranslationKey = string;
type TranslationValue = string | Record<string, any>;

interface Translations {
    [key: string]: TranslationValue;
}

interface PageProps extends Record<string, unknown> {
    translations?: Translations;
}

/**
 * Hook to access translations from Laravel
 * Usage: const t = useTranslation(); t('section-builder.create.title')
 */
export function useTranslation() {
    const { translations = {} } = usePage<PageProps>().props;

    const translate = (key: string, replacements: Record<string, string> = {}): string => {
        const keys = key.split('.');
        let value: any = translations;

        // Navigate through nested translation object
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                // Return the key if translation not found
                return key;
            }
        }

        // If value is still an object, return the key
        if (typeof value !== 'string') {
            return key;
        }

        // Replace placeholders like :name, :count, etc.
        let translated = value;
        Object.keys(replacements).forEach((placeholder) => {
            translated = translated.replace(`:${placeholder}`, replacements[placeholder]);
        });

        return translated;
    };

    return translate;
}

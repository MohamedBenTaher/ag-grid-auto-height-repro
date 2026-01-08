export const useTranslation = (namespace?: string) => {
  return {
    t: (key: string) => {
        const parts = key.split('.');
        return parts[parts.length - 1]; // Return last part of key as fallback
    },
    i18n: { language: 'fi' }
  };
};

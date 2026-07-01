import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { updateLanguage } from '../services/profile';
import { useAuth } from '../contexts/AuthContext';
import { AppLanguage } from '../i18n';

export function useLanguage() {
  const { i18n } = useTranslation();
  const { session } = useAuth();

  const currentLanguage = (i18n.language ?? 'de') as AppLanguage;

  const setLanguage = useCallback(
    async (lang: AppLanguage) => {
      await i18n.changeLanguage(lang);
      if (session?.user.id) {
        await updateLanguage(session.user.id, lang);
      }
    },
    [i18n, session]
  );

  return { currentLanguage, setLanguage };
}

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { termsService } from '@/api/services/terms.service';

interface TermsModalProps {
  termsVersionId: string;
  onClose: () => void;
}

export function TermsModal({ termsVersionId, onClose }: TermsModalProps) {
  const { t } = useTranslation();
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await fetch(termsService.getTermsContentUrl(termsVersionId));
        const html = await response.text();
        setContent(html);
      } catch (err) {
        console.error('Failed to fetch terms content:', err);
        setContent('<p>Failed to load terms and conditions. Please try again.</p>');
      } finally {
        setIsLoading(false);
      }
    };
    fetchContent();
  }, [termsVersionId]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-hero shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 text-gray-400 hover:text-gray-600 transition-colors bg-white rounded-full p-1 shadow-sm"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex-1 overflow-y-auto p-6 pt-10">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : content ? (
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          ) : (
            <p className="text-gray-600">{t('common.loading')}</p>
          )}
        </div>

        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            style={{ display: 'block', width: '100%', padding: '13px', borderRadius: 10, border: 'none', background: '#6d28d9', color: 'white', fontSize: 14.5, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 18px rgba(109,40,217,0.28)' }}
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
}

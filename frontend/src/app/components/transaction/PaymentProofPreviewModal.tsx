import { LoadingSpinner } from '@/app/components/LoadingSpinner';
import { useTranslation } from 'react-i18next';
import { ModalOverlay } from './ModalOverlay';
import type { PaymentProofPreviewModalProps } from './types';

export function PaymentProofPreviewModal({
  title,
  onClose,
  loading,
  blobUrl,
  contentTypePdf,
}: PaymentProofPreviewModalProps & { contentTypePdf: boolean }) {
  const { t } = useTranslation();
  return (
    <ModalOverlay title={title} onClose={onClose}>
      <div className="max-h-[70vh] overflow-auto rounded-xl border border-gray-100">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <LoadingSpinner size="md" text={t('common.loading')} />
          </div>
        ) : blobUrl ? (
          contentTypePdf ? (
            <iframe src={blobUrl} className="h-[65vh] w-full" title={title} />
          ) : (
            <img src={blobUrl} alt={title} className="mx-auto max-h-[65vh] max-w-full" />
          )
        ) : (
          <div className="flex h-48 items-center justify-center text-sm text-gray-500">
            {t('common.errorLoading')}
          </div>
        )}
      </div>
    </ModalOverlay>
  );
}

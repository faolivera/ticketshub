import { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';

interface ConflictErrorModalProps {
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
  message?: string;
  resourceName?: string;
}

export const ConflictErrorModal: FC<ConflictErrorModalProps> = ({
  open,
  onClose,
  onRefresh,
  message,
  resourceName,
}) => {
  const { t } = useTranslation();

  const handleRefresh = () => {
    onClose();
    onRefresh();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/20">
            <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <DialogTitle className="text-center">
            {t('error.conflict.title')}
          </DialogTitle>
          <DialogDescription className="text-center">
            {message ||
              t('error.conflict.description', {
                resource: resourceName || t('common.resource'),
              })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            {t('common.cancel')}
          </Button>
          <Button onClick={handleRefresh} className="w-full sm:w-auto">
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('common.refresh')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

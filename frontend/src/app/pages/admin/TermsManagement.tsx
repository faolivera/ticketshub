import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Button } from '../../components/ui/button';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { termsService } from '@/api/services/terms.service';
import { TermsUserType } from '@/api/types/terms';

interface TermsEditorProps {
  userType: TermsUserType;
}

function TermsEditor({ userType }: TermsEditorProps) {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    termsService
      .getCurrentTerms(userType)
      .then((data) => {
        if (!cancelled) setContent(data.contentSummary);
      })
      .catch(() => {
        if (!cancelled) setError(t('admin.termsManagement.loadError'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userType, t]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await termsService.updateTermsContent(userType, content);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError(t('admin.termsManagement.saveError'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPreview((v) => !v)}
        >
          {showPreview ? (
            <>
              <EyeOff className="w-4 h-4 mr-1.5" />
              {t('admin.termsManagement.hidePreview')}
            </>
          ) : (
            <>
              <Eye className="w-4 h-4 mr-1.5" />
              {t('admin.termsManagement.preview')}
            </>
          )}
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
          {t('admin.termsManagement.save')}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      {success && (
        <p className="text-sm text-green-600">{t('admin.termsManagement.saveSuccess')}</p>
      )}

      <textarea
        className="w-full rounded-md border bg-muted/20 p-3 font-mono text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
        style={{ minHeight: 400 }}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        spellCheck={false}
      />

      {showPreview && (
        <div className="rounded-md border p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground mb-3">
            {t('admin.termsManagement.preview')}
          </p>
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      )}
    </div>
  );
}

export function TermsManagement() {
  const { t } = useTranslation();

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">{t('admin.termsManagement.title')}</h1>
      <Tabs defaultValue={TermsUserType.Buyer}>
        <TabsList>
          <TabsTrigger value={TermsUserType.Buyer}>
            {t('admin.termsManagement.buyers')}
          </TabsTrigger>
          <TabsTrigger value={TermsUserType.Seller}>
            {t('admin.termsManagement.sellers')}
          </TabsTrigger>
        </TabsList>
        <TabsContent value={TermsUserType.Buyer} className="mt-4">
          <TermsEditor userType={TermsUserType.Buyer} />
        </TabsContent>
        <TabsContent value={TermsUserType.Seller} className="mt-4">
          <TermsEditor userType={TermsUserType.Seller} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

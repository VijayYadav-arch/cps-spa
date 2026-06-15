import '@/styles/claims.css';
import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import CMS1500Form, { type CmsClaimPayload } from './CMS1500Form';
import { downloadClaimPdf, getClaimForPrint } from '@/api/claims';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

export function ClaimPrintView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [claim, setClaim] = useState<CmsClaimPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  // Download PDF hits GET /billing/claims/{id}/print — gated by claims:print.
  const canPrint = usePermission(PERMISSIONS.CLAIMS_PRINT);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setIsLoading(true);
    getClaimForPrint(parseInt(id, 10))
      .then((c) => {
        if (!cancelled) setClaim(c as CmsClaimPayload);
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error).message || 'Could not load claim');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleDownloadPdf() {
    if (!claim) return;
    setIsDownloading(true);
    try {
      const blob = await downloadClaimPdf(claim.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `claim-${claim.claimNumber || claim.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(`PDF download failed: ${(e as Error).message}`);
    } finally {
      setIsDownloading(false);
    }
  }

  if (isLoading) {
    return <div className="p-8 text-navy-700">Loading claim {id}...</div>;
  }
  if (error || !claim) {
    return (
      <div className="p-8" role="alert">
        <h2 className="text-xl text-navy-900">Could not load claim {id}</h2>
        {error && <p className="text-red-600 mt-2">{error}</p>}
        <Link to="/claims" className="text-teal-600 hover:text-teal-700 mt-4 inline-block">
          &larr; Back to Claims
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="no-print bg-navy-50 border-b border-navy-200 px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(`/claims/${claim.id}`)}
          className="px-3 py-1.5 text-sm rounded-md border border-navy-300 text-navy-700 hover:bg-navy-100"
        >
          &larr; Back to claim
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="px-3 py-1.5 text-sm rounded-md bg-teal-600 text-white hover:bg-teal-700"
        >
          Print
        </button>
        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={isDownloading || !canPrint}
          title={!canPrint ? NO_PERMISSION : undefined}
          className="px-3 py-1.5 text-sm rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
        >
          {isDownloading ? 'Generating...' : 'Download PDF'}
        </button>
        <span className="text-xs text-navy-500 ml-auto">
          CMS-1500 claim {claim.claimNumber || claim.id}
        </span>
      </div>

      <CMS1500Form claim={claim} />
    </div>
  );
}

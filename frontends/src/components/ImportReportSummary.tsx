'use client';

import { getImportReportSummary, isDuplicateImportError, type ImportReport } from '@/lib/redux/slices/EpisodeSlice';

export default function ImportReportSummary({ report }: { report?: ImportReport }) {
    const counts = report ? getImportReportSummary(report) : null;
    const validationErrors = report?.errors.filter((error) => !isDuplicateImportError(error.reason)) ?? [];
    const rows = [
        { label: 'Rows processed', value: counts?.rowsProcessed ?? '—' },
        { label: 'New episodes imported', value: counts?.newEpisodesImported ?? '—' },
        { label: 'Already existing', value: counts?.alreadyExisting ?? '—' },
        { label: 'Duplicates inside file', value: counts?.duplicatesInsideFile ?? '—' },
        { label: 'Invalid rows', value: counts?.invalidRows ?? '—', isError: Boolean(counts?.invalidRows) },
    ];

    return (
        <>
            <dl className="mt-4 space-y-3">
                {rows.map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-3 text-[9px]">
                        <dt className="text-slate-500">{item.label}</dt>
                        <dd className={`font-semibold ${item.isError ? 'text-rose-600' : 'text-slate-900'}`}>{item.value}</dd>
                    </div>
                ))}
            </dl>
            <details className="mt-4 rounded-[7px] border border-slate-200 px-2.5 py-2">
                <summary className="cursor-pointer text-[9px] font-medium text-slate-700">View Details</summary>
                <div className="mt-2 max-h-56 overflow-auto rounded-[5px] bg-slate-50 p-2.5 text-[8px] leading-4 text-slate-600">
                    {!report ? 'Run an import to view validation details.' : validationErrors.length ? (
                        <ul className="space-y-1">
                            {validationErrors.map((error, index) => (
                                <li key={`${error.row}-${error.reason}-${index}`}>
                                    Row {error.row}{error.episode_id ? ` (${error.episode_id})` : ''}: {error.reason}
                                </li>
                            ))}
                        </ul>
                    ) : 'No invalid rows.'}
                </div>
            </details>
        </>
    );
}

'use client';

import { useState } from 'react';
import { FileText } from 'lucide-react';
import { toast } from 'sonner';
import ImportReportSummary from '@/components/ImportReportSummary';
import { useImportEpisodesMutation } from '@/lib/redux/slices/EpisodeSlice';

export default function AdminImportEpisodesPage() {
    const [file, setFile] = useState<File | null>(null);
    const [importEpisodes, { data: report, isLoading }] = useImportEpisodesMutation();

    const selectFile = (nextFile?: File) => {
        if (!nextFile) return;
        if (!nextFile.name.toLowerCase().endsWith('.csv')) {
            toast.error('Choose a CSV file to import.');
            return;
        }
        setFile(nextFile);
    };

    const startImport = async () => {
        if (!file) return;
        try {
            const result = await importEpisodes(file).unwrap();
            toast.success(`${result.imported} new episodes imported.`);
        } catch {
            toast.error('Unable to import episodes. Please check the CSV and try again.');
        }
    };

    return (
        <div className="mx-auto min-h-[calc(100vh-54px)] max-w-[1440px] px-5 py-6 sm:px-6 lg:px-[26px]">
            <div className="mb-5">
                <h2 className="text-xl font-semibold text-slate-950">Import Episodes</h2>
                <p className="mt-1 text-[10px] text-slate-500">Import recording metadata safely and review skipped rows.</p>
            </div>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(280px,0.85fr)]">
                <section className="rounded-[11px] border border-slate-200 bg-white p-4 shadow-[0_2px_5px_rgba(15,23,42,0.025)]">
                    <h3 className="text-[11px] font-semibold text-slate-900">CSV Import</h3>
                    <p className="mt-1 text-[9px] text-slate-500">The import is idempotent: already imported episodes are skipped.</p>
                    <label htmlFor="admin-episode-csv" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); selectFile(event.dataTransfer.files[0]); }} className="mt-4 flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-[9px] border border-dashed border-slate-300 bg-slate-50 px-4 text-center hover:border-slate-400">
                        <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-slate-500"><FileText size={16} /></span>
                        <span className="mt-2.5 text-[10px] font-semibold text-slate-900">{file?.name || 'Drop your CSV file here'}</span>
                        <span className="mt-1 text-[8px] text-slate-500">or click to browse · CSV up to 25 MB</span>
                        <span className="mt-2 inline-flex h-7 items-center rounded-[6px] border border-slate-200 bg-white px-2.5 text-[8px] font-medium">Choose file</span>
                        <input id="admin-episode-csv" type="file" accept=".csv,text/csv" onChange={(event) => selectFile(event.target.files?.[0])} className="sr-only" />
                    </label>
                    <div className="mt-3.5 flex justify-end">
                        <button type="button" disabled={!file || isLoading} onClick={startImport} className="h-8 rounded-[7px] bg-slate-900 px-3.5 text-[9px] font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300">{isLoading ? 'Importing...' : 'Start Import'}</button>
                    </div>
                </section>
                <section className="min-h-[260px] rounded-[11px] border border-slate-200 bg-white p-4 shadow-[0_2px_5px_rgba(15,23,42,0.025)]">
                    <h3 className="text-[11px] font-semibold text-slate-900">Last Import</h3>
                    <p className="mt-1 text-[9px] text-slate-500">{report?.filename || 'No import completed yet'}</p>
                    <ImportReportSummary report={report} />
                </section>
            </div>
        </div>
    );
}

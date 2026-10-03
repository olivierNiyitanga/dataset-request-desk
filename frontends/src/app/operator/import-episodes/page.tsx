'use client';

import { useState } from 'react';
import { FileText } from 'lucide-react';
import { toast } from 'sonner';
import ImportReportSummary from '@/components/ImportReportSummary';
import { useImportEpisodesMutation } from '@/lib/redux/slices/EpisodeSlice';

export default function ImportEpisodesPage() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [importEpisodes, { data: report, isLoading }] = useImportEpisodesMutation();

    const chooseFile = (file?: File) => {
        if (!file) return;
        if (!file.name.toLowerCase().endsWith('.csv')) {
            toast.error('Choose a CSV file to import.');
            return;
        }
        setSelectedFile(file);
    };

    const startImport = async () => {
        if (!selectedFile) return;
        try {
            const result = await importEpisodes(selectedFile).unwrap();
            toast.success(`${result.imported} new episodes imported.`);
        } catch {
            toast.error('Unable to import episodes. Please check the CSV and try again.');
        }
    };

    return (
        <div className="mx-auto min-h-[calc(100vh-54px)] max-w-[1440px] px-5 py-6 sm:px-6 lg:px-[26px]">
            <div className="mb-5">
                <h2 className="text-xl font-semibold tracking-tight text-slate-950">Import Episode Metadata</h2>
                <p className="mt-1 text-[10px] text-slate-500">Upload the recording export. Duplicate rows are safely skipped.</p>
            </div>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(280px,0.95fr)]">
                <section className="rounded-[11px] border border-slate-200 bg-white p-4 shadow-[0_2px_5px_rgba(15,23,42,0.025)] sm:p-4">
                    <h3 className="text-[11px] font-semibold text-slate-900">CSV Import</h3>
                    <p className="mt-1 text-[9px] text-slate-500">Episode ID, robot, task, recorded time, duration, operator and quality.</p>
                    <label
                        htmlFor="episode-csv"
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => { event.preventDefault(); chooseFile(event.dataTransfer.files[0]); }}
                        className="mt-4 flex min-h-[190px] cursor-pointer flex-col items-center justify-center rounded-[9px] border border-dashed border-slate-300 bg-slate-50 px-4 text-center transition-colors hover:border-slate-400"
                    >
                        <FileText size={18} className="text-slate-500" />
                        <span className="mt-3 text-[10px] font-semibold text-slate-900">{selectedFile ? selectedFile.name : 'Drop CSV export here'}</span>
                        <span className="mt-1 text-[9px] text-slate-500">or click to browse</span>
                        <span className="mt-2 inline-flex h-7 items-center rounded-[6px] border border-slate-200 bg-white px-2.5 text-[8px] font-medium text-slate-700">Choose file</span>
                        <input id="episode-csv" type="file" accept=".csv,text/csv" onChange={(event) => chooseFile(event.target.files?.[0])} className="sr-only" />
                    </label>
                    <div className="mt-3.5 flex items-center justify-between gap-3">
                        <p className="text-[8px] text-slate-500">Safe to run more than once.</p>
                        <button type="button" disabled={!selectedFile || isLoading} onClick={startImport} className="h-8 rounded-[7px] bg-slate-900 px-3.5 text-[9px] font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300">{isLoading ? 'Importing...' : 'Start Import'}</button>
                    </div>
                </section>

                <section className="min-h-[250px] rounded-[11px] border border-slate-200 bg-white p-4 shadow-[0_2px_5px_rgba(15,23,42,0.025)]">
                    <h3 className="text-[11px] font-semibold text-slate-900">Last Import</h3>
                    <p className="mt-1 text-[9px] text-slate-500">{report?.filename || 'No import completed yet'}</p>
                    <ImportReportSummary report={report} />
                </section>
            </div>
        </div>
    );
}

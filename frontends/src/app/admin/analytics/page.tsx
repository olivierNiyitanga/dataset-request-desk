'use client';

import { useState } from 'react';
import { useGetAnalyticsQuery } from '@/lib/redux/slices/AnalyticsSlice';

export default function AdminAnalyticsPage() {
    const [startDate, setStartDate] = useState('2026-09-01');
    const [endDate, setEndDate] = useState('2026-09-30');
    const [appliedRange, setAppliedRange] = useState({ start: startDate, end: endDate });
    const { data, isLoading, isError } = useGetAnalyticsQuery({ from_date: appliedRange.start, to_date: appliedRange.end });
    const dailyEpisodes = data?.episodes_per_day_per_robot.reduce<Record<string, number>>((totals, item) => {
        totals[item.date] = (totals[item.date] || 0) + item.count;
        return totals;
    }, {}) ?? {};
    const dailyValues = Object.values(dailyEpisodes);
    const topTasks = data?.top_good_tasks ?? [];
    const totalEpisodes = dailyValues.reduce((total, value) => total + value, 0);
    const goodEpisodes = topTasks.reduce((total, task) => total + task.count, 0);
    const deliveredRequests = data?.requests_by_status.find((item) => item.status === 'delivered')?.count ?? 0;

    if (isLoading) return <div className="mx-auto max-w-[1440px] px-5 py-6 text-xs text-slate-500">Loading analytics...</div>;
    if (isError) return <div className="mx-auto max-w-[1440px] px-5 py-6 text-xs text-rose-600">Unable to load analytics.</div>;

    return (
        <div className="mx-auto min-h-[calc(100vh-54px)] max-w-[1440px] px-5 py-6 sm:px-6 lg:px-[26px]">
            <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div><h2 className="text-xl font-semibold text-slate-950">Analytics</h2><p className="mt-1 text-[10px] text-slate-500">Operational metrics calculated from the database.</p></div>
                <div className="flex flex-wrap items-center gap-2">
                    <input aria-label="Start date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="h-8 rounded-[7px] border border-slate-200 bg-white px-2 text-[9px] text-slate-700" />
                    <input aria-label="End date" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="h-8 rounded-[7px] border border-slate-200 bg-white px-2 text-[9px] text-slate-700" />
                    <button type="button" onClick={() => setAppliedRange({ start: startDate, end: endDate })} className="h-8 rounded-[7px] bg-slate-900 px-3 text-[9px] font-medium text-white hover:bg-slate-700">Apply</button>
                </div>
            </div>

            <section aria-label="Analytics summary" className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                {[
                    { label: 'Requests Delivered', value: deliveredRequests.toLocaleString(), note: data?.median_submitted_to_delivered_seconds ? `Median fulfilment: ${(data.median_submitted_to_delivered_seconds / 86400).toFixed(1)} days` : 'No delivery timing yet' },
                    { label: 'Episodes Recorded', value: totalEpisodes.toLocaleString(), note: `${data?.date_range.from_date} to ${data?.date_range.to_date}`, positive: true },
                    { label: 'Good Episodes', value: goodEpisodes.toLocaleString(), note: totalEpisodes ? `${((goodEpisodes / totalEpisodes) * 100).toFixed(1)}% quality rate` : 'No episodes yet' },
                ].map((metric) => <article key={metric.label} className="rounded-[11px] border border-slate-200 bg-white px-4 py-3.5"><p className="text-[9px] text-slate-500">{metric.label}</p><p className="mt-2 text-xl font-semibold leading-6 text-slate-950">{metric.value}</p><p className={`mt-1 text-[8px] ${metric.positive ? 'text-emerald-600' : 'text-slate-500'}`}>{metric.note}</p></article>)}
            </section>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <section className="rounded-[11px] border border-slate-200 bg-white p-4 sm:p-5">
                    <h3 className="text-[11px] font-semibold text-slate-900">Episodes Recorded per Day</h3>
                    <div role="img" aria-label="Bar chart of episodes recorded per day" className="mt-4 flex h-[170px] items-end gap-1.5 border-b border-l border-slate-200 px-2 pb-0 sm:gap-2">
                        {dailyValues.map((value, index) => <div key={`${value}-${index}`} title={`${value} episodes`} className={`flex-1 rounded-t-[3px] ${index === dailyValues.length - 1 ? 'bg-slate-800' : index > 5 ? 'bg-slate-600' : 'bg-slate-400'}`} style={{ height: `${(value / Math.max(...dailyValues, 1)) * 100}%` }} />)}
                    </div>
                    <div className="mt-2 flex justify-between text-[8px] text-slate-400"><span>{appliedRange.start ? new Date(`${appliedRange.start}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Start'}</span><span>{appliedRange.end ? new Date(`${appliedRange.end}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'End'}</span></div>
                </section>

                <section className="rounded-[11px] border border-slate-200 bg-white p-4 sm:p-5">
                    <h3 className="text-[11px] font-semibold text-slate-900">Top Tasks by Good Episodes</h3>
                    <div className="mt-4 space-y-4">{topTasks.map((task) => <div key={task.task_name}><div className="mb-1 flex items-center justify-between text-[9px]"><span className="text-slate-700">{task.task_name}</span><span className="font-semibold text-slate-900">{task.count.toLocaleString()}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-700" style={{ width: `${(task.count / Math.max(...topTasks.map((item) => item.count), 1)) * 100}%` }} /></div></div>)}</div>
                </section>
            </div>
        </div>
    );
}
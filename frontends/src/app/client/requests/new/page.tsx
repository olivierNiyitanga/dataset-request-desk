'use client';

import Link from 'next/link';
import { useMemo, useState, type FocusEvent, type FormEvent, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, ChevronDown } from 'lucide-react';
import { useCreateRequestMutation } from '@/lib/redux/slices/RequestSlice';
import { useGetEpisodeTaskNamesQuery } from '@/lib/redux/slices/EpisodeSlice';

export default function CreateRequestPage() {
    const [notes, setNotes] = useState('');
    const [taskName, setTaskName] = useState('');
    const [taskMenuOpen, setTaskMenuOpen] = useState(false);
    const [activeTaskIndex, setActiveTaskIndex] = useState(0);
    const router = useRouter();
    const [createRequest, { isLoading }] = useCreateRequestMutation();
    const { data: taskNames = [], isLoading: isLoadingTasks, isError: taskNamesError } = useGetEpisodeTaskNamesQuery();
    const filteredTaskNames = useMemo(() => {
        const search = taskName.trim().toLocaleLowerCase();
        return taskNames.filter((task) => task.toLocaleLowerCase().includes(search));
    }, [taskName, taskNames]);

    const handleTaskKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (!taskMenuOpen) {
                const selectedIndex = filteredTaskNames.indexOf(taskName);
                setActiveTaskIndex(selectedIndex >= 0 ? selectedIndex : 0);
            } else {
                setActiveTaskIndex((index) => Math.min(index + 1, filteredTaskNames.length - 1));
            }
            setTaskMenuOpen(true);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (!taskMenuOpen) {
                const selectedIndex = filteredTaskNames.indexOf(taskName);
                setActiveTaskIndex(selectedIndex >= 0 ? selectedIndex : filteredTaskNames.length - 1);
            } else {
                setActiveTaskIndex((index) => Math.max(index - 1, 0));
            }
            setTaskMenuOpen(true);
        } else if (event.key === 'Enter' && taskMenuOpen && filteredTaskNames.length) {
            event.preventDefault();
            setTaskName(filteredTaskNames[activeTaskIndex] ?? filteredTaskNames[0]);
            setTaskMenuOpen(false);
        } else if (event.key === 'Escape') {
            setTaskMenuOpen(false);
        }
    };

    const handleTaskBlur = (event: FocusEvent<HTMLDivElement>) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setTaskMenuOpen(false);
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        if (!taskNames.includes(taskName)) {
            toast.error('Select a task from the episode list.');
            return;
        }

        try {
            await createRequest({
                task_name: taskName,
                episodes_requested: Number(formData.get('episodes')),
                deadline: String(formData.get('deadline') ?? ''),
                notes: notes.trim() || null,
            }).unwrap();
            toast.success('Request submitted successfully.');
            router.push('/client/requests');
        } catch {
            toast.error('Unable to submit request. Please try again.');
        }
    };

    return (
        <div className="mx-auto min-h-[calc(100vh-64px)] max-w-[720px] px-5 py-7 sm:px-8 lg:py-8">
            <div className="mb-5">
                <p className="mb-1.5 text-[10px] font-semibold text-blue-600">New request</p>
                <h2 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-[22px]">Create Dataset Request</h2>
                <p className="mt-1 text-xs text-slate-500">Tell our operations team what dataset you need.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
                <section className="rounded-[14px] border border-slate-200/80 bg-white p-4 shadow-[0_4px_18px_rgba(15,23,42,0.035)] sm:p-[18px]">
                    <h3 className="text-[12px] font-semibold text-slate-900">Dataset Requirements</h3>
                    <p className="mt-1 text-[10px] text-slate-500">Provide the core requirements for your requested dataset.</p>

                    <div className="mt-4">
                        <label htmlFor="task-name" className="mb-1.5 block text-[10px] font-medium text-slate-900">
                            Task Name <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative" onBlur={handleTaskBlur}>
                            <div className={`flex h-[42px] items-center rounded-[8px] border bg-white transition-colors ${taskMenuOpen ? 'border-blue-500 ring-2 ring-blue-500/15' : 'border-slate-300 hover:border-slate-400'}`}>
                                <input
                                    id="task-name"
                                    name="taskName"
                                    type="text"
                                    role="combobox"
                                    aria-autocomplete="list"
                                    aria-expanded={taskMenuOpen}
                                    aria-controls="episode-task-options"
                                    aria-activedescendant={taskMenuOpen && filteredTaskNames.length ? `episode-task-option-${activeTaskIndex}` : undefined}
                                    value={taskName}
                                    onFocus={() => setTaskMenuOpen(true)}
                                    onChange={(event) => { setTaskName(event.target.value); setActiveTaskIndex(0); setTaskMenuOpen(true); }}
                                    onKeyDown={handleTaskKeyDown}
                                    required
                                    maxLength={120}
                                    autoComplete="off"
                                    disabled={isLoadingTasks || taskNames.length === 0}
                                    placeholder={isLoadingTasks ? 'Loading tasks...' : 'Search or select a task'}
                                    className="h-full min-w-0 flex-1 rounded-l-[8px] bg-transparent px-3 text-[13px] text-slate-800 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
                                />
                                <button type="button" aria-label={taskMenuOpen ? 'Close task options' : 'Show task options'} aria-expanded={taskMenuOpen} disabled={isLoadingTasks || taskNames.length === 0} onClick={() => setTaskMenuOpen((open) => !open)} className="grid h-full w-10 shrink-0 place-items-center border-l border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40">
                                    <ChevronDown size={16} className={`transition-transform duration-150 ${taskMenuOpen ? 'rotate-180' : ''}`} />
                                </button>
                            </div>
                            {taskMenuOpen && taskNames.length > 0 && <div className="absolute z-20 mt-1.5 max-h-60 w-full overflow-y-auto rounded-[9px] border border-slate-200 bg-white p-1.5 shadow-[0_12px_28px_rgba(15,23,42,0.13)]" role="listbox" id="episode-task-options" aria-label="Available episode tasks">
                                {filteredTaskNames.length ? filteredTaskNames.map((task, index) => <button type="button" role="option" aria-selected={taskName === task} id={`episode-task-option-${index}`} key={task} onMouseEnter={() => setActiveTaskIndex(index)} onMouseDown={(event) => event.preventDefault()} onClick={() => { setTaskName(task); setActiveTaskIndex(index); setTaskMenuOpen(false); }} className={`flex min-h-10 w-full items-center justify-between rounded-[6px] border px-2.5 py-2 text-left text-xs transition ${index === activeTaskIndex ? 'border-slate-200 bg-slate-100 text-slate-900' : 'border-transparent text-slate-700 hover:bg-slate-50'}`}>
                                    <span>{task}</span>{taskName === task && <Check size={15} className="text-blue-600" />}
                                </button>) : <p className="px-3 py-3 text-xs text-slate-500">No matching tasks found.</p>}
                            </div>}
                        </div>
                        <p className="mt-1 text-[9px] text-slate-400">{taskNamesError ? 'Unable to load available tasks.' : taskNames.length ? 'Choose a task with the arrow keys, or search by typing.' : 'No episode tasks are available yet.'}</p>
                    </div>

                    <div className="mt-3.5 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3.5">
                        <div>
                            <label htmlFor="episodes" className="mb-1.5 block text-[10px] font-medium text-slate-900">
                                Episodes Requested <span className="text-rose-500">*</span>
                            </label>
                            <input
                                id="episodes"
                                name="episodes"
                                type="number"
                                min={1}
                                max={100000}
                                required
                                placeholder="100"
                                className="h-[34px] w-full rounded-[8px] border border-slate-200 px-3 text-[10px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                            />
                        </div>
                        <div>
                            <label htmlFor="deadline" className="mb-1.5 block text-[10px] font-medium text-slate-900">
                                Deadline <span className="text-rose-500">*</span>
                            </label>
                            <input
                                id="deadline"
                                name="deadline"
                                type="date"
                                required
                                className="h-[34px] w-full rounded-[8px] border border-slate-200 px-3 text-[10px] text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                            />
                        </div>
                    </div>
                </section>

                <section className="rounded-[14px] border border-slate-200/80 bg-white p-4 shadow-[0_4px_18px_rgba(15,23,42,0.035)] sm:p-[18px]">
                    <h3 className="text-[12px] font-semibold text-slate-900">Additional Information</h3>
                    <p className="mt-1 text-[10px] text-slate-500">Add context that will help the operations team fulfill the request.</p>

                    <div className="mt-4">
                        <label htmlFor="notes" className="mb-1.5 block text-[10px] font-medium text-slate-900">Notes</label>
                        <textarea
                            id="notes"
                            name="notes"
                            value={notes}
                            onChange={(event) => setNotes(event.target.value)}
                            maxLength={1000}
                            rows={6}
                            placeholder="Describe any additional requirements for the dataset..."
                            className="block min-h-[120px] w-full resize-y rounded-[8px] border border-slate-200 px-3 py-2.5 text-[10px] leading-5 text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                        />
                        <div className="mt-1.5 flex items-center justify-between gap-3 text-[9px] text-slate-400">
                            <span>Do not include passwords or confidential credentials.</span>
                            <span className="shrink-0">{notes.length} / 1000</span>
                        </div>
                    </div>
                </section>

                <div className="flex justify-end gap-2 pt-0.5">
                    <Link href="/client/requests" className="inline-flex h-[34px] items-center rounded-[8px] border border-slate-200 bg-white px-3.5 text-[10px] font-medium text-slate-800 no-underline transition-colors hover:bg-slate-50">
                        Cancel
                    </Link>
                    <button type="submit" disabled={isLoading} className="h-[34px] rounded-[8px] bg-blue-600 px-3.5 text-[10px] font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300">
                        {isLoading ? 'Submitting...' : 'Submit Request'}
                    </button>
                </div>
            </form>
        </div>
    );
}

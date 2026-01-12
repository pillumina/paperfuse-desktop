import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Clock, Play, AlertCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import type { ScheduleStatus, ScheduleRun, ScheduleRunStatus } from '../../lib/types';
import { useLanguage } from '../../contexts/LanguageContext';

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function ScheduleSection() {
  const { t } = useLanguage();
  // Schedule configuration state
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('daily');
  const [time, setTime] = useState('09:00');
  const [weekDays, setWeekDays] = useState<number[]>([]); // 0-6 for Sunday-Saturday

  // Status state
  const [scheduleStatus, setScheduleStatus] = useState<ScheduleStatus | null>(null);
  const [history, setHistory] = useState<ScheduleRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load schedule status on mount
  useEffect(() => {
    loadScheduleStatus();
    loadHistory();
  }, []);

  const loadScheduleStatus = async () => {
    try {
      setIsLoading(true);
      const status = await invoke<ScheduleStatus>('get_schedule_status');
      setScheduleStatus(status);
      setFrequency(status.next_run_time ? 'daily' : 'daily'); // Default to daily
    } catch (err) {
      console.error('Failed to load schedule status:', err);
      setError(t('settings.schedule.errors.failedToLoadStatus'));
    } finally {
      setIsLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const runs = await invoke<ScheduleRun[]>('get_schedule_history', { limit: 10 });
      setHistory(runs);
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };

  const handleEnableSchedule = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);

      // Validate time format
      if (!time.match(/^\d{2}:\d{2}$/)) {
        setError(t('settings.schedule.errors.invalidTimeFormat'));
        return;
      }

      // Validate week days for weekly frequency
      if (frequency === 'weekly' && weekDays.length === 0) {
        setError(t('settings.schedule.errors.selectAtLeastOneDay'));
        return;
      }

      const result = await invoke<ScheduleStatus>('enable_schedule');
      setScheduleStatus(result);
      setSuccess(t('settings.schedule.success.scheduleEnabled'));
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisableSchedule = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);

      const result = await invoke<ScheduleStatus>('disable_schedule');
      setScheduleStatus(result);
      setSuccess(t('settings.schedule.success.scheduleDisabled'));
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunNow = async () => {
    try {
      setIsRunning(true);
      setError(null);
      setSuccess(null);

      await invoke('trigger_scheduled_fetch_now');
      setSuccess(t('settings.schedule.success.fetchStarted'));
      setTimeout(() => setSuccess(null), 3000);

      // Reload history after a delay
      setTimeout(() => {
        loadHistory();
        loadScheduleStatus();
      }, 2000);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsRunning(false);
    }
  };

  const toggleWeekDay = (dayIndex: number) => {
    if (weekDays.includes(dayIndex)) {
      setWeekDays(weekDays.filter((d) => d !== dayIndex));
    } else {
      setWeekDays([...weekDays, dayIndex]);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return dateString;
    }
  };

  const getStatusIcon = (status: ScheduleRunStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'running':
        return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const enabled = scheduleStatus?.enabled ?? false;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          {t('settings.schedule.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {t('settings.schedule.description')}
        </p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        {/* Enable Toggle */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-lg ${enabled ? 'bg-blue-100 dark:bg-blue-900/20' : 'bg-gray-100 dark:bg-gray-800'}`}>
              <Clock className={`w-6 h-6 ${enabled ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {t('settings.schedule.autoFetchPapers')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {enabled ? t('settings.schedule.status.enabled') : t('settings.schedule.status.disabled')}
                {scheduleStatus?.next_run_time && enabled && (
                  <span className="ml-2">
                    ({t('settings.schedule.nextRun', { time: formatDate(scheduleStatus.next_run_time) })})
                  </span>
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={enabled ? handleDisableSchedule : handleEnableSchedule}
            disabled={isSaving}
            className={`relative w-14 h-7 rounded-full transition-colors ${
              enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
            } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span
              className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                enabled ? 'left-8' : 'left-1'
              }`}
            />
          </button>
        </div>

        {enabled && (
          <div className="space-y-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            {/* Run Now Button */}
            <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {t('settings.schedule.runFetchNow')}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('settings.schedule.runFetchNowDesc')}
                </p>
              </div>
              <button
                type="button"
                onClick={handleRunNow}
                disabled={isRunning}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isRunning
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('settings.schedule.running')}
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    {t('settings.schedule.runNow')}
                  </>
                )}
              </button>
            </div>

            {/* Frequency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {t('settings.schedule.frequency')}
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFrequency('daily')}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    frequency === 'daily'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="font-semibold text-gray-900 dark:text-white mb-1">
                    {t('settings.schedule.daily')}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {t('settings.schedule.dailyDesc')}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFrequency('weekly')}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    frequency === 'weekly'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="font-semibold text-gray-900 dark:text-white mb-1">
                    {t('settings.schedule.weekly')}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {t('settings.schedule.weeklyDesc')}
                  </div>
                </button>
              </div>
            </div>

            {/* Time Picker */}
            {frequency === 'daily' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.schedule.fetchTime')}
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {t('settings.schedule.fetchTimeHint', { time }).replace('{{time}}', time)}
                </p>
              </div>
            )}

            {/* Week Day Selector */}
            {frequency === 'weekly' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.schedule.dayOfWeek')}
                </label>
                <div className="grid grid-cols-7 gap-2">
                  {WEEK_DAYS.map((day, index) => {
                    const isSelected = weekDays.includes(index);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleWeekDay(index)}
                        className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                          isSelected
                            ? 'border-blue-500 bg-blue-500 text-white'
                            : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
                {weekDays.length > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {t('settings.schedule.fetchWeeklyHint', {
                      days: weekDays.map((d) => WEEK_DAYS[d]).join(', '),
                      time: time
                    }).replace('{{days}}', weekDays.map((d) => WEEK_DAYS[d]).join(', ')).replace('{{time}}', time)}
                  </p>
                )}
              </div>
            )}

            {/* Run History */}
            {history.length > 0 && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                  {t('settings.schedule.recentRuns')}
                </h4>
                <div className="space-y-2">
                  {history.slice(0, 5).map((run) => (
                    <div
                      key={run.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(run.status)}
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {run.status === 'completed' && t('settings.schedule.papersSaved', { count: run.papers_saved }).replace('{{count}}', run.papers_saved.toString())}
                            {run.status === 'failed' && t('settings.schedule.failed')}
                            {run.status === 'running' && t('settings.schedule.runningStatus')}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(run.started_at)}
                          </div>
                        </div>
                      </div>
                      {run.error_message && (
                        <div className="text-xs text-red-600 dark:text-red-400 max-w-xs truncate">
                          {run.error_message}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!enabled && (
          <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('settings.schedule.enableAutoFetchHint')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

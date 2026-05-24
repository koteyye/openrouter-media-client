/**
 * Сервис восстановления незавершённых задач генерации.
 *
 * При запуске приложения проверяет все задачи из истории, которые остались
 * в промежуточных статусах (pending, in_progress, queued, running, processing),
 * опрашивает API OpenRouter для получения актуального статуса,
 * скачивает готовые результаты и обновляет историю.
 */

import * as fs from 'fs';
import * as path from 'path';
import { configStore } from '../ipc-handlers';
import * as historyStore from './history-store';
import { pollVideoStatus, downloadVideoContent } from '../openrouter';

// Статусы, которые означают, что задача ещё не завершилась
const PENDING_STATUSES = new Set([
  'pending', 'in_progress', 'queued', 'running', 'processing',
]);

// Максимальное количество попыток повторного опроса для одной задачи
const MAX_POLL_ATTEMPTS = 60;
// Интервал между повторными опросами (мс)
const POLL_INTERVAL_MS = 5000;

/**
 * Запускает фоновое восстановление всех незавершённых задач.
 * Вызывается один раз при старте приложения из main/index.ts.
 */
export async function recoverPendingJobs(): Promise<void> {
  const apiKey = configStore.get('apiKey');
  if (!apiKey) {
    console.log('[pending-recovery] API key не задан, пропускаем восстановление.');
    return;
  }

  const history = historyStore.listHistory();
  const pendingJobs = history.filter(
    (item) => item.jobId && PENDING_STATUSES.has(item.status)
  );

  if (pendingJobs.length === 0) {
    console.log('[pending-recovery] Нет незавершённых задач для восстановления.');
    return;
  }

  console.log(`[pending-recovery] Обнаружено ${pendingJobs.length} незавершённых задач. Начинаем восстановление...`);

  const localFolder = configStore.get('localFolder');

  // Восстанавливаем все задачи параллельно
  const recoveryPromises = pendingJobs.map((item) =>
    recoverSingleJob(apiKey, item.jobId!, item.mode, localFolder).catch((err) => {
      console.error(`[pending-recovery] Ошибка восстановления задачи ${item.jobId}:`, err);
    })
  );

  await Promise.allSettled(recoveryPromises);
  console.log('[pending-recovery] Восстановление завершено.');
}

/**
 * Восстанавливает одну конкретную задачу: опрашивает API до получения
 * терминального статуса (completed/failed/cancelled/expired),
 * скачивает результат если завершено успешно.
 */
async function recoverSingleJob(
  apiKey: string,
  jobId: string,
  mode: string,
  localFolder: string
): Promise<void> {
  const isVideoJob = mode.includes('video');

  console.log(`[pending-recovery] Восстановление задачи ${jobId} (${mode})...`);

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    try {
      if (isVideoJob) {
        // Все видео-задачи используют единый эндпоинт /api/v1/videos/{jobId}
        const pollingUrl = `https://openrouter.ai/api/v1/videos/${jobId}`;
        const status = await pollVideoStatus(apiKey, pollingUrl);

        console.log(`[pending-recovery] Задача ${jobId}: статус = ${status.status} (попытка ${attempt + 1})`);

        if (status.status === 'completed') {
          // Скачиваем видео, если доступна локальная папка
          let localPaths: string[] = [];
          if (status.unsigned_urls?.length && localFolder && fs.existsSync(localFolder)) {
            try {
              const outputPath = path.join(localFolder, `video-${jobId}.mp4`);
              // Не скачиваем повторно если файл уже существует
              if (!fs.existsSync(outputPath)) {
                await downloadVideoContent(apiKey, jobId, outputPath);
              }
              localPaths.push(outputPath);
            } catch (dlErr) {
              console.error(`[pending-recovery] Ошибка скачивания видео ${jobId}:`, dlErr);
            }
          }

          historyStore.updateByJobId(jobId, {
            status: 'completed',
            generationId: status.generation_id,
            remoteUrls: status.unsigned_urls ?? [],
            localPaths: localPaths.length ? localPaths : undefined,
            usage: status.usage,
          });
          console.log(`[pending-recovery] Задача ${jobId} успешно восстановлена (completed).`);
          return;
        }

        if (status.status === 'failed' || status.status === 'cancelled' || status.status === 'expired') {
          historyStore.updateByJobId(jobId, {
            status: status.status,
            error: status.error ?? `Генерация ${status.status}`,
          });
          console.log(`[pending-recovery] Задача ${jobId} завершена с ошибкой (${status.status}).`);
          return;
        }

        // Задача всё ещё в процессе — обновляем статус и ждём
        historyStore.updateByJobId(jobId, { status: status.status });
      } else {
        // Задачи генерации изображений не имеют polling — если они в pending,
        // значит запрос не был завершён. Помечаем как failed.
        historyStore.updateByJobId(jobId, {
          status: 'failed',
          error: 'Генерация была прервана при закрытии приложения',
        });
        console.log(`[pending-recovery] Задача ${jobId} (изображение) помечена как failed — нет механизма polling.`);
        return;
      }
    } catch (err) {
      console.error(`[pending-recovery] Ошибка при опросе задачи ${jobId} (попытка ${attempt + 1}):`, err);
      // При ошибке 404 задача больше не существует на сервере
      const errorMessage = (err as Error).message ?? '';
      if (errorMessage.includes('404')) {
        historyStore.updateByJobId(jobId, {
          status: 'expired',
          error: 'Задача больше не существует на сервере (404)',
        });
        console.log(`[pending-recovery] Задача ${jobId} не найдена на сервере (404), помечена как expired.`);
        return;
      }
    }

    // Ждём перед следующей попыткой
    await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  // Исчерпали все попытки — помечаем как failed
  historyStore.updateByJobId(jobId, {
    status: 'failed',
    error: `Превышено максимальное количество попыток опроса (${MAX_POLL_ATTEMPTS})`,
  });
  console.log(`[pending-recovery] Задача ${jobId} — превышен лимит попыток, помечена как failed.`);
}

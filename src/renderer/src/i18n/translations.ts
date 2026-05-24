export type LangKey =
  // App.tsx
  | 'app.header.balance'
  | 'app.header.refreshBalance'
  | 'app.header.language'
  | 'app.header.rus'
  | 'app.header.eng'
  | 'app.header.connectionSettings'
  | 'app.footer.rightsReserved'

  // SettingsScreen.tsx
  | 'settings.title'
  | 'settings.subtitle'
  | 'settings.getKeyAt'
  | 'settings.imgbbPlaceholder'
  | 'settings.imgbbHint'
  | 'settings.localFolderLabel'
  | 'settings.folderPlaceholder'
  | 'settings.selectFolder'
  | 'settings.folderHint'
  | 'settings.warningBox'
  | 'settings.save'
  | 'settings.testConnection'
  | 'settings.connectionSuccess'
  | 'settings.enterKeyToTest'
  | 'settings.connectionTestError'
  | 'settings.enterApiKey'
  | 'settings.enterLocalFolder'
  | 'settings.saveFailed'
  | 'settings.returnToMain'
  | 'settings.showPassword'
  | 'settings.hidePassword'
  | 'settings.connectionStatus'
  | 'settings.connectionStatusDesc'
  | 'settings.apiKeyConnected'
  | 'settings.readyToUse'
  | 'settings.keyRequired'
  | 'settings.optional'
  | 'settings.resultsFolder'
  | 'settings.folderSelected'
  | 'settings.pathRequired'
  | 'settings.whyNeededTitle'
  | 'settings.whyApiKey'
  | 'settings.whyImgbb'
  | 'settings.whyLocalFolder'
  | 'settings.authorContacts'
  | 'settings.apiKeyTooltip'
  | 'settings.imgbbTooltip'
  | 'settings.imgbbFieldMeta'
  | 'settings.localFolderTooltip'
  | 'settings.telegramChannel'
  | 'settings.website'
  | 'settings.imgbbOptionalLabel'

  // Dashboard.tsx — general
  | 'dashboard.settingsTitle'
  | 'dashboard.setupRequired'
  | 'dashboard.setupDesc'
  | 'dashboard.apiKeySet'
  | 'dashboard.apiKeyNotSet'
  | 'dashboard.folderSelected'
  | 'dashboard.folderNotSelected'
  | 'dashboard.openSettings'
  | 'dashboard.checkAgain'
  | 'dashboard.model'
  | 'dashboard.loadingModels'
  | 'dashboard.noModels'
  | 'dashboard.refreshModels'
  | 'dashboard.price'
  | 'dashboard.free'
  | 'dashboard.priceNotSpecified'
  | 'dashboard.prompt'
  | 'dashboard.promptPlaceholder'
  | 'dashboard.resolution'
  | 'dashboard.aspectRatio'
  | 'dashboard.duration'
  | 'dashboard.audio'
  | 'dashboard.seedOptional'
  | 'dashboard.seedRandom'
  | 'dashboard.seedTooltipTitle'
  | 'dashboard.seedTooltipBody1'
  | 'dashboard.seedTooltipBody2'
  | 'dashboard.seedTooltipBody3'
  | 'dashboard.firstFrameRequired'
  | 'dashboard.sourceImageRequired'
  | 'dashboard.loadingImage'
  | 'dashboard.uploadedSuccessfully'
  | 'dashboard.delete'
  | 'dashboard.uploadFirstFrame'
  | 'dashboard.uploadSourceImage'
  | 'dashboard.frameUploadFailed'
  | 'dashboard.generateImage'
  | 'dashboard.generateVideo'
  | 'dashboard.preview'
  | 'dashboard.videoPlaceholder'
  | 'dashboard.imagePlaceholder'
  | 'dashboard.placeholderSubtext'
  | 'dashboard.generationUnavailable'
  | 'dashboard.setupNeededOverlay'
  | 'dashboard.generatingMedia'
  | 'dashboard.submittingRequest'
  | 'dashboard.mayTakeMinutes'
  | 'dashboard.resetError'
  | 'dashboard.imageGenError'
  | 'dashboard.videoJobError'
  | 'dashboard.openFileFailed'
  | 'dashboard.openFolderFailed'
  | 'dashboard.fileDownloadedLocally'
  | 'dashboard.localPlayer'
  | 'dashboard.localFolder'
  | 'dashboard.recentHistory'
  | 'dashboard.openHistory'
  | 'dashboard.historyEmpty'
  | 'dashboard.historyEmptySub'
  | 'dashboard.historyLocalNote'
  | 'dashboard.fullHistory'
  | 'dashboard.close'
  | 'dashboard.historyEmptyModal'
  | 'dashboard.pendingTasksAlert'
  | 'dashboard.recovering'
  | 'dashboard.recover'
  | 'dashboard.open'
  | 'dashboard.deleteHistory'
  | 'dashboard.mode'
  | 'dashboard.status'
  | 'dashboard.seconds'
  | 'dashboard.previewUnavailable'
  | 'dashboard.textToImage'
  | 'dashboard.imageToImage'
  | 'dashboard.textToVideo'
  | 'dashboard.imageToVideo'

  // Pricing SKU descriptions
  | 'pricing.perReferenceFrame'
  | 'pricing.perSec480p'
  | 'pricing.perSec720p'
  | 'pricing.perSecond'
  | 'pricing.perSecWithAudio'
  | 'pricing.perSecWithoutAudio'
  | 'pricing.perSec720pShort'
  | 'pricing.perSec1080p'
  | 'pricing.perSec1024p'
  | 'pricing.perSec4kWithAudio'
  | 'pricing.perSec4kWithoutAudio'
  | 'pricing.perSec720pWithAudio'
  | 'pricing.perSec720pWithoutAudio'
  | 'pricing.t2vPerSec480p'
  | 'pricing.t2vPerSec720p'
  | 'pricing.i2vPerSec720p'
  | 'pricing.t2vPerSec1080p'
  | 'pricing.i2vPerSec1080p'
  | 'pricing.perVideoToken'
  | 'pricing.perVideoTokenWithoutAudio'
  | 'pricing.perImage'
  | 'pricing.perRequest'
  | 'pricing.perInputToken'
  | 'pricing.perOutputToken';

export type Lang = 'ru' | 'en';

export const translations: Record<LangKey, Record<Lang, string>> = {
  // App.tsx
  'app.header.balance':            { ru: 'Баланс',                   en: 'Balance' },
  'app.header.refreshBalance':     { ru: 'Обновить баланс',          en: 'Refresh balance' },
  'app.header.language':           { ru: 'Язык',                     en: 'Language' },
  'app.header.rus':                { ru: 'Русский',                  en: 'Russian' },
  'app.header.eng':                { ru: 'English',                  en: 'English' },
  'app.header.connectionSettings': { ru: 'Настройки подключения',    en: 'Connection settings' },
  'app.footer.rightsReserved':     { ru: 'Все права защищены.',      en: 'All rights reserved.' },

  // SettingsScreen.tsx
  'settings.title':               { ru: 'Настройки',                                    en: 'Settings' },
  'settings.subtitle':            { ru: 'Подключение и сохранение результатов',          en: 'Connection and result saving' },
  'settings.getKeyAt':            { ru: 'Получить ключ можно на',                        en: 'Get your key at' },
  'settings.imgbbPlaceholder':    { ru: 'Получите бесплатный ключ на api.imgbb.com',     en: 'Get a free key at api.imgbb.com' },
  'settings.imgbbHint':           { ru: 'Рекомендуется для автоматической загрузки кадров и стабильной работы в России без VPN.', en: 'Recommended for automatic frame uploads and stable work in Russia without VPN.' },
  'settings.localFolderLabel':    { ru: 'Локальная папка для результатов *',             en: 'Local folder for results *' },
  'settings.folderPlaceholder':   { ru: 'Путь к папке сохранения результатов...',        en: 'Path to results save folder...' },
  'settings.selectFolder':        { ru: 'Выбрать папку',                                 en: 'Select folder' },
  'settings.folderHint':          { ru: 'Сюда будут автоматически скачиваться все сгенерированные изображения и видеофайлы.', en: 'All generated images and video files will be automatically downloaded here.' },
  'settings.warningBox':          { ru: 'ℹ️ Все сгенерированные медиафайлы будут автоматически загружаться и упорядочиваться в выбранной директории на вашем компьютере для быстрого доступа.', en: 'ℹ️ All generated media files will be automatically downloaded and organized in the selected directory on your computer for quick access.' },
  'settings.save':                { ru: 'Сохранить',                                     en: 'Save' },
  'settings.testConnection':      { ru: 'Проверить подключение',                         en: 'Test connection' },
  'settings.connectionSuccess':   { ru: '✅ Подключение установлено успешно! API-ключ действителен.', en: '✅ Connection established successfully! API key is valid.' },
  'settings.enterKeyToTest':      { ru: 'Пожалуйста, введите OpenRouter API Key для проверки', en: 'Please enter OpenRouter API Key to test' },
  'settings.connectionTestError': { ru: 'Ошибка проверки подключения',                   en: 'Connection test error' },
  'settings.enterApiKey':         { ru: 'Пожалуйста, укажите OpenRouter API Key',        en: 'Please provide OpenRouter API Key' },
  'settings.enterLocalFolder':    { ru: 'Пожалуйста, укажите локальную папку для результатов', en: 'Please provide a local folder for results' },
  'settings.saveFailed':          { ru: 'Не удалось сохранить настройки',                en: 'Failed to save settings' },
  'settings.returnToMain':        { ru: 'Вернуться на основную страницу',                en: 'Return to main page' },
  'settings.showPassword':        { ru: 'Показать',                                      en: 'Show' },
  'settings.hidePassword':        { ru: 'Скрыть',                                        en: 'Hide' },
  'settings.connectionStatus':    { ru: 'Состояние подключения',                         en: 'Connection status' },
  'settings.connectionStatusDesc':{ ru: 'Настройте параметры для стабильной работы и сохранения результатов.', en: 'Configure settings for stable operation and saving results.' },
  'settings.apiKeyConnected':     { ru: 'API Key подключён',                             en: 'API Key connected' },
  'settings.readyToUse':          { ru: 'Готово к использованию',                        en: 'Ready to use' },
  'settings.keyRequired':         { ru: 'Требуется ввод ключа',                          en: 'Key input required' },
  'settings.optional':            { ru: 'Необязательно',                                 en: 'Optional' },
  'settings.resultsFolder':       { ru: 'Папка результатов',                             en: 'Results folder' },
  'settings.folderSelected':      { ru: 'Папка выбрана',                                 en: 'Folder selected' },
  'settings.pathRequired':        { ru: 'Требуется выбрать путь',                        en: 'Path selection required' },
  'settings.whyNeededTitle':      { ru: '💡 Зачем нужны эти настройки?',                  en: '💡 Why are these settings needed?' },
  'settings.whyApiKey':           { ru: 'API Key используется для авторизации и оплаты генераций на платформе OpenRouter.', en: 'API Key is used for authorization and payment of generations on the OpenRouter platform.' },
  'settings.whyImgbb':            { ru: 'ImgBB Key помогает напрямую заливать промежуточные картинки (первый/последний кадр) на надежный хостинг для бесперебойной работы на территории РФ без VPN.', en: 'ImgBB Key helps directly upload intermediate images (first/last frame) to reliable hosting for uninterrupted operation in Russia without VPN.' },
  'settings.whyLocalFolder':      { ru: 'Локальная папка сохраняет ваши шедевры прямо на жесткий диск для удобного просмотра и мгновенного открытия!', en: 'Local folder saves your masterpieces directly to your hard drive for convenient viewing and instant access!' },
  'settings.authorContacts':     { ru: 'Контакты автора',                                en: 'Author contacts' },
  'settings.apiKeyTooltip':     { ru: 'API Key используется для авторизации запросов и оплаты генераций на платформе OpenRouter.', en: 'API Key is used for authorization of requests and payment for generations on the OpenRouter platform.' },
  'settings.imgbbTooltip':      { ru: 'ImgBB Key нужен для генерации по референсам: OpenRouter принимает референс-кадры и изображения как URL, поэтому приложение загружает локальный файл на хостинг и передает модели ссылку.', en: 'ImgBB Key is needed for reference-based generation: OpenRouter accepts reference frames and images as URLs, so the app uploads the local file to hosting and passes the link to the model.' },
  'settings.imgbbFieldMeta':    { ru: 'Нужен для режимов с референсами: OpenRouter требует URL изображения, поэтому приложение загружает выбранный локальный файл на ImgBB и передает ссылку модели. Это позволяет делать изображения и видео по исходной картинке или первому кадру.', en: 'Needed for reference modes: OpenRouter requires an image URL, so the app uploads the selected local file to ImgBB and passes the link to the model. This enables generating images and videos from a source image or first frame.' },
  'settings.localFolderTooltip':{ ru: 'Локальная папка хранит сгенерированные изображения и видео на вашем компьютере, чтобы их можно было быстро открыть или найти в проводнике.', en: 'Local folder stores generated images and videos on your computer so you can quickly open or find them in file explorer.' },
  'settings.telegramChannel':   { ru: 'Telegram канал: ',                               en: 'Telegram channel: ' },
  'settings.website':              { ru: 'Сайт: ',                                          en: 'Website: ' },
  'settings.imgbbOptionalLabel':  { ru: 'ImgBB API Key (необязательно)',                    en: 'ImgBB API Key (optional)' },

  // Dashboard.tsx
  'dashboard.settingsTitle':      { ru: 'Настройки генерации',                           en: 'Generation settings' },
  'dashboard.setupRequired':      { ru: 'Требуется настройка',                           en: 'Setup required' },
  'dashboard.setupDesc':          { ru: 'Перед началом работы укажите OpenRouter API Key и выберите локальную папку для сохранения результатов.', en: 'Before getting started, enter your OpenRouter API Key and select a local folder to save results.' },
  'dashboard.apiKeySet':          { ru: 'API Key задан',                                  en: 'API Key set' },
  'dashboard.apiKeyNotSet':       { ru: '1. API Key не задан',                            en: '1. API Key not set' },
  'dashboard.folderSelected':     { ru: 'Локальная папка выбрана',                        en: 'Local folder selected' },
  'dashboard.folderNotSelected':  { ru: '2. Локальная папка не выбрана',                  en: '2. Local folder not selected' },
  'dashboard.openSettings':       { ru: 'Открыть настройки',                              en: 'Open settings' },
  'dashboard.checkAgain':         { ru: '🔄 Проверить снова',                             en: '🔄 Check again' },
  'dashboard.model':              { ru: 'Модель',                                        en: 'Model' },
  'dashboard.loadingModels':      { ru: 'Загрузка моделей...',                            en: 'Loading models...' },
  'dashboard.noModels':           { ru: 'Нет доступных моделей',                          en: 'No models available' },
  'dashboard.refreshModels':      { ru: 'Обновить список моделей',                        en: 'Refresh model list' },
  'dashboard.price':              { ru: 'Цена:',                                         en: 'Price:' },
  'dashboard.free':               { ru: 'Бесплатно',                                     en: 'Free' },
  'dashboard.priceNotSpecified':  { ru: 'Цена за изображение/видео не указана в API',     en: 'Image/video price not specified in API' },
  'dashboard.prompt':             { ru: 'Промпт (мин. 3 символа)',                        en: 'Prompt (min. 3 characters)' },
  'dashboard.promptPlaceholder':  { ru: 'Опишите, что вы хотите сгенерировать...',        en: 'Describe what you want to generate...' },
  'dashboard.resolution':         { ru: 'Разрешение',                                    en: 'Resolution' },
  'dashboard.aspectRatio':        { ru: 'Соотношение сторон',                             en: 'Aspect ratio' },
  'dashboard.duration':           { ru: 'Длительность',                                   en: 'Duration' },
  'dashboard.audio':              { ru: 'Аудио',                                         en: 'Audio' },
  'dashboard.seedOptional':       { ru: '(необязательно)',                                en: '(optional)' },
  'dashboard.seedRandom':         { ru: 'Случайный',                                     en: 'Random' },
  'dashboard.seedTooltipTitle':   { ru: '<strong>Seed (сид)</strong> — цифровое зерно, случайное число, служащее стартовой точкой алгоритма.', en: '<strong>Seed</strong> — a digital random number serving as the starting point for the algorithm.' },
  'dashboard.seedTooltipBody1':   { ru: '• <strong>Случайный:</strong> каждый раз генерируется новая уникальная сцена.', en: '• <strong>Random:</strong> a new unique scene is generated each time.' },
  'dashboard.seedTooltipBody2':   { ru: '• <strong>Фиксированный:</strong> сохраняет композицию, свет и ракурс. Используйте один сид для тонкой настройки деталей промпта (например, изменения породы кота), не ломая структуру кадра.', en: '• <strong>Fixed:</strong> preserves composition, lighting and camera angle. Use the same seed to fine-tune prompt details (e.g., changing cat breed) without breaking the frame structure.' },
  'dashboard.seedTooltipBody3':   { ru: '',                                              en: '' },
  'dashboard.firstFrameRequired':  { ru: 'ПЕРВЫЙ КАДР (ОБЯЗАТЕЛЬНО)',                     en: 'FIRST FRAME (REQUIRED)' },
  'dashboard.sourceImageRequired': { ru: 'ИСХОДНОЕ ИЗОБРАЖЕНИЕ (ОБЯЗАТЕЛЬНО)',            en: 'SOURCE IMAGE (REQUIRED)' },
  'dashboard.loadingImage':        { ru: 'Загрузка изображения...',                       en: 'Loading image...' },
  'dashboard.uploadedSuccessfully':{ ru: 'Загружено успешно',                             en: 'Uploaded successfully' },
  'dashboard.delete':              { ru: 'Удалить',                                      en: 'Delete' },
  'dashboard.uploadFirstFrame':    { ru: 'Загрузить первый кадр',                         en: 'Upload first frame' },
  'dashboard.uploadSourceImage':   { ru: 'Загрузить исходное изображение',                en: 'Upload source image' },
  'dashboard.frameUploadFailed':   { ru: 'Не удалось загрузить кадр',                     en: 'Failed to upload frame' },
  'dashboard.generateImage':       { ru: 'Создать изображение',                           en: 'Generate image' },
  'dashboard.generateVideo':       { ru: 'Создать видео',                                 en: 'Generate video' },
  'dashboard.preview':             { ru: 'Предпросмотр',                                  en: 'Preview' },
  'dashboard.videoPlaceholder':    { ru: 'Ваше видео появится здесь',                     en: 'Your video will appear here' },
  'dashboard.imagePlaceholder':    { ru: 'Ваше изображение появится здесь',                en: 'Your image will appear here' },
  'dashboard.placeholderSubtext':  { ru: 'Заполните настройки слева и нажмите кнопку генерации, чтобы запустить процесс.', en: 'Fill in the settings on the left and click the generate button to start the process.' },
  'dashboard.generationUnavailable':{ ru: 'Генерация недоступна',                          en: 'Generation unavailable' },
  'dashboard.setupNeededOverlay':  { ru: 'Сначала завершите первоначальную настройку приложения в левой колонке.', en: 'Complete the initial app setup in the left column first.' },
  'dashboard.generatingMedia':     { ru: 'Генерация медиа... Статус: ',                   en: 'Generating media... Status: ' },
  'dashboard.submittingRequest':   { ru: 'Отправка запроса на генерацию...',              en: 'Submitting generation request...' },
  'dashboard.mayTakeMinutes':      { ru: 'Это может занять несколько минут.',              en: 'This may take a few minutes.' },
  'dashboard.resetError':          { ru: 'Сбросить ошибку',                               en: 'Reset error' },
  'dashboard.imageGenError':       { ru: 'Ошибка генерации изображения',                   en: 'Image generation error' },
  'dashboard.videoJobError':       { ru: 'Ошибка отправки видео-задания',                  en: 'Video job submission error' },
  'dashboard.openFileFailed':      { ru: 'Не удалось открыть файл',                        en: 'Failed to open file' },
  'dashboard.openFolderFailed':    { ru: 'Не удалось открыть папку с файлом',               en: 'Failed to open folder' },
  'dashboard.fileDownloadedLocally':{ ru: 'Файл скачан локально: ',                        en: 'File downloaded locally: ' },
  'dashboard.localPlayer':         { ru: 'Локальный плеер',                               en: 'Local player' },
  'dashboard.localFolder':         { ru: 'Локальная папка',                               en: 'Local folder' },
  'dashboard.recentHistory':       { ru: 'История недавних генераций',                     en: 'Recent generation history' },
  'dashboard.openHistory':         { ru: 'Открыть историю',                               en: 'Open history' },
  'dashboard.historyEmpty':        { ru: 'История недавних генераций пуста',               en: 'Recent generation history is empty' },
  'dashboard.historyEmptySub':     { ru: 'Начните генерировать шедевры слева, и они автоматически появятся в этом блоке.', en: 'Start generating masterpieces on the left, and they will automatically appear in this block.' },
  'dashboard.historyLocalNote':    { ru: 'История хранится локально. Нажмите кнопку выше для просмотра всех генераций.', en: 'History is stored locally. Click the button above to view all generations.' },
  'dashboard.fullHistory':         { ru: 'Полная история генераций',                       en: 'Full generation history' },
  'dashboard.close':               { ru: 'Закрыть',                                       en: 'Close' },
  'dashboard.historyEmptyModal':   { ru: 'История генераций пуста.',                       en: 'Generation history is empty.' },
  'dashboard.pendingTasksAlert':   { ru: '⚠️ Есть незавершённые задачи. Нажмите для проверки их статуса на сервере.', en: '⚠️ There are unfinished tasks. Click to check their status on the server.' },
  'dashboard.recovering':          { ru: 'Восстановление...',                              en: 'Recovering...' },
  'dashboard.recover':             { ru: 'Восстановить',                                   en: 'Recover' },
  'dashboard.open':                { ru: 'Открыть',                                       en: 'Open' },
  'dashboard.deleteHistory':       { ru: 'Удалить',                                       en: 'Delete' },
  'dashboard.mode':                { ru: 'Режим:',                                        en: 'Mode:' },
  'dashboard.status':              { ru: 'Статус:',                                       en: 'Status:' },
  'dashboard.seconds':             { ru: 'секунд',                                        en: 'seconds' },
  'dashboard.previewUnavailable':  { ru: 'Нет превью',                                    en: 'No preview' },
  'dashboard.textToImage':         { ru: 'Текст в изображение',                            en: 'Text-to-Image' },
  'dashboard.imageToImage':        { ru: 'Изображение в изображение',                      en: 'Image-to-Image' },
  'dashboard.textToVideo':         { ru: 'Текст в видео',                                  en: 'Text-to-Video' },
  'dashboard.imageToVideo':        { ru: 'Изображение в видео',                            en: 'Image-to-Video' },

  // Pricing SKU descriptions
  'pricing.perReferenceFrame':        { ru: 'за референс-кадр',                  en: 'per reference frame' },
  'pricing.perSec480p':               { ru: 'за сек. 480p',                      en: 'per sec. 480p' },
  'pricing.perSec720p':               { ru: 'за сек. 720p',                      en: 'per sec. 720p' },
  'pricing.perSecond':                { ru: 'за секунду',                        en: 'per second' },
  'pricing.perSecWithAudio':          { ru: 'за сек. (с аудио)',                 en: 'per sec. (with audio)' },
  'pricing.perSecWithoutAudio':       { ru: 'за сек. (без аудио)',               en: 'per sec. (without audio)' },
  'pricing.perSec720pShort':          { ru: 'за сек. 720p',                      en: 'per sec. 720p' },
  'pricing.perSec1080p':              { ru: 'за сек. 1080p',                     en: 'per sec. 1080p' },
  'pricing.perSec1024p':              { ru: 'за сек. 1024p',                     en: 'per sec. 1024p' },
  'pricing.perSec4kWithAudio':        { ru: 'за сек. 4K (с аудио)',              en: 'per sec. 4K (with audio)' },
  'pricing.perSec4kWithoutAudio':     { ru: 'за сек. 4K (без аудио)',            en: 'per sec. 4K (without audio)' },
  'pricing.perSec720pWithAudio':      { ru: 'за сек. 720p (с аудио)',            en: 'per sec. 720p (with audio)' },
  'pricing.perSec720pWithoutAudio':   { ru: 'за сек. 720p (без аудио)',          en: 'per sec. 720p (without audio)' },
  'pricing.t2vPerSec480p':            { ru: 'T2V за сек. 480p',                  en: 'T2V per sec. 480p' },
  'pricing.t2vPerSec720p':            { ru: 'T2V за сек. 720p',                  en: 'T2V per sec. 720p' },
  'pricing.i2vPerSec720p':            { ru: 'I2V за сек. 720p',                  en: 'I2V per sec. 720p' },
  'pricing.t2vPerSec1080p':           { ru: 'T2V за сек. 1080p',                 en: 'T2V per sec. 1080p' },
  'pricing.i2vPerSec1080p':           { ru: 'I2V за сек. 1080p',                 en: 'I2V per sec. 1080p' },
  'pricing.perVideoToken':            { ru: 'за видео-токен',                     en: 'per video token' },
  'pricing.perVideoTokenWithoutAudio':{ ru: 'за видео-токен (без аудио)',          en: 'per video token (without audio)' },
  'pricing.perImage':                 { ru: 'за изображение',                     en: 'per image' },
  'pricing.perRequest':               { ru: 'за запрос',                          en: 'per request' },
  'pricing.perInputToken':            { ru: 'за входной токен',                   en: 'per input token' },
  'pricing.perOutputToken':           { ru: 'за выходной токен',                  en: 'per output token' },
};

export function getPricingSkuKey(apiPricingKey: string): LangKey | null {
  switch (apiPricingKey) {
    case 'cents_per_image_input':                  return 'pricing.perReferenceFrame';
    case 'cents_per_video_output_second_480p':     return 'pricing.perSec480p';
    case 'cents_per_video_output_second_720p':     return 'pricing.perSec720p';
    case 'duration_seconds':                        return 'pricing.perSecond';
    case 'duration_seconds_with_audio':             return 'pricing.perSecWithAudio';
    case 'duration_seconds_without_audio':          return 'pricing.perSecWithoutAudio';
    case 'duration_seconds_720p':                   return 'pricing.perSec720pShort';
    case 'duration_seconds_1080p':                  return 'pricing.perSec1080p';
    case 'duration_seconds_1024p':                  return 'pricing.perSec1024p';
    case 'duration_seconds_with_audio_4k':          return 'pricing.perSec4kWithAudio';
    case 'duration_seconds_without_audio_4k':       return 'pricing.perSec4kWithoutAudio';
    case 'duration_seconds_with_audio_720p':        return 'pricing.perSec720pWithAudio';
    case 'duration_seconds_without_audio_720p':     return 'pricing.perSec720pWithoutAudio';
    case 'text_to_video_duration_seconds_480p':     return 'pricing.t2vPerSec480p';
    case 'text_to_video_duration_seconds_720p':     return 'pricing.t2vPerSec720p';
    case 'image_to_video_duration_seconds_720p':    return 'pricing.i2vPerSec720p';
    case 'text_to_video_duration_seconds_1080p':    return 'pricing.t2vPerSec1080p';
    case 'image_to_video_duration_seconds_1080p':   return 'pricing.i2vPerSec1080p';
    case 'video_tokens':                            return 'pricing.perVideoToken';
    case 'video_tokens_without_audio':              return 'pricing.perVideoTokenWithoutAudio';
    case 'image':
    case 'cents_per_image':                         return 'pricing.perImage';
    case 'request':                                 return 'pricing.perRequest';
    case 'prompt':                                  return 'pricing.perInputToken';
    case 'completion':                              return 'pricing.perOutputToken';
    default: return null;
  }
}

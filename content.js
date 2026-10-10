// Edit this file to change the portfolio copy and projects.
// Descriptions are drafts based on public repository information. Review before publishing.
window.DATA = {
  projects: [
    {
      id: '01',
      name: 'Kwork Notifier',
      kind: 'PYTHON / AUTOMATION',
      state: 'PUBLIC',
      href: 'https://github.com/HexWald/SimpleKworkNotficator',
      tech: ['Python', 'Async I/O', 'Telegram', 'Integrations'],
      en: {
        lead: 'Kwork monitoring with Telegram alerts.',
        body: 'An asynchronous utility that monitors new Kwork projects and sends updates to Telegram. Includes configuration-based setup and modular components.',
        detail: 'A focused automation tool built around polling, processing incoming results and delivering notifications.'
      },
      ru: {
        lead: 'Мониторинг Kwork с уведомлениями в Telegram.',
        body: 'Асинхронная утилита, которая отслеживает новые проекты на Kwork и отправляет уведомления в Telegram. Настройка через конфигурацию, модульная структура.',
        detail: 'Автоматизация проверки, обработки результатов и отправки уведомлений.'
      }
    },
    {
      id: '02',
      name: 'Sketch Projects',
      kind: 'TELEGRAM / PRODUCTS',
      state: 'PRIVATE',
      href: '',
      tech: ['Telegram', 'Automation', 'Product development'],
      en: {
        lead: 'Telegram products and automated workflows.',
        body: 'Independent products and service automations. Code is private; project updates are collected in a separate channel.',
        detail: 'Private implementations. Public project feed available through the Telegram link below.'
      },
      ru: {
        lead: 'Telegram-продукты и сервисная автоматизация.',
        body: 'Собственные продукты и сервисная автоматизация. Код закрыт, новости проектов публикуются в отдельном канале.',
        detail: 'Исходный код закрыт. Ссылку на канал с проектами можно найти ниже.'
      }
    },
    {
      id: '03',
      name: 'ServerInserter',
      kind: 'JAVA / DESKTOP',
      state: 'PUBLIC',
      href: 'https://github.com/HexWald/ServerInserter',
      tech: ['Java', 'Swing', 'Maven', 'NBT'],
      en: {
        lead: 'Desktop utility for Minecraft server lists.',
        body: 'A cross-platform desktop utility for validating and importing servers into servers.dat. Supports duplicate checks, preview and backups.',
        detail: 'A desktop workflow for editing an NBT-based file without manual modifications.'
      },
      ru: {
        lead: 'Десктопная утилита для Minecraft-серверов.',
        body: 'Кроссплатформенное desktop-приложение для проверки и импорта серверов в servers.dat. Проверка дубликатов, предпросмотр и резервные копии.',
        detail: 'Работа с NBT-файлом через интерфейс без ручного редактирования.'
      }
    }
  ],
  stack: [
    { no:'01', en:'Primary', ru:'Основное', values:['Python', 'Async I/O', 'Automation', 'API integration'] },
    { no:'02', en:'Infrastructure', ru:'Инфраструктура', values:['Linux', 'Git', 'Telegram API', 'Application tooling'] },
    { no:'03', en:'Other', ru:'Другое', values:['Java', 'Swing', 'NBT', 'Computer vision'] }
  ]
};
window.COPY = {
  en: {
    navWork:'Work', navStack:'Stack', navContact:'Contact', workIndex:'01 / WORK', stackIndex:'02 / STACK', contactIndex:'03 / CONTACT', itemsCount:'03 ITEMS', scroll:'SCROLL TO EXPLORE', sourceLabel:'01 / SOURCE CODE', updatesLabel:'02 / PROJECT UPDATES', featuredLabel:'FEATURED PROJECT', publicLabel:'PUBLIC', heroKicker:'SOFTWARE DEVELOPMENT / SELECTED WORK',
    heroDescription:'I write Python tools for automation, bots and integrations. Here are a few projects I have built.',
    seeProjects:'View selected work', heroFooter:'PROJECTS / SOURCE / NOTES',
    workTitle:'Selected work', workDescription:'A few projects, with source code where available.',
    stackTitle:'What I work with', stackDescription:'Tools used in public projects and current work.',
    contactTitle:'Find me online', contactNote:'Projects and source code. No personal details.',
    footerRight:'STATIC HTML / CSS / JS', top:'BACK TO TOP ↑',
    source:'View repository', private:'Private source', inspect:'Project details', close:'Close details',
    item:'PROJECT', type:'TYPE', tech:'TECH', note:'NOTES'
  },
  ru: {
    navWork:'Проекты', navStack:'Стек', navContact:'Связь', workIndex:'01 / ПРОЕКТЫ', stackIndex:'02 / СТЕК', contactIndex:'03 / СВЯЗЬ', itemsCount:'03 ПРОЕКТА', scroll:'ЛИСТАЙ НИЖЕ', sourceLabel:'01 / ИСХОДНЫЙ КОД', updatesLabel:'02 / НОВОСТИ ПРОЕКТОВ', featuredLabel:'ГЛАВНЫЙ ПРОЕКТ', publicLabel:'ОТКРЫТЫЙ КОД', heroKicker:'РАЗРАБОТКА / ИЗБРАННЫЕ ПРОЕКТЫ',
    heroDescription:'Пишу на Python. Разрабатываю ботов, автоматизацию и интеграции. Здесь собрал несколько своих проектов.',
    seeProjects:'Смотреть проекты', heroFooter:'ПРОЕКТЫ / КОД / ДЕТАЛИ',
    workTitle:'Проекты', workDescription:'Несколько моих проектов. Где возможно, есть ссылка на код.',
    stackTitle:'С чем работаю', stackDescription:'Технологии из моих проектов и текущей разработки.',
    contactTitle:'Мои ссылки', contactNote:'Проекты и исходный код. Без личных данных.',
    footerRight:'HTML / CSS / JS', top:'НАВЕРХ ↑',
    source:'Открыть репозиторий', private:'Закрытый код', inspect:'Подробнее', close:'Скрыть',
    item:'ПРОЕКТ', type:'ТИП', tech:'СТЕК', note:'ДЕТАЛИ'
  }
};

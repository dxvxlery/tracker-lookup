export interface Notes {
  added?: string[];
  improved?: string[];
  fixed?: string[];
}

export interface Release {
  version: string;
  date: string;
  ru: Notes;
}

export const RELEASES: Release[] = [
  {
    version: "1.0.0",
    date: "2026-11-23",
    ru: {
      added: [
        "Окно профиля с discord-tracker.com по правому клику на участника.",
        "Где человек сидит в войсе сейчас, серверы и знакомые с сортировкой.",
        "Голосовые события, история ников, удалённые и изменённые сообщения, упоминания, комментарии.",
        "Автообновление из репозитория на GitHub и окно «что нового» после обновления.",
      ],
    },
  },
];

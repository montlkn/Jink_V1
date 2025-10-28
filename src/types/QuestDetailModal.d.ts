import type { RootParams } from "@/navigation/routes";

declare module "@/components/quests/QuestDetailModal" {
  export type QuestDetail = {
    id?: string | null;
    type?: string | null;
    questType?: string | null;
    title?: string | null;
    description?: string | null;
    xpReward?: number | null;
    epReward?: number | null;
    progress?: number | null;
    total?: number | null;
    completed?: boolean | null;
  };

  export type QuestDetailModalProps = {
    visible: boolean;
    quest: QuestDetail | null;
    onClose?: () => void;
    onStartQuest: (params?: RootParams["Quests"]) => void;
    timeRemaining?: string;
  };

  declare function QuestDetailModal(
    props: QuestDetailModalProps
  ): JSX.Element | null;

  export default QuestDetailModal;
}

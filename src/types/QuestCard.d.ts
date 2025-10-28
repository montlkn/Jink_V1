declare module "@/components/quests/QuestCard" {
  export type QuestReward = {
    type: string;
    icon?: string;
    label: string;
  };

  export type QuestCardProps = {
    type?: string;
    title?: string;
    description?: string;
    epReward?: number | null;
    xpReward?: number | null;
    progress?: number;
    total?: number;
    completed?: boolean;
    additionalRewards?: QuestReward[];
    onPress?: () => void;
  };

  declare function QuestCard(props: QuestCardProps): JSX.Element;

  export default QuestCard;
}

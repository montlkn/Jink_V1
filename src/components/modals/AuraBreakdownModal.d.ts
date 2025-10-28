export type AuraSegment = {
  name?: string;
  color?: string;
  percentage?: number;
  score?: number;
};

export type AuraBreakdownModalProps = {
  visible: boolean;
  segments?: AuraSegment[];
  onClose?: () => void;
};

declare function AuraBreakdownModal(props: AuraBreakdownModalProps): JSX.Element | null;

export default AuraBreakdownModal;

declare module "@/components/sheets/AestheticAuraSheet" {
  export type AuraSegment = {
    name?: string;
    color?: string;
    percentage?: number;
    score?: number;
  };

  export type AestheticAuraSheetProps = {
    visible: boolean;
    segments?: AuraSegment[];
    onClose?: () => void;
  };

  declare function AestheticAuraSheet(
    props: AestheticAuraSheetProps,
  ): JSX.Element | null;

  export default AestheticAuraSheet;
}

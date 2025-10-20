import GlassOrb from "./three/orb/GlassOrb";

export default function ArchetypeOrb(props) {
  return <GlassOrb size={props.size ?? 220} />;
}

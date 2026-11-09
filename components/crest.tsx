import Image from 'next/image'

// The crest sits next to the word FACTION, so it has empty alt text. The clip
// hides the tan corners that are baked into the Figma export.
export default function Crest({
  size,
  className,
}: {
  size: number
  className?: string
}) {
  return (
    <Image
      src="/faction-crest.svg"
      alt=""
      width={size}
      height={size}
      className={`[clip-path:inset(1.5%_round_23%)] ${className ?? ''}`}
    />
  )
}

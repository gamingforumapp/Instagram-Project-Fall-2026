import Image from 'next/image'

// Same crest treatment as the homepage: the clip hides the tan corners that are
// baked into the Figma export of /faction-crest.svg.
export function Crest({ size }: { size: number }) {
  return (
    <Image
      src="/faction-crest.svg"
      alt=""
      width={size}
      height={size}
      className="[clip-path:inset(1.5%_round_23%)]"
    />
  )
}

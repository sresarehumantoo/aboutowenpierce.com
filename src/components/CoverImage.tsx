import Image from 'next/image'

// Covers are generated abstract art that says nothing the title doesn't, so
// screen readers skip them (alt="").
export function CoverImage({ src }: { src: string }) {
  return (
    <div className="post-cover">
      <Image src={src} alt="" width={1200} height={630} preload fetchPriority="high" />
    </div>
  )
}

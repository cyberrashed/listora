import { ImageOff } from "lucide-react";
import Image from "next/image";

type Photo = { id: string; url: string; thumbUrl: string };

// Photos come already sized and in WebP from our own route, so Next's
// image optimizer would only do the same work again.

/** The cover in a table row, or a quiet stand-in when there is none. */
export function CoverThumb({ photo }: { photo: Photo | undefined }) {
  if (!photo) {
    return (
      <span
        aria-hidden
        className="bg-raised text-muted grid size-11 shrink-0 place-items-center rounded-control"
      >
        <ImageOff size={16} strokeWidth={1.75} />
      </span>
    );
  }
  return (
    <Image
      src={photo.thumbUrl}
      alt=""
      width={44}
      height={44}
      unoptimized
      className="bg-raised size-11 shrink-0 rounded-control object-cover"
    />
  );
}

/** Every photo on a listing. Each opens at full size in a new tab. */
export function PhotoGrid({
  photos,
  title,
}: {
  photos: Photo[];
  title: string;
}) {
  if (photos.length === 0) {
    return <p className="text-muted">The seller didn&apos;t add photos.</p>;
  }
  return (
    <ul className="grid max-w-[640px] grid-cols-3 gap-2 sm:grid-cols-4">
      {photos.map((photo, index) => (
        <li key={photo.id}>
          <a
            href={photo.url}
            target="_blank"
            rel="noreferrer"
            className="block"
          >
            <Image
              src={photo.thumbUrl}
              alt={`Photo ${index + 1} of ${title}`}
              width={160}
              height={160}
              unoptimized
              className="bg-raised aspect-square w-full rounded-card object-cover"
            />
          </a>
        </li>
      ))}
    </ul>
  );
}

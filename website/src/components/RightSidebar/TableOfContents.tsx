import { unescape } from 'html-escaper';
import type { MarkdownHeading } from 'astro';
import type { FunctionalComponent } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';

type ItemOffsets = {
  id: string;
  topOffset: number;
};

const TableOfContents: FunctionalComponent<{ headings: MarkdownHeading[]; currentPage: string }> = ({
  headings = [],
  currentPage,
}) => {
  const toc = useRef<any>();
  const onThisPageID = 'on-this-page-heading';
  const itemOffsets = useRef<ItemOffsets[]>([]);
  const [currentID, setCurrentID] = useState('overview');
  useEffect(() => {
    const getItemOffsets = () => {
      const titles = document.querySelectorAll('article :is(h1, h2, h3, h4)');
      itemOffsets.current = Array.from(titles).map((title) => ({
        id: title.id,
        topOffset: title.getBoundingClientRect().top + window.scrollY,
      }));
    };

    getItemOffsets();
    window.addEventListener('resize', getItemOffsets);

    return () => {
      window.removeEventListener('resize', getItemOffsets);
    };
  }, []);

  useEffect(() => {
    if (!toc.current) return;

    const setCurrent: IntersectionObserverCallback = (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const { id } = entry.target;
          if (id === onThisPageID) continue;
          setCurrentID(entry.target.id);
          break;
        }
      }
    };

    const observerOptions: IntersectionObserverInit = {
      // Negative top margin accounts for `scroll-margin`.
      // Negative bottom margin means heading needs to be towards top of viewport to trigger intersection.
      rootMargin: '-100px 0% -66%',
      threshold: 1,
    };

    const headingsObserver = new IntersectionObserver(setCurrent, observerOptions);

    // Observe all the headings in the main page content.
    document.querySelectorAll('article :is(h1,h2,h3)').forEach((h) => headingsObserver.observe(h));

    // Stop observing when the component is unmounted.
    return () => headingsObserver.disconnect();
  }, [toc.current]);

  const onLinkClick = (e: any) => {
    setCurrentID(e.target.getAttribute('href').replace('#', ''));
  };
  const minDepth = 1;

  return (
    <>
      <ul ref={toc}>
        {headings
          .filter(({ depth }) => depth >= minDepth && depth < 4)
          .map((heading) => (
            <li className={`w-full`}>
              <a
                href={`${currentPage}#${heading.slug}`}
                onClick={onLinkClick}
                className={`py-0.5 block cursor-pointer w-full border-l-4 border-header hover:bg-header ${
                  ['pl-4', 'pl-9', 'pl-12'][heading.depth - minDepth]
                } ${currentID === heading.slug ? 'bg-header' : ''}`.trim()}
              >
                {unescape(heading.text)}
              </a>
            </li>
          ))}
      </ul>
    </>
  );
};

export default TableOfContents;

"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { XIcon, GithubIcon } from "lucide-react";
import Image from "next/image";

interface Artwork {
  objectID: number;
  title: string;
  artistDisplayName: string;
  primaryImageSmall?: string;
  primaryImage?: string;
  objectDate?: string;
  medium?: string;
  department?: string;
  culture?: string;
  objectName?: string;
  creditLine?: string;
  repository?: string;
  objectURL?: string;
  description?: string;
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Artwork | null>(null);
  const dialogContentRef = useRef<HTMLDivElement | null>(null);
  const [objectIDs, setObjectIDs] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 9;
  const [filteredResults, setFilteredResults] = useState<Artwork[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const maxResults = 120;

  useEffect(() => {
    if (!selected && dialogContentRef.current) {
      dialogContentRef.current.blur();
    }
  }, [selected]);

  async function fetchWithImagesBatch(ids: number[], already: Artwork[] = [], needed: number) {
    let filtered = [...already];
    let i = 0;
    const batchSize = 9;
    while (filtered.length < needed && i < ids.length) {
      const batch = await Promise.all(
        ids.slice(i, i + batchSize).map((id: number) =>
          fetch(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`).then((r) => r.json())
        )
      );
      filtered = filtered.concat(batch.filter((item: Artwork) => item.primaryImageSmall || item.primaryImage));
      i += batchSize;
    }
    return { filtered, nextIndex: i };
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setHasSearched(true);
    setLoading(true);
    setError("");
    setResults([]);
    setObjectIDs([]);
    setFilteredResults([]);
    setCurrentPage(1);
    try {
      const searchRes = await fetch(
        `https://collectionapi.metmuseum.org/public/collection/v1/search?hasImages=true&q=${encodeURIComponent(query)}`
      ).then((r) => r.json());
      if (!searchRes.objectIDs || searchRes.objectIDs.length === 0) {
        setResults([]);
        setObjectIDs([]);
        setFilteredResults([]);
        setLoading(false);
        return;
      }
      setObjectIDs(searchRes.objectIDs);
      // Progressive loading: fetch just enough for the first page
      const { filtered, nextIndex } = await fetchWithImagesBatch(searchRes.objectIDs, [], pageSize);
      setFilteredResults(filtered);
      setResults(filtered.slice(0, pageSize));
      setLoading(false);
      // Continue fetching in the background for more pages
      if (filtered.length < maxResults && nextIndex < searchRes.objectIDs.length) {
        setIsFetchingMore(true);
        (async () => {
          let moreFiltered = [...filtered];
          let i = nextIndex;
          while (moreFiltered.length < maxResults && i < searchRes.objectIDs.length) {
            const batch = await Promise.all(
              searchRes.objectIDs.slice(i, i + 9).map((id: number) =>
                fetch(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`).then((r) => r.json())
              )
            );
            moreFiltered = moreFiltered.concat(batch.filter((item: Artwork) => item.primaryImageSmall || item.primaryImage));
            setFilteredResults([...moreFiltered]);
            i += 9;
          }
          setIsFetchingMore(false);
        })();
      }
    } catch {
      setError("Failed to fetch results. Please try again.");
      setLoading(false);
    }
  }

  // When currentPage changes, ensure enough results are loaded, otherwise fetch more
  useEffect(() => {
    if (filteredResults.length === 0) return;
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    // If not enough results for this page, fetch more
    if (filteredResults.length < end && objectIDs.length > 0 && !isFetchingMore) {
      setIsFetchingMore(true);
      (async () => {
        const { filtered } = await fetchWithImagesBatch(objectIDs, filteredResults, end);
        setFilteredResults(filtered);
        setResults(filtered.slice(start, end));
        setIsFetchingMore(false);
      })();
    } else {
      setResults(filteredResults.slice(start, end));
    }
  }, [currentPage, filteredResults, objectIDs, isFetchingMore]);

  const totalPages = Math.ceil(filteredResults.length / pageSize);

  return (
    <div className="min-h-screen flex flex-col items-center justify-start py-16 px-4 bg-background">
      {/* Met logo above the title */}
      <div className="mb-6 flex justify-center">
        <Image src="/met-logo.svg" alt="The Met logo" width={80} height={80} priority />
      </div>
      <h3 className="text-xl sm:text-2xl font-bold mb-8 text-center">Metropolitan Museum of Art</h3>
      <form onSubmit={handleSearch} className="w-full max-w-xl flex gap-2 mb-4 relative">
        <div className="relative flex-1">
          <Input
            placeholder="Search the Met Collection..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pr-10"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => {
                setQuery("");
                setResults([]);
                setObjectIDs([]);
                setFilteredResults([]);
                setError("");
              }}
            >
              <XIcon className="w-4 h-4" />
            </button>
          )}
        </div>
        <Button type="submit" disabled={loading || !query.trim()}>
          Search
        </Button>
      </form>
      {/* Sample search terms always visible below search bar */}
      <div className="w-full max-w-xl flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-8">
        <span className="text-xs text-muted-foreground font-light min-w-fit">Sample searches:</span>
        <div className="flex flex-wrap gap-2">
          {["sunflowers", "rousseau", "monet", "pottery"].map((term) => (
            <button
              key={term}
              type="button"
              className="text-xs font-light rounded-full px-3 py-1 bg-accent/60 text-muted-foreground border border-accent/30 transition-colors hover:bg-primary/10 hover:text-primary hover:border-primary"
              onClick={() => {
                setQuery(term);
                setTimeout(() => {
                  document.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                }, 0);
              }}
            >
              {term}
            </button>
          ))}
        </div>
      </div>
      {error && <div className="text-destructive mb-6">{error}</div>}
      <Dialog>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 w-full max-w-5xl">
          {loading &&
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="flex flex-col gap-4">
                  <Skeleton className="w-full h-48" />
                  <Skeleton className="w-2/3 h-6" />
                  <Skeleton className="w-1/2 h-4" />
                </CardContent>
              </Card>
            ))}
          {!loading && results.length > 0 &&
            results.map((item) => (
              <DialogTrigger asChild key={item.objectID}>
                <Card onClick={() => setSelected(item)} className="cursor-pointer transition-shadow hover:shadow-lg">
                  <CardHeader>
                    <CardTitle className="truncate" title={item.title}>{item.title}</CardTitle>
                    <CardDescription className="truncate" title={item.artistDisplayName}>{item.artistDisplayName}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {item.primaryImageSmall || item.primaryImage ? (
                      <Image
                        src={item.primaryImageSmall || item.primaryImage || "/placeholder.png"}
                        alt={item.title}
                        width={400}
                        height={300}
                        className="w-full h-48 object-cover rounded-md border"
                        style={{ objectFit: "cover" }}
                        loading="lazy"
                      />
                    ) : (
                      <Skeleton className="w-full h-48" />
                    )}
                    <div className="mt-2 text-xs text-muted-foreground truncate" title={item.objectDate}>{item.objectDate}</div>
                  </CardContent>
                </Card>
              </DialogTrigger>
            ))}
          {!loading && !error && results.length === 0 && hasSearched && (
            <div className="col-span-full text-center text-muted-foreground flex flex-col items-center gap-2">
              <span>No results found.</span>
            </div>
          )}
          {isFetchingMore && (
            <div className="col-span-full text-center text-xs text-muted-foreground mt-4">Loading more results…</div>
          )}
        </div>
        {/* Pagination Controls */}
        {filteredResults.length > pageSize && (
          <div className="flex flex-col sm:flex-row flex-wrap justify-center items-center gap-2 sm:gap-4 mt-8">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
                First
              </Button>
              <Button variant="outline" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                Previous
              </Button>
            </div>
            <span className="text-sm min-w-[80px] text-center my-2 sm:my-0">Page {currentPage} of {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                Next
              </Button>
              <Button variant="outline" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>
                Last
              </Button>
            </div>
          </div>
        )}
        {selected && (
          <DialogContent ref={dialogContentRef} className="max-w-2xl" onInteractOutside={() => setSelected(null)} onEscapeKeyDown={() => setSelected(null)}>
            <DialogHeader>
              <DialogTitle>{selected.title}</DialogTitle>
              <DialogDescription>{selected.artistDisplayName}</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4">
              {selected.primaryImage || selected.primaryImageSmall ? (
                <Image
                  src={selected.primaryImage || selected.primaryImageSmall || "/placeholder.png"}
                  alt={selected.title}
                  width={600}
                  height={450}
                  className="w-full max-h-96 object-contain rounded-md border"
                  style={{ objectFit: "contain" }}
                  loading="lazy"
                />
              ) : (
                <Skeleton className="w-full h-48" />
              )}
              <div className="w-full text-sm">
                <div><strong>Date:</strong> {selected.objectDate}</div>
                {selected.medium && <div><strong>Medium:</strong> {selected.medium}</div>}
                {selected.department && <div><strong>Department:</strong> {selected.department}</div>}
                {selected.culture && <div><strong>Culture:</strong> {selected.culture}</div>}
                {selected.objectName && <div><strong>Type:</strong> {selected.objectName}</div>}
                {selected.creditLine && <div><strong>Credit:</strong> {selected.creditLine}</div>}
                {selected.repository && <div><strong>Repository:</strong> {selected.repository}</div>}
                {selected.objectURL && (
                  <div className="mt-2"><a href={selected.objectURL} target="_blank" rel="noopener noreferrer" className="text-primary underline">View on MetMuseum.org</a></div>
                )}
                {selected.description && <div className="mt-2">{selected.description}</div>}
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
      <footer className="w-full flex flex-row items-center justify-center mt-16 mb-4 text-xs text-muted-foreground gap-2">
        <a href="https://github.com/harrywang/met-search" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
          <GithubIcon className="w-5 h-5" />
        </a>
        <span>
          Made by{' '}
          <a href="https://harrywang.me/" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Harry Wang</a>
        </span>
      </footer>
    </div>
  );
}

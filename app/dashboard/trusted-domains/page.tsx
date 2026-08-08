"use client";

import { RiDeleteBinLine, RiShieldCheckLine } from "@remixicon/react";
import { useCallback, useEffect, useState } from "react";
import LoaderContent from "@/components/loading-content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TrustedURL {
  id: string;
  url: string;
  createdAt: string;
}

export default function TrustedUrlsPage() {
  const [trustedUrls, setTrustedUrls] = useState<TrustedURL[]>([]);
  const [url, setUrl] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchUrls = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/trusted-urls");
      if (res.ok) {
        const data = await res.json();
        setTrustedUrls(data);
      }
    } catch (err) {
      console.error("Failed to fetch trusted urls", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUrls();
  }, [fetchUrls]);

  const handleAdd = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!url) return;

    setIsAdding(true);
    setError(null);

    const finalUrl = url.trim();

    try {
      const res = await fetch("/api/trusted-urls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: finalUrl }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(
          err.details?.prefix?.[0] || err.error || "Failed to add url",
        );
      }

      setUrl("");
      fetchUrls();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/trusted-urls/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete url");
      setTrustedUrls(trustedUrls.filter((d) => d.id !== id));
    } catch (err) {
      console.error(err);
      setError("Failed to delete url");
    }
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(dateString));
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Trusted Urls</h2>
      </div>

      <p className="text-muted-foreground mb-4">
        Add website urls or specific paths that the AI agent is allowed to
        search and read from.
      </p>

      {/* Add Form */}
      <div className="p-4 rounded-lg border shadow-sm mb-6">
        <form
          onSubmit={handleAdd}
          className="flex flex-col sm:flex-row gap-3 items-start sm:items-end"
        >
          <div className="flex-1 w-full space-y-1">
            <Label htmlFor="url-input" className="mb-2 ml-1">
              URL (must include http:// or https://)
            </Label>
            <p></p>
            <Input
              id="url-input"
              placeholder="e.g., https://www.wikipedia.org or http://example.com/docs"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isAdding}
            />
          </div>
          <Button type="submit" disabled={!url || isAdding}>
            {isAdding ? "Adding..." : "Add"}
          </Button>
        </form>
        {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
      </div>

      {/* List */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>URL</TableHead>
              <TableHead>Added</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4}>
                  <LoaderContent text="Loading trusted urls..." />
                </TableCell>
              </TableRow>
            ) : trustedUrls.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-24 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <RiShieldCheckLine className="h-8 w-8 text-muted-foreground/50" />
                    <p>No trusted urls yet.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              trustedUrls.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.url}</TableCell>
                  <TableCell>{formatDate(d.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(d.id)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-500/10"
                    >
                      <RiDeleteBinLine className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

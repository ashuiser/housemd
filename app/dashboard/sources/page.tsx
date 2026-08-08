"use client";

import {
  RiDeleteBinLine,
  RiFileList3Line,
  RiUploadCloud2Line,
} from "@remixicon/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SourceStatus = "uploading" | "processing" | "ready" | "failed";

interface Source {
  id: string;
  fileName: string;
  sizeBytes: number;
  status: SourceStatus;
  vectorIdsCount: number | null;
  createdAt: string;
}

export default function SourcesPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchSources = useCallback(async () => {
    try {
      const res = await fetch("/api/sources");
      if (res.ok) {
        const data = await res.json();
        setSources(data);
      }
    } catch (err) {
      console.error("Failed to fetch sources", err);
    }
  }, []);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  // Poll if there are any uploading/processing sources
  useEffect(() => {
    const hasPending = sources.some(
      (s) => s.status === "uploading" || s.status === "processing",
    );
    if (!hasPending) return;

    const interval = setInterval(fetchSources, 3000);
    return () => clearInterval(interval);
  }, [fetchSources, sources]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setError("Only PDF files are supported.");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError("File must be under 50MB.");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const initiateRes = await fetch("/api/sources/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          sizeBytes: file.size,
        }),
      });

      if (!initiateRes.ok) {
        const err = await initiateRes.json();
        throw new Error(err.error || "Failed to initiate upload");
      }

      const { uploadUrl } = await initiateRes.json();

      fetchSources();

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload file to storage");
      }
      fetchSources();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/sources/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete source");
      setSources(sources.filter((s) => s.id !== id));
    } catch (err) {
      console.error(err);
      setError("Failed to delete source");
    }
  };

  const getStatusBadge = (status: SourceStatus) => {
    switch (status) {
      case "ready":
        return (
          <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20 shadow-none border-0">
            Ready
          </Badge>
        );
      case "processing":
        return (
          <Badge
            variant="secondary"
            className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 shadow-none border-0"
          >
            Processing
          </Badge>
        );
      case "uploading":
        return (
          <Badge
            variant="secondary"
            className="bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 shadow-none border-0"
          >
            Uploading
          </Badge>
        );
      case "failed":
        return (
          <Badge
            variant="destructive"
            className="bg-red-500/10 text-red-500 hover:bg-red-500/20 shadow-none border-0"
          >
            Failed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
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
    <div className="flex-1 space-y-4 p-8 pt-6 max-w-6xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Sources</h2>
        <div className="flex items-center gap-4">
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button onClick={handleUploadClick} disabled={isUploading}>
            <RiUploadCloud2Line className="mr-2 h-4 w-4" />
            {isUploading ? "Uploading..." : "Upload PDF"}
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="application/pdf"
            className="hidden"
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sources.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <RiFileList3Line className="h-8 w-8 text-muted-foreground/50" />
                    <p>No sources uploaded yet.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              sources.map((source) => (
                <TableRow key={source.id}>
                  <TableCell className="font-medium">
                    {source.fileName}
                  </TableCell>
                  <TableCell>{getStatusBadge(source.status)}</TableCell>
                  <TableCell>
                    {(source.sizeBytes / 1024 / 1024).toFixed(2)} MB
                  </TableCell>
                  <TableCell>{formatDate(source.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(source.id)}
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

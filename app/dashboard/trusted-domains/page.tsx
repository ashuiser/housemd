"use client";

import { RiDeleteBinLine, RiShieldCheckLine } from "@remixicon/react";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TrustedDomain {
  id: string;
  prefix: string;
  scope: "domain" | "path";
  createdAt: string;
}

const items: {
  label: string;
  value: "domain" | "path";
}[] = [
  { label: "Domain", value: "domain" },
  { label: "Path Only", value: "path" },
];

export default function TrustedDomainsPage() {
  const [domains, setDomains] = useState<TrustedDomain[]>([]);
  const [prefix, setPrefix] = useState("");
  const [scope, setScope] = useState<"domain" | "path">("domain");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDomains = useCallback(async () => {
    try {
      const res = await fetch("/api/trusted-domains");
      if (res.ok) {
        const data = await res.json();
        setDomains(data);
      }
    } catch (err) {
      console.error("Failed to fetch trusted domains", err);
    }
  }, []);

  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  // Normalize input continuously so user sees the cleaned version
  const handlePrefixChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.trim();
    if (val.startsWith("http://")) val = val.slice(7);
    if (val.startsWith("https://")) val = val.slice(8);
    // don't trim trailing slash while typing since they might be adding a path
    setPrefix(val);
    setError(null);
  };

  const handleAdd = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!prefix) return;

    setIsAdding(true);
    setError(null);

    // Normalize one last time before submit
    let finalPrefix = prefix.trim();
    if (finalPrefix.endsWith("/")) finalPrefix = finalPrefix.slice(0, -1);

    try {
      const res = await fetch("/api/trusted-domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefix: finalPrefix, scope }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(
          err.details?.prefix?.[0] || err.error || "Failed to add domain",
        );
      }

      setPrefix("");
      setScope("domain");
      fetchDomains();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/trusted-domains/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete domain");
      setDomains(domains.filter((d) => d.id !== id));
    } catch (err) {
      console.error(err);
      setError("Failed to delete domain");
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
        <h2 className="text-3xl font-bold tracking-tight">Trusted Domains</h2>
      </div>

      <p className="text-muted-foreground mb-4">
        Add website domains or specific paths that the AI agent is allowed to
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
              URL / Domain
            </Label>
            <Input
              id="url-input"
              placeholder="e.g., wikipedia.org or example.com/docs"
              value={prefix}
              onChange={handlePrefixChange}
              disabled={isAdding}
            />
          </div>
          <div className="w-full sm:w-48 space-y-1">
            <Label htmlFor="scope" className="mb-2 ml-1">
              Scope
            </Label>
            <Select
              value={scope}
              onValueChange={(value) => setScope(value as "domain" | "path")}
            >
              <SelectTrigger className="w-full max-w-48 mb-0" id="scope">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Scope</SelectLabel>
                  {items.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={!prefix || isAdding}>
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
              <TableHead>Prefix</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Added</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {domains.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-24 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <RiShieldCheckLine className="h-8 w-8 text-muted-foreground/50" />
                    <p>No trusted domains yet.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              domains.map((domain) => (
                <TableRow key={domain.id}>
                  <TableCell className="font-medium">{domain.prefix}</TableCell>
                  <TableCell>
                    {domain.scope === "domain" ? (
                      <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 shadow-none border-0">
                        Domain
                      </Badge>
                    ) : (
                      <Badge className="bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 shadow-none border-0">
                        Path
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(domain.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(domain.id)}
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

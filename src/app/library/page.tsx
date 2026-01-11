"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Search, FolderPlus, Trash2, MoreVertical, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PalettePreview } from "@/components/PaletteDisplay"
import { usePaletteStore } from "@/stores/paletteStore"
import { formatDate, cn } from "@/lib/utils"

export default function LibraryPage() {
  const { savedPalettes, folders, deletePalette, createFolder, deleteFolder } = usePaletteStore()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")

  const filteredPalettes = useMemo(() => {
    let filtered = savedPalettes

    // Filter by folder
    if (selectedFolder !== null) {
      filtered = filtered.filter((p) => p.folderId === selectedFolder)
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.tags.some((tag) => tag.toLowerCase().includes(query))
      )
    }

    // Sort by update date
    return filtered.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  }, [savedPalettes, selectedFolder, searchQuery])

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      createFolder(newFolderName.trim())
      setNewFolderName("")
      setShowNewFolder(false)
    }
  }

  const handleDeletePalette = (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (confirm("Are you sure you want to delete this palette?")) {
      deletePalette(id)
    }
  }

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">My Library</h1>
        <Button asChild>
          <Link href="/create">
            <Plus className="h-4 w-4 mr-2" />
            New Palette
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <aside className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search palettes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Folders */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Folders</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowNewFolder(true)}
              >
                <FolderPlus className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-1">
              <button
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                  selectedFolder === null
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted"
                )}
                onClick={() => setSelectedFolder(null)}
              >
                All Palettes ({savedPalettes.length})
              </button>

              {folders.map((folder) => (
                <div
                  key={folder.id}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors group",
                    selectedFolder === folder.id
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted"
                  )}
                >
                  <button
                    className="flex-1 text-left"
                    onClick={() => setSelectedFolder(folder.id)}
                  >
                    {folder.name} (
                    {savedPalettes.filter((p) => p.folderId === folder.id).length})
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100"
                    onClick={() => {
                      if (confirm("Delete this folder?")) {
                        deleteFolder(folder.id)
                        if (selectedFolder === folder.id) {
                          setSelectedFolder(null)
                        }
                      }
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}

              {showNewFolder && (
                <div className="flex items-center space-x-2 px-3 py-2">
                  <Input
                    placeholder="Folder name"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
                    className="h-8 text-sm"
                    autoFocus
                  />
                  <Button size="sm" onClick={handleCreateFolder}>
                    Add
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-2">
            <h3 className="font-semibold">Stats</h3>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Total Palettes: {savedPalettes.length}</p>
              <p>Total Folders: {folders.length}</p>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {filteredPalettes.length === 0 ? (
            <div className="text-center py-16 rounded-lg border-2 border-dashed border-muted-foreground/25">
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? "No palettes match your search"
                  : "No palettes saved yet"}
              </p>
              <Button asChild>
                <Link href="/create">Create Your First Palette</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredPalettes.map((palette) => (
                <Link
                  key={palette.id}
                  href={`/palette/${palette.id}`}
                  className="group block rounded-lg border border-border bg-card overflow-hidden hover:border-primary/50 transition-colors"
                >
                  <PalettePreview colors={palette.colors} className="h-24" />

                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{palette.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {palette.colors.length} colors • {formatDate(palette.updatedAt)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100"
                        onClick={(e) => handleDeletePalette(palette.id, e)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {palette.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {palette.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

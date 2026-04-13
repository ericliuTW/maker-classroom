"use client"

import { useState, useEffect, useCallback } from "react"
import type { Item, Category } from "@/types/database"

export function useItems() {
  const [items, setItems] = useState<Item[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const fetchItems = useCallback(async (search?: string, category?: string) => {
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    if (category) params.set("category", category)
    const res = await fetch(`/api/items?${params}`)
    const data = await res.json()
    if (Array.isArray(data)) setItems(data)
    setLoading(false)
  }, [])

  const fetchCategories = useCallback(async () => {
    const res = await fetch("/api/categories")
    const data = await res.json()
    if (Array.isArray(data)) setCategories(data)
  }, [])

  useEffect(() => {
    fetchItems()
    fetchCategories()
  }, [fetchItems, fetchCategories])

  return { items, categories, loading, fetchItems, fetchCategories, setItems }
}
